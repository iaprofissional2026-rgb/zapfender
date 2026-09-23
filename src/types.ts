export interface Contact {
  id: string;
  name: string;
  phone: string;
  group: string;
  status: 'active' | 'invalid' | 'opt_out';
  tags: string[];
  variables: Record<string, string>;
  avatarUrl?: string;
  lastSentAt?: string;
  createdAt: string;
  notes?: string;
  isRealContact?: boolean;
}

export interface ContactGroup {
  id: string;
  name: string;
  color: string;
  description?: string;
  contactCount?: number;
  createdAt: string;
  isRealWhatsAppGroup?: boolean;
  participantsCount?: number;
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: 'vendas' | 'cobranca' | 'atendimento' | 'lembrete' | 'pos-venda' | 'geral';
  mediaType?: 'none' | 'image' | 'audio' | 'document' | 'video';
  mediaUrl?: string;
  mediaName?: string;
  isVoiceSimulated?: boolean;
  spintaxEnabled?: boolean;
  createdAt: string;
}

export interface DispatchLog {
  id: string;
  campaignId: string;
  contactId: string;
  contactName: string;
  phone: string;
  renderedMessage: string;
  status: 'pending' | 'sending' | 'success' | 'failed' | 'skipped';
  timestamp: string;
  messageId?: string;
  error?: string;
  delaySeconds?: number;
  simulatedDelay?: number;
}

export interface Campaign {
  id: string;
  name: string;
  templateId?: string;
  messageContent: string;
  targetType: 'groups' | 'contacts' | 'direct_list';
  targetGroupIds: string[];
  targetContactIds: string[];
  directNumbers?: string[];
  mediaType?: 'none' | 'image' | 'audio' | 'document';
  mediaUrl?: string;
  mediaName?: string;
  isVoiceSimulated?: boolean;
  sendImmediately: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
  minDelaySeconds: number;
  maxDelaySeconds: number;
  pauseEveryCount: number;
  pauseDurationSeconds: number;
  status: 'scheduled' | 'running' | 'paused' | 'completed' | 'canceled';
  totalCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  completedAt?: string;
  logs?: DispatchLog[];
}

export interface WhatsAppSession {
  id: string;
  name: string;
  phone: string;
  pushname?: string;
  status: 'disconnected' | 'connecting' | 'qrcode' | 'connected';
  qrCodeUrl?: string;
  connectedAt?: string;
  antiBanHealthScore: number;
  batteryLevel: number;
  isCharging: boolean;
  dailySentCount: number;
  dailyLimit: number;
}

export interface AppSettings {
  defaultMinDelay: number;
  defaultMaxDelay: number;
  defaultPauseEvery: number;
  defaultPauseDuration: number;
  autoSaveDrafts: boolean;
  antiBanSafetyMode: 'conservative' | 'balanced' | 'turbo';
}

export interface AutoResponderRule {
  id: string;
  keyword: string;
  matchType: 'exact' | 'contains' | 'startsWith';
  replyMessage: string;
  mediaType?: 'none' | 'image' | 'audio' | 'document';
  mediaUrl?: string;
  mediaName?: string;
  delaySeconds: number;
  isActive: boolean;
  triggerCount: number;
  lastTriggeredAt?: string;
  createdAt: string;
}

export interface ChipWarmerSession {
  isActive: boolean;
  phase: number;
  targetDailyMessages: number;
  sentToday: number;
  totalConversationsCompleted: number;
  healthScore: number;
  speed: 'slow' | 'medium' | 'fast';
  lastActivityAt?: string;
  recentLogs: Array<{
    id: string;
    text: string;
    timestamp: string;
    status: 'success' | 'warning' | 'info';
  }>;
}

export interface SupermarketDebtProduct {
  code: string;
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface SupermarketDebtItem {
  id: string;
  cupomCode: string;
  description: string;
  purchaseDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: 'open' | 'overdue' | 'paid' | 'partial';
  productsList?: SupermarketDebtProduct[];
}

export interface SupermarketCustomer {
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  cpfCnpj?: string;
  creditLimit: number;
  totalDebt: number;
  totalPaid: number;
  status: 'up_to_date' | 'pending' | 'overdue' | 'blocked';
  debts: SupermarketDebtItem[];
  address?: string;
  lastPurchaseDate?: string;
  lastPaymentDate?: string;
  notes?: string;
  source: 'erp_api' | 'manual' | 'csv_import' | 'xml_nfe';
  createdAt?: string;
}

export interface SupermarketErpConfig {
  systemType: 'syspdv' | 'vr_software' | 'bluesoft' | 'totvs' | 'hiper' | 'linx' | 'sg_sistemas' | 'gdoor' | 'generic_rest' | 'sql_database';
  erpName: string;
  apiUrl: string;
  apiKey: string;
  storeCode?: string;
  pixKey: string;
  pixName: string;
  autoSync: boolean;
  lastSyncAt?: string;
  status: 'connected' | 'disconnected' | 'error';
  errorMessage?: string;
}

