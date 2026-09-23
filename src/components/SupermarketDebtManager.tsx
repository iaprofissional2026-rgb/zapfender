import React, { useState, useMemo, useRef } from 'react';
import {
  Store,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  RefreshCw,
  Send,
  FileSpreadsheet,
  Settings,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Phone,
  FileText,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  Receipt,
  X,
  Database,
  ArrowUpDown,
  Filter,
  Check,
  Calendar,
  AlertCircle,
  Copy,
  Zap,
  UploadCloud,
  FileCode,
  QrCode,
  ShieldCheck,
  Play,
  Pause,
  Layers,
} from 'lucide-react';
import {
  SupermarketCustomer,
  SupermarketDebtItem,
  SupermarketErpConfig,
  WhatsAppSession,
  Contact,
} from '../types';
import { formatPhoneDisplay, sanitizePhoneNumber } from '../utils/messageFormatter';
import { sendWhatsAppMessage, syncSupermarketERP, checkWhatsAppNumbers } from '../services/whatsappApi';
import { generatePixCopyPaste } from '../utils/pixHelper';
import { parseNFeXml, parseSupermarketCsv } from '../utils/supermarketFileParser';

interface SupermarketDebtManagerProps {
  customers: SupermarketCustomer[];
  onUpdateCustomers: (customers: SupermarketCustomer[]) => void;
  erpConfig: SupermarketErpConfig;
  onUpdateErpConfig: (config: SupermarketErpConfig) => void;
  session: WhatsAppSession;
  contacts: Contact[];
  onAddContactsFromMarket: (newContacts: Contact[]) => void;
}

export const SupermarketDebtManager: React.FC<SupermarketDebtManagerProps> = ({
  customers,
  onUpdateCustomers,
  erpConfig,
  onUpdateErpConfig,
  session,
  contacts,
  onAddContactsFromMarket,
}) => {
  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'pending' | 'up_to_date'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<SupermarketCustomer | null>(null);

  // Modals state
  const [isErpModalOpen, setIsErpModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMassChargeModalOpen, setIsMassChargeModalOpen] = useState(false);

  // Sync state
  const [isSyncingErp, setIsSyncingErp] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);

  // Single Charge modal state
  const [chargeTargetCustomer, setChargeTargetCustomer] = useState<SupermarketCustomer | null>(null);
  const [chargeCustomMessage, setChargeCustomMessage] = useState('');
  const [isSendingCharge, setIsSendingCharge] = useState(false);
  const [chargeResult, setChargeResult] = useState<{ success: boolean; messageId?: string; error?: string } | null>(null);
  const [pixCopyNotice, setPixCopyNotice] = useState(false);

  // Mass Charge State
  const [massSelectedCustomerIds, setMassSelectedCustomerIds] = useState<string[]>([]);
  const [massChargeMessageTemplate, setMassChargeMessageTemplate] = useState(
    `Olá *{nome}*, tudo bem? Aqui é do *{empresa}*. 🛒\n\nPassando para enviar o extrato atualizado das suas compras no supermercado.\n\n📌 *Código do Cliente:* {codigo_cliente}\n💰 *Saldo em Aberto:* R$ {saldo_devedor}\n📅 *Status:* {status_debito}\n\n🔑 *Chave PIX:* \`{chave_pix}\`\nBeneficiário: *{nome_pix}*\n\n📱 *PIX Copia e Cola:* \n\`{pix_copia_cola}\`\n\nAssim que fizer o pagamento, nos envie o comprovante para darmos baixa no sistema. Agradecemos pela preferência! 👍`
  );
  const [isMassSending, setIsMassSending] = useState(false);
  const [massCurrentIndex, setMassCurrentIndex] = useState(0);
  const [massSentCount, setMassSentCount] = useState(0);
  const [massFailedCount, setMassFailedCount] = useState(0);
  const [massDelaySeconds, setMassDelaySeconds] = useState(4);
  const [massLogs, setMassLogs] = useState<Array<{ name: string; phone: string; status: 'success' | 'failed'; error?: string; messageId?: string }>>([]);
  const isMassActiveRef = useRef(false);

  // Payment modal state
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNote, setPaymentNote] = useState('');

  // File import state
  const [importStatusMsg, setImportStatusMsg] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // New Customer Form State
  const [newCustCode, setNewCustCode] = useState(`CLI-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCpf, setNewCustCpf] = useState('');
  const [newCustLimit, setNewCustLimit] = useState(1500);
  const [newCustInitialDebt, setNewCustInitialDebt] = useState(0);
  const [newCustCupom, setNewCustCupom] = useState(`CUP-${Math.floor(10000 + Math.random() * 90000)}`);
  const [newCustDesc, setNewCustDesc] = useState('Compras de Mercado (Açougue / Mercearia)');

  // ERP Config Form State
  const [tempErpConfig, setTempErpConfig] = useState<SupermarketErpConfig>(erpConfig);

  // Number validation state
  const [isValidatingNumbers, setIsValidatingNumbers] = useState(false);
  const [validationResultMsg, setValidationResultMsg] = useState<string | null>(null);

  // Computed Metrics
  const metrics = useMemo(() => {
    const totalCustomers = customers.length;
    const totalDebt = customers.reduce((acc, c) => acc + (c.totalDebt || 0), 0);
    const overdueCustomers = customers.filter((c) => c.status === 'overdue' && c.totalDebt > 0);
    const overdueDebt = overdueCustomers.reduce((acc, c) => acc + (c.totalDebt || 0), 0);
    const upToDateCount = customers.filter((c) => c.totalDebt === 0).length;
    return {
      totalCustomers,
      totalDebt,
      overdueCount: overdueCustomers.length,
      overdueDebt,
      upToDateCount,
    };
  }, [customers]);

  // Filtered List
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        (c.cpfCnpj && c.cpfCnpj.includes(searchTerm)) ||
        c.debts.some((d) => d.cupomCode.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === 'overdue') return c.status === 'overdue' && c.totalDebt > 0;
      if (statusFilter === 'pending') return c.status === 'pending' && c.totalDebt > 0;
      if (statusFilter === 'up_to_date') return c.totalDebt === 0;

      return true;
    });
  }, [customers, searchTerm, statusFilter]);

  // Handle Real ERP Sync
  const handleSyncERP = async () => {
    setIsSyncingErp(true);
    setSyncSuccessMsg(null);
    setSyncErrorMsg(null);

    try {
      const res = await syncSupermarketERP({
        apiUrl: tempErpConfig.apiUrl,
        apiKey: tempErpConfig.apiKey,
        systemType: tempErpConfig.systemType,
        storeCode: tempErpConfig.storeCode,
      });

      if (res.customers && Array.isArray(res.customers)) {
        onUpdateCustomers(res.customers);
        const updatedConfig: SupermarketErpConfig = {
          ...tempErpConfig,
          status: 'connected',
          lastSyncAt: new Date().toISOString(),
          errorMessage: undefined,
        };
        onUpdateErpConfig(updatedConfig);
        setTempErpConfig(updatedConfig);
        setSyncSuccessMsg(`Conexão com ERP realizada! ${res.customers.length} clientes carregados em tempo real.`);
      }
    } catch (err: any) {
      console.error('[ERP Sync Error]:', err);
      const updatedConfig: SupermarketErpConfig = {
        ...tempErpConfig,
        status: 'error',
        errorMessage: err.message || 'Falha ao conectar com o ERP',
      };
      onUpdateErpConfig(updatedConfig);
      setTempErpConfig(updatedConfig);
      setSyncErrorMsg(err.message || 'Falha ao conectar com o sistema do supermercado.');
    } finally {
      setIsSyncingErp(false);
    }
  };

  // Open Single Charge Modal
  const handleOpenChargeModal = (customer: SupermarketCustomer) => {
    setChargeTargetCustomer(customer);
    setChargeResult(null);

    const firstDebt = customer.debts.find((d) => d.status === 'overdue' || d.status === 'open') || customer.debts[0];
    const cupomInfo = firstDebt ? `(Cupom / Nota: *${firstDebt.cupomCode}*)` : '';
    const dueDateInfo = firstDebt ? `com vencimento em *${firstDebt.dueDate}*` : '';

    const pixPayload = generatePixCopyPaste({
      pixKey: erpConfig.pixKey || 'supermercadocentral@pix.com.br',
      merchantName: erpConfig.pixName || erpConfig.erpName || 'SUPERMERCADO',
      amount: customer.totalDebt,
      txId: customer.customerCode.replace(/[^a-zA-Z0-9]/g, ''),
    });

    const defaultMsg = `Olá *${customer.name}*, tudo bem? Aqui é do *${erpConfig.erpName || 'Supermercado'}*. 🛒\n\nPassando para enviar o extrato atualizado da sua caderneta de compras.\n\n📌 *Código do Cliente:* ${customer.customerCode}\n💰 *Saldo em Aberto:* R$ ${customer.totalDebt.toFixed(2).replace('.', ',')} ${cupomInfo}\n📅 *Vencimento:* ${dueDateInfo || 'Pendente'}\n\n🔑 *Chave PIX:* \`${erpConfig.pixKey || 'supermercadocentral@pix.com.br'}\`\nBeneficiário: *${erpConfig.pixName || 'Supermercado Central'}*\n\n📱 *PIX Copia e Cola:* \n\`${pixPayload}\`\n\nAssim que realizar o pagamento, você pode nos mandar o comprovante por aqui para darmos a baixa no sistema. Agradecemos pela preferência! 👍`;

    setChargeCustomMessage(defaultMsg);
    setIsChargeModalOpen(true);
  };

  // Dispatch Real Charge Message via WhatsApp
  const handleSendChargeMessage = async () => {
    if (!chargeTargetCustomer) return;
    setIsSendingCharge(true);
    setChargeResult(null);

    try {
      const cleanPhone = sanitizePhoneNumber(chargeTargetCustomer.phone) || chargeTargetCustomer.phone;
      const res = await sendWhatsAppMessage(cleanPhone, chargeCustomMessage);

      setChargeResult({
        success: true,
        messageId: res.messageId,
      });
    } catch (err: any) {
      setChargeResult({
        success: false,
        error: err.message || 'Falha ao enviar mensagem de cobrança pelo WhatsApp',
      });
    } finally {
      setIsSendingCharge(false);
    }
  };

  // Open Mass Charge Modal
  const handleOpenMassCharge = () => {
    const debtors = customers.filter((c) => c.totalDebt > 0);
    setMassSelectedCustomerIds(debtors.map((c) => c.id));
    setMassLogs([]);
    setMassSentCount(0);
    setMassFailedCount(0);
    setMassCurrentIndex(0);
    setIsMassChargeModalOpen(true);
  };

  // Start Real Mass WhatsApp Charge Loop
  const handleStartMassCharge = async () => {
    const targetCustomers = customers.filter((c) => massSelectedCustomerIds.includes(c.id));
    if (targetCustomers.length === 0) {
      alert('Selecione pelo menos um cliente para cobrar.');
      return;
    }

    if (session.status !== 'connected') {
      alert('WhatsApp desconectado! Conecte seu aparelho no menu superior antes de disparar.');
      return;
    }

    setIsMassSending(true);
    isMassActiveRef.current = true;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < targetCustomers.length; i++) {
      if (!isMassActiveRef.current) break;

      setMassCurrentIndex(i);
      const cust = targetCustomers[i];
      const cleanPhone = sanitizePhoneNumber(cust.phone) || cust.phone;

      // Generate PIX
      const pixPayload = generatePixCopyPaste({
        pixKey: erpConfig.pixKey || 'supermercadocentral@pix.com.br',
        merchantName: erpConfig.pixName || erpConfig.erpName || 'SUPERMERCADO',
        amount: cust.totalDebt,
        txId: cust.customerCode.replace(/[^a-zA-Z0-9]/g, ''),
      });

      // Personalize message
      const personalized = massChargeMessageTemplate
        .replace(/{nome}/g, cust.name)
        .replace(/{empresa}/g, erpConfig.erpName || 'Supermercado Central')
        .replace(/{codigo_cliente}/g, cust.customerCode)
        .replace(/{saldo_devedor}/g, cust.totalDebt.toFixed(2).replace('.', ','))
        .replace(/{status_debito}/g, cust.status === 'overdue' ? 'Vencido' : 'Pendente')
        .replace(/{chave_pix}/g, erpConfig.pixKey || 'supermercadocentral@pix.com.br')
        .replace(/{nome_pix}/g, erpConfig.pixName || 'Supermercado Central')
        .replace(/{pix_copia_cola}/g, pixPayload);

      try {
        const res = await sendWhatsAppMessage(cleanPhone, personalized);
        sent++;
        setMassSentCount(sent);
        setMassLogs((prev) => [
          {
            name: cust.name,
            phone: cleanPhone,
            status: 'success',
            messageId: res.messageId,
          },
          ...prev,
        ]);
      } catch (err: any) {
        failed++;
        setMassFailedCount(failed);
        setMassLogs((prev) => [
          {
            name: cust.name,
            phone: cleanPhone,
            status: 'failed',
            error: err.message || 'Falha no envio',
          },
          ...prev,
        ]);
      }

      // Real anti-ban delay
      if (i < targetCustomers.length - 1 && isMassActiveRef.current) {
        await new Promise((r) => setTimeout(r, massDelaySeconds * 1000));
      }
    }

    setIsMassSending(false);
    isMassActiveRef.current = false;
  };

  const handleStopMassCharge = () => {
    isMassActiveRef.current = false;
    setIsMassSending(false);
  };

  // Validate Numbers on WhatsApp
  const handleValidateWhatsAppNumbers = async () => {
    const phones = filteredCustomers.map((c) => c.phone).filter(Boolean);
    if (phones.length === 0) return;

    setIsValidatingNumbers(true);
    setValidationResultMsg(null);

    try {
      const res = await checkWhatsAppNumbers(phones);
      if (res.success && res.results) {
        const activeMap = new Map(res.results.map((r) => [r.phone, r.exists]));
        const validCount = res.results.filter((r) => r.exists).length;
        setValidationResultMsg(`Validação concluída: ${validCount} de ${phones.length} números possuem WhatsApp ativo!`);
      }
    } catch (err: any) {
      setValidationResultMsg(`Aviso: ${err.message || 'Erro ao validar números no WhatsApp'}`);
    } finally {
      setIsValidatingNumbers(false);
    }
  };

  // Handle XML / CSV Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    setImportStatusMsg(null);

    const reader = new FileReader();
    const file = files[0];

    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        if (!content) return;

        if (file.name.endsWith('.xml')) {
          const parsed = parseNFeXml(content);
          if (parsed) {
            onUpdateCustomers([parsed, ...customers]);
            setImportStatusMsg(`Arquivo NFe XML importado! Cliente "${parsed.name}" cadastrado com sucesso.`);
          } else {
            setImportStatusMsg('Não foi possível ler o XML da NFe. Verifique a estrutura do arquivo.');
          }
        } else {
          // CSV / TXT
          const parsedList = parseSupermarketCsv(content);
          if (parsedList.length > 0) {
            onUpdateCustomers([...parsedList, ...customers]);
            setImportStatusMsg(`Arquivo importado com sucesso! ${parsedList.length} clientes adicionados à caderneta.`);
          } else {
            setImportStatusMsg('Nenhum dado válido encontrado no arquivo CSV.');
          }
        }
      } catch (err: any) {
        setImportStatusMsg(`Erro ao importar arquivo: ${err.message}`);
      } finally {
        setIsImporting(false);
      }
    };

    reader.readAsText(file);
  };

  // Handle Payment Settlement
  const handleRegisterPayment = (customer: SupermarketCustomer) => {
    setSelectedCustomer(customer);
    setPaymentAmount(customer.totalDebt);
    setPaymentNote('Pagamento via PIX / Dinheiro no Caixa do Supermercado');
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = () => {
    if (!selectedCustomer) return;

    const amount = Number(paymentAmount) || 0;
    const newTotalDebt = Math.max(0, selectedCustomer.totalDebt - amount);
    const newTotalPaid = selectedCustomer.totalPaid + amount;

    const updatedDebts = selectedCustomer.debts.map((d) => {
      if (d.status !== 'paid') {
        return {
          ...d,
          paidAmount: d.amount,
          status: 'paid' as const,
        };
      }
      return d;
    });

    const updatedCustomer: SupermarketCustomer = {
      ...selectedCustomer,
      totalDebt: newTotalDebt,
      totalPaid: newTotalPaid,
      status: newTotalDebt === 0 ? 'up_to_date' : 'pending',
      lastPaymentDate: new Date().toISOString(),
      debts: updatedDebts,
      notes: `${selectedCustomer.notes || ''} [Pagamento R$ ${amount.toFixed(2)} em ${new Date().toLocaleDateString('pt-BR')}]`.trim(),
    };

    const updatedList = customers.map((c) => (c.id === selectedCustomer.id ? updatedCustomer : c));
    onUpdateCustomers(updatedList);
    setSelectedCustomer(updatedCustomer);
    setIsPaymentModalOpen(false);
  };

  // Create Manual Customer
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;

    const newCustomer: SupermarketCustomer = {
      id: `sm-cli-${Date.now()}`,
      customerCode: newCustCode,
      name: newCustName,
      phone: sanitizePhoneNumber(newCustPhone) || newCustPhone,
      cpfCnpj: newCustCpf,
      creditLimit: Number(newCustLimit) || 1000,
      totalDebt: Number(newCustInitialDebt) || 0,
      totalPaid: 0,
      status: Number(newCustInitialDebt) > 0 ? 'overdue' : 'up_to_date',
      source: 'manual',
      createdAt: new Date().toISOString(),
      debts:
        Number(newCustInitialDebt) > 0
          ? [
              {
                id: `cup-${Date.now()}`,
                cupomCode: newCustCupom,
                description: newCustDesc,
                purchaseDate: new Date().toISOString().split('T')[0],
                dueDate: new Date(Date.now() + 3600000 * 24 * 10).toISOString().split('T')[0],
                amount: Number(newCustInitialDebt),
                paidAmount: 0,
                status: 'overdue',
              },
            ]
          : [],
    } as any;

    onUpdateCustomers([newCustomer, ...customers]);
    setIsAddCustomerModalOpen(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustCpf('');
    setNewCustInitialDebt(0);
  };

  // Sync with General Contacts
  const handleSyncToGeneralContacts = () => {
    const newContacts: Contact[] = customers.map((c) => ({
      id: `mkt-ct-${c.id}`,
      name: c.name,
      phone: c.phone,
      group: c.totalDebt > 0 ? 'grp-cobranca' : 'grp-vip',
      status: 'active' as const,
      tags: ['Supermercado', `Cod: ${c.customerCode}`, c.totalDebt > 0 ? 'Fiado Aberto' : 'Em Dia'],
      variables: {
        empresa: erpConfig.erpName || 'Supermercado Central',
        codigo_cliente: c.customerCode,
        valor_devido: c.totalDebt.toFixed(2).replace('.', ','),
        cpf: c.cpfCnpj || '',
        limite: c.creditLimit.toFixed(2).replace('.', ','),
      },
      notes: `Cliente Supermercado: ${c.customerCode}. Saldo Devedor: R$ ${c.totalDebt.toFixed(2)}`,
      createdAt: new Date().toISOString(),
      isRealContact: true,
    }));

    onAddContactsFromMarket(newContacts);
    alert(`Sucesso! ${newContacts.length} clientes do Supermercado sincronizados com sua agenda de contatos.`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-600 via-rose-700 to-black rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/20 rounded-xl">
                <Store className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                Módulo Supermercado & PDV Avançado
              </span>
              <span
                className={`text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                  erpConfig.status === 'connected'
                    ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                    : 'bg-amber-500/30 text-amber-200 border border-amber-400/40'
                }`}
              >
                <Database className="w-3 h-3" />
                {erpConfig.status === 'connected' ? 'ERP Sincronizado' : 'ERP Desconectado'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Gestão Real de Clientes, Débitos & Cupons Fiscais
            </h1>
            <p className="text-sm text-rose-100 max-w-2xl">
              Consulte itens comprados no caixa, saldos devidos, cupons e envie notificações individuais ou em massa pelo WhatsApp com código PIX oficial em 1 clique.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleOpenMassCharge}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-2xl transition-all flex items-center gap-2 shadow-lg"
              title="Disparar cobranças automáticas para todos os clientes com dívida no WhatsApp"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Cobrança em Massa WA</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-2xl transition-all flex items-center gap-2 shadow-sm"
              title="Importe arquivos XML de NFe/NFC-e ou planilhas CSV do caixa do supermercado"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Importar XML / CSV</span>
            </button>

            <button
              onClick={() => setIsErpModalOpen(true)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-2xl transition-all flex items-center gap-2 shadow-sm"
            >
              <Settings className="w-4 h-4" />
              <span>Configurar ERP</span>
            </button>

            <button
              onClick={handleSyncERP}
              disabled={isSyncingErp}
              className="px-4 py-2.5 bg-white text-red-700 hover:bg-rose-50 font-extrabold text-xs rounded-2xl transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingErp ? 'animate-spin' : ''}`} />
              <span>{isSyncingErp ? 'Sincronizando...' : 'Sincronizar ERP'}</span>
            </button>

            <button
              onClick={() => setIsAddCustomerModalOpen(true)}
              className="px-4 py-2.5 bg-black hover:bg-slate-900 text-white font-bold text-xs rounded-2xl transition-all flex items-center gap-2 shadow-lg border border-white/20"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Cliente</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sync Alerts */}
      {syncSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{syncSuccessMsg}</span>
          </div>
          <button onClick={() => setSyncSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {syncErrorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-red-800 text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{syncErrorMsg}</span>
          </div>
          <button onClick={() => setSyncErrorMsg(null)} className="text-red-600 hover:text-red-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {validationResultMsg && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-blue-800 text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>{validationResultMsg}</span>
          </div>
          <button onClick={() => setValidationResultMsg(null)} className="text-blue-600 hover:text-blue-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Clientes Mercado</span>
            <div className="p-2 bg-red-50 rounded-xl">
              <Users className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.totalCustomers}</div>
          <p className="text-[11px] text-slate-500 font-medium">Cadastrados no ERP / Caderneta</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Fiado em Aberto</span>
            <div className="p-2 bg-amber-50 rounded-xl">
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">
            R$ {metrics.totalDebt.toFixed(2).replace('.', ',')}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Valor total a receber do supermercado</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Débitos Vencidos</span>
            <div className="p-2 bg-red-50 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-600">
            R$ {metrics.overdueDebt.toFixed(2).replace('.', ',')}
          </div>
          <p className="text-[11px] text-red-600 font-bold">{metrics.overdueCount} clientes em atraso</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clientes em Dia</span>
            <div className="p-2 bg-emerald-50 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{metrics.upToDateCount}</div>
          <p className="text-[11px] text-slate-500 font-medium">Sem pendências financeiras</p>
        </div>
      </div>

      {/* Action Toolbar & Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por Nome, Código (CLI-01), Cupom, CPF ou Telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white transition-all"
            />
          </div>

          {/* Filter Badges & Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({customers.length})
            </button>

            <button
              onClick={() => setStatusFilter('overdue')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'overdue'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Vencidos ({metrics.overdueCount})
            </button>

            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              A Vencer
            </button>

            <button
              onClick={() => setStatusFilter('up_to_date')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'up_to_date'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Em Dia ({metrics.upToDateCount})
            </button>

            <button
              onClick={handleValidateWhatsAppNumbers}
              disabled={isValidatingNumbers || session.status !== 'connected'}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
              title="Valida em tempo real quais números possuem conta ativa no WhatsApp"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${isValidatingNumbers ? 'animate-spin' : ''}`} />
              <span>{isValidatingNumbers ? 'Validando...' : 'Verificar Números WA'}</span>
            </button>

            <button
              onClick={handleSyncToGeneralContacts}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ml-auto"
              title="Copia os clientes do mercado para a lista de Contatos para disparos em massa"
            >
              <Users className="w-3.5 h-3.5 text-red-600" />
              <span>Exportar p/ Contatos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Customers & Debts Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-red-600" />
              Lista de Clientes & Caderneta do Supermercado
            </h2>
            <p className="text-xs text-slate-500">
              Exibindo {filteredCustomers.length} de {customers.length} clientes encontrados
            </p>
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Nenhum cliente do supermercado encontrado</h3>
            <p className="text-xs text-slate-400">
              Tente mudar o filtro de busca, importe um arquivo XML/CSV ou clique em &quot;Sincronizar ERP&quot;.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Código / Cliente</th>
                  <th className="py-3.5 px-4">Telefone / WhatsApp</th>
                  <th className="py-3.5 px-4">CPF / Cadastro</th>
                  <th className="py-3.5 px-4">Saldo Devedor (R$)</th>
                  <th className="py-3.5 px-4">Cupons & Compras</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((cust) => {
                  const hasDebts = cust.totalDebt > 0;
                  const isOverdue = cust.status === 'overdue' && hasDebts;

                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-slate-50/80 transition-all group cursor-pointer"
                      onClick={() => setSelectedCustomer(cust)}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                            {cust.customerCode}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 block text-xs group-hover:text-red-600 transition-colors">
                              {cust.name}
                            </span>
                            {cust.address && (
                              <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                                {cust.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{formatPhoneDisplay(cust.phone)}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-slate-600">
                        <span className="font-mono">{cust.cpfCnpj || 'Não informado'}</span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span
                            className={`font-black text-sm block ${
                              hasDebts ? 'text-red-600 font-mono' : 'text-emerald-600 font-mono'
                            }`}
                          >
                            R$ {cust.totalDebt.toFixed(2).replace('.', ',')}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Limite: R$ {cust.creditLimit.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-800 text-[11px] block">
                            {cust.debts.length} {cust.debts.length === 1 ? 'Cupom' : 'Cupons'}
                          </span>
                          {cust.debts.length > 0 && (
                            <span className="text-[10px] font-mono text-slate-500 block truncate max-w-[180px]">
                              {cust.debts.map((d) => d.cupomCode).join(', ')}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isOverdue
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : hasDebts
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isOverdue ? (
                            <>
                              <AlertTriangle className="w-3 h-3 text-red-600" /> Vencido
                            </>
                          ) : hasDebts ? (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" /> A Vencer
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Quitado
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {hasDebts && (
                            <button
                              onClick={() => handleOpenChargeModal(cust)}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                              title="Enviar lembrete amigável com Chave PIX pelo WhatsApp"
                            >
                              <Send className="w-3 h-3" />
                              <span>Cobrar WA</span>
                            </button>
                          )}

                          {hasDebts && (
                            <button
                              onClick={() => handleRegisterPayment(cust)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                              title="Dar baixa no valor pago pelo cliente"
                            >
                              <Check className="w-3 h-3" />
                              <span>Baixa</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedCustomer(cust)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
                            title="Ver detalhes de todas as compras e cupons"
                          >
                            <Receipt className="w-4 h-4 text-slate-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-black text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-white/20 px-2 py-0.5 rounded font-bold">
                      {selectedCustomer.customerCode}
                    </span>
                    <h2 className="text-base font-black">{selectedCustomer.name}</h2>
                  </div>
                  <p className="text-xs text-rose-100">
                    Telefone: {formatPhoneDisplay(selectedCustomer.phone)} · CPF: {selectedCustomer.cpfCnpj || 'N/A'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-2 hover:bg-white/20 text-white rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Overview Card */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-4">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Saldo Devedor Atual</span>
                <span className="text-lg font-black text-red-600 block mt-0.5">
                  R$ {selectedCustomer.totalDebt.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Limite de Crédito</span>
                <span className="text-lg font-black text-slate-900 block mt-0.5">
                  R$ {selectedCustomer.creditLimit.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Já Pago</span>
                <span className="text-lg font-black text-emerald-600 block mt-0.5">
                  R$ {selectedCustomer.totalPaid.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Itemized Receipts & Purchases List */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-red-600" />
                  Cupons Fiscais & Itens Comprados no Supermercado
                </h3>
                <span className="text-xs font-bold text-slate-500">{selectedCustomer.debts.length} Compras</span>
              </div>

              {selectedCustomer.debts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-medium">
                  Nenhum cupom em aberto no momento.
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedCustomer.debts.map((debt) => (
                    <div
                      key={debt.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-slate-900 bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200">
                            {debt.cupomCode}
                          </span>
                          <span className="text-xs font-bold text-slate-800">{debt.description}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-red-600 block">
                            R$ {debt.amount.toFixed(2).replace('.', ',')}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Vencimento: {debt.dueDate}
                          </span>
                        </div>
                      </div>

                      {/* Products detailed breakdown */}
                      {debt.productsList && debt.productsList.length > 0 && (
                        <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Itens Registrados no Caixa:
                          </span>
                          <div className="space-y-1">
                            {debt.productsList.map((prod, pIdx) => (
                              <div
                                key={pIdx}
                                className="flex items-center justify-between text-[11px] text-slate-700 border-b border-slate-100/80 pb-1"
                              >
                                <span className="font-medium">
                                  {prod.qty}x {prod.name} ({prod.code})
                                </span>
                                <span className="font-mono font-bold">
                                  R$ {prod.total.toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {selectedCustomer.notes || 'Sem observações'}
              </span>

              <div className="flex items-center gap-2">
                {selectedCustomer.totalDebt > 0 && (
                  <button
                    onClick={() => {
                      handleOpenChargeModal(selectedCustomer);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Cobrar no WhatsApp</span>
                  </button>
                )}

                {selectedCustomer.totalDebt > 0 && (
                  <button
                    onClick={() => {
                      handleRegisterPayment(selectedCustomer);
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Dar Baixa / Receber</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Direct Debt Notice Modal with BR Code PIX */}
      {isChargeModalOpen && chargeTargetCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-xl flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-black">Notificação de Débito no WhatsApp</h2>
                  <p className="text-xs text-emerald-100">
                    Destinatário: {chargeTargetCustomer.name} ({formatPhoneDisplay(chargeTargetCustomer.phone)})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsChargeModalOpen(false)}
                className="p-1.5 hover:bg-white/20 text-white rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Mensagem que será enviada no WhatsApp:</label>
                  <span className="text-[10px] text-slate-400 font-mono">Disparo Real Conectado</span>
                </div>
                <textarea
                  rows={8}
                  value={chargeCustomMessage}
                  onChange={(e) => setChargeCustomMessage(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all resize-none leading-relaxed"
                />
              </div>

              {/* PIX Quick Payload Card */}
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs text-emerald-900">
                  <span className="font-bold flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-700" />
                    Chave PIX & Código Copia e Cola Oficial
                  </span>
                  <button
                    onClick={() => {
                      const payload = generatePixCopyPaste({
                        pixKey: erpConfig.pixKey || 'supermercadocentral@pix.com.br',
                        merchantName: erpConfig.pixName || 'SUPERMERCADO',
                        amount: chargeTargetCustomer.totalDebt,
                        txId: chargeTargetCustomer.customerCode.replace(/[^a-zA-Z0-9]/g, ''),
                      });
                      navigator.clipboard.writeText(payload);
                      setPixCopyNotice(true);
                      setTimeout(() => setPixCopyNotice(false), 3000);
                    }}
                    className="text-[10px] font-bold px-2 py-1 bg-emerald-200 hover:bg-emerald-300 text-emerald-900 rounded-lg flex items-center gap-1 transition-all"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{pixCopyNotice ? 'Copiado!' : 'Copiar PIX'}</span>
                  </button>
                </div>
                <div className="text-[11px] font-mono text-emerald-800 break-all bg-white/70 p-2 rounded-xl border border-emerald-200">
                  Chave: {erpConfig.pixKey || 'supermercadocentral@pix.com.br'} • Beneficiário: {erpConfig.pixName || 'Supermercado Central'}
                </div>
              </div>

              {chargeResult && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs font-bold ${
                    chargeResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {chargeResult.success ? (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Mensagem entregue com sucesso no WhatsApp!
                      </span>
                      {chargeResult.messageId && (
                        <span className="font-mono text-[10px]">ID: {chargeResult.messageId}</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      {chargeResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setIsChargeModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Fechar
              </button>

              <button
                onClick={handleSendChargeMessage}
                disabled={isSendingCharge || !chargeCustomMessage.trim()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingCharge ? 'Disparando no WhatsApp...' : 'Enviar Agora no WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mass WhatsApp Debt Broadcast Modal */}
      {isMassChargeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-700 to-black text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-black">Disparador de Cobrança em Massa do Mercado</h2>
                  <p className="text-xs text-emerald-100">
                    Notifique todos os devedores no WhatsApp com código PIX automático e proteção anti-bloqueio
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (isMassSending) handleStopMassCharge();
                  setIsMassChargeModalOpen(false);
                }}
                className="p-2 hover:bg-white/20 text-white rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Target Selection Stats */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-500 block">Inadimplentes Selecionados:</span>
                  <span className="text-xl font-black text-slate-900">
                    {massSelectedCustomerIds.length} Clientes
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="space-y-0.5">
                    <label className="text-[11px] font-bold text-slate-600 block">Delay entre Envios (segundos):</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={massDelaySeconds}
                      onChange={(e) => setMassDelaySeconds(parseInt(e.target.value) || 4)}
                      className="w-24 p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Message Template */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Modelo de Mensagem de Cobrança:</label>
                <textarea
                  rows={6}
                  value={massChargeMessageTemplate}
                  onChange={(e) => setMassChargeMessageTemplate(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono leading-relaxed"
                />
                <p className="text-[10px] text-slate-400">
                  Variáveis automáticas: <span className="font-bold">{'{nome}'}</span>, <span className="font-bold">{'{saldo_devedor}'}</span>, <span className="font-bold">{'{codigo_cliente}'}</span>, <span className="font-bold">{'{chave_pix}'}</span>, <span className="font-bold">{'{pix_copia_cola}'}</span>.
                </p>
              </div>

              {/* Live Dispatch Progress */}
              {isMassSending && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span>Disparando mensagens no WhatsApp ({massCurrentIndex + 1} de {massSelectedCustomerIds.length})...</span>
                    <span>{Math.round(((massCurrentIndex + 1) / massSelectedCustomerIds.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-emerald-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${((massCurrentIndex + 1) / massSelectedCustomerIds.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Logs */}
              {massLogs.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Histórico de Entregas ao Vivo:</span>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                    {massLogs.map((lg, lIdx) => (
                      <div key={lIdx} className="flex items-center justify-between">
                        <span className="font-medium text-slate-800">
                          {lg.name} ({formatPhoneDisplay(lg.phone)})
                        </span>
                        <span
                          className={`font-bold text-[11px] ${
                            lg.status === 'success' ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {lg.status === 'success' ? '✓ Enviado' : `✕ ${lg.error}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-500 font-bold">
                Enviados: <span className="text-emerald-600">{massSentCount}</span> • Falhas: <span className="text-red-600">{massFailedCount}</span>
              </div>

              <div className="flex items-center gap-2">
                {isMassSending ? (
                  <button
                    onClick={handleStopMassCharge}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl transition-all"
                  >
                    Pausar Disparos
                  </button>
                ) : (
                  <button
                    onClick={handleStartMassCharge}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-2 shadow-md"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Iniciar Cobrança em Massa</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* XML / CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-xl flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-black text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UploadCloud className="w-5 h-5 text-white" />
                <h2 className="text-base font-black">Importar Arquivos do Supermercado (XML / CSV)</h2>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-white hover:bg-white/20 p-1.5 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Selecione os arquivos fiscais gerados pelo PDV do mercado (Notas Fiscais NFe/NFC-e em XML ou relatórios de clientes em CSV/Excel):
              </p>

              <div className="border-2 border-dashed border-slate-300 hover:border-red-500 rounded-3xl p-8 text-center transition-all bg-slate-50 hover:bg-red-50/20 cursor-pointer relative">
                <input
                  type="file"
                  accept=".xml,.csv,.txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="space-y-2">
                  <FileCode className="w-10 h-10 text-red-600 mx-auto" />
                  <div className="text-xs font-bold text-slate-800">
                    Clique aqui ou arraste seus arquivos XML ou CSV
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Suporte nativo a NFe Mod 55, NFC-e Mod 65, SysPDV, VR Software, Bluesoft e planilhas de caderneta.
                  </p>
                </div>
              </div>

              {importStatusMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{importStatusMsg}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Settlement Modal */}
      {isPaymentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Check className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-black">Dar Baixa no Pagamento</h2>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs text-slate-500 font-medium">Cliente:</span>
                <span className="text-sm font-bold text-slate-900 block">{selectedCustomer.name}</span>
                <span className="text-xs font-mono text-red-600 block mt-0.5">
                  Saldo Devedor Atual: R$ {selectedCustomer.totalDebt.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Valor Recebido (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Observação do Pagamento:</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Ex: Recebido via PIX / Dinheiro no Caixa 02"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPayment}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md"
              >
                Confirmar Quitação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ERP Connection Setup Modal */}
      {isErpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-6 py-4 bg-gradient-to-r from-red-600 via-rose-700 to-black text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-black">Conexão Real com ERP / PDV do Supermercado</h2>
                  <p className="text-xs text-rose-100">
                    Sincronize automaticamente os débitos, clientes e cupons da caderneta
                  </p>
                </div>
              </div>
              <button onClick={() => setIsErpModalOpen(false)} className="text-white hover:bg-white/20 p-1.5 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Sistema / Fabricante do ERP:</label>
                  <select
                    value={tempErpConfig.systemType}
                    onChange={(e: any) =>
                      setTempErpConfig({ ...tempErpConfig, systemType: e.target.value })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  >
                    <option value="generic_rest">API REST Customizada (JSON)</option>
                    <option value="syspdv">SysPDV (Casa Magalhães)</option>
                    <option value="vr_software">VR Software Supermercados</option>
                    <option value="bluesoft">Bluesoft ERP Varejo</option>
                    <option value="totvs">Totvs Supermercados</option>
                    <option value="hiper">Hiper Sistema PDV</option>
                    <option value="linx">Linx Supermercados</option>
                    <option value="sg_sistemas">SG Sistemas</option>
                    <option value="gdoor">GDoor Varejo</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Nome da Loja / Mercado:</label>
                  <input
                    type="text"
                    value={tempErpConfig.erpName}
                    onChange={(e) =>
                      setTempErpConfig({ ...tempErpConfig, erpName: e.target.value })
                    }
                    placeholder="Ex: Supermercado Central Loja 01"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  URL da API / Servidor do Supermercado (Endpoint de Clientes & Débitos):
                </label>
                <input
                  type="text"
                  value={tempErpConfig.apiUrl}
                  onChange={(e) =>
                    setTempErpConfig({ ...tempErpConfig, apiUrl: e.target.value })
                  }
                  placeholder="http://localhost:3000/api/supermarket/mock-erp-feed ou https://erp.mercado.com.br/api/debitos"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
                <p className="text-[11px] text-slate-400">
                  O endpoint padrão de testes ao vivo local é: <span className="font-mono text-red-600">http://localhost:3000/api/supermarket/mock-erp-feed</span>
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Token de Acesso / API Key:</label>
                  <input
                    type="password"
                    value={tempErpConfig.apiKey}
                    onChange={(e) =>
                      setTempErpConfig({ ...tempErpConfig, apiKey: e.target.value })
                    }
                    placeholder="Bearer Token ou Chave Secreta"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Código da Loja / Filial:</label>
                  <input
                    type="text"
                    value={tempErpConfig.storeCode || ''}
                    onChange={(e) =>
                      setTempErpConfig({ ...tempErpConfig, storeCode: e.target.value })
                    }
                    placeholder="Ex: LOJA-01"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Chave PIX do Supermercado:</label>
                  <input
                    type="text"
                    value={tempErpConfig.pixKey}
                    onChange={(e) =>
                      setTempErpConfig({ ...tempErpConfig, pixKey: e.target.value })
                    }
                    placeholder="CNPJ, E-mail ou Celular PIX"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Nome do Beneficiário PIX:</label>
                  <input
                    type="text"
                    value={tempErpConfig.pixName}
                    onChange={(e) =>
                      setTempErpConfig({ ...tempErpConfig, pixName: e.target.value })
                    }
                    placeholder="Nome da Razão Social"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setIsErpModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncERP}
                  disabled={isSyncingErp}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingErp ? 'animate-spin' : ''}`} />
                  <span>{isSyncingErp ? 'Testando Conexão...' : 'Salvar & Sincronizar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Manual Customer Modal */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-xl flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-black text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Plus className="w-5 h-5 text-white" />
                <h2 className="text-base font-black">Cadastrar Novo Cliente / Caderneta</h2>
              </div>
              <button onClick={() => setIsAddCustomerModalOpen(false)} className="text-white hover:bg-white/20 p-1.5 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Código do Cliente:</label>
                  <input
                    type="text"
                    value={newCustCode}
                    onChange={(e) => setNewCustCode(e.target.value)}
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Nome Completo:</label>
                  <input
                    type="text"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    required
                    placeholder="Ex: Carlos Eduardo Silva"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">WhatsApp / Celular:</label>
                  <input
                    type="text"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    required
                    placeholder="55 11 98765-4321"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">CPF / CNPJ:</label>
                  <input
                    type="text"
                    value={newCustCpf}
                    onChange={(e) => setNewCustCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Limite de Crédito (R$):</label>
                  <input
                    type="number"
                    value={newCustLimit}
                    onChange={(e) => setNewCustLimit(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Débito Inicial / Saldo (R$):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newCustInitialDebt}
                    onChange={(e) => setNewCustInitialDebt(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-red-600"
                  />
                </div>
              </div>

              {newCustInitialDebt > 0 && (
                <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-2xl space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Código do Cupom / Nota Fiscal:</label>
                    <input
                      type="text"
                      value={newCustCupom}
                      onChange={(e) => setNewCustCupom(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Descrição dos Itens Comprados:</label>
                    <input
                      type="text"
                      value={newCustDesc}
                      onChange={(e) => setNewCustDesc(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
