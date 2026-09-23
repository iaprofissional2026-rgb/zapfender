import { SupermarketCustomer, SupermarketDebtItem, SupermarketDebtProduct } from '../types';
import { sanitizePhoneNumber } from './messageFormatter';

/**
 * Parses XML NFe/NFC-e string content directly in browser.
 */
export function parseNFeXml(xmlText: string): SupermarketCustomer | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // Check parser error
    const parseError = xmlDoc.getElementsByTagName('parsererror')[0];
    if (parseError) {
      console.warn('XML Parse error:', parseError.textContent);
      return null;
    }

    // Extract Destinatário (Customer)
    const dest = xmlDoc.getElementsByTagName('dest')[0];
    const infNFe = xmlDoc.getElementsByTagName('infNFe')[0];
    const ide = xmlDoc.getElementsByTagName('ide')[0];
    const total = xmlDoc.getElementsByTagName('total')[0];

    const customerName = dest?.getElementsByTagName('xNome')[0]?.textContent || 'Cliente Supermercado';
    const cpf = dest?.getElementsByTagName('CPF')[0]?.textContent || dest?.getElementsByTagName('CNPJ')[0]?.textContent || '';
    const phone = dest?.getElementsByTagName('fone')[0]?.textContent || '';
    const enderDest = dest?.getElementsByTagName('enderDest')[0];
    const logradouro = enderDest?.getElementsByTagName('xLgr')[0]?.textContent || '';
    const numero = enderDest?.getElementsByTagName('nro')[0]?.textContent || '';
    const bairro = enderDest?.getElementsByTagName('xBairro')[0]?.textContent || '';
    const fullAddress = [logradouro, numero, bairro].filter(Boolean).join(', ');

    // Invoice info
    const nNF = ide?.getElementsByTagName('nNF')[0]?.textContent || `${Math.floor(10000 + Math.random() * 90000)}`;
    const dhEmi = ide?.getElementsByTagName('dhEmi')[0]?.textContent || new Date().toISOString();
    const purchaseDate = dhEmi.split('T')[0];
    const dueDate = new Date(Date.now() + 3600000 * 24 * 15).toISOString().split('T')[0];

    // Total Amount
    const vNF = parseFloat(total?.getElementsByTagName('vNF')[0]?.textContent || '0') || 0;

    // Itemized products list
    const dets = xmlDoc.getElementsByTagName('det');
    const productsList: SupermarketDebtProduct[] = [];

    for (let i = 0; i < dets.length; i++) {
      const prod = dets[i].getElementsByTagName('prod')[0];
      if (prod) {
        const cProd = prod.getElementsByTagName('cProd')[0]?.textContent || `PRD-${i + 1}`;
        const xProd = prod.getElementsByTagName('xProd')[0]?.textContent || 'Produto de Mercado';
        const qCom = parseFloat(prod.getElementsByTagName('qCom')[0]?.textContent || '1');
        const vUnCom = parseFloat(prod.getElementsByTagName('vUnCom')[0]?.textContent || '0');
        const vProd = parseFloat(prod.getElementsByTagName('vProd')[0]?.textContent || `${qCom * vUnCom}`);

        productsList.push({
          code: cProd,
          name: xProd,
          qty: qCom,
          unitPrice: vUnCom,
          total: vProd,
        });
      }
    }

    const customerCode = `CLI-${cpf ? cpf.substring(0, 5) : Math.floor(1000 + Math.random() * 9000)}`;
    const cupomCode = `NFE-${nNF}`;

    const debtItem: SupermarketDebtItem = {
      id: `cup-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      cupomCode,
      description: productsList.length > 0 ? `${productsList.length} itens de Supermercado` : 'Compra Fiscal NFe',
      purchaseDate,
      dueDate,
      amount: vNF,
      paidAmount: 0,
      status: 'overdue',
      productsList,
    };

    return {
      id: `nfe-cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customerCode,
      name: customerName,
      phone: sanitizePhoneNumber(phone) || phone,
      cpfCnpj: cpf,
      creditLimit: Math.max(1000, vNF * 2),
      totalDebt: vNF,
      totalPaid: 0,
      status: vNF > 0 ? 'overdue' : 'up_to_date',
      address: fullAddress,
      lastPurchaseDate: purchaseDate,
      source: 'xml_nfe',
      createdAt: new Date().toISOString(),
      debts: [debtItem],
    };
  } catch (err) {
    console.error('Error parsing NFe XML:', err);
    return null;
  }
}

/**
 * Parses CSV / Tab-Delimited or TXT file with customer and debt lists.
 */
export function parseSupermarketCsv(csvText: string): SupermarketCustomer[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const parsedCustomers: SupermarketCustomer[] = [];

  // Check if first row is header
  const firstRow = lines[0].toLowerCase();
  const startIndex = firstRow.includes('nome') || firstRow.includes('cliente') || firstRow.includes('valor') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    // Split by comma, semicolon or tab
    const delimiter = line.includes(';') ? ';' : line.includes('\t') ? '\t' : ',';
    const cols = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));

    if (cols.length < 2) continue;

    // Mapping heuristic
    // Col 0: Nome ou Código
    // Col 1: Telefone ou Valor
    let code = `CLI-${1000 + i}`;
    let name = '';
    let phone = '';
    let debt = 0;
    let cupom = `CUP-${8000 + i}`;
    let cpf = '';

    if (cols.length >= 4) {
      code = cols[0] || code;
      name = cols[1];
      phone = cols[2];
      debt = parseFloat(cols[3].replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0;
      if (cols[4]) cpf = cols[4];
      if (cols[5]) cupom = cols[5];
    } else if (cols.length === 3) {
      name = cols[0];
      phone = cols[1];
      debt = parseFloat(cols[2].replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0;
    } else if (cols.length === 2) {
      name = cols[0];
      phone = cols[1];
      debt = 150.0;
    }

    if (!name) continue;

    parsedCustomers.push({
      id: `csv-cust-${Date.now()}-${i}`,
      customerCode: code,
      name,
      phone: sanitizePhoneNumber(phone) || phone,
      cpfCnpj: cpf,
      creditLimit: Math.max(1000, debt * 1.5),
      totalDebt: debt,
      totalPaid: 0,
      status: debt > 0 ? 'overdue' : 'up_to_date',
      source: 'csv_import',
      createdAt: new Date().toISOString(),
      debts:
        debt > 0
          ? [
              {
                id: `cup-csv-${Date.now()}-${i}`,
                cupomCode: cupom,
                description: 'Compras de Mercado (Caderneta / PDV)',
                purchaseDate: new Date(Date.now() - 3600000 * 24 * 10).toISOString().split('T')[0],
                dueDate: new Date().toISOString().split('T')[0],
                amount: debt,
                paidAmount: 0,
                status: 'overdue',
                productsList: [
                  { code: 'PRD-01', name: 'Produtos de Mercearia & Carnes', qty: 1, unitPrice: debt, total: debt },
                ],
              },
            ]
          : [],
    });
  }

  return parsedCustomers;
}
