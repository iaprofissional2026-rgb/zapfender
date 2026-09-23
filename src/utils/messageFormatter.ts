import { Contact } from '../types';

/**
 * Resolves Spintax format: {opção 1|opção 2|opção 3}
 */
export function resolveSpintax(text: string): string {
  if (!text) return '';
  const spintaxRegex = /\{([^{}]+)\}/g;

  let result = text;
  let matchesFound = true;
  let iterations = 0;

  while (matchesFound && iterations < 10) {
    iterations++;
    const prev = result;
    result = result.replace(spintaxRegex, (match, optionsString) => {
      // Check if this looks like a variable like {nome} without pipe
      if (!optionsString.includes('|')) {
        return match; // keep variables untouched for next step
      }
      const options = optionsString.split('|');
      const randomIndex = Math.floor(Math.random() * options.length);
      return options[randomIndex].trim();
    });
    matchesFound = result !== prev;
  }

  return result;
}

/**
 * Returns appropriate greeting based on local Brazilian time
 */
export function getGreetingByTime(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'Bom dia';
  } else if (hour >= 12 && hour < 18) {
    return 'Boa tarde';
  } else {
    return 'Boa noite';
  }
}

/**
 * Standardizes phone number to numbers only with Brazil country code if needed
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (!cleaned) return '';

  // If already has 55 and valid length (12 or 13 digits)
  if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
    return cleaned;
  }

  // If starts with duplicated 55 (e.g. 5555...)
  if (cleaned.startsWith('5555')) {
    cleaned = cleaned.slice(2);
    if (cleaned.length === 12 || cleaned.length === 13) return cleaned;
  }

  // If 10 or 11 digits (DDD + 8 or 9 digits, e.g. 11987654321 or 83997128400) -> prepend 55
  if (cleaned.length === 10 || cleaned.length === 11) {
    return '55' + cleaned;
  }

  // If doesn't start with 55 and first 2 digits are valid Brazilian DDD (11 to 99)
  const dddNum = parseInt(cleaned.slice(0, 2), 10);
  if (!cleaned.startsWith('55') && dddNum >= 11 && dddNum <= 99) {
    cleaned = '55' + cleaned;
  }

  return cleaned;
}

/**
 * Visual format for display: +55 (11) 98765-4321
 */
export function formatPhoneDisplay(phone: string): string {
  const digits = sanitizePhoneNumber(phone);
  if (!digits) return phone;

  if (digits.startsWith('55') && digits.length >= 12) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    if (rest.length === 9) {
      return `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    } else if (rest.length === 8) {
      return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
    }
  }

  return '+' + digits;
}

/**
 * Personalizes message template with contact variables and dynamic tags
 */
export function renderPersonalizedMessage(
  rawTemplate: string,
  contact: Partial<Contact>,
  customOverrides?: Record<string, string>
): string {
  let text = resolveSpintax(rawTemplate);

  const fullName = contact.name || 'Cliente';
  const firstName = fullName.split(' ')[0] || 'Cliente';
  const phone = contact.phone ? formatPhoneDisplay(contact.phone) : '';
  const greeting = getGreetingByTime();
  const today = new Date().toLocaleDateString('pt-BR');
  const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Standard variables
  const replacements: Record<string, string> = {
    nome: fullName,
    primeiro_nome: firstName,
    telefone: phone,
    saudacao: greeting,
    saudacao_tempo: greeting,
    data: today,
    hora: currentTime,
    ...(contact.variables || {}),
    ...(customOverrides || {}),
  };

  // Replace each variable case-insensitively
  for (const [key, val] of Object.entries(replacements)) {
    const reg = new RegExp(`\\{${key}\\}`, 'gi');
    text = text.replace(reg, val || '');
  }

  return text;
}

/**
 * Generate official WhatsApp Web link for manual dispatch / fallback
 */
export function buildWhatsAppWebUrl(phone: string, text: string): string {
  const cleanNumber = sanitizePhoneNumber(phone);
  const encodedText = encodeURIComponent(text);
  return `https://web.whatsapp.com/send?phone=${cleanNumber}&text=${encodedText}`;
}

/**
 * Generate mobile wa.me link
 */
export function buildWaMeUrl(phone: string, text: string): string {
  const cleanNumber = sanitizePhoneNumber(phone);
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanNumber}?text=${encodedText}`;
}
