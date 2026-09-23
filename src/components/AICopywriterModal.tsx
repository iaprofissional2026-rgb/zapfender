import React, { useState } from 'react';
import { Sparkles, Copy, Check, RefreshCw, Layers, CheckCircle2, MessageSquare, Zap, Lightbulb } from 'lucide-react';
import { generateMessageWithAI } from '../services/geminiService';

interface AICopywriterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMessage: (content: string) => void;
}

export const AICopywriterModal: React.FC<AICopywriterModalProps> = ({
  isOpen,
  onClose,
  onSelectMessage,
}) => {
  const [topic, setTopic] = useState<string>('Oferta de lançamento com desconto exclusivo de 30% até hoje');
  const [category, setCategory] = useState<string>('vendas');
  const [companyName, setCompanyName] = useState<string>('Minha Empresa');
  const [tone, setTone] = useState<'amigável' | 'persuasivo' | 'formal' | 'urgente' | 'descontraído'>('persuasivo');
  const [includeSpintax, setIncludeSpintax] = useState<boolean>(true);
  const [selectedVariables, setSelectedVariables] = useState<string[]>(['nome', 'empresa', 'saudacao_tempo']);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [variations, setVariations] = useState<Array<{ title: string; content: string }>>([
    {
      title: 'Opção 1 - Direta & Persuasiva (Spintax)',
      content: `{Olá|Oi|Tudo bem} {nome}, {saudacao_tempo}!\n\nPassando para compartilhar uma oportunidade exclusiva da *Minha Empresa* com 30% de desconto hoje.\n\n👉 Responda *QUERO* agora mesmo para garantir a sua condição especial!`,
    },
    {
      title: 'Opção 2 - Conversacional & Humanizada',
      content: `{Oi|Olá} {primeiro_nome}, como você está?\n\nLembrei de você hoje aqui na *Minha Empresa*. Liberamos um benefício especial para clientes selecionados.\n\nTem 2 minutinhos para eu te passar os detalhes?`,
    },
    {
      title: 'Opção 3 - Urgência & Escassez',
      content: `{Atenção|Aviso Importante} {nome}! ⚠️\n\nRestam poucas vagas para a condição exclusiva da *Minha Empresa*.\n\nResponda *SIM* aqui antes do encerramento para assegurar sua vaga!`,
    },
  ]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const availableVariables = [
    { id: 'nome', label: '{nome}' },
    { id: 'primeiro_nome', label: '{primeiro_nome}' },
    { id: 'saudacao_tempo', label: '{saudacao_tempo}' },
    { id: 'empresa', label: '{empresa}' },
    { id: 'valor', label: '{valor}' },
  ];

  const quickPrompts = [
    {
      title: '🏷️ Oferta & Desconto',
      topic: 'Desconto relâmpago de 25% para quem responder hoje no WhatsApp',
      category: 'vendas',
      tone: 'persuasivo' as const,
    },
    {
      title: '💳 Cobrança Gentil (PIX)',
      topic: 'Lembrete amigável de fatura em aberto com chave PIX para quitação',
      category: 'cobranca',
      tone: 'amigável' as const,
    },
    {
      title: '⏰ Confirmação de Agendamento',
      topic: 'Confirmação de horário de atendimento amanhã, responda 1 para confirmar',
      category: 'lembrete',
      tone: 'formal' as const,
    },
    {
      title: '💤 Reativação de Clientes',
      topic: 'Sentimos sua falta! Volte a comprar conosco com frete grátis e brinde exclusivo',
      category: 'pos_venda',
      tone: 'descontraído' as const,
    },
  ];

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const result = await generateMessageWithAI({
        topic,
        category,
        companyName,
        tone,
        includeSpintax,
        variables: selectedVariables,
      });
      if (result.variations && result.variations.length > 0) {
        setVariations(result.variations);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyQuickPrompt = (item: typeof quickPrompts[0]) => {
    setTopic(item.topic);
    setCategory(item.category);
    setTone(item.tone);
  };

  const toggleVariable = (varId: string) => {
    if (selectedVariables.includes(varId)) {
      setSelectedVariables(selectedVariables.filter(v => v !== varId));
    } else {
      setSelectedVariables([...selectedVariables, varId]);
    }
  };

  const handleSelectAndUse = (content: string) => {
    onSelectMessage(content);
    onClose();
  };

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(index);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-red-600 via-rose-700 to-black text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Sparkles className="w-5 h-5 drop-shadow-sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">
                  Gerador de Mensagens Inteligente (IA Ilimitada)
                </h2>
                <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Grátis & Ilimitado
                </span>
              </div>
              <p className="text-xs text-rose-100 font-medium">
                Cria cópias persuasivas com variações Spintax e tags dinâmicas para anti-bloqueio.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Quick presets */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-2 block flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-red-600" /> Ideias & Sugestões Rápidas:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {quickPrompts.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyQuickPrompt(item)}
                  className="p-2.5 bg-slate-50 hover:bg-red-50/70 border border-slate-200 hover:border-red-300 rounded-2xl text-left text-xs font-bold text-slate-800 transition-all truncate shadow-2xs"
                >
                  {item.title}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                Sobre o que é a mensagem? (Objetivo / Oferta / Aviso)
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Lembrete com desconto especial para pagamento via PIX até as 18h"
                rows={2}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Nome da Empresa / Remetente
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: AutoPeças Silva"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Tom de Voz
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-red-600"
                >
                  <option value="persuasivo">🔥 Persuasivo / Vendas</option>
                  <option value="amigável">😊 Amigável & Empático</option>
                  <option value="formal">👔 Formal & Corporativo</option>
                  <option value="urgente">⚡ Urgente / Escassez</option>
                  <option value="descontraído">🎉 Descontraído & Direto</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Proteção Spintax
                </label>
                <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={includeSpintax}
                    onChange={(e) => setIncludeSpintax(e.target.checked)}
                    className="w-4 h-4 accent-red-600 rounded"
                  />
                  <span className="text-xs text-slate-800 font-bold">
                    Variações {'{Olá|Oi}'}
                  </span>
                </label>
              </div>
            </div>

            {/* Variable Pills */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                Tags para incluir:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableVariables.map((v) => {
                  const isSelected = selectedVariables.includes(v.id);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => toggleVariable(v.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all border ${
                        isSelected
                          ? 'bg-red-50 border-red-500 text-red-700 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-red-600 via-rose-700 to-black hover:from-red-500 hover:to-zinc-900 text-white font-black text-xs rounded-2xl transition-all shadow-md shadow-red-600/20 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Gerando Variações com IA...' : 'Gerar 3 Mensagens com IA Ilimitada ✨'}
            </button>
          </div>

          {/* Generated Variations List */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-red-600" />
              Opções Geradas (Escolha 1 para Usar no Disparo):
            </span>

            <div className="space-y-3">
              {variations.map((v, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50 border border-slate-200 hover:border-red-400 rounded-2xl space-y-2.5 transition-all shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-red-700 bg-red-100/70 px-2.5 py-0.5 rounded-lg">
                      {v.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(v.content, idx)}
                        className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded-lg flex items-center gap-1"
                      >
                        {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedIdx === idx ? 'Copiado' : 'Copiar'}
                      </button>
                      <button
                        onClick={() => handleSelectAndUse(v.content)}
                        className="px-3 py-1 bg-gradient-to-r from-red-600 to-black text-white font-extrabold text-[11px] rounded-lg shadow-sm hover:from-red-500 hover:to-zinc-900 flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Usar Esta
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-medium bg-white p-3 rounded-xl border border-slate-100">
                    {v.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
