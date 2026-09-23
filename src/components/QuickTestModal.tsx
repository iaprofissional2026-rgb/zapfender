import React, { useState } from 'react';
import {
  Send,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Paperclip,
  Image,
  Mic,
  FileText,
  X,
} from 'lucide-react';
import { WhatsAppSession } from '../types';
import { sendWhatsAppMessage } from '../services/whatsappApi';
import { resolveSpintax } from '../utils/messageFormatter';

interface QuickTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: WhatsAppSession;
  onOpenConnectModal: () => void;
}

export const QuickTestModal: React.FC<QuickTestModalProps> = ({
  isOpen,
  onClose,
  session,
  onOpenConnectModal,
}) => {
  const [phone, setPhone] = useState<string>(session.phone ? `+${session.phone}` : '');
  const [message, setMessage] = useState<string>(
    '{Olá|Oi|Tudo bem}! Este é um teste oficial de envio em tempo real do ZapSender Pro. ✅🚀'
  );
  const [mediaType, setMediaType] = useState<'none' | 'image' | 'audio' | 'document'>('none');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [mediaName, setMediaName] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setMediaUrl(result);
      setMediaName(file.name);
      if (file.type.startsWith('image/')) {
        setMediaType('image');
      } else if (file.type.startsWith('audio/')) {
        setMediaType('audio');
      } else {
        setMediaType('document');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setStatusMessage({ type: 'error', text: 'Informe o número do WhatsApp de destino.' });
      return;
    }

    if (session.status !== 'connected') {
      onOpenConnectModal();
      return;
    }

    setIsSending(true);
    setStatusMessage(null);

    try {
      const resolved = resolveSpintax(message);
      const res = await sendWhatsAppMessage(phone.trim(), resolved, {
        mediaType: mediaType !== 'none' ? mediaType : undefined,
        mediaUrl: mediaUrl || undefined,
        mediaName: mediaName || undefined,
        isVoiceSimulated: mediaType === 'audio',
      });

      setStatusMessage({
        type: 'success',
        text: `✅ Mensagem enviada com sucesso para ${phone}! ID do WhatsApp: ${res.messageId || 'OK'}`,
      });
    } catch (err: any) {
      console.error('[Quick Test] Error:', err);
      setStatusMessage({
        type: 'error',
        text: `❌ Falha no envio: ${err?.message || 'Verifique se o WhatsApp está conectado e se o número existe.'}`,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-red-600 via-rose-700 to-black text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black">Disparo de Teste Imediato (1 Clique)</h3>
              <p className="text-[11px] text-rose-100">Envie um teste direto para o seu número ou de um cliente</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSendTest} className="p-6 space-y-4">
          {session.status !== 'connected' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>WhatsApp desconectado. Conecte antes de testar.</span>
              </div>
              <button
                type="button"
                onClick={onOpenConnectModal}
                className="px-2.5 py-1 bg-amber-600 text-white font-bold text-[11px] rounded-lg"
              >
                Conectar
              </button>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">
              Número de Destino com DDD (Ex: 11999998888 ou +5511999998888)
            </label>
            <div className="relative">
              <Smartphone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 5511999998888"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-red-600"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Texto da Mensagem</label>
              <button
                type="button"
                onClick={() => setMessage((prev) => prev + ' {Olá|Oi|Fala}')}
                className="text-[10px] text-red-600 font-bold hover:underline"
              >
                + Spintax
              </button>
            </div>
            <textarea
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600"
            />
          </div>

          {/* Media attachment option */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-red-600" /> Anexar Mídia ao Teste (Opcional):
              </span>
              {mediaUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setMediaType('none');
                    setMediaUrl('');
                    setMediaName('');
                  }}
                  className="text-[10px] text-red-600 font-bold hover:underline"
                >
                  Remover Anexo
                </button>
              )}
            </div>

            <input
              type="file"
              id="quick-test-file"
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,audio/*,.pdf,.doc,.docx"
            />

            {!mediaUrl ? (
              <label
                htmlFor="quick-test-file"
                className="p-2.5 border border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-100"
              >
                <Paperclip className="w-3.5 h-3.5 text-slate-400" /> Escolher Foto, Áudio ou PDF
              </label>
            ) : (
              <div className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-slate-200">
                <span className="font-medium text-slate-800 truncate max-w-[280px]">
                  📎 {mediaName || 'Arquivo anexado'} ({mediaType})
                </span>
                <span className="text-[10px] bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-md">
                  Pronto
                </span>
              </div>
            )}
          </div>

          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl text-xs font-bold leading-relaxed ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 via-rose-700 to-black hover:from-red-500 hover:to-zinc-900 text-white font-black text-xs rounded-xl shadow-md shadow-red-600/25 flex items-center gap-2 transition-all"
            >
              <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-spin' : ''}`} />
              {isSending ? 'Disparando no WhatsApp...' : 'Enviar Teste Agora 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
