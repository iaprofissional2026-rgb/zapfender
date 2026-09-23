import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Play, 
  Pause, 
  Square, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Smartphone, 
  ShieldCheck, 
  Send, 
  User, 
  Sparkles,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { Campaign, Contact, DispatchLog, WhatsAppSession } from '../types';
import { renderPersonalizedMessage, formatPhoneDisplay, sanitizePhoneNumber } from '../utils/messageFormatter';
import { sendWhatsAppMessage } from '../services/whatsappApi';

interface LiveDispatcherModalProps {
  campaign: Campaign;
  contacts: Contact[];
  session: WhatsAppSession;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCampaign: (campaign: Campaign) => void;
  onUpdateSession: (session: WhatsAppSession) => void;
}

export const LiveDispatcherModal: React.FC<LiveDispatcherModalProps> = ({
  campaign,
  contacts,
  session,
  isOpen,
  onClose,
  onUpdateCampaign,
  onUpdateSession,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(0);
  const [logs, setLogs] = useState<DispatchLog[]>(campaign.logs || []);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [currentContact, setCurrentContact] = useState<Contact | null>(null);
  const [currentRenderedMsg, setCurrentRenderedMsg] = useState<string>('');
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [lastSentStatus, setLastSentStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [isTurbo, setIsTurbo] = useState<boolean>(false);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const isRunningRef = useRef<boolean>(isRunning);
  const isTurboRef = useRef<boolean>(isTurbo);
  const activeRef = useRef<boolean>(true);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    isTurboRef.current = isTurbo;
  }, [isTurbo]);

  // Resolve target contacts solidly
  const targetContacts: Contact[] = React.useMemo(() => {
    // 1. Direct numbers list
    if (campaign.directNumbers && campaign.directNumbers.length > 0) {
      return campaign.directNumbers.map((num, idx) => ({
        id: `direct-${idx}`,
        name: `Contato ${idx + 1}`,
        phone: sanitizePhoneNumber(num) || num,
        group: 'direto',
        status: 'active' as const,
        tags: ['Direto'],
        variables: { empresa: 'Sua Empresa' },
        createdAt: new Date().toISOString(),
      }));
    }

    // 2. Specific contacts selection
    if (campaign.targetType === 'contacts' && campaign.targetContactIds && campaign.targetContactIds.length > 0) {
      const selected = contacts.filter((c) => campaign.targetContactIds.includes(c.id));
      if (selected.length > 0) return selected;
    }

    // 3. Specific groups selection
    if (campaign.targetType === 'groups' && campaign.targetGroupIds && campaign.targetGroupIds.length > 0) {
      const selected = contacts.filter((c) => campaign.targetGroupIds.includes(c.group) && c.status === 'active');
      if (selected.length > 0) return selected;
    }

    // 4. Fallback: all active contacts with valid phone
    const valid = contacts.filter((c) => c.phone && sanitizePhoneNumber(c.phone).length >= 8);
    return valid.length > 0 ? valid : contacts;
  }, [campaign, contacts]);

  // Auto scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, isTyping]);

  // Main Dispatch Loop
  useEffect(() => {
    if (!isOpen || isFinished || targetContacts.length === 0) return;

    activeRef.current = true;
    let accumulatedLogs: DispatchLog[] = [...(campaign.logs || [])];
    let sentCount = campaign.sentCount || 0;
    let failedCount = campaign.failedCount || 0;

    const processQueue = async () => {
      for (let idx = currentIndex; idx < targetContacts.length; idx++) {
        if (!activeRef.current) break;

        // Pause check
        while (!isRunningRef.current && activeRef.current) {
          await new Promise((r) => setTimeout(r, 400));
        }
        if (!activeRef.current) break;

        const contact = targetContacts[idx];
        setCurrentIndex(idx);
        setCurrentContact(contact);

        const rendered = renderPersonalizedMessage(campaign.messageContent, contact);
        setCurrentRenderedMsg(rendered);

        // Visual typing indicator (short humanized burst)
        setIsTyping(true);
        setLastSentStatus('sending');
        const typingDelay = isTurboRef.current ? 400 : 1200;
        await new Promise((r) => setTimeout(r, typingDelay));
        if (!activeRef.current) break;
        setIsTyping(false);

        // REAL SEND VIA WHATSAPP SOCKET
        let sendSuccess = false;
        let realMessageId: string | undefined;
        let errorMessage: string | undefined;

        try {
          const cleanPhone = sanitizePhoneNumber(contact.phone) || contact.phone;
          console.log(`[Live Dispatcher] Real WhatsApp sending to ${cleanPhone} (${contact.name})...`);

          const sendRes = await sendWhatsAppMessage(cleanPhone, rendered, {
            mediaType: campaign.mediaType,
            mediaUrl: campaign.mediaUrl,
            mediaName: campaign.mediaName,
            isVoiceSimulated: campaign.isVoiceSimulated,
          });

          sendSuccess = true;
          realMessageId = sendRes?.messageId;
          setLastSentStatus('sent');
          sentCount++;

          // Update real daily counter
          onUpdateSession({
            ...session,
            dailySentCount: (session.dailySentCount || 0) + 1,
          });
        } catch (err: any) {
          console.error(`[Live Dispatcher] Send failed for ${contact.phone}:`, err);
          sendSuccess = false;
          errorMessage = err?.message || 'Falha no envio via WhatsApp';
          setLastSentStatus('error');
          failedCount++;
        }

        const newLog: DispatchLog = {
          id: `log-${Date.now()}-${idx}`,
          campaignId: campaign.id,
          contactId: contact.id,
          contactName: contact.name,
          phone: contact.phone,
          renderedMessage: rendered,
          status: sendSuccess ? 'success' : 'failed',
          error: errorMessage,
          messageId: realMessageId,
          timestamp: new Date().toISOString(),
          simulatedDelay: isTurboRef.current ? 2 : Math.floor(Math.random() * 4) + 3,
        };

        accumulatedLogs = [newLog, ...accumulatedLogs];
        setLogs([...accumulatedLogs]);

        // Sync with parent state
        onUpdateCampaign({
          ...campaign,
          sentCount,
          failedCount,
          logs: accumulatedLogs,
        });

        // If finished
        if (idx === targetContacts.length - 1) {
          setIsFinished(true);
          onUpdateCampaign({
            ...campaign,
            status: 'completed',
            sentCount,
            failedCount,
            completedAt: new Date().toISOString(),
            logs: accumulatedLogs,
          });
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          break;
        }

        // Delay between contacts (Anti-Ban safety)
        const minDel = campaign.minDelaySeconds || 4;
        const maxDel = campaign.maxDelaySeconds || 10;
        const delaySeconds = isTurboRef.current
          ? 2
          : Math.floor(Math.random() * (maxDel - minDel + 1)) + minDel;

        for (let cd = delaySeconds; cd > 0; cd--) {
          if (!activeRef.current) break;
          while (!isRunningRef.current && activeRef.current) {
            await new Promise((r) => setTimeout(r, 400));
          }
          setCountdown(cd);
          await new Promise((r) => setTimeout(r, 1000));
        }
        setCountdown(0);
      }
    };

    processQueue();

    return () => {
      activeRef.current = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const total = targetContacts.length;
  const progressPercent = total > 0 ? Math.round(((currentIndex + (isFinished ? 1 : 0)) / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-red-600 via-rose-700 to-black text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Send className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">{campaign.name}</h2>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                  {isFinished ? 'Disparo Concluído' : isRunning ? 'Disparo Real Ativo' : 'Pausado'}
                </span>
              </div>
              <p className="text-xs text-rose-100">
                Transmissão direta pelo WhatsApp Conectado ({session.phone || 'Ativo'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isFinished && (
              <>
                <button
                  onClick={() => setIsTurbo(!isTurbo)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 border ${
                    isTurbo
                      ? 'bg-amber-400 text-black border-amber-300 shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                  }`}
                  title="Modo Turbo reduz os intervalos de envio para 2s"
                >
                  <Zap className="w-3.5 h-3.5" /> {isTurbo ? 'Turbo Ativo (2s)' : 'Modo Turbo'}
                </button>

                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isRunning
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isRunning ? 'Pausar' : 'Continuar'}
                </button>
              </>
            )}

            <button
              onClick={() => {
                activeRef.current = false;
                onClose();
              }}
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all"
            >
              {isFinished ? 'Concluir' : 'Minimizar'}
            </button>
          </div>
        </div>

        {/* Progress Metrics Bar */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-700">
                Progresso Geral: {currentIndex + (isFinished ? 1 : 0)} de {total} contatos ({progressPercent}%)
              </span>
              <span className="font-mono text-red-600 font-black">
                {campaign.sentCount || 0} Enviados · {campaign.failedCount || 0} Falhas
              </span>
            </div>
            <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden p-0.5 border border-slate-300">
              <div
                className="bg-gradient-to-r from-red-600 to-black h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Status</span>
              <span className="text-xs font-black text-slate-900 block mt-1">
                {isFinished ? '✅ Finalizado' : isRunning ? '⚡ Disparando' : '⏸️ Em Pausa'}
              </span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Intervalo Seguro</span>
              <span className="text-xs font-bold text-slate-900 block mt-1">
                {isTurbo ? '2 segundos' : `${campaign.minDelaySeconds || 4}s ~ ${campaign.maxDelaySeconds || 10}s`}
              </span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Próximo Envio Em</span>
              <span className="text-xs font-black text-red-600 block mt-1 flex items-center gap-1">
                {countdown > 0 ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" /> {countdown}s
                  </>
                ) : isTyping ? (
                  'Digitando...'
                ) : isFinished ? (
                  'Concluído'
                ) : (
                  'Aguardando...'
                )}
              </span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Mídia Anexada</span>
              <span className="text-xs font-bold text-slate-800 block mt-1">
                {campaign.mediaType && campaign.mediaType !== 'none' ? `Sim (${campaign.mediaType})` : 'Apenas Texto'}
              </span>
            </div>
          </div>
        </div>

        {/* Content: Logs List + Phone Preview */}
        <div className="flex-1 grid md:grid-cols-2 p-6 gap-6 overflow-y-auto">
          {/* Logs View */}
          <div className="space-y-3 flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Logs Reais de Transmissão ({logs.length})
              </h3>
            </div>

            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-3 max-h-80 overflow-y-auto space-y-2 font-mono text-xs">
              {logs.length === 0 && !isTyping && (
                <div className="text-center text-slate-400 py-16">
                  Iniciando disparos reais no WhatsApp...
                </div>
              )}

              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2.5 rounded-xl border shadow-2xs space-y-1 text-[11px] ${
                    log.status === 'success'
                      ? 'bg-white border-slate-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      {log.status === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                      )}
                      {log.contactName} ({formatPhoneDisplay(log.phone)})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>

                  <div className="text-slate-700 font-sans truncate text-[11px]">
                    {log.renderedMessage}
                  </div>

                  {log.messageId && (
                    <div className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center justify-between">
                      <span>✓ Entregue no WhatsApp</span>
                      <span>ID: {log.messageId}</span>
                    </div>
                  )}

                  {log.error && (
                    <div className="text-[10px] text-red-700 font-bold bg-red-100/70 p-1.5 rounded-lg">
                      {log.error}
                    </div>
                  )}
                </div>
              ))}

              {isTyping && currentContact && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-900 rounded-xl flex items-center gap-2 text-xs font-bold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                  Emitindo presença de digitação para {currentContact.name}...
                </div>
              )}

              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Current Message Smartphone View */}
          <div className="space-y-3 flex flex-col">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-red-600" />
              Destinatário Atual: {currentContact ? currentContact.name : 'Aguardando...'}
            </h3>

            <div className="flex-1 bg-[#efeae2] border border-slate-300 rounded-2xl p-4 max-h-80 flex flex-col justify-between shadow-inner">
              <div className="flex items-center justify-between border-b border-[#dfd8cc] pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-700">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      {currentContact ? currentContact.name : 'Selecionando...'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {currentContact ? formatPhoneDisplay(currentContact.phone) : ''}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    lastSentStatus === 'sent'
                      ? 'bg-emerald-100 text-emerald-800'
                      : lastSentStatus === 'sending'
                      ? 'bg-amber-100 text-amber-800 animate-pulse'
                      : lastSentStatus === 'error'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {lastSentStatus === 'sent'
                    ? '✓ Enviado'
                    : lastSentStatus === 'sending'
                    ? 'Disparando...'
                    : lastSentStatus === 'error'
                    ? 'Falha'
                    : 'Em Fila'}
                </span>
              </div>

              {/* Message bubble */}
              <div className="my-auto py-2 flex justify-end">
                <div className="bg-[#d9fdd3] max-w-[90%] p-3 rounded-2xl rounded-tr-xs shadow-xs text-xs font-medium text-slate-900 space-y-1.5">
                  {campaign.mediaType && campaign.mediaType !== 'none' && (
                    <div className="bg-black/10 p-2 rounded-lg text-[10px] font-bold text-slate-800 flex items-center gap-1.5">
                      <span>📎 Anexo ({campaign.mediaType}): {campaign.mediaName || 'Arquivo'}</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed text-[11px]">
                    {currentRenderedMsg || campaign.messageContent}
                  </p>
                  <div className="text-[9px] text-slate-500 text-right flex items-center justify-end gap-1 font-mono">
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-blue-600 font-bold">✓✓</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 text-center border-t border-[#dfd8cc] pt-1.5">
                Criptografia de ponta a ponta ativa pelo WhatsApp
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
