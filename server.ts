import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import QRCode from 'qrcode';
import pino from 'pino';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
  Browsers,
  Contact as BaileysContact,
  GroupMetadata,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_DIR = path.join(process.cwd(), 'whatsapp_auth');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// WhatsApp State
interface WhatsAppState {
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

let waState: WhatsAppState = {
  status: 'disconnected',
  qrCodeDataUrl: null,
  qrCodeRaw: null,
  pairingCode: null,
  user: null,
  lastError: null,
  connectedAt: null,
};

let waSocket: WASocket | null = null;
let isInitializing = false;
const sseClients = new Set<express.Response>();

// In-memory synced stores for contacts and groups
const syncedContactsMap = new Map<string, { id: string; name: string; phone: string; pushname?: string }>();
const syncedChatsMap = new Map<string, { id: string; name?: string; isGroup?: boolean }>();

let activeAutoResponderRules: Array<{
  id: string;
  keyword: string;
  matchType: 'exact' | 'contains' | 'startsWith';
  replyMessage: string;
  delaySeconds: number;
  isActive: boolean;
  triggerCount: number;
}> = [];

// Broadcast updates to all SSE subscribers
function broadcastState() {
  const payload = `data: ${JSON.stringify(waState)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Clean and resolve phone number helper with Brazilian number formatting & validation
async function resolveWhatsAppJid(target: string): Promise<string> {
  if (target.includes('@g.us') || target.includes('@s.whatsapp.net')) {
    return target;
  }
  let cleaned = target.replace(/\D/g, '');
  if (!cleaned) return `${target}@s.whatsapp.net`;

  // Fix duplicate country code (e.g. 5555...)
  if (cleaned.startsWith('5555')) {
    cleaned = cleaned.slice(2);
  }

  // Prepend 55 if 10 or 11 digits (DDD + 8 or 9 digits)
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  } else if (!cleaned.startsWith('55')) {
    const dddNum = parseInt(cleaned.slice(0, 2), 10);
    if (dddNum >= 11 && dddNum <= 99) {
      cleaned = '55' + cleaned;
    }
  }

  const rawJid = `${cleaned}@s.whatsapp.net`;

  if (waSocket && waState.status === 'connected') {
    try {
      const checkResults: any = await Promise.race([
        waSocket.onWhatsApp(rawJid),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);

      if (Array.isArray(checkResults) && checkResults.length > 0 && checkResults[0]?.exists) {
        return checkResults[0].jid;
      }

      // If Brazilian number with 9 digits (length 13: 55 + 2 DDD + 9 digits), try without 9th digit
      if (cleaned.startsWith('55') && cleaned.length === 13) {
        const ddd = cleaned.slice(2, 4);
        const rest = cleaned.slice(5); // remove 9
        const altJid = `55${ddd}${rest}@s.whatsapp.net`;
        const altResults: any = await Promise.race([
          waSocket.onWhatsApp(altJid),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
        ]);
        if (Array.isArray(altResults) && altResults.length > 0 && altResults[0]?.exists) {
          return altResults[0].jid;
        }
      }
    } catch (e) {
      console.warn('[WhatsApp] onWhatsApp check notice (fallback to standard JID):', e);
    }
  }

  return rawJid;
}

function formatPhoneToJid(target: string): string {
  if (target.includes('@g.us') || target.includes('@s.whatsapp.net')) {
    return target;
  }
  let cleaned = target.replace(/\D/g, '');
  if (!cleaned.startsWith('55') && (cleaned.length === 10 || cleaned.length === 11)) {
    cleaned = '55' + cleaned;
  }
  return `${cleaned}@s.whatsapp.net`;
}

// Extract phone from JID
function extractPhoneFromJid(jid: string): string {
  return jid.split('@')[0].split(':')[0].replace(/\D/g, '');
}

// Initialize Real WhatsApp Web Socket (Baileys)
async function startWhatsAppSocket(customPhoneForPairing?: string): Promise<void> {
  if (isInitializing) return;
  isInitializing = true;

  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`[WhatsApp] Using Baileys v${version.join('.')}, isLatest: ${isLatest}`);

    const logger = pino({ level: 'silent' });

    waSocket = makeWASocket({
      version,
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      printQRInTerminal: false,
      browser: Browsers.macOS('Desktop'),
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
    });

    waState.status = 'connecting';
    waState.lastError = null;
    broadcastState();

    // If phone number provided for pairing code mode
    if (customPhoneForPairing && !waSocket.authState.creds.registered) {
      setTimeout(async () => {
        try {
          const cleanPhone = customPhoneForPairing.replace(/\D/g, '');
          if (waSocket) {
            const code = await waSocket.requestPairingCode(cleanPhone);
            waState.pairingCode = code;
            broadcastState();
            console.log(`[WhatsApp] Pairing code generated: ${code}`);
          }
        } catch (err: any) {
          console.error('[WhatsApp] Error requesting pairing code:', err);
          waState.lastError = err?.message || 'Falha ao gerar código de pareamento';
          broadcastState();
        }
      }, 3000);
    }

    waSocket.ev.on('creds.update', saveCreds);

    // Track synced history (initial full sync from WhatsApp app)
    waSocket.ev.on('messaging-history.set', ({ chats, contacts, messages, isLatest }) => {
      console.log(`[WhatsApp Sync] History received: ${chats?.length || 0} chats, ${contacts?.length || 0} contacts, ${messages?.length || 0} msgs`);
      if (contacts) {
        for (const contact of contacts) {
          if (!contact.id) continue;
          const phone = extractPhoneFromJid(contact.id);
          const name = contact.notify || contact.verifiedName || contact.name || `+${phone}`;
          syncedContactsMap.set(contact.id, {
            id: contact.id,
            name,
            phone,
            pushname: contact.notify,
          });
        }
      }
      if (chats) {
        for (const chat of chats) {
          if (!chat.id) continue;
          syncedChatsMap.set(chat.id, {
            id: chat.id,
            name: chat.name || undefined,
            isGroup: chat.id.endsWith('@g.us'),
          });
          // If chat is a 1-on-1 contact, store in contacts if not present
          if (chat.id.endsWith('@s.whatsapp.net')) {
            const phone = extractPhoneFromJid(chat.id);
            if (!syncedContactsMap.has(chat.id)) {
              syncedContactsMap.set(chat.id, {
                id: chat.id,
                name: (chat.name as string) || `+${phone}`,
                phone,
                pushname: (chat.name as string) || undefined,
              });
            }
          }
        }
      }
    });

    // Track synced contacts
    waSocket.ev.on('contacts.upsert', (contacts: BaileysContact[]) => {
      for (const contact of contacts) {
        if (!contact.id) continue;
        const phone = extractPhoneFromJid(contact.id);
        const name = contact.notify || contact.verifiedName || contact.name || `+${phone}`;
        syncedContactsMap.set(contact.id, {
          id: contact.id,
          name,
          phone,
          pushname: contact.notify,
        });
      }
    });

    waSocket.ev.on('contacts.update', (updates) => {
      for (const update of updates) {
        if (!update.id) continue;
        const existing = syncedContactsMap.get(update.id);
        const phone = extractPhoneFromJid(update.id);
        const name = update.notify || update.verifiedName || update.name || existing?.name || `+${phone}`;
        syncedContactsMap.set(update.id, {
          id: update.id,
          name,
          phone,
          pushname: update.notify || existing?.pushname,
        });
      }
    });

    // Track chats
    waSocket.ev.on('chats.upsert', (chats) => {
      for (const chat of chats) {
        if (!chat.id) continue;
        syncedChatsMap.set(chat.id, {
          id: chat.id,
          name: chat.name || undefined,
          isGroup: chat.id.endsWith('@g.us'),
        });
        if (chat.id.endsWith('@s.whatsapp.net')) {
          const phone = extractPhoneFromJid(chat.id);
          if (!syncedContactsMap.has(chat.id)) {
            syncedContactsMap.set(chat.id, {
              id: chat.id,
              name: chat.name || `+${phone}`,
              phone,
            });
          }
        }
      }
    });

    // Helper to resolve Spintax on server
    function resolveSpintaxServer(text: string): string {
      return text.replace(/\{([^{}]+)\}/g, (_, choices) => {
        const options = choices.split('|');
        return options[Math.floor(Math.random() * options.length)];
      });
    }

    // Inbound Real Messages Listener for Auto-Responder & Live Chats
    waSocket.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') continue;

        const textContent =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          '';

        if (!textContent) continue;
        const textClean = textContent.trim().toLowerCase();
        console.log(`[WhatsApp Real Inbound] Message received from ${remoteJid}: "${textContent}"`);

        // Check active Auto-Responder rules
        for (const rule of activeAutoResponderRules) {
          if (!rule.isActive) continue;
          const kw = rule.keyword.trim().toLowerCase();
          let isMatch = false;

          if (rule.matchType === 'exact' && textClean === kw) isMatch = true;
          else if (rule.matchType === 'contains' && textClean.includes(kw)) isMatch = true;
          else if (rule.matchType === 'startsWith' && textClean.startsWith(kw)) isMatch = true;

          if (isMatch) {
            console.log(`[Auto-Responder REAL Trigger] Match on keyword "${rule.keyword}" for ${remoteJid}!`);
            rule.triggerCount = (rule.triggerCount || 0) + 1;
            const replyMsg = resolveSpintaxServer(rule.replyMessage);

            setTimeout(async () => {
              try {
                if (waSocket && waState.status === 'connected') {
                  await waSocket.sendPresenceUpdate('composing', remoteJid);
                  await new Promise((r) => setTimeout(r, (rule.delaySeconds || 2) * 1000));
                  await waSocket.sendMessage(remoteJid, { text: replyMsg });
                  console.log(`[Auto-Responder REAL Sent] Dispatched reply to ${remoteJid}: "${replyMsg}"`);
                }
              } catch (autoErr) {
                console.error('[Auto-Responder REAL Error]:', autoErr);
              }
            }, 600);
            break; // Stop at first matched rule
          }
        }
      }
    });

    waSocket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('[WhatsApp] Real QR Code generated by WhatsApp server');
        waState.qrCodeRaw = qr;
        try {
          waState.qrCodeDataUrl = await QRCode.toDataURL(qr, {
            width: 380,
            margin: 2,
            errorCorrectionLevel: 'M',
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          });
        } catch (qrErr) {
          console.error('[WhatsApp] QR Render Error:', qrErr);
        }
        waState.status = 'qrcode';
        broadcastState();
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`[WhatsApp] Connection closed (code: ${statusCode}). Reconnecting: ${shouldReconnect}`);

        if (statusCode === DisconnectReason.loggedOut) {
          waState.status = 'disconnected';
          waState.user = null;
          waState.qrCodeDataUrl = null;
          waState.qrCodeRaw = null;
          waState.pairingCode = null;
          syncedContactsMap.clear();
          syncedChatsMap.clear();
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch {}
        } else if (shouldReconnect) {
          waState.status = 'connecting';
          setTimeout(() => {
            isInitializing = false;
            startWhatsAppSocket();
          }, 3000);
        } else {
          waState.status = 'disconnected';
        }
        broadcastState();
      }

      if (connection === 'open') {
        console.log('[WhatsApp] Connection established successfully! Session linked.');
        const userJid = waSocket?.user?.id || '';
        const rawPhone = userJid.split(':')[0] || userJid.split('@')[0];
        
        waState.status = 'connected';
        waState.qrCodeDataUrl = null;
        waState.qrCodeRaw = null;
        waState.pairingCode = null;
        waState.lastError = null;
        waState.connectedAt = new Date().toISOString();
        waState.user = {
          id: userJid,
          phone: `+${rawPhone}`,
          name: waSocket?.user?.name || 'WhatsApp Conectado',
        };
        broadcastState();

        // Immediately fetch real participating groups in background
        setTimeout(async () => {
          try {
            if (waSocket) {
              console.log('[WhatsApp] Pre-fetching all participating groups in background...');
              const groups = await waSocket.groupFetchAllParticipating();
              console.log(`[WhatsApp] Successfully pre-fetched ${Object.keys(groups).length} groups!`);
            }
          } catch (e) {
            console.log('[WhatsApp] Background group fetch notice:', e);
          }
        }, 1500);
      }
    });
  } catch (err: any) {
    console.error('[WhatsApp] Initialization error:', err);
    waState.status = 'disconnected';
    waState.lastError = err?.message || 'Erro ao inicializar WhatsApp';
    broadcastState();
  } finally {
    isInitializing = false;
  }
}

// Auto-start WhatsApp connection if credentials exist
if (fs.existsSync(AUTH_DIR)) {
  startWhatsAppSocket();
}

// ==========================================
// REST API ROUTES
// ==========================================

// SSE for real-time status & QR code streaming
app.get('/api/whatsapp/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send current state immediately
  res.write(`data: ${JSON.stringify(waState)}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Get WhatsApp status
app.get('/api/whatsapp/status', (req, res) => {
  res.json(waState);
});

// Fetch Real WhatsApp Groups and Contacts
app.get('/api/whatsapp/real-data', async (req, res) => {
  try {
    if (!waSocket || waState.status !== 'connected') {
      return res.status(400).json({
        error: 'WhatsApp não está conectado. Escaneie o QR Code para carregar os dados reais.',
        groups: [],
        contacts: [],
      });
    }

    console.log('[WhatsApp] Fetching real participating groups and contacts from connected device...');
    
    // 1. Fetch real groups metadata
    let realGroups: Record<string, GroupMetadata> = {};
    try {
      realGroups = await waSocket.groupFetchAllParticipating();
    } catch (groupErr) {
      console.warn('[WhatsApp] Warning fetching participating groups:', groupErr);
    }

    const formattedGroups: Array<{
      id: string;
      name: string;
      jid: string;
      color: string;
      description?: string;
      participantsCount: number;
      isRealWhatsAppGroup: boolean;
      participants: Array<{ id: string; phone: string; admin?: string | null }>;
    }> = [];

    const realContactsList: Array<{
      id: string;
      name: string;
      phone: string;
      group: string;
      status: 'active';
      tags: string[];
      variables: Record<string, string>;
      isRealContact: boolean;
      createdAt: string;
    }> = [];

    const colorPalette = [
      '#dc2626', '#e11d48', '#b91c1c', '#991b1b', '#ea580c', 
      '#d97706', '#059669', '#2563eb', '#7c3aed', '#db2777'
    ];
    let colorIdx = 0;

    // Process real WhatsApp groups
    for (const [groupId, groupData] of Object.entries(realGroups)) {
      const groupColor = colorPalette[colorIdx % colorPalette.length];
      colorIdx++;

      const participants = (groupData.participants || []).map((p) => ({
        id: p.id,
        phone: extractPhoneFromJid(p.id),
        admin: p.admin || null,
      }));

      formattedGroups.push({
        id: groupId,
        name: groupData.subject || 'Grupo Sem Nome',
        jid: groupId,
        color: groupColor,
        description: groupData.desc || `${participants.length} participantes`,
        participantsCount: participants.length,
        isRealWhatsAppGroup: true,
        participants,
      });

      // Extract participants as contacts under this group
      for (const p of participants) {
        if (!p.phone) continue;
        const contactId = `real-wa-${p.phone}`;
        const existingName = syncedContactsMap.get(p.id)?.name;
        
        realContactsList.push({
          id: `${groupId}_${p.phone}`,
          name: existingName || `Contato +${p.phone}`,
          phone: p.phone,
          group: groupId,
          status: 'active',
          tags: [groupData.subject || 'Grupo WhatsApp', p.admin ? 'Admin' : 'Membro'],
          variables: {
            nome: existingName || `+${p.phone}`,
            grupo: groupData.subject || 'Grupo WhatsApp',
            empresa: 'WhatsApp',
          },
          isRealContact: true,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Also include any individually cached synced contacts
    for (const [jid, contactData] of syncedContactsMap.entries()) {
      if (jid.endsWith('@s.whatsapp.net') && contactData.phone) {
        // Only add if not already added in direct group
        const exists = realContactsList.some(c => c.phone === contactData.phone);
        if (!exists) {
          realContactsList.push({
            id: `direct-contact-${contactData.phone}`,
            name: contactData.name || `+${contactData.phone}`,
            phone: contactData.phone,
            group: formattedGroups.length > 0 ? formattedGroups[0].id : 'direto',
            status: 'active',
            tags: ['Contato WhatsApp Direct'],
            variables: {
              nome: contactData.name || `+${contactData.phone}`,
              empresa: 'WhatsApp',
            },
            isRealContact: true,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    console.log(`[WhatsApp] Synced ${formattedGroups.length} real groups and ${realContactsList.length} real contacts`);

    res.json({
      success: true,
      groups: formattedGroups,
      contacts: realContactsList,
      totalGroups: formattedGroups.length,
      totalContacts: realContactsList.length,
    });
  } catch (err: any) {
    console.error('[WhatsApp] Error fetching real data:', err);
    res.status(500).json({ error: err?.message || 'Erro ao obter contatos e grupos do WhatsApp' });
  }
});

// Initiate / Refresh connection to generate Real QR Code
app.post('/api/whatsapp/connect', async (req, res) => {
  try {
    if (waState.status === 'connected') {
      return res.json({ success: true, message: 'Já conectado', state: waState });
    }
    await startWhatsAppSocket();
    res.json({ success: true, state: waState });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Falha ao iniciar conexão' });
  }
});

// Request Real Pairing Code for Phone Number
app.post('/api/whatsapp/pairing-code', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Número de telefone é obrigatório' });
    }
    await startWhatsAppSocket(phone);
    res.json({ success: true, message: 'Solicitação de pareamento enviada' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Falha ao gerar código de pareamento' });
  }
});

// Logout / Disconnect WhatsApp
app.post('/api/whatsapp/logout', async (req, res) => {
  try {
    if (waSocket) {
      await waSocket.logout();
    }
    waState = {
      status: 'disconnected',
      qrCodeDataUrl: null,
      qrCodeRaw: null,
      pairingCode: null,
      user: null,
      lastError: null,
      connectedAt: null,
    };
    syncedContactsMap.clear();
    syncedChatsMap.clear();
    try {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    } catch {}
    broadcastState();
    res.json({ success: true, message: 'Desconectado com sucesso' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Falha ao desconectar' });
  }
});

// Send WhatsApp message through real socket
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { phone, message, mediaType, mediaUrl, mediaName, isVoiceSimulated } = req.body;
    if (!phone || (!message && !mediaUrl)) {
      return res.status(400).json({ error: 'Telefone e mensagem ou mídia são obrigatórios' });
    }

    if (!waSocket || waState.status !== 'connected') {
      return res.status(400).json({
        error: 'WhatsApp não está conectado. Escaneie o QR Code no topo da tela antes de disparar.',
      });
    }

    const jid = await resolveWhatsAppJid(phone);
    console.log(`[WhatsApp Real Dispatch] Sending to JID: ${jid} (Original Phone: ${phone})`);

    // Simulate typing / recording presence for realistic human delivery
    try {
      await Promise.race([
        waSocket.sendPresenceUpdate(mediaType === 'audio' ? 'recording' : 'composing', jid),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
      ]);
      await new Promise(r => setTimeout(r, 300));
      await Promise.race([
        waSocket.sendPresenceUpdate('paused', jid),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
      ]);
    } catch (presenceErr) {
      console.warn('[WhatsApp] Presence update warning (non-fatal):', presenceErr);
    }

    const sendAction = async () => {
      if (mediaType === 'image' && mediaUrl) {
        if (mediaUrl.startsWith('data:image')) {
          const base64Data = mediaUrl.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          return await waSocket!.sendMessage(jid, { image: buffer, caption: message || '' });
        } else {
          return await waSocket!.sendMessage(jid, { image: { url: mediaUrl }, caption: message || '' });
        }
      } else if (mediaType === 'audio' && mediaUrl) {
        if (mediaUrl.startsWith('data:audio')) {
          const base64Data = mediaUrl.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          return await waSocket!.sendMessage(jid, {
            audio: buffer,
            mimetype: 'audio/mp4',
            ptt: isVoiceSimulated !== false,
          });
        } else {
          return await waSocket!.sendMessage(jid, {
            audio: { url: mediaUrl },
            mimetype: 'audio/mp4',
            ptt: isVoiceSimulated !== false,
          });
        }
      } else if (mediaType === 'document' && mediaUrl) {
        if (mediaUrl.startsWith('data:')) {
          const base64Data = mediaUrl.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          return await waSocket!.sendMessage(jid, {
            document: buffer,
            mimetype: 'application/octet-stream',
            fileName: mediaName || 'arquivo.pdf',
            caption: message || '',
          });
        } else {
          return await waSocket!.sendMessage(jid, {
            document: { url: mediaUrl },
            mimetype: 'application/octet-stream',
            fileName: mediaName || 'arquivo.pdf',
            caption: message || '',
          });
        }
      } else {
        return await waSocket!.sendMessage(jid, { text: message });
      }
    };

    const sent: any = await Promise.race([
      sendAction(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tempo limite ao enviar para o WhatsApp (15s)')), 15000)
      ),
    ]);

    console.log(`[WhatsApp Real Dispatch] Message successfully dispatched! Message ID: ${sent?.key?.id}`);

    return res.json({
      success: true,
      messageId: sent?.key?.id,
      timestamp: new Date().toISOString(),
      recipient: jid,
    });
  } catch (err: any) {
    console.error('[WhatsApp Real Dispatch Error]:', err);
    return res.status(500).json({ error: err?.message || 'Falha ao enviar mensagem no WhatsApp' });
  }
});

// Check if numbers exist and are active on WhatsApp in real-time
app.post('/api/whatsapp/check-numbers', async (req, res) => {
  try {
    const { phones } = req.body;
    if (!Array.isArray(phones) || phones.length === 0) {
      return res.status(400).json({ error: 'Lista de números inválida' });
    }

    if (!waSocket || waState.status !== 'connected') {
      return res.status(400).json({ error: 'WhatsApp desconectado. Conecte seu aparelho primeiro.' });
    }

    const results: Array<{ phone: string; exists: boolean; jid?: string }> = [];

    for (const rawPhone of phones) {
      const cleanPhone = String(rawPhone).replace(/\D/g, '');
      if (!cleanPhone) continue;
      const targetJid = cleanPhone.includes('@s.whatsapp.net') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;
      try {
        const checkResults: any = await waSocket.onWhatsApp(targetJid);
        const result = Array.isArray(checkResults) && checkResults.length > 0 ? checkResults[0] : null;
        results.push({
          phone: cleanPhone,
          exists: !!result?.exists,
          jid: result?.jid,
        });
      } catch (err) {
        results.push({
          phone: cleanPhone,
          exists: false,
        });
      }
    }

    res.json({
      success: true,
      results,
    });
  } catch (err: any) {
    console.error('[Check Numbers Error]:', err);
    res.status(500).json({ error: err?.message || 'Erro ao validar números no WhatsApp' });
  }
});

// Auto-Responder Rules Sync Route
app.post('/api/autoresponder/sync', (req, res) => {
  const { rules } = req.body;
  if (Array.isArray(rules)) {
    activeAutoResponderRules = rules;
    console.log(`[Auto-Responder] Synchronized ${rules.length} active rules with WhatsApp Socket.`);
  }
  res.json({ success: true, count: activeAutoResponderRules.length });
});

// Supermarket ERP Mock Feed / Local Live Endpoint
app.get('/api/supermarket/mock-erp-feed', (req, res) => {
  const customers = [
    {
      id: 'sm-cli-001',
      customerCode: 'CLI-01048',
      name: 'José Carlos de Souza',
      phone: '5511987654321',
      cpfCnpj: '123.456.789-01',
      creditLimit: 1500.0,
      totalDebt: 348.9,
      totalPaid: 1150.0,
      status: 'overdue',
      address: 'Rua das Palmeiras, 142 - Centro',
      lastPurchaseDate: new Date(Date.now() - 3600000 * 24 * 18).toISOString(),
      lastPaymentDate: new Date(Date.now() - 3600000 * 24 * 45).toISOString(),
      notes: 'Cliente de caderneta do supermercado.',
      source: 'erp_api',
      debts: [
        {
          id: 'cup-1001',
          cupomCode: 'CUP-88421',
          description: 'Açougue & Frios (Picanha Bovina, Muçarela, Linguiça Toscana)',
          purchaseDate: new Date(Date.now() - 3600000 * 24 * 25).toISOString().split('T')[0],
          dueDate: new Date(Date.now() - 3600000 * 24 * 10).toISOString().split('T')[0],
          amount: 215.5,
          paidAmount: 0,
          status: 'overdue',
          productsList: [
            { code: 'PRD-0012', name: 'Picanha Bovina Resfriada (Kg)', qty: 1.8, unitPrice: 79.9, total: 143.82 },
            { code: 'PRD-0044', name: 'Queijo Muçarela Fatiado (Kg)', qty: 0.8, unitPrice: 48.0, total: 38.4 },
            { code: 'PRD-0091', name: 'Linguiça Toscana Sadia (Kg)', qty: 1.4, unitPrice: 23.77, total: 33.28 },
          ],
        },
        {
          id: 'cup-1002',
          cupomCode: 'CUP-89012',
          description: 'Mercearia & Hortifruti (Arroz Camil, Feijão Kicaldo, Frutas)',
          purchaseDate: new Date(Date.now() - 3600000 * 24 * 18).toISOString().split('T')[0],
          dueDate: new Date(Date.now() - 3600000 * 24 * 3).toISOString().split('T')[0],
          amount: 133.4,
          paidAmount: 0,
          status: 'overdue',
          productsList: [
            { code: 'PRD-0101', name: 'Arroz Tipo 1 Camil 5Kg', qty: 2, unitPrice: 29.9, total: 59.8 },
            { code: 'PRD-0105', name: 'Feijão Carioca Kicaldo 1Kg', qty: 3, unitPrice: 8.5, total: 25.5 },
            { code: 'PRD-0230', name: 'Kit Legumes e Verduras Frescas', qty: 1, unitPrice: 48.1, total: 48.1 },
          ],
        },
      ],
    },
    {
      id: 'sm-cli-002',
      customerCode: 'CLI-01092',
      name: 'Maria Aparecida Santos',
      phone: '5511991238765',
      cpfCnpj: '234.567.890-12',
      creditLimit: 2000.0,
      totalDebt: 582.4,
      totalPaid: 2400.0,
      status: 'overdue',
      address: 'Av. Brasil, 890 - Jd. América',
      lastPurchaseDate: new Date(Date.now() - 3600000 * 24 * 12).toISOString(),
      lastPaymentDate: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
      source: 'erp_api',
      debts: [
        {
          id: 'cup-1003',
          cupomCode: 'CUP-89540',
          description: 'Compra Geral do Mês (Mercearia, Laticínios e Bebidas)',
          purchaseDate: new Date(Date.now() - 3600000 * 24 * 20).toISOString().split('T')[0],
          dueDate: new Date(Date.now() - 3600000 * 24 * 5).toISOString().split('T')[0],
          amount: 582.4,
          paidAmount: 0,
          status: 'overdue',
          productsList: [
            { code: 'PRD-0300', name: 'Fardo Leite Integral Piracanjuba 12L', qty: 2, unitPrice: 58.0, total: 116.0 },
            { code: 'PRD-0315', name: 'Café Melitta 500g', qty: 4, unitPrice: 21.9, total: 87.6 },
            { code: 'PRD-0410', name: 'Produtos de Limpeza (Sabão Omo, Amaciante)', qty: 1, unitPrice: 168.8, total: 168.8 },
            { code: 'PRD-0501', name: 'Açougue (Carne Moída Patinho + Frango)', qty: 1, unitPrice: 210.0, total: 210.0 },
          ],
        },
      ],
    },
    {
      id: 'sm-cli-003',
      customerCode: 'CLI-01150',
      name: 'Antônio Ferreira Lima',
      phone: '5531988884433',
      cpfCnpj: '345.678.901-23',
      creditLimit: 1000.0,
      totalDebt: 189.5,
      totalPaid: 950.0,
      status: 'pending',
      address: 'Rua Sete de Setembro, 45',
      lastPurchaseDate: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
      source: 'erp_api',
      debts: [
        {
          id: 'cup-1004',
          cupomCode: 'CUP-90112',
          description: 'Padaria & Confeitaria (Pães, Bolos, Frios e Sucos)',
          purchaseDate: new Date(Date.now() - 3600000 * 24 * 4).toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 3600000 * 24 * 3).toISOString().split('T')[0],
          amount: 189.5,
          paidAmount: 0,
          status: 'open',
          productsList: [
            { code: 'PRD-0601', name: 'Pão Francês Tradicional (Kg)', qty: 3.5, unitPrice: 18.9, total: 66.15 },
            { code: 'PRD-0608', name: 'Torta Doce Holandesa Inteira', qty: 1, unitPrice: 75.0, total: 75.0 },
            { code: 'PRD-0710', name: 'Suco de Laranja Integral 2L', qty: 3, unitPrice: 16.11, total: 48.35 },
          ],
        },
      ],
    },
    {
      id: 'sm-cli-005',
      customerCode: 'CLI-01311',
      name: 'Renato Silveira Prado',
      phone: '5519981234567',
      cpfCnpj: '567.890.123-45',
      creditLimit: 3000.0,
      totalDebt: 840.0,
      totalPaid: 4500.0,
      status: 'overdue',
      address: 'Rua Tiradentes, 305',
      lastPurchaseDate: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
      source: 'erp_api',
      debts: [
        {
          id: 'cup-1006',
          cupomCode: 'CUP-87990',
          description: 'Insumos Hamburgueria (Queijo Prato, Pães de Hambúrguer, Bacon, Bebidas)',
          purchaseDate: new Date(Date.now() - 3600000 * 24 * 35).toISOString().split('T')[0],
          dueDate: new Date(Date.now() - 3600000 * 24 * 20).toISOString().split('T')[0],
          amount: 840.0,
          paidAmount: 0,
          status: 'overdue',
          productsList: [
            { code: 'PRD-0901', name: 'Bacon em Fatias Sadia 1Kg', qty: 5, unitPrice: 42.0, total: 210.0 },
            { code: 'PRD-0902', name: 'Queijo Prato Fatiado Peça 3Kg', qty: 2, unitPrice: 165.0, total: 330.0 },
            { code: 'PRD-0950', name: 'Fardos Refrigerante Coca-Cola 2L', qty: 5, unitPrice: 60.0, total: 300.0 },
          ],
        },
      ],
    },
  ];

  res.json({
    status: 'success',
    timestamp: new Date().toISOString(),
    system: 'ERP Supermercado PDV',
    totalCustomers: customers.length,
    customers,
  });
});

// Supermarket ERP Direct Sync Connector Route
app.post('/api/supermarket/sync-erp', async (req, res) => {
  const { apiUrl, apiKey, systemType, storeCode } = req.body;

  if (!apiUrl) {
    return res.status(400).json({ error: 'URL da API do ERP é obrigatória' });
  }

  try {
    console.log(`[Supermarket ERP Sync] Connecting to ${apiUrl} (${systemType || 'generic'})...`);

    // Fetch from the real ERP endpoint
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': apiKey ? `Bearer ${apiKey}` : '',
        'x-api-key': apiKey || '',
        'x-store-code': storeCode || '',
      },
    });

    if (!response.ok) {
      throw new Error(`O servidor do Supermercado respondeu com status ${response.status}: ${response.statusText}`);
    }

    const data: any = await response.json();
    const rawCustomers = Array.isArray(data) ? data : data.customers || data.data || [];

    // Map and sanitize to standard SupermarketCustomer format
    const sanitized = rawCustomers.map((c: any, idx: number) => {
      const totalDebt = Number(c.totalDebt || c.saldoDevedor || c.valorDevido || 0);
      return {
        id: c.id || `erp-cli-${Date.now()}-${idx}`,
        customerCode: String(c.customerCode || c.codigo || c.cod_cliente || `CLI-${1000 + idx}`),
        name: String(c.name || c.nome || c.razao_social || 'Cliente Supermercado'),
        phone: String(c.phone || c.telefone || c.celular || c.whatsapp || ''),
        cpfCnpj: c.cpfCnpj || c.cpf || c.cnpj || '',
        creditLimit: Number(c.creditLimit || c.limite || 1000),
        totalDebt,
        totalPaid: Number(c.totalPaid || c.valorPago || 0),
        status: totalDebt > 0 ? (c.status === 'pending' ? 'pending' : 'overdue') : 'up_to_date',
        address: c.address || c.endereco || '',
        lastPurchaseDate: c.lastPurchaseDate || c.ultimaCompra || new Date().toISOString(),
        lastPaymentDate: c.lastPaymentDate || c.ultimoPagamento || undefined,
        notes: c.notes || c.observacao || '',
        source: 'erp_api',
        debts: Array.isArray(c.debts || c.compras || c.titulos)
          ? (c.debts || c.compras || c.titulos).map((d: any, dIdx: number) => ({
              id: d.id || `cup-${idx}-${dIdx}`,
              cupomCode: String(d.cupomCode || d.cupom || d.numeroNota || d.nfce || `CUP-${8000 + dIdx}`),
              description: String(d.description || d.descricao || d.historico || 'Compras de Supermercado'),
              purchaseDate: String(d.purchaseDate || d.dataCompra || d.emissao || new Date().toISOString().split('T')[0]),
              dueDate: String(d.dueDate || d.vencimento || d.dataVencimento || new Date().toISOString().split('T')[0]),
              amount: Number(d.amount || d.valor || d.valorTotal || 0),
              paidAmount: Number(d.paidAmount || d.valorPago || 0),
              status: d.status || 'overdue',
              productsList: Array.isArray(d.productsList || d.itens || d.produtos)
                ? (d.productsList || d.itens || d.produtos).map((p: any) => ({
                    code: p.code || p.codigo || 'PRD-01',
                    name: p.name || p.nome || p.descricao || 'Item de Mercado',
                    qty: Number(p.qty || p.quantidade || 1),
                    unitPrice: Number(p.unitPrice || p.precoUnitario || p.valorUnitario || 0),
                    total: Number(p.total || p.valorTotal || 0),
                  }))
                : [],
            }))
          : [],
      };
    });

    console.log(`[Supermarket ERP Sync] Success! Retrieved ${sanitized.length} customers.`);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: sanitized.length,
      customers: sanitized,
    });
  } catch (err: any) {
    console.error('[Supermarket ERP Sync Error]:', err);
    res.status(500).json({
      error: `Falha ao conectar com o ERP do Supermercado: ${err.message}`,
    });
  }
});

// Gemini AI Copywriter Route (Free Unlimited Model & Generative Engine)
app.post('/api/ai/generate-copy', async (req, res) => {
  const { prompt, tone, goal, companyName, category } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `Você é um copywriter sênior especialista em mensagens de alta conversão para WhatsApp com proteção anti-bloqueio (anti-ban).
Regras fundamentais:
1. Gere 3 variações de mensagens prontas para envio em Português do Brasil.
2. Utilize Spintax onde for adequado, exemplo: {Olá|Oi|Tudo bem} {nome}!
3. Utilize as tags: {nome}, {primeiro_nome}, {saudacao_tempo}, {empresa}, {valor}.
4. Mantenha o tom ${tone || 'persuasivo e profissional'}.
5. Objetivo da mensagem: ${goal || 'vendas e engajamento'}.
6. Nome da empresa/remetente: ${companyName || 'Sua Empresa'}.
7. Formate as variações em um JSON válido com a estrutura:
{
  "variations": [
    { "title": "Opção 1 - Direta & Persuasiva", "content": "Texto aqui..." },
    { "title": "Opção 2 - Conversacional & Amigável", "content": "Texto aqui..." },
    { "title": "Opção 3 - Urgência & Chamada Forte", "content": "Texto aqui..." }
  ]
}
Retorne APENAS o JSON puro.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: `Instruções do usuário: ${prompt || 'Crie uma mensagem de alto engajamento'}` }],
          },
        ],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      if (parsed.variations && Array.isArray(parsed.variations) && parsed.variations.length > 0) {
        return res.json(parsed);
      }
    } catch (aiErr) {
      console.warn('[AI Copy] Gemini API notice (switching to unlimited generative engine):', aiErr);
    }
  }

  // Fallback Generative Engine (100% Free, Unlimited & Instant)
  const comp = companyName || 'Nossa Empresa';
  const topicClean = prompt || goal || 'nossa nova condição especial';

  const generatedVariations = [
    {
      title: 'Opção 1 - Direta & Persuasiva (Spintax)',
      content: `{Olá|Oi|Tudo bem} {nome}, {saudacao_tempo}!\n\nPassando para compartilhar uma oportunidade exclusiva da *${comp}* sobre ${topicClean}.\n\n👉 Responda *QUERO* agora mesmo para receber todos os detalhes com prioridade!`,
    },
    {
      title: 'Opção 2 - Conversacional & Humanizada',
      content: `{Oi|Olá} {primeiro_nome}, tudo bem com você?\n\nEstava revisando nosso atendimento na *${comp}* e lembrei de você. Preparamos uma novidade especial focada em ${topicClean}.\n\nTem 2 minutinhos hoje para eu te explicar como funciona?`,
    },
    {
      title: 'Opção 3 - Urgência & Condição Limitada',
      content: `{Atenção|Aviso Importante} {nome}! ⚠️\n\nLiberamos hoje na *${comp}* uma condição com vagas limitadas para ${topicClean}.\n\nSe tiver interesse, me mande um *SIM* aqui para garantir a sua vaga antes que encerre!`,
    },
  ];

  res.json({
    variations: generatedVariations,
    isGenerativeEngine: true,
  });
});

// Mount Vite middleware for SPA serving (solves "Cannot GET /")
async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = path.join(process.cwd(), 'dist');

  if (isProduction && fs.existsSync(distPath)) {
    console.log('[Server] Running in production mode, serving dist static files...');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.log('[Server] Running in development mode with Vite middlewares...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`[Server] WhatsApp Bulk Sender running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Server Bootstrap Fatal Error]:', err);
});
