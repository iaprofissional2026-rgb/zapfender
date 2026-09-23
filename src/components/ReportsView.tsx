import React, { useState } from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Search, 
  ExternalLink, 
  RotateCcw, 
  Clock, 
  Smartphone,
  MessageSquare
} from 'lucide-react';
import { Campaign, DispatchLog } from '../types';
import { formatPhoneDisplay, buildWhatsAppWebUrl } from '../utils/messageFormatter';

interface ReportsViewProps {
  campaigns: Campaign[];
  selectedCampaignId?: string;
  onRetryCampaign: (campaign: Campaign) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  campaigns,
  selectedCampaignId,
  onRetryCampaign,
}) => {
  const [filterCampaignId, setFilterCampaignId] = useState<string>(selectedCampaignId || 'all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<DispatchLog | null>(null);

  // Aggregate all logs from all campaigns
  const allLogs: (DispatchLog & { campaignName: string })[] = [];
  campaigns.forEach((camp) => {
    (camp.logs || []).forEach((log) => {
      allLogs.push({
        ...log,
        campaignName: camp.name,
      });
    });
  });

  const filteredLogs = allLogs.filter((log) => {
    const matchesCamp = filterCampaignId === 'all' || log.campaignId === filterCampaignId;
    const matchesSearch =
      log.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.phone.includes(searchTerm) ||
      log.renderedMessage.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCamp && matchesSearch;
  });

  const totalSuccess = allLogs.filter(l => l.status === 'success').length;
  const totalFailed = allLogs.filter(l => l.status === 'failed').length;
  const successRate = allLogs.length > 0 ? ((totalSuccess / allLogs.length) * 100).toFixed(1) : '100';

  const handleExportCSV = () => {
    const headers = 'Campanha,Contato,WhatsApp,Mensagem,Status,Delay,Timestamp\n';
    const rows = filteredLogs.map(l => {
      return `"${l.campaignName}","${l.contactName}","${l.phone}","${l.renderedMessage.replace(/"/g, '""')}","${l.status}","${l.simulatedDelay || 0}s","${l.timestamp}"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_disparos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-[#111b21] border border-[#202c33] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e9edef] flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#00a884]" />
            Relatórios de Envios & Histórico de Mensagens
          </h1>
          <p className="text-xs text-[#8696a0] mt-1">
            Registro detalhado de cada mensagem disparada com timestamp e status de entrega
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] border border-[#2a3942] text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
        >
          <Download className="w-4 h-4 text-[#00a884]" /> Exportar Relatório CSV
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#111b21] border border-[#202c33] p-4 rounded-2xl">
          <span className="text-xs text-[#8696a0] block">Total Disparado</span>
          <span className="text-2xl font-bold text-[#e9edef] block mt-1">{allLogs.length}</span>
        </div>
        <div className="bg-[#111b21] border border-[#202c33] p-4 rounded-2xl">
          <span className="text-xs text-[#8696a0] block">Entregues com Sucesso</span>
          <span className="text-2xl font-bold text-[#00a884] block mt-1">{totalSuccess}</span>
        </div>
        <div className="bg-[#111b21] border border-[#202c33] p-4 rounded-2xl">
          <span className="text-xs text-[#8696a0] block">Taxa de Eficiência</span>
          <span className="text-2xl font-bold text-[#00a884] block mt-1">{successRate}%</span>
        </div>
        <div className="bg-[#111b21] border border-[#202c33] p-4 rounded-2xl">
          <span className="text-xs text-[#8696a0] block">Campanhas Criadas</span>
          <span className="text-2xl font-bold text-purple-400 block mt-1">{campaigns.length}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#111b21] border border-[#202c33] rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por contato, telefone ou texto da mensagem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#182229] border border-[#202c33] rounded-xl text-xs text-[#e9edef] focus:outline-none focus:border-[#00a884]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8696a0] whitespace-nowrap">Filtrar Campanha:</span>
          <select
            value={filterCampaignId}
            onChange={(e) => setFilterCampaignId(e.target.value)}
            className="px-3 py-2 bg-[#182229] border border-[#202c33] rounded-xl text-xs text-[#e9edef]"
          >
            <option value="all">Todas as Campanhas</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#111b21] border border-[#202c33] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#182229] border-b border-[#202c33] text-[#8696a0] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Campanha</th>
                <th className="p-4">Destinatário</th>
                <th className="p-4">WhatsApp</th>
                <th className="p-4">Mensagem Personalizada</th>
                <th className="p-4">Status</th>
                <th className="p-4">Data/Hora</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202c33]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#8696a0]">
                    Nenhum registro de envio encontrado.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#182229]/60 transition-colors">
                    <td className="p-4 font-medium text-[#e9edef] max-w-[140px] truncate">
                      {log.campaignName}
                    </td>
                    <td className="p-4 font-semibold text-[#e9edef]">
                      {log.contactName}
                    </td>
                    <td className="p-4 font-mono text-[#00a884]">
                      {formatPhoneDisplay(log.phone)}
                    </td>
                    <td className="p-4 text-[#8696a0] max-w-xs truncate cursor-pointer hover:text-[#e9edef]" onClick={() => setSelectedLog(log)}>
                      "{log.renderedMessage}"
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" /> Entregue
                      </span>
                    </td>
                    <td className="p-4 text-[#8696a0] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-4 text-right">
                      <a
                        href={buildWhatsAppWebUrl(log.phone, log.renderedMessage)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-[#00a884] hover:bg-[#202c33] rounded-lg inline-block"
                        title="Ver no WhatsApp Web"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Message Viewer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111b21] border border-[#2a3942] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#202c33] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#e9edef]">Mensagem Enviada</h3>
                <p className="text-xs text-[#8696a0]">
                  Para: {selectedLog.contactName} ({formatPhoneDisplay(selectedLog.phone)})
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-[#8696a0] hover:text-[#e9edef]"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#0b141a] p-4 rounded-xl border border-[#202c33] bg-whatsapp-pattern">
              <div className="bg-[#005c4b] text-[#e9edef] rounded-xl p-3.5 text-xs whitespace-pre-wrap leading-relaxed shadow">
                {selectedLog.renderedMessage}
              </div>
              <div className="text-right text-[10px] text-[#8696a0] mt-2">
                Enviado em: {new Date(selectedLog.timestamp).toLocaleString('pt-BR')}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-[#00a884] text-black text-xs font-bold rounded-xl shadow"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
