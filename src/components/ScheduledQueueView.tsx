import React, { useState } from 'react';
import { 
  Clock, 
  Calendar, 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Eye, 
  Send, 
  RotateCcw,
  Sparkles,
  Users,
  ShieldCheck,
  Image as ImageIcon,
  Mic,
  Paperclip
} from 'lucide-react';
import { Campaign, Contact, ContactGroup, WhatsAppSession } from '../types';

interface ScheduledQueueViewProps {
  campaigns: Campaign[];
  contacts: Contact[];
  groups: ContactGroup[];
  session: WhatsAppSession;
  onRunCampaignNow: (campaign: Campaign) => void;
  onUpdateCampaigns: (campaigns: Campaign[]) => void;
  onViewReport: (campaign: Campaign) => void;
  onOpenNewCampaign: () => void;
}

export const ScheduledQueueView: React.FC<ScheduledQueueViewProps> = ({
  campaigns,
  contacts,
  groups,
  session,
  onRunCampaignNow,
  onUpdateCampaigns,
  onViewReport,
  onOpenNewCampaign,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'scheduled' | 'running' | 'completed'>('all');

  const filteredCampaigns = campaigns.filter((c) => {
    if (activeFilter === 'all') return true;
    return c.status === activeFilter;
  });

  const handleDeleteCampaign = (id: string) => {
    if (confirm('Deseja cancelar e remover esta campanha?')) {
      onUpdateCampaigns(campaigns.filter(c => c.id !== id));
    }
  };

  const handleTogglePause = (campaign: Campaign) => {
    const updated = campaigns.map((c) => {
      if (c.id === campaign.id) {
        return {
          ...c,
          status: c.status === 'paused' ? ('scheduled' as const) : ('paused' as const),
        };
      }
      return c;
    });
    onUpdateCampaigns(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-red-600" />
            Fila de Envios & Agendamentos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Acompanhe o status de disparos programados e envios em andamento
          </p>
        </div>

        <button
          onClick={onOpenNewCampaign}
          className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-black hover:from-red-500 hover:to-zinc-900 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-red-600/20 flex items-center gap-2"
        >
          <Send className="w-4 h-4" /> Novo Agendamento
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: `Todos (${campaigns.length})` },
          { id: 'scheduled', label: `Agendados (${campaigns.filter(c => c.status === 'scheduled').length})` },
          { id: 'running', label: `Em Execução (${campaigns.filter(c => c.status === 'running').length})` },
          { id: 'completed', label: `Concluídos (${campaigns.filter(c => c.status === 'completed').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              activeFilter === tab.id
                ? 'bg-gradient-to-r from-red-600 to-black text-white border-red-600 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {filteredCampaigns.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 shadow-sm space-y-3">
            <Clock className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Nenhuma campanha encontrada nesta categoria.</h3>
            <p className="text-xs text-slate-400">
              Programe novos disparos com data e horário para automatizar sua rotina.
            </p>
          </div>
        ) : (
          filteredCampaigns.map((camp) => (
            <div
              key={camp.id}
              className="bg-white border border-slate-200 hover:border-red-300 rounded-3xl p-6 shadow-sm transition-all space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-slate-900">{camp.name}</h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      camp.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : camp.status === 'scheduled'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : camp.status === 'running'
                        ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {camp.status === 'completed'
                        ? '● Concluído'
                        : camp.status === 'scheduled'
                        ? '● Agendado'
                        : camp.status === 'running'
                        ? '● Disparando...'
                        : '● Pausado'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                    <span>Criado em: {new Date(camp.createdAt).toLocaleDateString('pt-BR')}</span>
                    {camp.scheduledDate && (
                      <>
                        <span>•</span>
                        <span className="text-purple-700 font-bold flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Agendado para: {camp.scheduledDate} às {camp.scheduledTime}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Quick action buttons */}
                <div className="flex items-center gap-2">
                  {camp.status === 'scheduled' && (
                    <button
                      onClick={() => handleTogglePause(camp)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Pause className="w-3.5 h-3.5" /> Pausar
                    </button>
                  )}

                  <button
                    onClick={() => onRunCampaignNow(camp)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-extrabold shadow-md shadow-red-600/20 transition-all flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" /> Disparar Agora
                  </button>

                  <button
                    onClick={() => onViewReport(camp)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" /> Relatório
                  </button>

                  <button
                    onClick={() => handleDeleteCampaign(camp.id)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Campaign details breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Destinatários</span>
                  <span className="text-sm font-bold text-slate-900 block mt-0.5">
                    {camp.totalCount} contatos
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Enviados / Sucesso</span>
                  <span className="text-sm font-bold text-emerald-600 block mt-0.5">
                    {camp.sentCount || 0} ({camp.totalCount > 0 ? Math.round(((camp.sentCount || 0) / camp.totalCount) * 100) : 0}%)
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Intervalo Anti-Ban</span>
                  <span className="text-xs font-bold text-slate-900 block mt-1">
                    {camp.minDelaySeconds}s ~ {camp.maxDelaySeconds}s
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Mídia Anexada</span>
                  <span className="text-xs font-bold text-slate-800 block mt-1 truncate">
                    {camp.mediaType && camp.mediaType !== 'none' ? `${camp.mediaType.toUpperCase()}` : 'Apenas Texto'}
                  </span>
                </div>
              </div>

              {/* Message snippet */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 font-mono line-clamp-2">
                {camp.messageContent}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
