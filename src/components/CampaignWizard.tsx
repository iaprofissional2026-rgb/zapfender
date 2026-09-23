import React, { useState, useRef } from 'react';
import { 
  Send, 
  Users, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  FileText, 
  Smartphone, 
  Mic, 
  Paperclip, 
  Plus, 
  Check, 
  AlertTriangle,
  Info,
  ChevronRight,
  Eye,
  Sliders,
  RotateCw,
  Image as ImageIcon,
  FolderKanban
} from 'lucide-react';
import { Campaign, Contact, ContactGroup, MessageTemplate, WhatsAppSession } from '../types';
import { renderPersonalizedMessage, formatPhoneDisplay } from '../utils/messageFormatter';
import { AICopywriterModal } from './AICopywriterModal';

interface CampaignWizardProps {
  groups: ContactGroup[];
  contacts: Contact[];
  templates: MessageTemplate[];
  session: WhatsAppSession;
  onStartCampaign: (campaign: Campaign) => void;
  onOpenConnectModal: () => void;
}

export const CampaignWizard: React.FC<CampaignWizardProps> = ({
  groups,
  contacts,
  templates,
  session,
  onStartCampaign,
  onOpenConnectModal,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = useState<string>(`Disparo_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}_${new Date().getHours()}h`);
  const [targetType, setTargetType] = useState<'groups' | 'contacts' | 'direct_list'>('groups');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(groups.length > 0 ? [groups[0].id] : []);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [directNumbersText, setDirectNumbersText] = useState<string>('');
  
  // Message & Media state
  const [messageContent, setMessageContent] = useState<string>(
    `{Olá|Oi} {nome}, {saudacao_tempo}!\n\nPassando com uma oportunidade especial da {empresa}.\n\n👉 Gostaria de conferir agora? Basta responder com *SIM*!`
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [activeMediaTab, setActiveMediaTab] = useState<'none' | 'image' | 'audio' | 'document'>('none');
  const [attachedImage, setAttachedImage] = useState<{ url: string; name: string } | null>(null);
  const [attachedAudio, setAttachedAudio] = useState<{ url: string; name: string } | null>(null);
  const [attachedDocument, setAttachedDocument] = useState<{ url: string; name: string; size: string } | null>(null);
  const [isVoiceSimulated, setIsVoiceSimulated] = useState<boolean>(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Anti-Ban & Scheduling state
  const [sendImmediately, setSendImmediately] = useState<boolean>(true);
  const [scheduledDate, setScheduledDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState<string>('09:00');
  const [minDelay, setMinDelay] = useState<number>(6);
  const [maxDelay, setMaxDelay] = useState<number>(15);
  const [pauseEvery, setPauseEvery] = useState<number>(20);
  const [pauseDuration, setPauseDuration] = useState<number>(120);

  // Preview state
  const [previewContactIndex, setPreviewContactIndex] = useState<number>(0);

  // Compute calculated target contacts
  const targetContacts = React.useMemo(() => {
    if (targetType === 'groups') {
      if (selectedGroupIds.length === 0) {
        return contacts.filter((c) => c.status === 'active');
      }
      const filtered = contacts.filter((c) => selectedGroupIds.includes(c.group) && c.status === 'active');
      return filtered.length > 0 ? filtered : contacts.filter((c) => c.status === 'active');
    } else if (targetType === 'contacts') {
      if (selectedContactIds.length === 0) {
        return contacts.filter((c) => c.status === 'active');
      }
      return contacts.filter((c) => selectedContactIds.includes(c.id));
    } else {
      const nums = directNumbersText
        .split(/[\n,;]+/)
        .map((n) => n.trim())
        .filter((n) => n.length >= 8);
      return nums.map((num, idx) => ({
        id: `direct-${idx}`,
        name: `Contato ${idx + 1}`,
        phone: num,
        group: 'direto',
        status: 'active' as const,
        tags: ['Lista Direta'],
        variables: { empresa: 'Sua Empresa' },
        createdAt: new Date().toISOString(),
      }));
    }
  }, [targetType, selectedGroupIds, selectedContactIds, directNumbersText, contacts]);

  const previewContact = targetContacts[previewContactIndex] || contacts[0] || {
    id: 'sample',
    name: 'Lucas Oliveira',
    phone: '5511987654321',
    group: 'vip',
    status: 'active',
    tags: ['Cliente'],
    variables: { empresa: 'Tech Soluções', valor: '450,00', vencimento: '25/03/2026' },
    createdAt: new Date().toISOString(),
  };

  const renderedPreview = renderPersonalizedMessage(messageContent, previewContact);

  const handleSelectTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const found = templates.find(t => t.id === tplId);
    if (found) {
      setMessageContent(found.content);
    }
  };

  const handleInsertTag = (tag: string) => {
    setMessageContent(prev => prev + ` {${tag}}`);
  };

  const handleToggleGroup = (groupId: string) => {
    if (selectedGroupIds.includes(groupId)) {
      setSelectedGroupIds(selectedGroupIds.filter(id => id !== groupId));
    } else {
      setSelectedGroupIds([...selectedGroupIds, groupId]);
    }
  };

  const handleToggleContact = (contactId: string) => {
    if (selectedContactIds.includes(contactId)) {
      setSelectedContactIds(selectedContactIds.filter(id => id !== contactId));
    } else {
      setSelectedContactIds([...selectedContactIds, contactId]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (file.type.startsWith('image/')) {
        setAttachedImage({ url: result, name: file.name });
        setActiveMediaTab('image');
      } else if (file.type.startsWith('audio/')) {
        setAttachedAudio({ url: result, name: file.name });
        setActiveMediaTab('audio');
      } else {
        const sizeKb = Math.round(file.size / 1024);
        setAttachedDocument({ url: result, name: file.name, size: `${sizeKb} KB` });
        setActiveMediaTab('document');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (session.status !== 'connected') {
      onOpenConnectModal();
      return;
    }

    if (targetContacts.length === 0) {
      alert('Selecione pelo menos 1 contato ou grupo para o disparo.');
      return;
    }

    let mediaType: 'none' | 'image' | 'audio' | 'document' = 'none';
    let mediaUrl: string | undefined = undefined;
    let mediaName: string | undefined = undefined;

    if (activeMediaTab === 'image' && attachedImage) {
      mediaType = 'image';
      mediaUrl = attachedImage.url;
      mediaName = attachedImage.name;
    } else if (activeMediaTab === 'audio' && (attachedAudio || isVoiceSimulated)) {
      mediaType = 'audio';
      mediaUrl = attachedAudio?.url;
      mediaName = attachedAudio?.name || 'audio.mp3';
    } else if (activeMediaTab === 'document' && attachedDocument) {
      mediaType = 'document';
      mediaUrl = attachedDocument.url;
      mediaName = attachedDocument.name;
    }

    const newCampaign: Campaign = {
      id: `cmp-${Date.now()}`,
      name: name.trim() || 'Disparo WhatsApp Turbo',
      templateId: selectedTemplateId || undefined,
      messageContent,
      targetType,
      targetGroupIds: selectedGroupIds,
      targetContactIds: selectedContactIds,
      directNumbers: targetType === 'direct_list' ? targetContacts.map(c => c.phone) : undefined,
      mediaType,
      mediaUrl,
      mediaName,
      isVoiceSimulated: isVoiceSimulated || activeMediaTab === 'audio',
      sendImmediately,
      scheduledDate: sendImmediately ? undefined : scheduledDate,
      scheduledTime: sendImmediately ? undefined : scheduledTime,
      minDelaySeconds: Number(minDelay),
      maxDelaySeconds: Number(maxDelay),
      pauseEveryCount: Number(pauseEvery),
      pauseDurationSeconds: Number(pauseDuration),
      status: sendImmediately ? 'running' : 'scheduled',
      totalCount: targetContacts.length,
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString(),
      logs: [],
    };

    onStartCampaign(newCampaign);
  };

  return (
    <div className="space-y-6">
      {/* Wizard Header & Progress steps */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Send className="w-6 h-6 text-red-600" />
              Assistente de Disparo com Mídia
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Envio em massa de texto, fotos, áudios e arquivos com proteção anti-ban e agendamento
            </p>
          </div>

          {session.status !== 'connected' ? (
            <button
              onClick={onOpenConnectModal}
              className="px-4 py-2 bg-red-50 border border-red-300 text-red-700 hover:bg-red-100 text-xs font-bold rounded-xl flex items-center gap-2 transition-all"
            >
              <AlertTriangle className="w-4 h-4" />
              WhatsApp Desconectado (Clique para Conectar)
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-xl text-emerald-800 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Conectado: {session.phone} ({session.antiBanHealthScore}% Seguro)
            </div>
          )}
        </div>

        {/* Step Tabs */}
        <div className="grid grid-cols-4 gap-2 mt-5">
          {[
            { num: 1, label: '1. Destinatários', desc: `${targetContacts.length} contatos` },
            { num: 2, label: '2. Mensagem & Mídia', desc: 'Texto, Fotos, Áudios' },
            { num: 3, label: '3. Anti-Bloqueio', desc: `${minDelay}s ~ ${maxDelay}s delay` },
            { num: 4, label: '4. Revisão & Envio', desc: 'Simulação ao Vivo' },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => setStep(s.num as any)}
              className={`p-3 rounded-2xl border text-left transition-all ${
                step === s.num
                  ? 'bg-gradient-to-r from-red-600 to-black text-white shadow-md shadow-red-600/20'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="text-xs font-black flex items-center justify-between">
                <span>{s.label}</span>
                {step > s.num && <span className="text-emerald-300">✓</span>}
              </div>
              <div className={`text-[10px] mt-0.5 truncate ${step === s.num ? 'text-red-100' : 'text-slate-500'}`}>
                {s.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Step form */}
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1: DESTINATÁRIOS */}
          {step === 1 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm animate-in fade-in">
              <div className="space-y-1">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-600" />
                  Passo 1: Selecione os Destinatários
                </h2>
                <p className="text-xs text-slate-500">
                  Escolha por grupos/categorias, contatos avulsos ou lista rápida colada
                </p>
              </div>

              {/* Campaign name */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Identificação da Campanha
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-red-600 font-medium"
                  placeholder="Ex: Oferta VIP Março"
                />
              </div>

              {/* Target Type Selector */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'groups', label: 'Por Categorias / Grupos', icon: FolderKanban, desc: 'Segmentação rápida' },
                  { id: 'contacts', label: 'Contatos Avulsos', icon: Users, desc: 'Escolha manual' },
                  { id: 'direct_list', label: 'Colar Telefones', icon: FileText, desc: 'Lista rápida' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTargetType(item.id as any)}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      targetType === item.id
                        ? 'bg-red-50/80 border-red-600 text-red-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>{item.label}</span>
                      {targetType === item.id && <span className="text-red-600">✓</span>}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">{item.desc}</div>
                  </button>
                ))}
              </div>

              {/* Sub-selectors */}
              {targetType === 'groups' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Selecione os Grupos / Categorias de Contatos:
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedGroupIds(
                          selectedGroupIds.length === groups.length
                            ? []
                            : groups.map((g) => g.id)
                        )
                      }
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      {selectedGroupIds.length === groups.length
                        ? 'Desmarcar Todos'
                        : `Marcar Todos os Grupos (${groups.length})`}
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {groups.map((group) => {
                      const isSelected = selectedGroupIds.includes(group.id);
                      const groupCount = contacts.filter(c => c.group === group.id && c.status === 'active').length;
                      return (
                        <div
                          key={group.id}
                          onClick={() => handleToggleGroup(group.id)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-red-50/70 border-red-600 shadow-xs'
                              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: group.color || '#dc2626' }}
                              />
                              {group.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {group.description || 'Sem descrição'}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-lg border border-red-200">
                              {groupCount} contatos
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {targetType === 'contacts' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700">
                      Selecione os contatos ({selectedContactIds.length} selecionados):
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedContactIds(contacts.map(c => c.id))}
                      className="text-red-600 font-bold hover:underline"
                    >
                      Selecionar Todos ({contacts.length})
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    {contacts.map((c) => {
                      const isSelected = selectedContactIds.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => handleToggleContact(c.id)}
                          className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer ${
                            isSelected ? 'bg-red-100/70 text-red-950 font-bold' : 'hover:bg-slate-200/50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="accent-red-600 rounded"
                            />
                            <span className="font-medium text-slate-900">{c.name}</span>
                            <span className="text-[10px] text-slate-500">({formatPhoneDisplay(c.phone)})</span>
                          </div>
                          <span className="text-[10px] text-slate-500">{c.variables?.empresa || ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {targetType === 'direct_list' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Cole os números de WhatsApp (um por linha ou separados por vírgula):
                  </label>
                  <textarea
                    rows={4}
                    value={directNumbersText}
                    onChange={(e) => setDirectNumbersText(e.target.value)}
                    placeholder="5511987654321&#10;5521991238765&#10;5531988884433"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:border-red-600"
                  />
                  <p className="text-[11px] text-slate-500">
                    Total identificado: <strong className="text-red-600">{targetContacts.length} números</strong>.
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-black hover:from-red-500 hover:to-zinc-900 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-red-600/20 flex items-center gap-2"
                >
                  Continuar para Mensagem & Mídia <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: MENSAGEM & MÍDIA */}
          {step === 2 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-red-600" />
                    Passo 2: Mensagem, Mídia & IA
                  </h2>
                  <p className="text-xs text-slate-500">
                    Insira o texto e anexe fotos, áudios de voz gravados ou arquivos
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAIModalOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-500 hover:to-red-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  Gerador IA
                </button>
              </div>

              {/* Media selection bar */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Tipo de Envio:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'none', label: 'Apenas Texto', icon: FileText },
                    { id: 'image', label: 'Foto / Imagem', icon: ImageIcon },
                    { id: 'audio', label: 'Áudio (Voz PTT)', icon: Mic },
                    { id: 'document', label: 'PDF / Arquivo', icon: Paperclip },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setActiveMediaTab(m.id as any)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                          activeMediaTab === m.id
                            ? 'bg-gradient-to-r from-red-600 to-black text-white shadow-sm shadow-red-600/20'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px]">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Media upload controls */}
              {activeMediaTab === 'image' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Anexo de Imagem:</span>
                    {attachedImage && (
                      <button onClick={() => setAttachedImage(null)} className="text-xs text-red-600 underline font-bold">
                        Remover
                      </button>
                    )}
                  </div>
                  {attachedImage ? (
                    <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200">
                      <img src={attachedImage.url} alt="img" className="w-14 h-14 rounded-lg object-cover" />
                      <span className="text-xs font-bold text-slate-800 truncate">{attachedImage.name}</span>
                    </div>
                  ) : (
                    <div>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="text-xs text-slate-600" />
                    </div>
                  )}
                </div>
              )}

              {activeMediaTab === 'audio' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Áudio de Voz no WhatsApp:</span>
                  </div>
                  <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800">Simular Áudio de Voz Gravado na Hora (PTT)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isVoiceSimulated || activeMediaTab === 'audio'}
                      onChange={(e) => setIsVoiceSimulated(e.target.checked)}
                      className="w-4 h-4 accent-red-600 rounded"
                    />
                  </div>
                </div>
              )}

              {activeMediaTab === 'document' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Anexar Arquivo ou PDF:</span>
                    {attachedDocument && (
                      <button onClick={() => setAttachedDocument(null)} className="text-xs text-red-600 underline font-bold">
                        Remover
                      </button>
                    )}
                  </div>
                  {attachedDocument ? (
                    <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="w-8 h-8 rounded bg-red-600 text-white font-bold text-xs flex items-center justify-center">PDF</div>
                      <span className="text-xs font-bold text-slate-800 truncate">{attachedDocument.name}</span>
                    </div>
                  ) : (
                    <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileUpload} className="text-xs text-slate-600" />
                  )}
                </div>
              )}

              {/* Tag inserters */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 block">
                  Tags Dinâmicas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { tag: 'nome', label: '👤 {nome}' },
                    { tag: 'primeiro_nome', label: '👋 {primeiro_nome}' },
                    { tag: 'saudacao_tempo', label: '☀️ {saudacao_tempo}' },
                    { tag: 'empresa', label: '🏢 {empresa}' },
                    { tag: 'valor', label: '💰 {valor}' },
                  ].map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => handleInsertTag(v.tag)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[11px] font-mono font-bold text-slate-700 transition-all"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main text area */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700">
                    Corpo da Mensagem (Suporta Spintax e formatação WhatsApp: *negrito*, _itálico_):
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {messageContent.length} caracteres
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Olá {nome}, tudo bem?..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 leading-relaxed focus:outline-none focus:border-red-600 font-medium"
                />
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-black hover:from-red-500 hover:to-zinc-900 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-red-600/20 flex items-center gap-2"
                >
                  Continuar para Anti-Bloqueio <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ANTI-BLOQUEIO & AGENDAMENTO */}
          {step === 3 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm animate-in fade-in">
              <div className="space-y-1">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-red-600" />
                  Passo 3: Proteção Anti-Bloqueio & Agendamento
                </h2>
                <p className="text-xs text-slate-500">
                  Configure pausas inteligentes e horários automáticos para máxima segurança do seu chip
                </p>
              </div>

              {/* Envio Imediato vs Agendado */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  Quando disparar?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSendImmediately(true)}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      sendImmediately
                        ? 'bg-red-50 border-red-600 text-red-950 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-2">
                      <Send className="w-4 h-4 text-red-600" />
                      Enviar Imediatamente
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Inicia a fila agora mesmo</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSendImmediately(false)}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      !sendImmediately
                        ? 'bg-red-50 border-red-600 text-red-950 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-red-600" />
                      Agendar Data e Horário
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Disparo programado</div>
                  </button>
                </div>
              </div>

              {/* Schedule time inputs */}
              {!sendImmediately && (
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                      Data do Envio
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                      Horário de Início
                    </label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Delay Range Settings */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Sliders className="w-4 h-4 text-red-600" />
                  Intervalo Randômico entre Mensagens (Human Jitter)
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-600 mb-1 block">
                      Delay Mínimo: <strong className="text-slate-900">{minDelay} segundos</strong>
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="30"
                      value={minDelay}
                      onChange={(e) => setMinDelay(Number(e.target.value))}
                      className="w-full accent-red-600"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 mb-1 block">
                      Delay Máximo: <strong className="text-slate-900">{maxDelay} segundos</strong>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      value={maxDelay}
                      onChange={(e) => setMaxDelay(Number(e.target.value))}
                      className="w-full accent-red-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-black hover:from-red-500 hover:to-zinc-900 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-red-600/20 flex items-center gap-2"
                >
                  Revisar e Disparar <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: REVISÃO & INICIAR DISPARO */}
          {step === 4 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm animate-in fade-in">
              <div className="space-y-1">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Check className="w-5 h-5 text-red-600" />
                  Passo 4: Revisão Final do Disparo
                </h2>
                <p className="text-xs text-slate-500">
                  Confira o resumo antes de iniciar ou programar o envio
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Destinatários</span>
                  <span className="text-sm font-bold text-red-600 block mt-0.5">
                    {targetContacts.length} contatos
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Modo de Envio</span>
                  <span className="text-xs font-bold text-slate-900 block mt-1">
                    {sendImmediately ? 'Imediato' : `${scheduledDate} às ${scheduledTime}`}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Intervalo Randômico</span>
                  <span className="text-xs font-bold text-slate-900 block mt-1">
                    {minDelay}s ~ {maxDelay}s
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">WhatsApp Conectado</span>
                  <span className="text-xs font-bold text-emerald-700 block mt-1 truncate">
                    {session.phone || 'Instância Ativa'}
                  </span>
                </div>
              </div>

              {/* Final CTA Buttons */}
              <div className="p-5 bg-red-50 border border-red-200 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-slate-900">
                    Tudo pronto para disparar!
                  </div>
                  <div className="text-xs text-slate-600">
                    O sistema enviará com intervalos humanos e proteção anti-bloqueio.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-red-600 via-rose-700 to-black hover:from-red-500 hover:to-zinc-900 text-white font-black text-sm rounded-2xl transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  {sendImmediately ? 'Iniciar Disparador Agora 🚀' : 'Salvar Agendamento 📅'}
                </button>
              </div>

              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 col: Live WhatsApp Smartphone Simulator */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-red-600" />
              Pré-Visualização WhatsApp:
            </h3>

            {targetContacts.length > 1 && (
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <span>Simular:</span>
                <select
                  value={previewContactIndex}
                  onChange={(e) => setPreviewContactIndex(Number(e.target.value))}
                  className="bg-white border border-slate-200 text-slate-800 text-[10px] rounded-lg px-2 py-0.5"
                >
                  {targetContacts.slice(0, 10).map((c, idx) => (
                    <option key={c.id} value={idx}>
                      {c.name.split(' ')[0]}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Smartphone Simulator */}
          <div className="w-full max-w-sm mx-auto bg-slate-950 border-4 border-slate-800 rounded-[36px] overflow-hidden shadow-2xl relative flex flex-col h-[520px]">
            {/* Phone Top Bar */}
            <div className="bg-slate-900 h-6 flex items-center justify-between px-6 text-[10px] text-slate-400 select-none">
              <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              <div className="w-16 h-3 bg-black rounded-full" />
              <span>100% ⚡</span>
            </div>

            {/* WhatsApp App Header */}
            <div className="bg-[#1f2c34] px-3.5 py-2.5 flex items-center justify-between border-b border-slate-800 select-none">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center">
                  {previewContact.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-bold text-white truncate max-w-[130px]">
                    {previewContact.name}
                  </div>
                  <div className="text-[9px] text-emerald-400 font-medium">online</div>
                </div>
              </div>
              <div className="text-slate-400 text-xs">⋮</div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-whatsapp-pattern p-3 overflow-y-auto space-y-3 flex flex-col justify-end">
              <div className="text-center">
                <span className="text-[9px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-md">Hoje</span>
              </div>

              {/* Image preview */}
              {activeMediaTab === 'image' && attachedImage && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-[#005c4b] rounded-2xl rounded-tr-xs p-1 shadow-md">
                    <img src={attachedImage.url} alt="anexo" className="rounded-xl max-h-32 w-full object-cover" />
                  </div>
                </div>
              )}

              {/* Voice simulation */}
              {(isVoiceSimulated || activeMediaTab === 'audio') && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-[#005c4b] text-white rounded-2xl rounded-tr-xs p-2.5 text-xs shadow-md flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-500 text-black flex items-center justify-center text-xs">▶</div>
                    <div className="flex-1 space-y-1">
                      <div className="h-1 bg-white/40 rounded-full w-full" />
                      <div className="text-[9px] text-slate-300">0:24 • Mensagem de voz</div>
                    </div>
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
              )}

              {/* Document preview */}
              {activeMediaTab === 'document' && attachedDocument && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-[#005c4b] text-white rounded-2xl rounded-tr-xs p-2.5 text-xs shadow-md flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-red-600 text-white font-bold text-[9px] flex items-center justify-center">PDF</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold truncate">{attachedDocument.name}</div>
                      <div className="text-[9px] text-slate-300">{attachedDocument.size}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Message text bubble */}
              <div className="flex justify-end">
                <div className="max-w-[88%] bg-[#005c4b] text-white rounded-2xl rounded-tr-xs p-3 text-xs leading-relaxed shadow-md space-y-1">
                  <div className="whitespace-pre-wrap">{renderedPreview}</div>
                  <div className="flex items-center justify-end gap-1 text-[9px] text-slate-300 pt-1">
                    <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-[#53bdeb] font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Bar */}
            <div className="bg-[#1f2c34] p-2 flex items-center gap-2 border-t border-slate-800 select-none">
              <div className="flex-1 bg-slate-800 rounded-full px-3 py-1.5 text-[11px] text-slate-400 truncate">
                Mensagem
              </div>
              <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold">
                ➤
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Copywriter Modal */}
      <AICopywriterModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onSelectMessage={(content) => setMessageContent(content)}
      />
    </div>
  );
};
