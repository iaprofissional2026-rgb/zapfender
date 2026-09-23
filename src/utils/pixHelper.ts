/**
 * BR Code / PIX EMV Standard Payload Generator
 * Generates copy-paste PIX payloads according to Central Bank of Brazil (BACEN) standards.
 */

function crc16(str: string): string {
  let crc = 0xffff;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  const hex = (crc & 0xffff).toString(16).toUpperCase();
  return hex.padStart(4, '0');
}

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

export function generatePixCopyPaste(params: {
  pixKey: string;
  merchantName: string;
  merchantCity?: string;
  amount?: number;
  txId?: string;
}): string {
  const {
    pixKey,
    merchantName = 'Supermercado Central',
    merchantCity = 'SAO PAULO',
    amount,
    txId = 'DEBITO',
  } = params;

  // Sanitize values
  const cleanKey = pixKey.trim();
  const cleanName = merchantName.substring(0, 25).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const cleanCity = (merchantCity || 'SAO PAULO').substring(0, 15).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const cleanTxId = (txId || '***').substring(0, 25).replace(/[^a-zA-Z0-9]/g, '');

  let payload = '';
  // 00 - Payload Format Indicator
  payload += formatField('00', '01');
  // 26 - Merchant Account Information (GUI + Key)
  const gui = formatField('00', 'br.gov.bcb.pix');
  const key = formatField('01', cleanKey);
  payload += formatField('26', `${gui}${key}`);
  // 52 - Merchant Category Code
  payload += formatField('52', '0000');
  // 53 - Transaction Currency (986 = BRL)
  payload += formatField('53', '986');
  // 54 - Transaction Amount (optional)
  if (amount && amount > 0) {
    payload += formatField('54', amount.toFixed(2));
  }
  // 58 - Country Code
  payload += formatField('58', 'BR');
  // 59 - Merchant Name
  payload += formatField('59', cleanName || 'SUPERMERCADO');
  // 60 - Merchant City
  payload += formatField('60', cleanCity || 'CIDADE');
  // 62 - Additional Data Field Template (TxID)
  const txField = formatField('05', cleanTxId || '***');
  payload += formatField('62', txField);

  // 63 - CRC16
  payload += '6304';
  const checksum = crc16(payload);
  return `${payload}${checksum}`;
}
