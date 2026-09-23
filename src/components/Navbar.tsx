import React from 'react';
import {
  Send,
  LayoutDashboard,
  FileText,
  Clock,
  BarChart3,
  ShieldCheck,
  Smartphone,
  Plus,
  Sparkles,
  Menu,
  X,
  Battery,
  Zap,
  FolderKanban,
  Bot,
  Flame,
  CheckCircle2,
  Store,
  LucideIcon,
} from 'lucide-react';
import { WhatsAppSession } from '../types';
import { ZapLogo } from './ZapLogo';

export type AppView =
  | 'dashboard'
  | 'campaign'
  | 'supermarket'
  | 'contacts'
  | 'autoresponder'
  | 'warmer'
  | 'templates'
  | 'scheduled'
  | 'reports'
  | 'antiban';

interface NavItem {
  id: AppView;
  label: string;
  icon: LucideIcon;
  highlight?: boolean;
}

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  session: WhatsAppSession;
  onOpenConnectModal: () => void;
  onOpenAIModal: () => void;
  onOpenQuickTestModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  session,
  onOpenConnectModal,
  onOpenAIModal,
  onOpenQuickTestModal,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState<boolean>(false);
  const isConnected = session.status === 'connected';

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'supermarket', label: 'Supermercado & Fiado', icon: Store, highlight: true },
    { id: 'campaign', label: 'Disparador Real', icon: Send },
    { id: 'contacts', label: 'Contatos & Grupos', icon: FolderKanban },
    { id: 'autoresponder', label: 'Auto-Responder', icon: Bot },
    { id: 'warmer', label: 'Aquecedor de Chip', icon: Flame },
    { id: 'scheduled', label: 'Agendamentos', icon: Clock },
    { id: 'templates', label: 'Modelos', icon: FileText },
    { id: 'reports', label: 'Logs', icon: BarChart3 },
    { id: 'antiban', label: 'Anti-Ban', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div
            className="cursor-pointer group select-none flex items-center gap-2"
            onClick={() => onNavigate('dashboard')}
          >
            <ZapLogo size="md" showSubtitle={true} />
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden xl:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-red-600 to-black text-white shadow-sm shadow-red-600/20'
                      : item.highlight
                      ? 'text-red-700 bg-red-50 hover:bg-red-100 border border-red-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Action Buttons */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Quick Test Button */}
            <button
              onClick={onOpenQuickTestModal}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <Send className="w-3.5 h-3.5 text-red-600" />
              <span>Teste Rápido</span>
            </button>

            {/* AI Generator Button */}
            <button
              onClick={onOpenAIModal}
              className="px-3 py-1.5 bg-gradient-to-r from-rose-50 to-red-50 hover:from-rose-100 hover:to-red-100 border border-red-200/90 text-red-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-red-600 animate-pulse" />
              <span>IA Copy</span>
            </button>

            {/* WhatsApp Connection Status Badge */}
            <button
              onClick={onOpenConnectModal}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-2xs'
                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 animate-pulse'
              }`}
            >
              <span className="relative flex h-2 w-2">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isConnected ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
              </span>
              <Smartphone className="w-3.5 h-3.5" />
              <span className="font-extrabold">
                {isConnected ? `WA Conectado` : 'Conectar WhatsApp'}
              </span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex xl:hidden items-center gap-2">
            <button
              onClick={onOpenConnectModal}
              className={`p-2 rounded-xl text-xs font-bold border ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="xl:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-5 space-y-2 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onOpenQuickTestModal();
                setIsMobileMenuOpen(false);
              }}
              className="w-full py-2 bg-slate-100 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-200"
            >
              <Send className="w-3.5 h-3.5 text-red-600" /> Teste Rápido
            </button>
            <button
              onClick={() => {
                onOpenAIModal();
                setIsMobileMenuOpen(false);
              }}
              className="w-full py-2 bg-red-50 text-red-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-red-200"
            >
              <Sparkles className="w-3.5 h-3.5 text-red-600" /> IA Mensagens
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-red-600 to-black text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
