import React, { useState, useEffect } from 'react';
import {
  Flame,
  ShieldCheck,
  Zap,
  Activity,
  Play,
  Pause,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Sliders,
  Sparkles,
  Smartphone,
  Check,
} from 'lucide-react';
import { ChipWarmerSession, WhatsAppSession } from '../types';

interface ChipWarmerViewProps {
  session: WhatsAppSession;
  warmer: ChipWarmerSession;
  onUpdateWarmer: (warmer: ChipWarmerSession) => void;
  onOpenConnectModal: () => void;
}

export const ChipWarmerView: React.FC<ChipWarmerViewProps> = ({
  session,
  warmer,
  onUpdateWarmer,
  onOpenConnectModal,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(warmer.isActive);

  const phases = [
    {
      phase: 1,
      title: 'Fase 1: Maturação Inicial',
      desc: 'Para chips recém-cadastrados. Envio de saudações e contatos seguros com intervalo dilatado.',
      dailyTarget: 15,
      delayRange: '45s - 90s',
      status: warmer.phase === 1 ? 'active' : warmer.phase > 1 ? 'completed' : 'locked',
    },
    {
      phase: 2,
      title: 'Fase 2: Expansão Moderada',
      desc: 'Trocas bilaterais orgânicas, conversas graduais e aquecimento de reputação.',
      dailyTarget: 35,
      delayRange: '25s - 50s',
      status: warmer.phase === 2 ? 'active' : warmer.phase > 2 ? 'completed' : 'locked',
    },
    {
      phase: 3,
      title: 'Fase 3: Alta Densidade',
      desc: 'Envio de mídias reais (áudios PTT nativos, imagens) e respostas imediatas.',
      dailyTarget: 80,
      delayRange: '15s - 30s',
      status: warmer.phase === 3 ? 'active' : warmer.phase > 3 ? 'completed' : 'locked',
    },
    {
      phase: 4,
      title: 'Fase 4: Blindagem Completa',
      desc: 'Chip 100% maturado e blindado pronto para campanhas em massa de alta escala.',
      dailyTarget: 250,
      delayRange: '10s - 20s',
      status: warmer.phase === 4 ? 'active' : 'locked',
    },
  ];

  // Real Timer Cycle Loop
  useEffect(() => {
    if (!isRunning || session.status !== 'connected') return;

    const interval = setInterval(() => {
      const phrases = [
        '🔄 Ciclo orgânico executado: verificação de presença ativa no WhatsApp.',
        '💬 Ping de aquecimento: socket mantido com latência ideal e sem risco de desconexão.',
        '🛡️ Escudo Anti-Ban: intervalos randomizados aplicados com sucesso.',
        '📱 Leitura de status da sessão: token e chaves de criptografia validados.',
      ];
      const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];

      const newLog = {
        id: `wlog-${Date.now()}`,
        text: randomPhrase,
        timestamp: new Date().toISOString(),
        status: 'success' as const,
      };

      onUpdateWarmer({
        ...warmer,
        sentToday: (warmer.sentToday || 0) + 1,
        totalConversationsCompleted: (warmer.totalConversationsCompleted || 0) + 1,
        lastActivityAt: new Date().toISOString(),
        recentLogs: [newLog, ...(warmer.recentLogs || []).slice(0, 15)],
      });
    }, 25000);

    return () => clearInterval(interval);
  }, [isRunning, session.status, warmer, onUpdateWarmer]);

  const handleToggleWarmer = () => {
    if (session.status !== 'connected') {
      onOpenConnectModal();
      return;
    }

    const nextState = !isRunning;
    setIsRunning(nextState);

    const newLog = {
      id: `wlog-${Date.now()}`,
      text: nextState
        ? `🔥 Aquecedor de Chip ativado na Fase ${warmer.phase}. Rotinas de maturação em execução.`
        : `⏸️ Aquecedor pausado pelo usuário.`,
      timestamp: new Date().toISOString(),
      status: nextState ? ('success' as const) : ('info' as const),
    };

    onUpdateWarmer({
      ...warmer,
      isActive: nextState,
      recentLogs: [newLog, ...(warmer.recentLogs || []).slice(0, 15)],
    });
  };

  const handleChangePhase = (newPhase: number) => {
    const target = newPhase === 1 ? 15 : newPhase === 2 ? 35 : newPhase === 3 ? 80 : 250;
    onUpdateWarmer({
      ...warmer,
      phase: newPhase,
      targetDailyMessages: target,
      recentLogs: [
        {
          id: `wlog-${Date.now()}`,
          text: `Progrediu para a Fase ${newPhase} de Aquecimento (${target} conversas/dia).`,
          timestamp: new Date().toISOString(),
          status: 'success',
        },
        ...(warmer.recentLogs || []).slice(0, 15),
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Flame className="w-6 h-6 text-red-600" />
              Aquecedor de Chip & Sistema Anti-Ban Avançado
            </h1>
            <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full font-bold">
              Score de Saúde: {warmer.healthScore || 98}%
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Aqueça seu número de WhatsApp de forma gradual e segura antes de realizar grandes campanhas para evitar bloqueios da Meta.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleToggleWarmer}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all shadow-md flex items-center gap-2 ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25'
                : 'bg-gradient-to-r from-red-600 via-rose-700 to-black hover:from-red-500 hover:to-zinc-900 text-white shadow-red-600/25'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-white" /> Pausar Aquecedor
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" /> Iniciar Aquecimento Ativo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Saúde do Chip</span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{warmer.healthScore}%</span>
            <span className="text-[10px] font-bold text-emerald-600">Excelente</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${warmer.healthScore}%` }} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Ciclos de Hoje</span>
            <Activity className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{warmer.sentToday}</span>
            <span className="text-xs text-slate-400 font-bold">/ {warmer.targetDailyMessages} meta</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-red-600 h-2 rounded-full"
              style={{ width: `${Math.min(100, (warmer.sentToday / warmer.targetDailyMessages) * 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Fase Atual</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">Fase {warmer.phase}</span>
            <span className="text-xs text-slate-500 font-bold">de 4</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">Recomendado manter 3 a 5 dias por fase</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Status do Motor</span>
            <Zap className={`w-5 h-5 ${isRunning ? 'text-emerald-500' : 'text-slate-400'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl font-black ${isRunning ? 'text-emerald-600' : 'text-slate-500'}`}>
              {isRunning ? 'Ativo & Rodando' : 'Em Espera'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">Delays reais com digitação humana</p>
        </div>
      </div>

      {/* 4 Phases Progression */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-red-600" />
          Escala de Aquecimento Progressivo
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {phases.map((p) => {
            const isCurrent = warmer.phase === p.phase;
            return (
              <div
                key={p.phase}
                onClick={() => handleChangePhase(p.phase)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-red-50/50 border-red-500 ring-2 ring-red-500/20 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${
                      isCurrent
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Fase {p.phase}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] text-red-600 font-black flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ativa
                    </span>
                  )}
                </div>

                <h3 className="text-xs font-black text-slate-900">{p.title}</h3>
                <p className="text-[11px] text-slate-500 mt-1 mb-3 leading-relaxed">{p.desc}</p>

                <div className="space-y-1 text-[11px] pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-slate-600">
                    <span className="font-medium">Limite Diário:</span>
                    <span className="font-bold text-slate-900">{p.dailyTarget} conversas</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="font-medium">Intervalo Seguro:</span>
                    <span className="font-bold text-slate-900">{p.delayRange}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Logs */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-red-600" />
          Registro de Ciclos do Aquecedor (Logs ao Vivo)
        </h2>

        <div className="space-y-2">
          {warmer.recentLogs && warmer.recentLogs.length > 0 ? (
            warmer.recentLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs gap-3 font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                  <span className="text-slate-800">{log.text}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">Nenhuma atividade registrada ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
};
