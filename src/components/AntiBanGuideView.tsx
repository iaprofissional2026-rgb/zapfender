import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Flame, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  PhoneCall, 
  Smile, 
  Send, 
  Sliders, 
  ShieldAlert, 
  Zap, 
  Check, 
  RefreshCw, 
  Lock, 
  Eye, 
  Copy, 
  UserX, 
  Plus, 
  Trash2,
  Calendar,
  Activity
} from 'lucide-react';
import { WhatsAppSession, AppSettings } from '../types';

interface AntiBanSystemProps {
  session?: WhatsAppSession;
  settings?: AppSettings;
  onUpdateSettings?: (settings: AppSettings) => void;
}

export const AntiBanGuideView: React.FC<AntiBanSystemProps> = ({
  session,
  settings,
  onUpdateSettings,
}) => {
  // Safety Mode State
  const [safetyMode, setSafetyMode] = useState<'conservative' | 'balanced' | 'turbo'>('balanced');
  const [simulateTyping, setSimulateTyping] = useState<boolean>(true);
  const [simulateRecording, setSimulateRecording] = useState<boolean>(true);
  const [autoSpintax, setAutoSpintax] = useState<boolean>(true);
  const [autoOptOutFilter, setAutoOptOutFilter] = useState<boolean>(true);

  // Custom Delays
  const [minDelay, setMinDelay] = useState<number>(safetyMode === 'conservative' ? 15 : safetyMode === 'balanced' ? 8 : 5);
  const [maxDelay, setMaxDelay] = useState<number>(safetyMode === 'conservative' ? 30 : safetyMode === 'balanced' ? 18 : 10);
  const [pauseEvery, setPauseEvery] = useState<number>(safetyMode === 'conservative' ? 15 : safetyMode === 'balanced' ? 25 : 45);
  const [pauseDuration, setPauseDuration] = useState<number>(safetyMode === 'conservative' ? 180 : safetyMode === 'balanced' ? 120 : 60);

  // Blacklist / Opt-out Keywords
  const [blacklistKeywords, setBlacklistKeywords] = useState<string[]>([
    'SAIR',
    'PARAR',
    'CANCELAR',
    'REMOVER',
    'NUNCA MAIS',
    'SPAM',
  ]);
  const [newKeyword, setNewKeyword] = useState<string>('');

  // Spintax Previewer Tester
  const [spintaxTestText, setSpintaxTestText] = useState<string>(
    '{Olá|Oi|E aí|Tudo bem} {nome}! {Passando para avisar|Temos uma novidade|Quero te mostrar} a nossa nova {oferta|condição especial}.'
  );
  const [spintaxResults, setSpintaxResults] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Chip Warmup Progress
  const [currentWarmupDay, setCurrentWarmupDay] = useState<number>(4);

  // Calculate Health Score
  const healthScore = session?.antiBanHealthScore || 98;

  const handleSafetyModeChange = (mode: 'conservative' | 'balanced' | 'turbo') => {
    setSafetyMode(mode);
    if (mode === 'conservative') {
      setMinDelay(15);
      setMaxDelay(30);
      setPauseEvery(15);
      setPauseDuration(180);
    } else if (mode === 'balanced') {
      setMinDelay(8);
      setMaxDelay(18);
      setPauseEvery(25);
      setPauseDuration(120);
    } else {
      setMinDelay(5);
      setMaxDelay(10);
      setPauseEvery(45);
      setPauseDuration(60);
    }
  };

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return;
    const clean = newKeyword.trim().toUpperCase();
    if (!blacklistKeywords.includes(clean)) {
      setBlacklistKeywords([...blacklistKeywords, clean]);
    }
    setNewKeyword('');
  };

  const handleRemoveKeyword = (kw: string) => {
    setBlacklistKeywords(blacklistKeywords.filter(k => k !== kw));
  };

  const handleGenerateSpintaxExamples = () => {
    const results: string[] = [];
    for (let i = 0; i < 4; i++) {
      let sample = spintaxTestText;
      sample = sample.replace(/\{([^{}]+)\}/g, (match, choices) => {
        const parts = choices.split('|');
        return parts[Math.floor(Math.random() * parts.length)].trim();
      });
      sample = sample.replace('{nome}', ['Carlos', 'Mariana', 'Roberto', 'Juliana'][i % 4]);
      results.push(sample);
    }
    setSpintaxResults(results);
  };

  const handleCopySample = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Shield Banner */}
      <div className="bg-gradient-to-r from-red-600 via-rose-700 to-black rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-red-500/30">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
            <ShieldCheck className="w-8 h-8 text-white drop-shadow-md" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight">
                Sistema Anti-Ban & Blindagem de WhatsApp
              </h1>
              <span className="text-[10px] uppercase font-black tracking-wider bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow-xs">
                Escudo Ativo
              </span>
            </div>
            <p className="text-xs text-rose-100 font-medium mt-0.5">
              Proteção com intervalos humanizados, variação spintax dinâmica e aquecimento progressivo de chips.
            </p>
          </div>
        </div>

        {/* Health Score Pill */}
        <div className="bg-black/40 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 flex items-center gap-4">
          <div>
            <div className="text-[11px] font-bold text-rose-200">Saúde do Número:</div>
            <div className="text-xl font-black text-emerald-400 flex items-center gap-1.5">
              <span>{healthScore}%</span>
              <span className="text-xs text-white/70 font-semibold">(Excelente)</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Safety Mode Selector */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-red-600" />
              Nível de Proteção & Velocidade de Disparo
            </h2>
            <p className="text-xs text-slate-500">
              Escolha a estratégia ideal de acordo com o tempo de ativação do seu WhatsApp.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Conservative Mode */}
          <div
            onClick={() => handleSafetyModeChange('conservative')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
              safetyMode === 'conservative'
                ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                🛡️ Modo Conservador
              </span>
              {safetyMode === 'conservative' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            </div>
            <div className="text-xs font-bold text-slate-900 mb-1">Para Chips Novos (1 a 15 dias)</div>
            <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
              Intervalos longos de 15s a 30s. Pausas a cada 15 envios. Máxima proteção contra detecção de robôs.
            </p>
            <div className="text-[10px] font-bold text-slate-700 bg-white p-2 rounded-xl border border-slate-200">
              Limite Diário Seguro: <strong>150 msgs/dia</strong>
            </div>
          </div>

          {/* Balanced Mode (Default) */}
          <div
            onClick={() => handleSafetyModeChange('balanced')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
              safetyMode === 'balanced'
                ? 'border-red-600 bg-red-50/60 shadow-md shadow-red-600/10'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full">
                ⭐ Recomendado (Equilibrado)
              </span>
              {safetyMode === 'balanced' && <CheckCircle2 className="w-4 h-4 text-red-600" />}
            </div>
            <div className="text-xs font-bold text-slate-900 mb-1">Para WhatsApp Pessoal / Comercial</div>
            <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
              Intervalos humanos de 8s a 18s com variação spintax. Pausas de 2 minutos a cada 25 envios.
            </p>
            <div className="text-[10px] font-bold text-slate-700 bg-white p-2 rounded-xl border border-slate-200">
              Limite Diário Seguro: <strong>350 a 500 msgs/dia</strong>
            </div>
          </div>

          {/* Turbo Mode */}
          <div
            onClick={() => handleSafetyModeChange('turbo')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
              safetyMode === 'turbo'
                ? 'border-zinc-900 bg-zinc-50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-zinc-900 bg-zinc-200 px-2.5 py-0.5 rounded-full">
                ⚡ Modo Turbo (Chips Maturados)
              </span>
              {safetyMode === 'turbo' && <CheckCircle2 className="w-4 h-4 text-zinc-900" />}
            </div>
            <div className="text-xs font-bold text-slate-900 mb-1">Para Chips Aquecidos (+45 dias)</div>
            <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
              Intervalos rápidos de 5s a 10s. Ideal para envios urgentes em bases de clientes que já conversam com você.
            </p>
            <div className="text-[10px] font-bold text-slate-700 bg-white p-2 rounded-xl border border-slate-200">
              Limite Diário Seguro: <strong>800+ msgs/dia</strong>
            </div>
          </div>
        </div>

        {/* Real-time Parameters Adjusted */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid sm:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Intervalo Mínimo:</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="3"
                max="60"
                value={minDelay}
                onChange={(e) => setMinDelay(Number(e.target.value))}
                className="w-16 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
              />
              <span className="text-slate-500 font-medium">segundos</span>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Intervalo Máximo:</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="5"
                max="120"
                value={maxDelay}
                onChange={(e) => setMaxDelay(Number(e.target.value))}
                className="w-16 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
              />
              <span className="text-slate-500 font-medium">segundos</span>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Pausa a cada:</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="5"
                max="100"
                value={pauseEvery}
                onChange={(e) => setPauseEvery(Number(e.target.value))}
                className="w-16 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
              />
              <span className="text-slate-500 font-medium">mensagens</span>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Duração da Pausa:</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="30"
                max="600"
                value={pauseDuration}
                onChange={(e) => setPauseDuration(Number(e.target.value))}
                className="w-16 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
              />
              <span className="text-slate-500 font-medium">segundos</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Section: Spintax Engine (Left) vs Opt-out Blacklist (Right) */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Col (6 cols): Spintax Engine & Generator */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-red-600" />
                Gerador & Testador de Spintax {'{Olá|Oi}'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Evita que o WhatsApp identifique textos repetidos idênticos como spam.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Texto com Sintaxe Spintax:
            </label>
            <textarea
              rows={3}
              value={spintaxTestText}
              onChange={(e) => setSpintaxTestText(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-red-600"
            />
            <button
              onClick={handleGenerateSpintaxExamples}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-black text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 hover:from-red-500 hover:to-zinc-900 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Gerar 4 Variações Aleatórias
            </button>
          </div>

          {/* Generated Variations */}
          {spintaxResults.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-700 block">
                Variações Únicas Geradas para Cada Contato:
              </span>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {spintaxResults.map((sample, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 flex items-center justify-between gap-3"
                  >
                    <span className="truncate">{sample}</span>
                    <button
                      onClick={() => handleCopySample(sample, idx)}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1 flex-shrink-0"
                    >
                      {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {copiedIndex === idx ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col (6 cols): Opt-Out & Blacklist Auto Protection */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <UserX className="w-4 h-4 text-red-600" />
                Bloqueio Automático de Denúncias (Opt-Out)
              </h3>
              <p className="text-[11px] text-slate-500">
                Se o contato responder qualquer uma das palavras abaixo, ele é bloqueado de futuros disparos para evitar banimentos.
              </p>
            </div>
          </div>

          {/* Add Keyword Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
              placeholder="Ex: NAO QUERO, PARE"
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 uppercase focus:outline-none focus:border-red-600"
            />
            <button
              onClick={handleAddKeyword}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-all flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          </div>

          {/* Keyword Badges */}
          <div className="flex flex-wrap gap-2">
            {blacklistKeywords.map((kw) => (
              <span
                key={kw}
                className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-800 text-xs font-mono font-bold rounded-xl flex items-center gap-2 shadow-2xs"
              >
                <span>{kw}</span>
                <button
                  onClick={() => handleRemoveKeyword(kw)}
                  className="text-red-500 hover:text-red-800 font-bold"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>

          {/* Auto Recommendation Box */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Dica de Ouro Anti-Ban:
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Sempre adicione no final da sua copy a frase: <em>"Caso não queira mais receber novidades, responda SAIR"</em>. Isso faz a pessoa responder ao invés de clicar no botão "Denunciar Spam" do WhatsApp!
            </p>
          </div>
        </div>
      </div>

      {/* Chip Maturation & Warmup Planner (15 Days Schedule) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center text-white">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Plano de Aquecimento de Chip Novo (15 Dias de Maturação)
              </h3>
              <p className="text-xs text-slate-500">
                Siga essa escala diária para blindar o número recém-ativado e construir reputação positiva no algoritmo do WhatsApp.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { day: 'Dias 1 a 3', limit: '20 msgs/dia', delay: '25s', desc: 'Apenas contatos conhecidos', safe: 'Máxima' },
            { day: 'Dias 4 a 6', limit: '50 msgs/dia', delay: '18s', desc: 'Contatos com boa taxa de resposta', safe: 'Alta' },
            { day: 'Dias 7 a 9', limit: '100 msgs/dia', delay: '15s', desc: 'Ativação de fotos e áudios PTT', safe: 'Alta' },
            { day: 'Dias 10 a 12', limit: '200 msgs/dia', delay: '12s', desc: 'Pausas automáticas ativas', safe: 'Média/Alta' },
            { day: 'Dia 13+', limit: '400+ msgs/dia', delay: '8s', desc: 'Chip maturado e pronto para escala', safe: 'Seguro' },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border text-xs space-y-1.5 transition-all ${
                idx + 1 === currentWarmupDay
                  ? 'border-red-600 bg-red-50/70 shadow-sm'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900">{item.day}</span>
                <span className="text-[10px] font-bold text-red-600 bg-white px-2 py-0.2 rounded-md border border-slate-200">
                  {item.limit}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 font-medium">Delay: <strong>{item.delay}</strong></div>
              <p className="text-[10px] text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
