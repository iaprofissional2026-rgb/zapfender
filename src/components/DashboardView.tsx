import React from 'react';
import { 
  Send, 
  Users, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  Smartphone, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  ExternalLink,
  Zap,
  Play,
  Image,
  Mic,
  Paperclip,
  FolderKanban,
  Store,
  Receipt,
  Plus
} from 'lucide-react';
import { Campaign, Contact, ContactGroup, WhatsAppSession, SupermarketCustomer } from '../types';

interface DashboardViewProps {
  session: WhatsAppSession;
  contacts: Contact[];
  groups: ContactGroup[];
  campaigns: Campaign[];
  supermarketCustomers?: SupermarketCustomer[];
  onNavigate: (view: 'dashboard' | 'campaign' | 'supermarket' | 'contacts' | 'templates' | 'scheduled' | 'reports' | 'antiban' | 'autoresponder' | 'warmer') => void;
  onOpenConnectModal: () => void;
  onOpenAIModal: () => void;
  onRunCampaignNow: (campaign: Campaign) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  session,
  contacts,
  groups,
  campaigns,
  supermarketCustomers = [],
  onNavigate,
  onOpenConnectModal,
  onOpenAIModal,
  onRunCampaignNow,
}) => {
  const isConnected = session.status === 'connected';
  const totalSent = campaigns.reduce((acc, c) => acc + (c.sentCount || 0), 0);
  const activeSchedules = campaigns.filter(c => c.status === 'scheduled');
  const runningCampaigns = campaigns.filter(c => c.status === 'running');

  // Supermarket debt metrics
  const totalMarketDebt = supermarketCustomers.reduce((acc, c) => acc + (c.totalDebt || 0), 0);
  const overdueMarketCustomers = supermarketCustomers.filter((c) => c.status === 'overdue' && c.totalDebt > 0);

  return (
    <div className="space-y-6">
      {/* Hero Red & Black Gradient Banner */}
      <div className={`rounded-3xl p-6 sm:p-8 border shadow-xl transition-all relative overflow-hidden ${
        isConnected
          ? 'bg-gradient-to-r from-red-600 via-rose-700 to-zinc-950 text-white border-red-500/30'
          : 'bg-gradient-to-r from-zinc-950 via-zinc-900 to-red-950 text-white border-red-900/50'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg flex-shrink-0">
              <Smartphone className="w-7 h-7 text-white animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  {isConnected ? 'WhatsApp Conectado & Pronto' : 'Conecte seu WhatsApp para Disparar'}
                </h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold border ${
                  isConnected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                    : 'bg-red-500/20 text-red-300 border-red-400/40'
                }`}>
                  {isConnected ? '● Online' : '● Desconectado'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-red-100/90 leading-relaxed max-w-xl">
                {isConnected
                  ? `Instância ativa: ${session.phone} • Proteção anti-bloqueio ${session.antiBanHealthScore}% • Disparos com Fotos, Áudios e Documentos liberados.`
                  : 'Escaneie o QR Code oficial em segundos no seu celular para disparar em massa sem custos de API do Meta.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenConnectModal}
              className="px-4 py-2.5 bg-white text-zinc-950 hover:bg-slate-100 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 hover:scale-[1.02]"
            >
              <Smartphone className="w-4 h-4 text-red-600" />
              {isConnected ? 'Ver QR Code / Conexão' : 'Conectar WhatsApp 📲'}
            </button>
            <button
              onClick={() => onNavigate('contacts')}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-red-600/30 flex items-center gap-2 hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Programar Disparo
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2 hover:border-red-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Enviado</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalSent + session.dailySentCount}</div>
          <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> 100% Entregabilidade
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2 hover:border-red-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Base de Contatos</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{contacts.length}</div>
          <div className="text-[11px] text-slate-500 font-medium">
            Em {groups.length} categorias segmentadas
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2 hover:border-red-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Agendamentos</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{activeSchedules.length}</div>
          <div className="text-[11px] text-slate-500 font-medium">
            {activeSchedules.length > 0 ? 'Envios automáticos na fila' : 'Nenhuma fila pendente'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2 hover:border-red-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Proteção Anti-Ban</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{session.antiBanHealthScore}%</div>
          <div className="text-[11px] text-slate-500 font-medium">
            Delays humanizados ativos
          </div>
        </div>
      </div>

      {/* Supermarket Debt Special Banner Card */}
      <div className="bg-gradient-to-r from-red-900 via-zinc-900 to-black rounded-3xl p-5 sm:p-6 border border-red-500/30 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center flex-shrink-0 text-red-400">
            <Store className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider bg-red-600/30 text-red-300 px-2.5 py-0.5 rounded-full border border-red-500/30">
                Supermercado & ERP
              </span>
              <span className="text-xs text-slate-300">
                {supermarketCustomers.length} Clientes Sincronizados
              </span>
            </div>
            <h3 className="text-base font-black tracking-tight text-white">
              Gestão de Fiado, Débitos & Códigos de Cupons do Mercado
            </h3>
            <p className="text-xs text-slate-300">
              Saldo total devedor: <strong className="text-amber-400 font-mono">R$ {totalMarketDebt.toFixed(2).replace('.', ',')}</strong> • <span className="text-red-400 font-bold">{overdueMarketCustomers.length} vencidos</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('supermarket')}
          className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 flex-shrink-0"
        >
          <Receipt className="w-4 h-4" />
          <span>Abrir Clientes do Supermercado</span>
        </button>
      </div>

      {/* Feature Navigation Cards (Media & Contacts Quick Actions) */}
      <div className="grid md:grid-cols-3 gap-4">
        <div 
          onClick={() => onNavigate('supermarket')}
          className="bg-white border-2 border-slate-200 hover:border-red-600 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group space-y-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-700 text-white flex items-center justify-center shadow-md shadow-red-600/20 group-hover:scale-105 transition-transform">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 group-hover:text-red-600 transition-colors">
              Clientes & Fiado do Supermercado
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Veja o que cada cliente comprou, quanto deve, números reais e envie cobrança com chave PIX em 1 clique.
            </p>
          </div>
          <div className="text-xs font-bold text-red-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Acessar Supermercado →
          </div>
        </div>

        <div 
          onClick={() => onNavigate('contacts')}
          className="bg-white border-2 border-slate-200 hover:border-red-600 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group space-y-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-black text-white flex items-center justify-center shadow-md shadow-red-600/20 group-hover:scale-105 transition-transform">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 group-hover:text-red-600 transition-colors">
              Contatos & Programador de Mídia
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Visualize grupos, selecione contatos com 1 clique e programe mensagens com fotos, áudios e arquivos.
            </p>
          </div>
          <div className="text-xs font-bold text-red-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Acessar Programador →
          </div>
        </div>

        <div 
          onClick={() => onNavigate('campaign')}
          className="bg-white border-2 border-slate-200 hover:border-red-600 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group space-y-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-zinc-950 text-white flex items-center justify-center shadow-md shadow-red-600/20 group-hover:scale-105 transition-transform">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 group-hover:text-red-600 transition-colors">
              Assistente de Disparo Passo a Passo
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Wizard guiado com gerador de cópias por Inteligência Artificial e simulador de smartphone ao vivo.
            </p>
          </div>
          <div className="text-xs font-bold text-red-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Abrir Assistente →
          </div>
        </div>

        <div 
          onClick={() => onNavigate('scheduled')}
          className="bg-white border-2 border-slate-200 hover:border-red-600 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group space-y-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-800 to-black text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 group-hover:text-red-600 transition-colors">
              Fila & Envios Agendados
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Acompanhe disparos programados para datas futuras com relatórios detalhados de entrega.
            </p>
          </div>
          <div className="text-xs font-bold text-red-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Ver Agendamentos →
          </div>
        </div>
      </div>

      {/* Active & Recent Campaigns Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Campanhas & Disparos Recentes
            </h3>
            <p className="text-xs text-slate-500">
              Histórico de envios realizados e campanhas ativas
            </p>
          </div>
          <button
            onClick={() => onNavigate('reports')}
            className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline"
          >
            Ver Relatório Completo
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-10 text-slate-500 space-y-2">
            <Send className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Nenhum disparo realizado ainda.</p>
            <p className="text-xs text-slate-400">Selecione contatos e programe seu primeiro envio com mídia!</p>
            <button
              onClick={() => onNavigate('contacts')}
              className="mt-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-black text-white font-extrabold text-xs rounded-xl shadow"
            >
              Iniciar Primeiro Disparo
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {campaigns.slice(0, 5).map((camp) => (
              <div key={camp.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{camp.name}</span>
                    <span className={`text-[10px] px-2 py-0.2 rounded-full font-extrabold ${
                      camp.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : camp.status === 'scheduled'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {camp.status === 'completed' ? 'Concluído' : camp.status === 'scheduled' ? 'Agendado' : 'Em Execução'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-3">
                    <span>{camp.totalCount} contatos</span>
                    <span>•</span>
                    <span>Intervalo: {camp.minDelaySeconds}s ~ {camp.maxDelaySeconds}s</span>
                    {camp.scheduledDate && (
                      <>
                        <span>•</span>
                        <span>Agendado para: {camp.scheduledDate} {camp.scheduledTime}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRunCampaignNow(camp)}
                    className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5" /> Disparar Agora
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
