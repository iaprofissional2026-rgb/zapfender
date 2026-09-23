import { Contact, ContactGroup, MessageTemplate, Campaign, WhatsAppSession, AppSettings, AutoResponderRule, ChipWarmerSession, SupermarketCustomer, SupermarketErpConfig } from '../types';

const CONTACTS_KEY = 'zapsender_contacts_v1';
const GROUPS_KEY = 'zapsender_groups_v1';
const TEMPLATES_KEY = 'zapsender_templates_v1';
const CAMPAIGNS_KEY = 'zapsender_campaigns_v1';
const SESSION_KEY = 'zapsender_session_v1';
const SETTINGS_KEY = 'zapsender_settings_v1';
const AUTORESPONDER_KEY = 'zapsender_autoresponder_v1';
const WARMER_KEY = 'zapsender_warmer_v1';
const SUPERMARKET_CUSTOMERS_KEY = 'zapsender_supermarket_customers_v1';
const SUPERMARKET_ERP_KEY = 'zapsender_supermarket_erp_v1';

export const INITIAL_GROUPS: ContactGroup[] = [
  {
    id: 'grp-vip',
    name: '👑 Clientes VIP',
    color: '#eab308',
    description: 'Clientes de alta recorrência e maior ticket médio',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'grp-leads',
    name: '🔥 Leads Quentes - Março',
    color: '#ef4444',
    description: 'Contatos interessados na nova promoção que pediram proposta',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'grp-mentoria',
    name: '🎓 Alunos & Assinantes',
    color: '#3b82f6',
    description: 'Comunidade de membros ativos da plataforma',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'grp-cobranca',
    name: '⚠️ Pendências de Pagamento',
    color: '#f97316',
    description: 'Faturas e mensalidades em aberto para lembrete gentil',
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'ct-1',
    name: 'Lucas Gabriel Oliveira',
    phone: '5511987654321',
    group: 'grp-vip',
    status: 'active',
    tags: ['Decisor', 'Comprador Frequente', 'São Paulo'],
    variables: {
      empresa: 'TechSoluções SP',
      cargo: 'Diretor Comercial',
      valor: '1.450,00',
      codigo_rastreio: 'BR984572391',
    },
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    notes: 'Prefere receber novidades no período da manhã.',
  },
  {
    id: 'ct-2',
    name: 'Beatriz Vasconcelos',
    phone: '5521991238765',
    group: 'grp-vip',
    status: 'active',
    tags: ['E-commerce', 'Rio de Janeiro'],
    variables: {
      empresa: 'Studio Bella Moda',
      cargo: 'Proprietária',
      valor: '890,00',
      codigo_rastreio: 'BR771239012',
    },
    createdAt: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
  },
  {
    id: 'ct-3',
    name: 'Rodrigo Alcantara Mendes',
    phone: '5531988884433',
    group: 'grp-leads',
    status: 'active',
    tags: ['Lead Inbound', 'Interessado Plano Pro', 'Belo Horizonte'],
    variables: {
      empresa: 'Mendes Contabilidade',
      cargo: 'Sócio Gestor',
      plano_interesse: 'Plano Anual Turbo',
    },
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
  },
  {
    id: 'ct-4',
    name: 'Camila Duarte Silveira',
    phone: '5541997651122',
    group: 'grp-leads',
    status: 'active',
    tags: ['Demonstração Solicitada', 'Curitiba'],
    variables: {
      empresa: 'LogiExpress Sul',
      cargo: 'Gerente de Operações',
      plano_interesse: 'Plano Enterprise',
    },
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
  {
    id: 'ct-5',
    name: 'Fernando Augusto Lima',
    phone: '5519981234567',
    group: 'grp-mentoria',
    status: 'active',
    tags: ['Turma 04', 'Campinas'],
    variables: {
      empresa: 'Agência Alpha Digital',
      modulo_atual: 'Módulo 5 - Automação Avançada',
    },
    createdAt: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
  },
  {
    id: 'ct-6',
    name: 'Mariana Costa Ferreira',
    phone: '5581987650011',
    group: 'grp-cobranca',
    status: 'active',
    tags: ['Vencimento 15/03', 'Recife'],
    variables: {
      empresa: 'Nordeste Imports',
      valor: '350,00',
      vencimento: '25/03/2026',
    },
    createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
  },
  {
    id: 'ct-7',
    name: 'Eduardo Martins Rocha',
    phone: '5561999887766',
    group: 'grp-vip',
    status: 'active',
    tags: ['Brasília', 'Contrato Ativo'],
    variables: {
      empresa: 'Capital Consultoria',
      cargo: 'CEO',
      valor: '2.300,00',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ct-8',
    name: 'Juliana Pires Rezende',
    phone: '5571981112233',
    group: 'grp-leads',
    status: 'active',
    tags: ['Salvador', 'WhatsApp Campanha'],
    variables: {
      empresa: 'Bahia Tour Operadora',
      cargo: 'Supervisora',
    },
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl-1',
    title: '🚀 Oferta Exclusiva com Spintax',
    category: 'vendas',
    spintaxEnabled: true,
    content: `{Olá|Oi|Opa} {nome}, {saudacao_tempo}! Tudo bem por aí?

Aqui é da equipe da *ZapSender*. Vimos que você gerencia a {empresa} e preparamos uma condição de renovação com *25% de desconto* liberada até amanhã! 🎁

👉 *Gostaria de ver como ativar com o benefício agora?* Basta me responder aqui.`,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tpl-2',
    title: '🔔 Lembrete de Pagamento e PIX',
    category: 'cobranca',
    spintaxEnabled: true,
    content: `{Olá|Oi|Prezado(a)} {nome}, como vai?

Passando rapidamente para lembrar sobre o fechamento do seu plano na *{empresa}* com valor de *R$ {valor}*, previsto para {vencimento}.

Se já realizou a quitação, por favor desconsidere. Caso precise da chave PIX ou boleto atualizado, basta responder esta mensagem! 👍`,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tpl-3',
    title: '📅 Confirmação de Reunião / Consulta',
    category: 'lembrete',
    spintaxEnabled: true,
    content: `{Olá|Oi} {nome}! Tudo certinho?

Lembrete amigável do nosso agendamento marcado para *{data}* às *{hora}*.

Por gentileza, digite:
*1* - Para CONFIRMAR sua presença ✅
*2* - Para REAGENDAR um novo horário 🔄

Aguardamos você!`,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tpl-4',
    title: '⭐ Pós-Venda e Pesquisa de Satisfação',
    category: 'pos-venda',
    spintaxEnabled: true,
    content: `{Olá|Oi} {primeiro_nome}, {saudacao_tempo}!

Gostaríamos de agradecer pela confiança na nossa parceria com a *{empresa}*.

Como foi sua experiência de atendimento até aqui? Se puder nos avaliar de 1 a 5 estrelas, ficaremos muito felizes em continuar melhorando para você! ⭐⭐⭐⭐⭐`,
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'cmp-1',
    name: 'Disparo de Boas-Vindas Clientes VIP',
    messageContent: `{Olá|Oi} {nome}, {saudacao_tempo}! Seja bem-vindo ao nosso canal VIP de atendimento da {empresa}.`,
    targetType: 'groups',
    targetGroupIds: ['grp-vip'],
    targetContactIds: [],
    sendImmediately: false,
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '15:30',
    minDelaySeconds: 10,
    maxDelaySeconds: 20,
    pauseEveryCount: 15,
    pauseDurationSeconds: 120,
    status: 'completed',
    totalCount: 3,
    sentCount: 3,
    failedCount: 0,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    logs: [
      {
        id: 'log-1',
        campaignId: 'cmp-1',
        contactId: 'ct-1',
        contactName: 'Lucas Gabriel Oliveira',
        phone: '5511987654321',
        renderedMessage: 'Olá Lucas Gabriel Oliveira, Boa tarde! Seja bem-vindo ao nosso canal VIP de atendimento da TechSoluções SP.',
        status: 'success',
        timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
        simulatedDelay: 12,
      },
      {
        id: 'log-2',
        campaignId: 'cmp-1',
        contactId: 'ct-2',
        contactName: 'Beatriz Vasconcelos',
        phone: '5521991238765',
        renderedMessage: 'Oi Beatriz Vasconcelos, Boa tarde! Seja bem-vindo ao nosso canal VIP de atendimento da Studio Bella Moda.',
        status: 'success',
        timestamp: new Date(Date.now() - 3600000 * 1.3).toISOString(),
        simulatedDelay: 14,
      },
      {
        id: 'log-3',
        campaignId: 'cmp-1',
        contactId: 'ct-7',
        contactName: 'Eduardo Martins Rocha',
        phone: '5561999887766',
        renderedMessage: 'Olá Eduardo Martins Rocha, Boa tarde! Seja bem-vindo ao nosso canal VIP de atendimento da Capital Consultoria.',
        status: 'success',
        timestamp: new Date(Date.now() - 3600000 * 1.1).toISOString(),
        simulatedDelay: 11,
      },
    ],
  },
];

export const INITIAL_SESSION: WhatsAppSession = {
  id: 'sess-1',
  name: 'Instância Principal - Vendas & Suporte',
  phone: '+55 11 97654-3210',
  pushname: 'ZapSender Oficial Pro',
  status: 'connected',
  connectedAt: new Date().toISOString(),
  batteryLevel: 94,
  isCharging: true,
  antiBanHealthScore: 98,
  dailySentCount: 38,
  dailyLimit: 350,
};

export const INITIAL_SETTINGS: AppSettings = {
  defaultMinDelay: 8,
  defaultMaxDelay: 18,
  defaultPauseEvery: 20,
  defaultPauseDuration: 180,
  autoSaveDrafts: true,
  antiBanSafetyMode: 'balanced',
};

// Storage helpers
export function loadContacts(): Contact[] {
  try {
    const data = localStorage.getItem(CONTACTS_KEY);
    return data ? JSON.parse(data) : INITIAL_CONTACTS;
  } catch (e) {
    return INITIAL_CONTACTS;
  }
}

export function saveContacts(contacts: Contact[]): void {
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

export function loadGroups(): ContactGroup[] {
  try {
    const data = localStorage.getItem(GROUPS_KEY);
    return data ? JSON.parse(data) : INITIAL_GROUPS;
  } catch (e) {
    return INITIAL_GROUPS;
  }
}

export function saveGroups(groups: ContactGroup[]): void {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export function loadTemplates(): MessageTemplate[] {
  try {
    const data = localStorage.getItem(TEMPLATES_KEY);
    return data ? JSON.parse(data) : INITIAL_TEMPLATES;
  } catch (e) {
    return INITIAL_TEMPLATES;
  }
}

export function saveTemplates(templates: MessageTemplate[]): void {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

export function loadCampaigns(): Campaign[] {
  try {
    const data = localStorage.getItem(CAMPAIGNS_KEY);
    return data ? JSON.parse(data) : INITIAL_CAMPAIGNS;
  } catch (e) {
    return INITIAL_CAMPAIGNS;
  }
}

export function saveCampaigns(campaigns: Campaign[]): void {
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
}

export function loadSession(): WhatsAppSession {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : INITIAL_SESSION;
  } catch (e) {
    return INITIAL_SESSION;
  }
}

export function saveSession(session: WhatsAppSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSettings(): AppSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : INITIAL_SETTINGS;
  } catch (e) {
    return INITIAL_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export const INITIAL_AUTORESPONDER_RULES: AutoResponderRule[] = [
  {
    id: 'rule-1',
    keyword: 'QUERO',
    matchType: 'contains',
    replyMessage: `{Olá|Oi}! Que ótimo ter seu interesse! 🎉\n\nLiberamos sua condição exclusiva com frete grátis e 25% de desconto.\n\n👉 Acesse agora nosso catálogo oficial ou me informe qual item você gostaria de reservar!`,
    delaySeconds: 3,
    isActive: true,
    triggerCount: 28,
    lastTriggeredAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule-2',
    keyword: 'PIX',
    matchType: 'contains',
    replyMessage: `{Perfeito|Excelente}! Segue nossa chave PIX para pagamento com aprovação imediata:\n\n🔑 Chave CNPJ: *12.345.678/0001-90*\nNome: Pagamentos ZapSender Oficial\n\nAssim que realizar a transferência, nos envie o comprovante por aqui! ✅`,
    delaySeconds: 2,
    isActive: true,
    triggerCount: 42,
    lastTriggeredAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule-3',
    keyword: 'VALOR',
    matchType: 'contains',
    replyMessage: `{Olá|Oi}! Nossos planos começam a partir de *R$ 97,00 mensais* sem fidelidade e com suporte prioritário.\n\nGostaria de agendar uma rápida demonstração em vídeo?`,
    delaySeconds: 4,
    isActive: true,
    triggerCount: 19,
    lastTriggeredAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule-4',
    keyword: '1',
    matchType: 'exact',
    replyMessage: `✅ *Presença Confirmada com Sucesso!*\n\nSeu agendamento foi registrado em nosso sistema. Nos vemos em breve! Qualquer dúvida estamos por aqui.`,
    delaySeconds: 2,
    isActive: true,
    triggerCount: 64,
    lastTriggeredAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    createdAt: new Date().toISOString(),
  },
];

export function loadAutoResponderRules(): AutoResponderRule[] {
  try {
    const data = localStorage.getItem(AUTORESPONDER_KEY);
    return data ? JSON.parse(data) : INITIAL_AUTORESPONDER_RULES;
  } catch (e) {
    return INITIAL_AUTORESPONDER_RULES;
  }
}

export function saveAutoResponderRules(rules: AutoResponderRule[]): void {
  localStorage.setItem(AUTORESPONDER_KEY, JSON.stringify(rules));
}

export const INITIAL_WARMER_SESSION: ChipWarmerSession = {
  isActive: false,
  phase: 2,
  targetDailyMessages: 35,
  sentToday: 18,
  totalConversationsCompleted: 84,
  healthScore: 98,
  speed: 'medium',
  lastActivityAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  recentLogs: [
    {
      id: 'wlog-1',
      text: 'Simulação orgânica: Troca de mensagens de aquecimento concluída com sucesso.',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      status: 'success',
    },
    {
      id: 'wlog-2',
      text: 'Status de digitação natural emitido (3.2s).',
      timestamp: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
      status: 'info',
    },
    {
      id: 'wlog-3',
      text: 'Aquecedor em pausa automática preventiva entre ciclos de envio.',
      timestamp: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
      status: 'info',
    },
  ],
};

export function loadChipWarmerSession(): ChipWarmerSession {
  try {
    const data = localStorage.getItem(WARMER_KEY);
    return data ? JSON.parse(data) : INITIAL_WARMER_SESSION;
  } catch (e) {
    return INITIAL_WARMER_SESSION;
  }
}

export function saveChipWarmerSession(session: ChipWarmerSession): void {
  localStorage.setItem(WARMER_KEY, JSON.stringify(session));
}

export const INITIAL_SUPERMARKET_CUSTOMERS: SupermarketCustomer[] = [
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
    notes: 'Cliente antigo da caderneta. Paga sempre no dia 10.',
    source: 'erp_api',
    debts: [
      {
        id: 'cup-1001',
        cupomCode: 'CUP-88421',
        description: 'Compras Açougue & Frios (Picanha, Queijo Muçarela, Linguiça)',
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
        description: 'Mercearia & Hortifruti (Arroz, Feijão, Óleo, Frutas)',
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
    notes: 'Pediu para enviar o PIX quando fechar a quinzena.',
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
    notes: 'Vence nos próximos dias.',
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
    id: 'sm-cli-004',
    customerCode: 'CLI-01205',
    name: 'Cláudia Regina Mendes',
    phone: '5541997651122',
    cpfCnpj: '456.789.012-34',
    creditLimit: 800.0,
    totalDebt: 0.0,
    totalPaid: 1850.0,
    status: 'up_to_date',
    address: 'Rua XV de Novembro, 1200',
    lastPurchaseDate: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    lastPaymentDate: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    notes: 'Cliente com pagamentos 100% em dia.',
    source: 'manual',
    debts: [
      {
        id: 'cup-1005',
        cupomCode: 'CUP-90400',
        description: 'Hortifruti Selecionado',
        purchaseDate: new Date(Date.now() - 3600000 * 24 * 10).toISOString().split('T')[0],
        dueDate: new Date(Date.now() - 3600000 * 24 * 2).toISOString().split('T')[0],
        amount: 145.0,
        paidAmount: 145.0,
        status: 'paid',
        productsList: [
          { code: 'PRD-0800', name: 'Cesta Hortifruti Orgânica Semanal', qty: 1, unitPrice: 145.0, total: 145.0 },
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
    lastPaymentDate: new Date(Date.now() - 3600000 * 24 * 60).toISOString(),
    notes: 'Dono de lanchonete parceira. Fiado de insumos semanais.',
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

export const INITIAL_SUPERMARKET_ERP_CONFIG: SupermarketErpConfig = {
  systemType: 'generic_rest',
  erpName: 'Sistema ERP PDV Supermercado',
  apiUrl: 'http://localhost:3000/api/supermarket/mock-erp-feed',
  apiKey: 'ERP-SUPERMERCADO-KEY-2026',
  storeCode: 'LOJA-01',
  pixKey: 'supermercadocentral@pix.com.br',
  pixName: 'Supermercado Central & Cia Ltda',
  autoSync: true,
  status: 'connected',
  lastSyncAt: new Date().toISOString(),
};

export function loadSupermarketCustomers(): SupermarketCustomer[] {
  try {
    const data = localStorage.getItem(SUPERMARKET_CUSTOMERS_KEY);
    return data ? JSON.parse(data) : INITIAL_SUPERMARKET_CUSTOMERS;
  } catch (e) {
    return INITIAL_SUPERMARKET_CUSTOMERS;
  }
}

export function saveSupermarketCustomers(customers: SupermarketCustomer[]): void {
  localStorage.setItem(SUPERMARKET_CUSTOMERS_KEY, JSON.stringify(customers));
}

export function loadSupermarketErpConfig(): SupermarketErpConfig {
  try {
    const data = localStorage.getItem(SUPERMARKET_ERP_KEY);
    return data ? JSON.parse(data) : INITIAL_SUPERMARKET_ERP_CONFIG;
  } catch (e) {
    return INITIAL_SUPERMARKET_ERP_CONFIG;
  }
}

export function saveSupermarketErpConfig(config: SupermarketErpConfig): void {
  localStorage.setItem(SUPERMARKET_ERP_KEY, JSON.stringify(config));
}
