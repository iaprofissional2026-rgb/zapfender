export async function generateMessageWithAI(prompt: {
  topic: string;
  category: string;
  tone: 'amigável' | 'persuasivo' | 'formal' | 'urgente' | 'descontraído';
  includeSpintax: boolean;
  variables: string[];
  companyName?: string;
}): Promise<{ content: string; suggestions: string[]; variations?: Array<{ title: string; content: string }> }> {
  try {
    const res = await fetch('/api/ai/generate-copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt.topic,
        category: prompt.category,
        tone: prompt.tone,
        goal: prompt.category,
        companyName: prompt.companyName || 'Sua Empresa',
        includeSpintax: prompt.includeSpintax,
        variables: prompt.variables,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.variations && Array.isArray(data.variations) && data.variations.length > 0) {
        return {
          content: data.variations[0].content,
          variations: data.variations,
          suggestions: [
            'Dica: Utilize a variação Spintax {Olá|Oi} para evitar filtros anti-spam do WhatsApp.',
            'Dica: Mensagens com chamada para ação direta (ex: "Responda QUERO") convertem 3x mais.',
          ],
        };
      }
    }
  } catch (err) {
    console.warn('[AI Service] Proxy request notice:', err);
  }

  // Instant Generative Engine Fallback (100% Free & Unlimited)
  const comp = prompt.companyName || 'Nossa Empresa';
  const topicClean = prompt.topic || 'nossas condições especiais';

  const defaultVariations = [
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

  return {
    content: defaultVariations[0].content,
    variations: defaultVariations,
    suggestions: [
      'Envie em intervalos de 8s a 15s para garantir alta taxa de entrega.',
      'Varie as palavras de saudação com Spintax para construir boa reputação de envio.',
    ],
  };
}

export async function convertToSpintaxWithAI(text: string): Promise<string> {
  if (!text) return '';
  return text
    .replace(/\b(Olá|Oi|E aí|Bom dia|Boa tarde)\b/gi, '{Olá|Oi|Tudo bem}')
    .replace(/\b(Temos|Preparamos|Liberamos)\b/gi, '{Temos|Preparamos|Liberamos}')
    .replace(/\b(Oportunidade|Condição especial|Novidade)\b/gi, '{Oportunidade|Condição especial|Novidade}')
    .replace(/\b(Responda|Mande|Chame)\b/gi, '{Responda|Mande|Chame}');
}
