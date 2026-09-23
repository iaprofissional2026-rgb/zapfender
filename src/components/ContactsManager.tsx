import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  UploadCloud, 
  Download, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  FolderPlus, 
  Tag, 
  CheckSquare, 
  Square, 
  FileSpreadsheet, 
  PhoneCall, 
  Sparkles, 
  ExternalLink, 
  Plus, 
  Send, 
  Image as ImageIcon, 
  Mic, 
  FileText, 
  Paperclip, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Sliders, 
  Check, 
  Eye, 
  X, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  File,
  FileCode,
  Music,
  FolderKanban,
  Zap,
  Smartphone,
  RefreshCw,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Building
} from 'lucide-react';
import { Contact, ContactGroup, MessageTemplate, Campaign, WhatsAppSession } from '../types';
import { formatPhoneDisplay, sanitizePhoneNumber, renderPersonalizedMessage, buildWhatsAppWebUrl } from '../utils/messageFormatter';
import { AICopywriterModal } from './AICopywriterModal';
import { fetchRealWhatsAppData, checkWhatsAppNumbers } from '../services/whatsappApi';

interface ContactsManagerProps {
  contacts: Contact[];
  groups: ContactGroup[];
  templates: MessageTemplate[];
  session: WhatsAppSession;
  onUpdateContacts: (contacts: Contact[]) => void;
  onUpdateGroups: (groups: ContactGroup[]) => void;
  onStartCampaign: (campaign: Campaign) => void;
  onOpenConnectModal: () => void;
}

export const ContactsManager: React.FC<ContactsManagerProps> = ({
  contacts,
  groups,
  templates,
  session,
  onUpdateContacts,
  onUpdateGroups,
  onStartCampaign,
  onOpenConnectModal,
}) => {
  // Navigation & Filtering
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  
  // Real Sync State
  const [isSyncingRealData, setIsSyncingRealData] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [isValidatingNumbers, setIsValidatingNumbers] = useState<boolean>(false);
  const [validatedActiveMap, setValidatedActiveMap] = useState<Record<string, boolean>>({});

  const handleValidateAllNumbers = async () => {
    if (session.status !== 'connected') {
      onOpenConnectModal();
      return;
    }
    const phones = contacts.map((c) => c.phone).filter(Boolean);
    if (phones.length === 0) return;

    setIsValidatingNumbers(true);
    setSyncStatusMsg('Consultando servidores do WhatsApp para verificar quais números estão ativos...');

    try {
      const res = await checkWhatsAppNumbers(phones);
      if (res.success && res.results) {
        const map: Record<string, boolean> = {};
        res.results.forEach((r) => {
          map[r.phone] = r.exists;
        });
        setValidatedActiveMap((prev) => ({ ...prev, ...map }));
        const activeCount = res.results.filter((r) => r.exists).length;
        setSyncStatusMsg(`✅ Verificação concluída! ${activeCount} de ${phones.length} números foram confirmados como contas ativas no WhatsApp.`);
      }
    } catch (err: any) {
      setSyncStatusMsg(`Aviso: ${err.message || 'Falha ao validar números no WhatsApp'}`);
    } finally {
      setIsValidatingNumbers(false);
    }
  };

  // Quick Add Mode Toggle: Single Contact vs Batch Paste
  const [addMode, setAddMode] = useState<'single' | 'batch'>('single');

  // Direct Inline Contact Form State
  const [directName, setDirectName] = useState<string>('');
  const [directPhone, setDirectPhone] = useState<string>('');
  const [directGroup, setDirectGroup] = useState<string>(groups[0]?.id || 'grp-vip');
  const [directCompany, setDirectCompany] = useState<string>('');
  const [directSuccessMsg, setDirectSuccessMsg] = useState<string | null>(null);

  // Direct Batch Paste Form State
  const [batchText, setBatchText] = useState<string>('');
  const [batchTargetGroup, setBatchTargetGroup] = useState<string>(groups[0]?.id || 'grp-vip');
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);

  // Group Form State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState<boolean>(false);
  const [groupName, setGroupName] = useState<string>('');
  const [groupColor, setGroupColor] = useState<string>('#dc2626');
  const [groupDesc, setGroupDesc] = useState<string>('');

  // AI Modal
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);

  // -------------------------------------------------------------
  // PROGRAMADOR / DISPATCHER STATE (Texto, Imagem, Áudio, Arquivo)
  // -------------------------------------------------------------
  const [campaignName, setCampaignName] = useState<string>(
    `Disparo_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}_${new Date().getHours()}h`
  );
  const [activeMediaTab, setActiveMediaTab] = useState<'text' | 'image' | 'audio' | 'document'>('text');
  const [messageText, setMessageText] = useState<string>(
    `{Olá|Oi} {nome}, {saudacao_tempo}!\n\nPassando com novidades especiais da {empresa}.\n\n👉 Responda *QUERO* para receber a oferta em primeira mão!`
  );

  // Media Attachment State
  const [attachedImage, setAttachedImage] = useState<{ url: string; name: string } | null>(null);
  const [attachedAudio, setAttachedAudio] = useState<{ url: string; name: string; duration: string } | null>(null);
  const [attachedDocument, setAttachedDocument] = useState<{ url: string; name: string; size: string } | null>(null);
  const [isVoiceSimulated, setIsVoiceSimulated] = useState<boolean>(false);

  // Timing & Anti-Ban State
  const [sendImmediately, setSendImmediately] = useState<boolean>(true);
  const [scheduledDate, setScheduledDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState<string>('09:00');
  const [minDelay, setMinDelay] = useState<number>(6);
  const [maxDelay, setMaxDelay] = useState<number>(15);
  const [pauseEvery, setPauseEvery] = useState<number>(20);
  const [pauseDuration, setPauseDuration] = useState<number>(120);

  // Direct Inline Add Contact Submission
  const handleAddDirectContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directName.trim() || !directPhone.trim()) {
      alert('Por favor, informe o Nome e o WhatsApp com DDD.');
      return;
    }

    const cleanPhone = sanitizePhoneNumber(directPhone);
    if (cleanPhone.length < 8) {
      alert('Número de WhatsApp inválido. Digite DDD + Número.');
      return;
    }

    // Check if phone already exists
    const exists = contacts.some(c => sanitizePhoneNumber(c.phone) === cleanPhone);
    if (exists) {
      alert('Aviso: Já existe um contato cadastrado com este número.');
    }

    const newContact: Contact = {
      id: `c-${Date.now()}`,
      name: directName.trim(),
      phone: cleanPhone,
      group: directGroup,
      status: 'active',
      tags: ['Manual', 'Novo'],
      variables: {
        nome: directName.trim(),
        empresa: directCompany.trim() || 'Empresa',
      },
      createdAt: new Date().toISOString(),
    };

    onUpdateContacts([newContact, ...contacts]);
    setSelectedIds(prev => [newContact.id, ...prev]);

    setDirectSuccessMsg(`✅ Contato "${directName.trim()}" adicionado e selecionado com sucesso!`);
    setDirectName('');
    setDirectPhone('');
    setDirectCompany('');
    setTimeout(() => setDirectSuccessMsg(null), 4000);
  };

  // Direct Batch Paste Import Handler
  const handleBatchImport = () => {
    if (!batchText.trim()) {
      alert('Cole ou digite a lista de números/nomes.');
      return;
    }

    const lines = batchText.split('\n');
    const newContactsList: Contact[] = [];
    let count = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Match comma, semicolon, tab or dash separated: "Nome, 11999998888, Empresa" or "11999998888"
      const parts = trimmed.split(/[,;\t\-]+/).map(p => p.trim());
      let name = '';
      let phone = '';
      let company = '';

      if (parts.length === 1) {
        phone = parts[0];
        name = `Contato ${sanitizePhoneNumber(phone).slice(-4)}`;
      } else if (parts.length >= 2) {
        // Check which part is the phone
        const p0Digits = parts[0].replace(/\D/g, '');
        const p1Digits = parts[1].replace(/\D/g, '');

        if (p0Digits.length >= 8 && p1Digits.length < 8) {
          phone = parts[0];
          name = parts[1];
          company = parts[2] || 'Empresa';
        } else {
          name = parts[0];
          phone = parts[1];
          company = parts[2] || 'Empresa';
        }
      }

      const cleanP = sanitizePhoneNumber(phone);
      if (cleanP.length >= 8) {
        newContactsList.push({
          id: `batch-${Date.now()}-${count}`,
          name: name || `Contato +${cleanP}`,
          phone: cleanP,
          group: batchTargetGroup,
          status: 'active',
          tags: ['Importado em Massa'],
          variables: {
            nome: name || `+${cleanP}`,
            empresa: company || 'Empresa',
          },
          createdAt: new Date().toISOString(),
        });
        count++;
      }
    }

    if (newContactsList.length === 0) {
      alert('Nenhum número válido foi identificado no texto colado.');
      return;
    }

    // Merge without duplicates
    const existingClean = new Set(contacts.map(c => sanitizePhoneNumber(c.phone)));
    const uniqueToAdd = newContactsList.filter(c => !existingClean.has(sanitizePhoneNumber(c.phone)));

    onUpdateContacts([...uniqueToAdd, ...contacts]);
    setSelectedIds(prev => [...uniqueToAdd.map(c => c.id), ...prev]);
    setBatchFeedback(`✅ ${uniqueToAdd.length} novos contatos importados e selecionados!`);
    setBatchText('');
    setTimeout(() => setBatchFeedback(null), 5000);
  };

  // Real WhatsApp Data Sync Function
  const handleSyncRealWhatsAppData = async () => {
    if (session.status !== 'connected') {
      onOpenConnectModal();
      return;
    }

    setIsSyncingRealData(true);
    setSyncStatusMsg('Sincronizando grupos e contatos do WhatsApp conectado...');

    try {
      const realData = await fetchRealWhatsAppData();

      if (realData.success) {
        // Merge real groups with existing groups
        const existingGroupIds = new Set(groups.map(g => g.id));
        const newGroupsList = [...groups];

        for (const rg of realData.groups) {
          if (!existingGroupIds.has(rg.id)) {
            newGroupsList.push({
              id: rg.id,
              name: rg.name,
              color: rg.color,
              description: rg.description || `${rg.participantsCount} membros do WhatsApp`,
              createdAt: new Date().toISOString(),
              isRealWhatsAppGroup: true,
              participantsCount: rg.participantsCount,
            });
            existingGroupIds.add(rg.id);
          }
        }
        onUpdateGroups(newGroupsList);

        // Merge real contacts with existing contacts by phone
        const existingPhones = new Set(contacts.map(c => sanitizePhoneNumber(c.phone)));
        const mergedContacts = [...contacts];
        let addedCount = 0;

        for (const rc of realData.contacts) {
          const cleanP = sanitizePhoneNumber(rc.phone);
          if (!existingPhones.has(cleanP)) {
            mergedContacts.push({
              id: rc.id,
              name: rc.name,
              phone: rc.phone,
              group: rc.group,
              status: 'active',
              tags: rc.tags,
              variables: rc.variables,
              createdAt: rc.createdAt,
            });
            existingPhones.add(cleanP);
            addedCount++;
          }
        }
        onUpdateContacts(mergedContacts);

        setSyncStatusMsg(`✅ Sucesso! ${realData.totalGroups} Grupos e ${addedCount || realData.totalContacts} Contatos sincronizados em tempo real!`);
        setTimeout(() => setSyncStatusMsg(null), 5000);
      }
    } catch (err: any) {
      console.error('Error syncing real WhatsApp data:', err);
      setSyncStatusMsg(`❌ ${err?.message || 'Falha ao sincronizar. Verifique a conexão com o WhatsApp.'}`);
      setTimeout(() => setSyncStatusMsg(null), 6000);
    } finally {
      setIsSyncingRealData(false);
    }
  };

  // Auto-sync real WhatsApp data when session is connected
  useEffect(() => {
    if (session.status === 'connected') {
      fetchRealWhatsAppData()
        .then((realData) => {
          if (realData.success && realData.groups.length > 0) {
            const existingGroupIds = new Set(groups.map(g => g.id));
            const newGroupsList = [...groups];
            for (const rg of realData.groups) {
              if (!existingGroupIds.has(rg.id)) {
                newGroupsList.push({
                  id: rg.id,
                  name: rg.name,
                  color: rg.color,
                  description: rg.description || `${rg.participantsCount} membros do WhatsApp`,
                  createdAt: new Date().toISOString(),
                  isRealWhatsAppGroup: true,
                  participantsCount: rg.participantsCount,
                });
                existingGroupIds.add(rg.id);
              }
            }
            onUpdateGroups(newGroupsList);

            const existingPhones = new Set(contacts.map(c => sanitizePhoneNumber(c.phone)));
            const mergedContacts = [...contacts];
            for (const rc of realData.contacts) {
              const cleanP = sanitizePhoneNumber(rc.phone);
              if (!existingPhones.has(cleanP)) {
                mergedContacts.push({
                  id: rc.id,
                  name: rc.name,
                  phone: rc.phone,
                  group: rc.group,
                  status: 'active',
                  tags: rc.tags,
                  variables: rc.variables,
                  createdAt: rc.createdAt,
                });
                existingPhones.add(cleanP);
              }
            }
            onUpdateContacts(mergedContacts);
          }
        })
        .catch(() => {});
    }
  }, [session.status]);

  // Filtered contacts calculation (lightweight & memoized)
  const filteredContacts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return contacts.filter((c) => {
      const matchesSearch =
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.phone.includes(term) ||
        (c.variables?.empresa && c.variables.empresa.toLowerCase().includes(term));
      const matchesGroup = selectedGroupId === 'all' || c.group === selectedGroupId;
      return matchesSearch && matchesGroup;
    });
  }, [contacts, searchTerm, selectedGroupId]);

  // Pagination for smooth non-blocking rendering ("sem travar")
  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / pageSize));
  const paginatedContacts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredContacts.slice(start, start + pageSize);
  }, [filteredContacts, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedGroupId]);

  const selectedContacts = useMemo(() => {
    return contacts.filter(c => selectedIds.includes(c.id));
  }, [contacts, selectedIds]);

  // Quick Select Helpers
  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredContacts.map(c => c.id);
    const newSelected = Array.from(new Set([...selectedIds, ...allFilteredIds]));
    setSelectedIds(newSelected);
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleToggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (file.type.startsWith('image/')) {
        setAttachedImage({ url: result, name: file.name });
        setActiveMediaTab('image');
      } else if (file.type.startsWith('audio/')) {
        setAttachedAudio({ url: result, name: file.name, duration: '0:30' });
        setActiveMediaTab('audio');
      } else {
        const sizeKb = Math.round(file.size / 1024);
        setAttachedDocument({ url: result, name: file.name, size: `${sizeKb} KB` });
        setActiveMediaTab('document');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleInsertTag = (tag: string) => {
    setMessageText(prev => prev + ` {${tag}}`);
  };

  const handleCreateAndStartCampaign = () => {
    if (session.status !== 'connected') {
      onOpenConnectModal();
      return;
    }

    if (selectedContacts.length === 0) {
      alert('Selecione pelo menos 1 contato para disparar ou agendar.');
      return;
    }

    if (!messageText.trim() && !attachedImage && !attachedAudio && !attachedDocument) {
      alert('Insira o texto da mensagem ou anexe uma mídia para o envio.');
      return;
    }

    let mediaType: 'none' | 'image' | 'audio' | 'document' = 'none';
    let mediaUrl: string | undefined = undefined;
    let mediaName: string | undefined = undefined;

    if (activeMediaTab === 'image' && attachedImage) {
      mediaType = 'image';
      mediaUrl = attachedImage.url;
      mediaName = attachedImage.name;
    } else if (activeMediaTab === 'audio' && attachedAudio) {
      mediaType = 'audio';
      mediaUrl = attachedAudio.url;
      mediaName = attachedAudio.name;
    } else if (activeMediaTab === 'document' && attachedDocument) {
      mediaType = 'document';
      mediaUrl = attachedDocument.url;
      mediaName = attachedDocument.name;
    }

    const newCampaign: Campaign = {
      id: `camp-${Date.now()}`,
      name: campaignName.trim() || `Envio ${selectedContacts.length} Contatos`,
      messageContent: messageText,
      targetType: 'contacts',
      targetGroupIds: selectedGroupId !== 'all' ? [selectedGroupId] : [],
      targetContactIds: selectedContacts.map(c => c.id),
      mediaType,
      mediaUrl,
      mediaName,
      isVoiceSimulated: isVoiceSimulated || activeMediaTab === 'audio',
      sendImmediately,
      scheduledDate: sendImmediately ? undefined : scheduledDate,
      scheduledTime: sendImmediately ? undefined : scheduledTime,
      minDelaySeconds: Number(minDelay),
      maxDelaySeconds: Number(maxDelay),
      pauseEveryCount: Number(pauseEvery),
      pauseDurationSeconds: Number(pauseDuration),
      status: sendImmediately ? 'running' : 'scheduled',
      totalCount: selectedContacts.length,
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString(),
      logs: [],
    };

    onStartCampaign(newCampaign);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar with Real Sync & Stats */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <FolderKanban className="w-6 h-6 text-red-600" />
              Central de Contatos, Grupos & Adição Rápida
            </h1>
            <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full font-bold">
              {contacts.length} Contatos • {groups.length} Grupos
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Cadastre novos contatos com nome e número, importe listas, sincronize do WhatsApp e programe envios multimídia.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleValidateAllNumbers}
            disabled={isValidatingNumbers}
            className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            title="Consulta diretamente os servidores da Meta para certificar que os contatos possuem conta de WhatsApp ativa"
          >
            <ShieldCheck className={`w-4 h-4 ${isValidatingNumbers ? 'animate-spin' : ''}`} />
            {isValidatingNumbers ? 'Verificando...' : 'Verificar Números no WhatsApp'}
          </button>

          <button
            onClick={handleSyncRealWhatsAppData}
            disabled={isSyncingRealData}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all shadow-md flex items-center gap-2 ${
              session.status === 'connected'
                ? 'bg-gradient-to-r from-red-600 via-rose-700 to-black text-white hover:from-red-500 hover:to-zinc-900 shadow-red-600/25'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingRealData ? 'animate-spin' : ''}`} />
            {isSyncingRealData ? 'Sincronizando...' : 'Sincronizar do Meu WhatsApp 📲'}
          </button>

          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4 text-red-600" /> Nova Categoria
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatusMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-950 flex items-center justify-between shadow-sm animate-in fade-in">
          <span>{syncStatusMsg}</span>
          <button onClick={() => setSyncStatusMsg(null)} className="text-red-600 hover:text-red-900 font-bold">✕</button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXPLICIT SECTION: ADICIONAR NOME E NÚMERO DE NOVOS CONTATOS (INLINE / PASTE) */}
      {/* ========================================================================= */}
      <div className="bg-white border-2 border-red-500/20 rounded-3xl p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 font-black">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Cadastrar Novo Contato ou Importar Lista para o WhatsApp
              </h2>
              <p className="text-[11px] text-slate-500">
                Insira o nome e número do contato diretamente para envio imediato ou agendamento.
              </p>
            </div>
          </div>

          {/* Toggle Single vs Batch Paste */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setAddMode('single')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                addMode === 'single'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + 1 Contato Direto
            </button>
            <button
              onClick={() => setAddMode('batch')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                addMode === 'batch'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 Colar Lista (Massa)
            </button>
          </div>
        </div>

        {/* Mode 1: Single Contact Direct Form */}
        {addMode === 'single' ? (
          <form onSubmit={handleAddDirectContact} className="space-y-3">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Nome */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Nome do Contato <span className="text-red-600">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={directName}
                  onChange={(e) => setDirectName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Número WhatsApp */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  WhatsApp com DDD <span className="text-red-600">*</span>:
                </label>
                <input
                  type="tel"
                  required
                  value={directPhone}
                  onChange={(e) => setDirectPhone(e.target.value)}
                  placeholder="Ex: 11999998888 ou 5511999998888"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Categoria / Grupo */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Categoria / Grupo:
                </label>
                <select
                  value={directGroup}
                  onChange={(e) => setDirectGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* Empresa / Tag */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Empresa / Observação:
                </label>
                <input
                  type="text"
                  value={directCompany}
                  onChange={(e) => setDirectCompany(e.target.value)}
                  placeholder="Ex: Tech Soluções"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              {directSuccessMsg ? (
                <span className="text-xs font-bold text-emerald-600 animate-in fade-in">
                  {directSuccessMsg}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">
                  O contato salvo será automaticamente adicionado à lista e marcado para disparo.
                </span>
              )}

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-red-600 via-rose-700 to-black hover:from-red-500 hover:to-zinc-900 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-red-600/20 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar Contato
              </button>
            </div>
          </form>
        ) : (
          /* Mode 2: Batch Paste List Form */
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Cole sua lista (1 contato por linha no formato: <code>Nome, Número, Empresa</code> ou apenas o número):
                </label>
                <textarea
                  rows={3}
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  placeholder={`Exemplo:\nCarlos Silva, 11988887777, Tech Soluções\nMariana Souza, 21977776666, Construtora\n5531999991111`}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="w-full sm:w-60 space-y-2">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Salvar no Grupo:
                </label>
                <select
                  value={batchTargetGroup}
                  onChange={(e) => setBatchTargetGroup(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleBatchImport}
                  className="w-full py-2.5 bg-gradient-to-r from-red-600 to-black text-white text-xs font-extrabold rounded-xl shadow-md flex items-center justify-center gap-1.5 hover:from-red-500 hover:to-zinc-900 transition-all"
                >
                  <ClipboardPaste className="w-4 h-4" /> Importar Lista
                </button>
              </div>
            </div>

            {batchFeedback && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
                {batchFeedback}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Group / Category Filter Pills */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-black text-slate-700 flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-red-600" /> Categorias & Grupos do WhatsApp:
          </span>
          <span className="text-slate-400 text-[11px] font-medium">Clique para filtrar ou selecionar contatos</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedGroupId('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              selectedGroupId === 'all'
                ? 'bg-gradient-to-r from-red-600 to-black text-white border-red-600 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Todos os Contatos ({contacts.length})
          </button>

          {groups.map((group) => {
            const count = contacts.filter(c => c.group === group.id).length;
            const isSelected = selectedGroupId === group.id;
            const isRealGroup = group.id.endsWith('@g.us');

            return (
              <button
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${
                  isSelected
                    ? 'bg-red-50 border-red-600 text-red-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: group.color || '#dc2626' }}
                />
                <span>{group.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                  isSelected ? 'bg-red-200 text-red-950' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
                {isRealGroup && (
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-mono">
                    WA Grupo
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Grid: Contacts Selection (Left) vs Media Scheduler (Right) */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Col (5 cols): Contacts List with Search & Bulk Select */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, telefone ou empresa..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600 transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Selection Quick Actions Toolbar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAllFiltered}
                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-[11px] font-bold transition-colors"
                >
                  Selecionar Todos ({filteredContacts.length})
                </button>
                {selectedIds.length > 0 && (
                  <button
                    onClick={handleDeselectAll}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium"
                  >
                    Desmarcar
                  </button>
                )}
              </div>

              <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                {selectedIds.length} selecionados
              </span>
            </div>

            {/* Contact Items List */}
            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-10 text-slate-400 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Nenhum contato encontrado.</p>
                  <p className="text-[11px]">Adicione pelo formulário acima ou clique em "Sincronizar do Meu WhatsApp".</p>
                </div>
              ) : (
                paginatedContacts.map((contact) => {
                  const isSelected = selectedIds.includes(contact.id);
                  const groupObj = groups.find(g => g.id === contact.group);

                  return (
                    <div
                      key={contact.id}
                      onClick={() => handleToggleSelectOne(contact.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                        isSelected
                          ? 'bg-red-50/90 border-red-500 shadow-2xs'
                          : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 accent-red-600 rounded cursor-pointer flex-shrink-0"
                        />
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {contact.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                            <span>{formatPhoneDisplay(contact.phone)}</span>
                            {groupObj && (
                              <span
                                className="text-[9px] px-1.5 py-0.2 rounded font-bold text-white truncate max-w-[90px]"
                                style={{ backgroundColor: groupObj.color || '#dc2626' }}
                              >
                                {groupObj.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {contact.variables?.empresa && (
                          <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                            {contact.variables.empresa}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls ("sem travar") */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span>Página {page} de {totalPages} ({filteredContacts.length} contatos)</span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col (7 cols): Programador de Disparo Multimídia */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Send className="w-5 h-5 text-red-600" />
                  Programador de Disparo Multimídia
                </h2>
                <p className="text-xs text-slate-500">
                  Configure texto, anexe fotos, áudios de voz e arquivos para os {selectedContacts.length} destinatários
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAIModalOpen(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-500 hover:to-red-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Gerar com IA
              </button>
            </div>

            {/* Campaign Name */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">
                Nome do Disparo / Identificação
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600"
                placeholder="Ex: Oferta VIP Grupos WhatsApp"
              />
            </div>

            {/* Media Type Tabs */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Selecione o Formato do Conteúdo:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'text', label: 'Texto / Spintax', icon: FileText },
                  { id: 'image', label: 'Foto / Imagem', icon: ImageIcon },
                  { id: 'audio', label: 'Áudio (Voz PTT)', icon: Mic },
                  { id: 'document', label: 'PDF / Arquivo', icon: Paperclip },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveMediaTab(tab.id as any)}
                      className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                        activeMediaTab === tab.id
                          ? 'bg-gradient-to-r from-red-600 to-black text-white shadow-sm shadow-red-600/20'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px]">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Media File Upload Area */}
            {activeMediaTab === 'image' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Anexo de Imagem / Foto:</span>
                  {attachedImage && (
                    <button onClick={() => setAttachedImage(null)} className="text-xs text-red-600 font-bold underline">
                      Remover Imagem
                    </button>
                  )}
                </div>

                {attachedImage ? (
                  <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                    <img src={attachedImage.url} alt="anexo" className="w-16 h-16 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{attachedImage.name}</div>
                      <div className="text-[10px] text-emerald-600 font-bold">✓ Imagem carregada e pronta para disparo</div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-600 file:text-white hover:file:bg-red-500 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}

            {activeMediaTab === 'audio' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Gravação / Áudio no WhatsApp:</span>
                  {attachedAudio && (
                    <button onClick={() => setAttachedAudio(null)} className="text-xs text-red-600 font-bold underline">
                      Remover Áudio
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">Simular Áudio de Voz Gravado na Hora (PTT)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isVoiceSimulated || activeMediaTab === 'audio'}
                    onChange={(e) => setIsVoiceSimulated(e.target.checked)}
                    className="w-4 h-4 accent-red-600 rounded"
                  />
                </div>

                <div>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-600 file:text-white hover:file:bg-red-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {activeMediaTab === 'document' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Documento / PDF / Arquivo:</span>
                  {attachedDocument && (
                    <button onClick={() => setAttachedDocument(null)} className="text-xs text-red-600 font-bold underline">
                      Remover Arquivo
                    </button>
                  )}
                </div>

                {attachedDocument ? (
                  <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                    <div className="w-9 h-9 rounded-xl bg-red-600 text-white font-black text-xs flex items-center justify-center">
                      PDF
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{attachedDocument.name}</div>
                      <div className="text-[10px] text-slate-500">{attachedDocument.size}</div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.zip"
                      onChange={handleFileUpload}
                      className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-600 file:text-white hover:file:bg-red-500 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Variable Tag Inserters */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600 block">
                Variáveis Personalizadas (1 clique para inserir):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: 'nome', label: '👤 {nome}' },
                  { tag: 'primeiro_nome', label: '👋 {primeiro_nome}' },
                  { tag: 'saudacao_tempo', label: '☀️ {saudacao_tempo}' },
                  { tag: 'empresa', label: '🏢 {empresa}' },
                  { tag: 'valor', label: '💰 {valor}' },
                ].map((v) => (
                  <button
                    key={v.tag}
                    type="button"
                    onClick={() => handleInsertTag(v.tag)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[11px] font-mono font-bold text-slate-700 transition-all"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Textarea */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-700">
                  Texto da Mensagem / Legenda:
                </label>
                <span className="text-[11px] text-slate-400">
                  {messageText.length} caracteres
                </span>
              </div>
              <textarea
                rows={5}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Digite a mensagem com spintax {Olá|Oi} e variáveis..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 leading-relaxed focus:outline-none focus:border-red-600"
              />
            </div>

            {/* Scheduling & Anti-Ban Row */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Agendamento & Proteção Anti-Ban
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSendImmediately(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      sendImmediately ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    Imediato
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendImmediately(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      !sendImmediately ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    Agendar
                  </button>
                </div>
              </div>

              {!sendImmediately && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Data:</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Horário:</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
                    />
                  </div>
                </div>
              )}

              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>Intervalo aleatório: <strong>{minDelay}s ~ {maxDelay}s</strong></span>
                <span>Pausa a cada {pauseEvery} envios</span>
              </div>
            </div>

            {/* Launch / Schedule Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCreateAndStartCampaign}
                className="w-full py-3.5 bg-gradient-to-r from-red-600 via-rose-700 to-black hover:from-red-500 hover:to-zinc-900 text-white font-black text-sm rounded-2xl transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 hover:scale-[1.01]"
              >
                <Send className="w-4 h-4" />
                {sendImmediately
                  ? `Disparar Agora para ${selectedContacts.length} Selecionados 🚀`
                  : `Agendar Disparo para ${selectedContacts.length} Contatos 📅`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Nova Categoria / Grupo */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-red-600" />
                Criar Nova Categoria / Grupo
              </h3>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nome da Categoria:</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ex: Clientes Quentes 2026"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Cor de Destaque:</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={groupColor}
                    onChange={(e) => setGroupColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-slate-700">{groupColor}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Descrição / Objetivo:</label>
                <input
                  type="text"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="Ex: Segmento de compradores recorrentes"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!groupName.trim()) {
                    alert('Nome da categoria é obrigatório.');
                    return;
                  }
                  const newG: ContactGroup = {
                    id: `grp-${Date.now()}`,
                    name: groupName.trim(),
                    color: groupColor,
                    description: groupDesc.trim() || undefined,
                    createdAt: new Date().toISOString(),
                  };
                  onUpdateGroups([...groups, newG]);
                  setGroupName('');
                  setGroupDesc('');
                  setIsGroupModalOpen(false);
                }}
                className="px-5 py-2 bg-gradient-to-r from-red-600 to-black text-white text-xs font-bold rounded-xl shadow-md"
              >
                Criar Categoria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Copywriter Modal */}
      <AICopywriterModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onSelectMessage={(content) => setMessageText(content)}
      />
    </div>
  );
};
