/**
 * WhatsApp Real Socket API client
 */

export interface BackendWhatsAppState {
  status: 'disconnected' | 'connecting' | 'qrcode' | 'connected';
  qrCodeDataUrl: string | null;
  qrCodeRaw: string | null;
  pairingCode: string | null;
  user: {
    id: string;
    phone: string;
    name: string;
  } | null;
  lastError: string | null;
  connectedAt: string | null;
}

export interface RealWhatsAppDataResponse {
  success: boolean;
  totalGroups: number;
  totalContacts: number;
  groups: Array<{
    id: string;
    name: string;
    jid: string;
    color: string;
    description?: string;
    participantsCount: number;
    isRealWhatsAppGroup: boolean;
    participants: Array<{ id: string; phone: string; admin?: string | null }>;
  }>;
  contacts: Array<{
    id: string;
    name: string;
    phone: string;
    group: string;
    status: 'active';
    tags: string[];
    variables: Record<string, string>;
    isRealContact: boolean;
    createdAt: string;
  }>;
  error?: string;
}

export async function fetchWhatsAppStatus(): Promise<BackendWhatsAppState> {
  try {
    const res = await fetch('/api/whatsapp/status');
    if (!res.ok) throw new Error('Falha ao obter status');
    return await res.json();
  } catch (err) {
    console.warn('API status fetch error:', err);
    return {
      status: 'disconnected',
      qrCodeDataUrl: null,
      qrCodeRaw: null,
      pairingCode: null,
      user: null,
      lastError: null,
      connectedAt: null,
    };
  }
}

export async function fetchRealWhatsAppData(): Promise<RealWhatsAppDataResponse> {
  const res = await fetch('/api/whatsapp/real-data');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Falha ao buscar dados reais do WhatsApp');
  }
  return await res.json();
}

export async function connectWhatsApp(): Promise<BackendWhatsAppState> {
  const res = await fetch('/api/whatsapp/connect', { method: 'POST' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao conectar');
  }
  return await res.json();
}

export async function requestPairingCode(phone: string): Promise<void> {
  const res = await fetch('/api/whatsapp/pairing-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao requisitar código');
  }
}

export async function logoutWhatsApp(): Promise<void> {
  const res = await fetch('/api/whatsapp/logout', { method: 'POST' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao desconectar');
  }
}

export async function sendWhatsAppMessage(
  phone: string, 
  message: string, 
  options?: {
    mediaType?: 'none' | 'image' | 'audio' | 'document';
    mediaUrl?: string;
    mediaName?: string;
    isVoiceSimulated?: boolean;
  }
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ 
        phone, 
        message, 
        mediaType: options?.mediaType,
        mediaUrl: options?.mediaUrl,
        mediaName: options?.mediaName,
        isVoiceSimulated: options?.isVoiceSimulated
      }),
    });
    clearTimeout(timeoutId);

    let data: any = {};
    try {
      data = await res.json();
    } catch {
      data = { error: `Servidor retornou resposta inesperada (Status HTTP: ${res.status})` };
    }

    if (!res.ok) {
      throw new Error(data.error || `Falha no envio (Status HTTP: ${res.status})`);
    }
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Tempo limite de 25s excedido na comunicação com o WhatsApp.');
    }
    if (err.message && err.message.includes('Failed to fetch')) {
      throw new Error('Falha de conexão com o servidor local. Verifique se o WhatsApp está pareado.');
    }
    throw err;
  }
}

export async function syncAutoResponderRulesWithBackend(rules: any[]) {
  try {
    const res = await fetch('/api/autoresponder/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules }),
    });
    return await res.json();
  } catch (err) {
    console.warn('[AutoResponder Sync] Notice:', err);
  }
}

export async function syncSupermarketERP(config: {
  apiUrl: string;
  apiKey?: string;
  systemType?: string;
  storeCode?: string;
}) {
  const res = await fetch('/api/supermarket/sync-erp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao sincronizar com ERP do Supermercado');
  }
  return data;
}

export async function checkWhatsAppNumbers(phones: string[]): Promise<{
  success: boolean;
  results: Array<{ phone: string; exists: boolean; jid?: string }>;
}> {
  const res = await fetch('/api/whatsapp/check-numbers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phones }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao validar números no WhatsApp');
  }
  return data;
}

export function subscribeToWhatsAppEvents(
  onUpdate: (state: BackendWhatsAppState) => void
): () => void {
  let eventSource: EventSource | null = null;
  let isClosed = false;

  const initSSE = () => {
    if (isClosed) return;
    try {
      eventSource = new EventSource('/api/whatsapp/events');
      
      eventSource.onmessage = (event) => {
        try {
          const parsed: BackendWhatsAppState = JSON.parse(event.data);
          onUpdate(parsed);
        } catch (e) {
          console.error('[SSE] Error parsing state:', e);
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        // Auto-reconnect SSE stream after 4 seconds
        if (!isClosed) {
          setTimeout(initSSE, 4000);
        }
      };
    } catch (e) {
      console.warn('[SSE] EventSource init failed:', e);
    }
  };

  initSSE();

  return () => {
    isClosed = true;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}
