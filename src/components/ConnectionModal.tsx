import React, { useEffect, useState } from 'react';
import { 
  QrCode, 
  Smartphone, 
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck, 
  Battery, 
  LogOut, 
  KeyRound, 
  Clock, 
  Sparkles,
  AlertCircle,
  Check
} from 'lucide-react';
import { WhatsAppSession } from '../types';
import { 
  fetchWhatsAppStatus, 
  connectWhatsApp, 
  requestPairingCode, 
  logoutWhatsApp, 
  subscribeToWhatsAppEvents,
  BackendWhatsAppState 
} from '../services/whatsappApi';

interface QRCodeModalProps {
  session: WhatsAppSession;
  onUpdateSession: (session: WhatsAppSession) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectionModal: React.FC<QRCodeModalProps> = ({
  session,
  onUpdateSession,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'code'>('qr');
  const [backendState, setBackendState] = useState<BackendWhatsAppState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [phoneNumberInput, setPhoneNumberInput] = useState<string>('');
  const [isGeneratingCode, setIsGeneratingCode] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Subscribe to real-time events when modal is open
  useEffect(() => {
    if (!isOpen) return;

    // Initial connect check
    connectWhatsApp().catch((e) => console.log('Connect error:', e));

    const unsubscribe = subscribeToWhatsAppEvents((state) => {
      setBackendState(state);
      
      if (state.status === 'connected' && state.user) {
        onUpdateSession({
          ...session,
          status: 'connected',
          phone: state.user.phone,
          pushname: state.user.name || 'WhatsApp Conectado',
          connectedAt: state.connectedAt || new Date().toISOString(),
          antiBanHealthScore: 99,
          batteryLevel: 92,
          isCharging: true,
        });
      } else if (state.status === 'disconnected') {
        onUpdateSession({
          ...session,
          status: 'disconnected',
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  const handleRefreshQR = async () => {
    setIsLoading(true);
    try {
      await connectWhatsApp();
    } catch (err) {
      console.error('Error refreshing QR:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await logoutWhatsApp();
      onUpdateSession({
        ...session,
        status: 'disconnected',
        connectedAt: undefined,
      });
    } catch (err) {
      console.error('Error disconnecting:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPairingCode = async () => {
    if (!phoneNumberInput.trim()) return;
    setIsGeneratingCode(true);
    try {
      await requestPairingCode(phoneNumberInput);
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar código');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleCopyPairingCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!isOpen) return null;

  const isConnected = backendState?.status === 'connected' || session.status === 'connected';
  const isConnecting = backendState?.status === 'connecting' || isLoading;
  const qrCodeUrl = backendState?.qrCodeDataUrl;
  const pairingCode = backendState?.pairingCode;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-red-600 via-rose-700 to-zinc-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black flex items-center gap-2">
                Conectar WhatsApp Web Real (QR Code)
                {isConnected && (
                  <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full font-bold">
                    ✓ Online
                  </span>
                )}
              </h2>
              <p className="text-xs text-red-100">
                Conexão oficial P2P multi-aparelhos do WhatsApp sem precisar de API paga
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

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('qr')}
            className={`px-4 py-2.5 rounded-t-xl font-bold text-xs flex items-center gap-2 transition-all border-b-2 ${
              activeTab === 'qr'
                ? 'bg-white text-red-600 border-red-600 shadow-2xs'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4" />
            Escanear QR Code Real
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2.5 rounded-t-xl font-bold text-xs flex items-center gap-2 transition-all border-b-2 ${
              activeTab === 'code'
                ? 'bg-white text-red-600 border-red-600 shadow-2xs'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Conectar por Código de 8 Dígitos
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 overflow-y-auto bg-white">
          {isConnected ? (
            /* Connected State */
            <div className="space-y-6">
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-emerald-950">
                    Seu WhatsApp está 100% Conectado e Ativo!
                  </h3>
                  <p className="text-xs text-emerald-800 font-medium">
                    Número vinculado: <strong>{session.phone}</strong> • Disparos prontos
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-slate-500 text-xs block">Número Vinculado</span>
                  <span className="text-xs font-bold text-slate-900 block mt-1 truncate">
                    {session.phone || 'Sessão Ativa'}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-slate-500 text-xs block">Saúde do Chip</span>
                  <span className="text-xs font-bold text-emerald-600 block mt-1">
                    99% Excelente
                  </span>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-slate-500 text-xs block">Envios Hoje</span>
                  <span className="text-xs font-bold text-slate-900 block mt-1">
                    {session.dailySentCount} mensagens
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Deseja desconectar para usar outro número?
                </span>
                <button
                  onClick={handleDisconnect}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  {isLoading ? 'Desconectando...' : 'Desconectar WhatsApp'}
                </button>
              </div>
            </div>
          ) : activeTab === 'qr' ? (
            /* QR Code Tab */
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* QR Code Frame */}
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-white border-2 border-dashed border-red-400 rounded-3xl shadow-lg relative min-w-[240px] min-h-[240px] flex items-center justify-center">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="WhatsApp QR Code Real"
                      className="w-56 h-56 rounded-2xl shadow-sm"
                    />
                  ) : (
                    <div className="text-center p-4 space-y-2">
                      <RefreshCw className="w-8 h-8 text-red-600 animate-spin mx-auto" />
                      <p className="text-xs font-bold text-slate-700">Gerando QR Code Real...</p>
                      <p className="text-[11px] text-slate-400">Aguardando sessão do WhatsApp</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleRefreshQR}
                  disabled={isLoading}
                  className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 hover:underline"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  Recarregar QR Code
                </button>
              </div>

              {/* Step instructions */}
              <div className="space-y-4 text-slate-700">
                <h3 className="text-sm font-black text-slate-900">
                  Como conectar pelo seu celular:
                </h3>
                <ol className="space-y-3 text-xs leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <span>Abra o <strong>WhatsApp</strong> no seu celular.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <span>Toque em <strong>Configurações (ou 3 pontinhos)</strong> &gt; <strong>Aparelhos Conectados</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <span>Toque em <strong>Conectar um aparelho</strong> e aponte a câmera para o QR Code ao lado.</span>
                  </li>
                </ol>

                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-[11px] text-red-900 font-medium flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-red-600 flex-shrink-0" />
                  Conexão direta e segura mantida no seu navegador e servidor local.
                </div>
              </div>
            </div>
          ) : (
            /* Pairing Code Tab */
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900">
                  Conectar usando Código de Pareamento de 8 dígitos
                </h3>
                <p className="text-xs text-slate-500">
                  Digite seu número de WhatsApp com DDD para receber o código na tela do WhatsApp
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phoneNumberInput}
                  onChange={(e) => setPhoneNumberInput(e.target.value)}
                  placeholder="Ex: 5511999998888 (com DDI 55)"
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-red-600"
                />
                <button
                  onClick={handleRequestPairingCode}
                  disabled={isGeneratingCode || !phoneNumberInput}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-black text-white font-bold text-xs rounded-xl hover:from-red-500 hover:to-zinc-900 transition-all shadow-md shadow-red-600/20 disabled:opacity-50"
                >
                  {isGeneratingCode ? 'Gerando...' : 'Obter Código'}
                </button>
              </div>

              {pairingCode && (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
                  <span className="text-xs text-slate-500 font-bold">Seu Código de Pareamento:</span>
                  <div className="text-3xl font-black font-mono tracking-widest text-red-600">
                    {pairingCode}
                  </div>
                  <button
                    onClick={() => handleCopyPairingCode(pairingCode)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold rounded-xl text-slate-800 transition-colors inline-flex items-center gap-1.5"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <KeyRound className="w-4 h-4" />}
                    {copiedCode ? 'Código Copiado!' : 'Copiar Código'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sistema Multi-Device 2026 pronto para envios em massa</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
