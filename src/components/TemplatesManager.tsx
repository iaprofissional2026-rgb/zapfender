import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Sparkles, 
  Copy, 
  Trash2, 
  Edit3, 
  Send, 
  RotateCw, 
  Check, 
  Tag, 
  MessageSquareQuote 
} from 'lucide-react';
import { MessageTemplate } from '../types';
import { resolveSpintax, renderPersonalizedMessage } from '../utils/messageFormatter';
import { AICopywriterModal } from './AICopywriterModal';

interface TemplatesManagerProps {
  templates: MessageTemplate[];
  onUpdateTemplates: (templates: MessageTemplate[]) => void;
  onUseTemplateInCampaign: (template: MessageTemplate) => void;
}

export const TemplatesManager: React.FC<TemplatesManagerProps> = ({
  templates,
  onUpdateTemplates,
  onUseTemplateInCampaign,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  // Form State
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<MessageTemplate['category']>('vendas');
  const [content, setContent] = useState<string>('');
  const [spintaxEnabled, setSpintaxEnabled] = useState<boolean>(true);
  const [spintaxPreviewSamples, setSpintaxPreviewSamples] = useState<string[]>([]);

  const categories = [
    { id: 'all', label: 'Todos os Modelos' },
    { id: 'vendas', label: '🔥 Vendas & Ofertas' },
    { id: 'cobranca', label: '💳 Cobrança & PIX' },
    { id: 'lembrete', label: '📅 Agendamentos' },
    { id: 'pos-venda', label: '⭐ Pós-Venda & NPS' },
    { id: 'geral', label: '📢 Avisos Gerais' },
  ];

  const filteredTemplates = templates.filter(
    t => selectedCategory === 'all' || t.category === selectedCategory
  );

  const handleOpenEditor = (tpl?: MessageTemplate) => {
    if (tpl) {
      setEditingTemplate(tpl);
      setTitle(tpl.title);
      setCategory(tpl.category);
      setContent(tpl.content);
      setSpintaxEnabled(!!tpl.spintaxEnabled);
    } else {
      setEditingTemplate(null);
      setTitle('');
      setCategory('vendas');
      setContent('{Olá|Oi} {nome}, {saudacao_tempo}!\n\nPassando com um aviso da *{empresa}*...');
      setSpintaxEnabled(true);
    }
    generateSpintaxSamples(tpl ? tpl.content : '{Olá|Oi} {nome}!');
    setIsEditorOpen(true);
  };

  const generateSpintaxSamples = (text: string) => {
    const samples: string[] = [];
    const dummyContact = {
      name: 'Lucas Silva',
      variables: { empresa: 'TechSoluções', valor: '499,00', vencimento: '28/03/2026' },
    };
    for (let i = 0; i < 3; i++) {
      samples.push(renderPersonalizedMessage(text, dummyContact));
    }
    setSpintaxPreviewSamples(samples);
  };

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      alert('Preencha o título e o conteúdo da mensagem.');
      return;
    }

    if (editingTemplate) {
      const updated = templates.map((t) => {
        if (t.id === editingTemplate.id) {
          return {
            ...t,
            title: title.trim(),
            category,
            content,
            spintaxEnabled,
          };
        }
        return t;
      });
      onUpdateTemplates(updated);
    } else {
      const newTemplate: MessageTemplate = {
        id: `tpl-${Date.now()}`,
        title: title.trim(),
        category,
        content,
        spintaxEnabled,
        createdAt: new Date().toISOString(),
      };
      onUpdateTemplates([newTemplate, ...templates]);
    }

    setIsEditorOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este modelo de mensagem?')) {
      onUpdateTemplates(templates.filter(t => t.id !== id));
    }
  };

  const handleInsertTag = (tag: string) => {
    const updated = content + ` {${tag}}`;
    setContent(updated);
    generateSpintaxSamples(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-[#111b21] border border-[#202c33] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e9edef] flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#00a884]" />
            Biblioteca de Modelos & Textos (Templates)
          </h1>
          <p className="text-xs text-[#8696a0] mt-1">
            Crie copys reutilizáveis com variáveis dinâmicas e variações anti-bloqueio
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-[#00a884] hover:from-purple-500 hover:to-[#02906f] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" /> Criar com IA Gemini
          </button>
          <button
            onClick={() => handleOpenEditor()}
            className="px-4 py-2 bg-[#00a884] hover:bg-[#02906f] text-black font-bold text-xs rounded-xl transition-all shadow-md shadow-[#00a884]/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Novo Modelo
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedCategory === cat.id
                ? 'bg-[#00a884] text-black border-[#00a884]'
                : 'bg-[#111b21] text-[#8696a0] border-[#202c33] hover:text-[#e9edef]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-[#111b21] border border-[#202c33] hover:border-[#00a884]/50 rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#00a884] bg-[#00a884]/15 px-2 py-0.5 rounded-full border border-[#00a884]/30">
                    {template.category}
                  </span>
                  <h3 className="text-base font-bold text-[#e9edef] mt-1.5">
                    {template.title}
                  </h3>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenEditor(template)}
                    className="p-1.5 text-[#8696a0] hover:text-[#e9edef] hover:bg-[#202c33] rounded-lg"
                    title="Editar"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-1.5 text-[#8696a0] hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message Content Bubble */}
              <div className="bg-[#182229] border border-[#202c33] rounded-xl p-3.5 text-xs text-[#e9edef] whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
                {template.content}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[#202c33]/60">
              <span className="text-[10px] text-[#8696a0]">
                {template.spintaxEnabled && '🛡️ Spintax Anti-Bloqueio Ativo'}
              </span>

              <button
                onClick={() => onUseTemplateInCampaign(template)}
                className="px-4 py-2 bg-[#00a884] hover:bg-[#02906f] text-black text-xs font-bold rounded-xl transition-all shadow flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Usar em Disparo
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Editor de Template */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111b21] border border-[#2a3942] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-[#e9edef]">
              {editingTemplate ? 'Editar Modelo de Mensagem' : 'Novo Modelo de Mensagem'}
            </h3>

            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#8696a0] mb-1 block">Título do Modelo</label>
                  <input
                    type="text"
                    placeholder="Ex: 🏷️ Oferta Especial 20%"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-[#182229] border border-[#202c33] rounded-xl text-xs text-[#e9edef] focus:outline-none focus:border-[#00a884]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#8696a0] mb-1 block">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#182229] border border-[#202c33] rounded-xl text-xs text-[#e9edef]"
                  >
                    <option value="vendas">🔥 Vendas</option>
                    <option value="cobranca">💳 Cobrança</option>
                    <option value="lembrete">📅 Lembrete / Agendamento</option>
                    <option value="pos-venda">⭐ Pós-Venda</option>
                    <option value="geral">📢 Geral</option>
                  </select>
                </div>
              </div>

              {/* Tag Quick Inserters */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-[#8696a0] block">Inserir Tags Dinâmicas:</span>
                <div className="flex flex-wrap gap-1">
                  {['nome', 'primeiro_nome', 'saudacao_tempo', 'empresa', 'telefone', 'valor', 'vencimento', 'data', 'hora'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleInsertTag(t)}
                      className="px-2 py-0.5 bg-[#182229] hover:bg-[#202c33] border border-[#202c33] rounded text-[10px] font-mono text-[#00a884]"
                    >
                      +{t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="text-[11px] font-semibold text-[#8696a0] mb-1 block">
                  Conteúdo da Mensagem (Suporta Spintax {'{Olá|Oi|Opa}'}):
                </label>
                <textarea
                  rows={6}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    generateSpintaxSamples(e.target.value);
                  }}
                  className="w-full p-3.5 bg-[#182229] border border-[#202c33] rounded-xl text-xs text-[#e9edef] leading-relaxed focus:outline-none focus:border-[#00a884]"
                />
              </div>

              {/* Spintax Live Variations Simulator */}
              <div className="p-3.5 bg-[#182229] rounded-xl border border-[#202c33] space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#e9edef]">
                  <span className="flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-[#00a884]" />
                    Simulação de Variações Aleatórias (Spintax):
                  </span>
                  <button
                    type="button"
                    onClick={() => generateSpintaxSamples(content)}
                    className="text-[10px] text-[#00a884] hover:underline"
                  >
                    Gerar novos exemplos
                  </button>
                </div>

                <div className="space-y-1.5 text-[11px] text-[#8696a0]">
                  {spintaxPreviewSamples.map((sample, idx) => (
                    <div key={idx} className="p-2 bg-[#111b21] rounded-lg border border-[#202c33]">
                      <span className="text-[#00a884] font-bold mr-1">Variação {idx + 1}:</span>
                      "{sample}"
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 bg-[#182229] text-[#8696a0] text-xs font-semibold rounded-xl border border-[#202c33]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 bg-[#00a884] hover:bg-[#02906f] text-black text-xs font-bold rounded-xl shadow-md"
              >
                Salvar Modelo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Modal */}
      <AICopywriterModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onSelectMessage={(newContent) => {
          setContent(newContent);
          setTitle(`Gerado por IA - ${new Date().toLocaleDateString('pt-BR')}`);
          generateSpintaxSamples(newContent);
          setIsEditorOpen(true);
        }}
      />
    </div>
  );
};
