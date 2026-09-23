import React, { useState } from 'react';
import {
  Bot,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Power,
  Clock,
  Sparkles,
  Search,
  MessageSquare,
  Zap,
  Send,
  HelpCircle,
  FileText,
  Image,
  Mic,
} from 'lucide-react';
import { AutoResponderRule, WhatsAppSession } from '../types';
import { resolveSpintax } from '../utils/messageFormatter';

interface AutoResponderViewProps {
  rules: AutoResponderRule[];
  onUpdateRules: (rules: AutoResponderRule[]) => void;
  session: WhatsAppSession;
  onOpenConnectModal: () => void;
  onOpenAIModal: () => void;
}

export const AutoResponderView: React.FC<AutoResponderViewProps> = ({
  rules,
  onUpdateRules,
  session,
  onOpenConnectModal,
  onOpenAIModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoResponderRule | null>(null);

  // Form State
  const [keyword, setKeyword] = useState('');
  const [matchType, setMatchType] = useState<'exact' | 'contains' | 'startsWith'>('contains');
  const [replyMessage, setReplyMessage] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [mediaType, setMediaType] = useState<'none' | 'image' | 'audio' | 'document'>('none');

  // Simulator State
  const [simulatedInput, setSimulatedInput] = useState('');
  const [simulatedLog, setSimulatedLog] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'user',
      text: 'Olá, gostaria de saber mais sobre a promoção QUERO',
      time: '14:32',
    },
    {
      sender: 'bot',
      text: 'Olá! Que ótimo ter seu interesse! 🎉\n\nLiberamos sua condição exclusiva com frete grátis e 25% de desconto.\n\n👉 Acesse agora nosso catálogo oficial!',
      time: '14:32',
    },
  ]);

  const filteredRules = rules.filter((r) =>
    r.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.replyMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingRule(null);
    setKeyword('');
    setMatchType('contains');
    setReplyMessage('{Olá|Oi}! Obrigado por entrar em contato. Como podemos ajudar hoje?');
    setDelaySeconds(2);
    setMediaType('none');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule: AutoResponderRule) => {
    setEditingRule(rule);
    setKeyword(rule.keyword);
    setMatchType(rule.matchType);
    setReplyMessage(rule.replyMessage);
    setDelaySeconds(rule.delaySeconds);
    setMediaType(rule.mediaType || 'none');
    setIsModalOpen(true);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !replyMessage.trim()) return;

    if (editingRule) {
      const updated = rules.map((r) =>
        r.id === editingRule.id
          ? {
              ...r,
              keyword: keyword.trim().toUpperCase(),
              matchType,
              replyMessage,
              delaySeconds,
              mediaType,
            }
          : r
      );
      onUpdateRules(updated);
    } else {
      const newRule: AutoResponderRule = {
        id: `rule-${Date.now()}`,
        keyword: keyword.trim().toUpperCase(),
        matchType,
        replyMessage,
        delaySeconds,
        mediaType,
        isActive: true,
        triggerCount: 0,
        createdAt: new Date().toISOString(),
      };
      onUpdateRules([newRule, ...rules]);
    }

    setIsModalOpen(false);
  };

  const handleToggleActive = (id: string) => {
    const updated = rules.map((r) =>
      r.id === id ? { ...r, isActive: !r.isActive } : r
    );
    onUpdateRules(updated);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja excluir esta regra de resposta automática?')) {
      onUpdateRules(rules.filter((r) => r.id !== id));
    }
  };

  const handleTestSimulator = () => {
    if (!simulatedInput.trim()) return;
    const userMsg = simulatedInput.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setSimulatedLog((prev) => [...prev, { sender: 'user', text: userMsg, time: timeStr }]);
    setSimulatedInput('');

    // Find matching rule
    const activeRules = rules.filter((r) => r.isActive);
    let matchedRule: AutoResponderRule | undefined;

    for (const rule of activeRules) {
      const kw = rule.keyword.toLowerCase();
      const inputLower = userMsg.toLowerCase();
      if (rule.matchType === 'exact' && inputLower === kw) {
        matchedRule = rule;
        break;
      } else if (rule.matchType === 'contains' && inputLower.includes(kw)) {
        matchedRule = rule;
        break;
      } else if (rule.matchType === 'startsWith' && inputLower.startsWith(kw)) {
        matchedRule = rule;
        break;
      }
    }

    setTimeout(() => {
      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (matchedRule) {
        const text = resolveSpintax(matchedRule.replyMessage);
        setSimulatedLog((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: text,
            time: botTime,
          },
        ]);
      } else {
        setSimulatedLog((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: '🤖 [Nenhuma regra ativa correspondeu a esta palavra-chave. Mensagem ignorada.]',
            time: botTime,
          },
        ]);
      }
    }, 700);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Bot className="w-6 h-6 text-red-600" />
              Auto-Responder & Chatbot por Palavras-Chave
            </h1>
            <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full font-bold">
              {rules.filter((r) => r.isActive).length} Regras Ativas
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Responda automaticamente clientes que enviarem palavras como "QUERO", "PIX", "VALOR" ou opções numéricas no WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenAIModal}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-red-600" /> Criar com IA
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-gradient-to-r from-red-600 via-rose-700 to-black hover:from-red-500 hover:to-zinc-900 text-white font-black text-xs rounded-xl shadow-md shadow-red-600/25 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> Nova Resposta Automática
          </button>
        </div>
      </div>

      {/* Main Grid: Rules List + Live Interactive Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Rules Table & Controls (8 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar por palavra-chave ou texto..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600"
                />
              </div>
            </div>

            {filteredRules.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                <Bot className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Nenhuma regra de resposta encontrada</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Cadastre palavras como "QUERO" para automatizar seu atendimento no WhatsApp.
                </p>
                <button
                  onClick={handleOpenAdd}
                  className="mt-3 px-3 py-1.5 bg-red-600 text-white font-bold text-xs rounded-xl"
                >
                  Criar Primeira Regra
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      rule.isActive
                        ? 'bg-white border-slate-200 hover:border-red-300 shadow-xs'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-xs px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-lg">
                            {rule.keyword}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold">
                            Tipo: {rule.matchType === 'exact' ? 'Exato' : rule.matchType === 'contains' ? 'Contém' : 'Começa com'}
                          </span>
                          <span className="text-[10px] text-slate-400">·</span>
                          <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" /> {rule.delaySeconds}s delay
                          </span>
                          <span className="text-[10px] text-slate-400">·</span>
                          <span className="text-[10px] text-emerald-600 font-bold">
                            {rule.triggerCount} disparos
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap line-clamp-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {rule.replyMessage}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleToggleActive(rule.id)}
                          title={rule.isActive ? 'Desativar Regra' : 'Ativar Regra'}
                          className={`p-2 rounded-xl border transition-colors ${
                            rule.isActive
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                              : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(rule)}
                          className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-2 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col h-[560px]">
            <div className="border-b border-slate-100 pb-3 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-red-600" />
                <h3 className="text-xs font-black text-slate-900">Simulador de Atendimento em Tempo Real</h3>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-black px-2 py-0.5 rounded-full border border-emerald-200">
                Bot Online
              </span>
            </div>

            {/* Chat Box */}
            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
              {simulatedLog.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${item.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium shadow-2xs whitespace-pre-wrap leading-relaxed ${
                      item.sender === 'user'
                        ? 'bg-slate-900 text-white rounded-tr-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                    }`}
                  >
                    {item.text}
                    <div
                      className={`text-[9px] mt-1 font-mono text-right ${
                        item.sender === 'user' ? 'text-slate-400' : 'text-slate-400'
                      }`}
                    >
                      {item.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="pt-3 flex gap-2">
              <input
                type="text"
                value={simulatedInput}
                onChange={(e) => setSimulatedInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTestSimulator()}
                placeholder="Digite ex: 'QUERO' ou 'PIX' e dê Enter..."
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600"
              />
              <button
                onClick={handleTestSimulator}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition-colors flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-red-600 to-black text-white">
              <h3 className="text-sm font-black">
                {editingRule ? 'Editar Resposta Automática' : 'Cadastrar Nova Resposta Automática'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  Palavra-Chave Gatilho (Ex: QUERO, PIX, VALOR, 1, 2)
                </label>
                <input
                  type="text"
                  required
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Ex: QUERO"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-red-600 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Tipo de Correspondência
                  </label>
                  <select
                    value={matchType}
                    onChange={(e) => setMatchType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-red-600"
                  >
                    <option value="contains">Contém a palavra</option>
                    <option value="exact">Mensagem exata</option>
                    <option value="startsWith">Começa com</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Delay para Responder (segundos)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Mensagem de Resposta Automática (Suporta Spintax)
                  </label>
                  <button
                    type="button"
                    onClick={() => setReplyMessage((prev) => prev + ' {Olá|Oi|Tudo bem}')}
                    className="text-[10px] text-red-600 font-bold hover:underline"
                  >
                    + Spintax
                  </button>
                </div>
                <textarea
                  required
                  rows={4}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Ex: Olá! Recebemos sua mensagem..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-black text-white font-black text-xs rounded-xl shadow-md hover:from-red-500 hover:to-zinc-900"
                >
                  Salvar Regra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
