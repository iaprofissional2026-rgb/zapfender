/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, AppView } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { CampaignWizard } from './components/CampaignWizard';
import { ContactsManager } from './components/ContactsManager';
import { TemplatesManager } from './components/TemplatesManager';
import { ScheduledQueueView } from './components/ScheduledQueueView';
import { ReportsView } from './components/ReportsView';
import { AntiBanGuideView } from './components/AntiBanGuideView';
import { AutoResponderView } from './components/AutoResponderView';
import { ChipWarmerView } from './components/ChipWarmerView';
import { SupermarketDebtManager } from './components/SupermarketDebtManager';
import { ConnectionModal } from './components/ConnectionModal';
import { LiveDispatcherModal } from './components/LiveDispatcherModal';
import { AICopywriterModal } from './components/AICopywriterModal';
import { QuickTestModal } from './components/QuickTestModal';

import {
  loadContacts,
  saveContacts,
  loadGroups,
  saveGroups,
  loadTemplates,
  saveTemplates,
  loadCampaigns,
  saveCampaigns,
  loadSession,
  saveSession,
  loadSettings,
  saveSettings,
  loadAutoResponderRules,
  saveAutoResponderRules,
  loadChipWarmerSession,
  saveChipWarmerSession,
  loadSupermarketCustomers,
  saveSupermarketCustomers,
  loadSupermarketErpConfig,
  saveSupermarketErpConfig,
} from './services/storageService';

import {
  Contact,
  ContactGroup,
  MessageTemplate,
  Campaign,
  WhatsAppSession,
  AppSettings,
  AutoResponderRule,
  ChipWarmerSession,
  SupermarketCustomer,
  SupermarketErpConfig,
} from './types';
import {
  subscribeToWhatsAppEvents,
  fetchWhatsAppStatus,
  fetchRealWhatsAppData,
  syncAutoResponderRulesWithBackend,
} from './services/whatsappApi';
import { sanitizePhoneNumber } from './utils/messageFormatter';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');

  // Core Persistent State
  const [contacts, setContacts] = useState<Contact[]>(loadContacts);
  const [groups, setGroups] = useState<ContactGroup[]>(loadGroups);
  const [templates, setTemplates] = useState<MessageTemplate[]>(loadTemplates);
  const [campaigns, setCampaigns] = useState<Campaign[]>(loadCampaigns);
  const [session, setSession] = useState<WhatsAppSession>(loadSession);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [autoResponderRules, setAutoResponderRules] = useState<AutoResponderRule[]>(loadAutoResponderRules);
  const [chipWarmer, setChipWarmer] = useState<ChipWarmerSession>(loadChipWarmerSession);
  const [supermarketCustomers, setSupermarketCustomers] = useState<SupermarketCustomer[]>(loadSupermarketCustomers);
  const [supermarketErpConfig, setSupermarketErpConfig] = useState<SupermarketErpConfig>(loadSupermarketErpConfig);

  // Modals state
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);
  const [isQuickTestModalOpen, setIsQuickTestModalOpen] = useState<boolean>(false);
  const [activeLiveCampaign, setActiveLiveCampaign] = useState<Campaign | null>(null);
  const [reportSelectedCampaignId, setReportSelectedCampaignId] = useState<string | undefined>();

  // Reusable function to pull real WhatsApp data from connected device
  const syncRealData = async () => {
    try {
      console.log('[App] Auto-syncing real WhatsApp contacts & groups...');
      const realData = await fetchRealWhatsAppData();
      if (realData.success) {
        // Merge groups
        setGroups((prevGroups) => {
          const existingIds = new Set(prevGroups.map((g) => g.id));
          const updated = [...prevGroups];
          for (const rg of realData.groups) {
            if (!existingIds.has(rg.id)) {
              updated.push({
                id: rg.id,
                name: rg.name,
                color: rg.color,
                description: rg.description || `${rg.participantsCount} participantes`,
                createdAt: new Date().toISOString(),
                isRealWhatsAppGroup: true,
                participantsCount: rg.participantsCount,
              });
              existingIds.add(rg.id);
            }
          }
          return updated;
        });

        // Merge contacts
        setContacts((prevContacts) => {
          const existingPhones = new Set(prevContacts.map((c) => sanitizePhoneNumber(c.phone)));
          const updated = [...prevContacts];
          for (const rc of realData.contacts) {
            const cleanP = sanitizePhoneNumber(rc.phone);
            if (!existingPhones.has(cleanP)) {
              updated.push({
                id: rc.id,
                name: rc.name,
                phone: rc.phone,
                group: rc.group,
                status: 'active',
                tags: rc.tags,
                variables: rc.variables,
                createdAt: rc.createdAt,
              });
              existingPhones.add(cleanP);
            }
          }
          return updated;
        });
      }
    } catch (err) {
      console.log('[App] Auto-sync notice:', err);
    }
  };

  // Initial WhatsApp status synchronization
  useEffect(() => {
    fetchWhatsAppStatus().then((state) => {
      if (state.status === 'connected' && state.user) {
        setSession((prev) => ({
          ...prev,
          status: 'connected',
          phone: state.user?.phone || prev.phone,
          pushname: state.user?.name || prev.pushname,
          connectedAt: state.connectedAt || prev.connectedAt,
        }));
        syncRealData();
      }
    });

    const unsubscribe = subscribeToWhatsAppEvents((state) => {
      if (state.status === 'connected' && state.user) {
        setSession((prev) => ({
          ...prev,
          status: 'connected',
          phone: state.user?.phone || prev.phone,
          pushname: state.user?.name || prev.pushname,
          connectedAt: state.connectedAt || prev.connectedAt,
        }));
        setTimeout(() => {
          syncRealData();
        }, 1200);
      } else if (state.status === 'disconnected') {
        setSession((prev) => ({
          ...prev,
          status: 'disconnected',
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  // Auto-save effects
  useEffect(() => {
    saveContacts(contacts);
  }, [contacts]);

  useEffect(() => {
    saveGroups(groups);
  }, [groups]);

  useEffect(() => {
    saveTemplates(templates);
  }, [templates]);

  useEffect(() => {
    saveCampaigns(campaigns);
  }, [campaigns]);

  useEffect(() => {
    saveSession(session);
  }, [session]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveAutoResponderRules(autoResponderRules);
    syncAutoResponderRulesWithBackend(autoResponderRules);
  }, [autoResponderRules]);

  useEffect(() => {
    saveChipWarmerSession(chipWarmer);
  }, [chipWarmer]);

  useEffect(() => {
    saveSupermarketCustomers(supermarketCustomers);
  }, [supermarketCustomers]);

  useEffect(() => {
    saveSupermarketErpConfig(supermarketErpConfig);
  }, [supermarketErpConfig]);

  // Merge new market contacts into contacts
  const handleAddContactsFromMarket = (newContacts: Contact[]) => {
    setContacts((prev) => {
      const existingPhones = new Set(prev.map((c) => sanitizePhoneNumber(c.phone)));
      const filtered = newContacts.filter((c) => !existingPhones.has(sanitizePhoneNumber(c.phone)));
      return [...filtered, ...prev];
    });
  };

  // Background Automatic Scheduler Check
  useEffect(() => {
    const schedulerInterval = setInterval(() => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentHourMin = now.toTimeString().substring(0, 5); // "14:30"

      campaigns.forEach((camp) => {
        if (
          camp.status === 'scheduled' &&
          camp.scheduledDate &&
          camp.scheduledTime &&
          session.status === 'connected'
        ) {
          if (
            camp.scheduledDate <= todayStr &&
            camp.scheduledTime <= currentHourMin &&
            !activeLiveCampaign
          ) {
            console.log('⏰ Horário agendado atingido! Iniciando campanha:', camp.name);
            setActiveLiveCampaign(camp);
          }
        }
      });
    }, 10000);

    return () => clearInterval(schedulerInterval);
  }, [campaigns, session.status, activeLiveCampaign]);

  // Campaign Handlers
  const handleStartCampaign = (newCampaign: Campaign) => {
    const updated = [newCampaign, ...campaigns];
    setCampaigns(updated);

    if (newCampaign.sendImmediately) {
      setActiveLiveCampaign(newCampaign);
    } else {
      alert(`Campanha agendada com sucesso para ${newCampaign.scheduledDate} às ${newCampaign.scheduledTime}!`);
      setCurrentView('scheduled');
    }
  };

  const handleRunCampaignNow = (camp: Campaign) => {
    setActiveLiveCampaign(camp);
  };

  const handleUpdateActiveCampaign = (updatedCampaign: Campaign) => {
    setCampaigns((prev) => prev.map((c) => (c.id === updatedCampaign.id ? updatedCampaign : c)));
  };

  const handleViewReport = (camp: Campaign) => {
    setReportSelectedCampaignId(camp.id);
    setCurrentView('reports');
  };

  const handleUseTemplateInCampaign = (tpl: MessageTemplate) => {
    setCurrentView('campaign');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col selection:bg-red-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setReportSelectedCampaignId(undefined);
          setCurrentView(view);
        }}
        session={session}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onOpenAIModal={() => setIsAIModalOpen(true)}
        onOpenQuickTestModal={() => setIsQuickTestModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'dashboard' && (
          <DashboardView
            session={session}
            contacts={contacts}
            groups={groups}
            campaigns={campaigns}
            supermarketCustomers={supermarketCustomers}
            onNavigate={setCurrentView}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
            onOpenAIModal={() => setIsAIModalOpen(true)}
            onRunCampaignNow={handleRunCampaignNow}
          />
        )}

        {currentView === 'supermarket' && (
          <SupermarketDebtManager
            customers={supermarketCustomers}
            onUpdateCustomers={setSupermarketCustomers}
            erpConfig={supermarketErpConfig}
            onUpdateErpConfig={setSupermarketErpConfig}
            session={session}
            contacts={contacts}
            onAddContactsFromMarket={handleAddContactsFromMarket}
          />
        )}

        {currentView === 'contacts' && (
          <ContactsManager
            contacts={contacts}
            groups={groups}
            templates={templates}
            session={session}
            onUpdateContacts={setContacts}
            onUpdateGroups={setGroups}
            onStartCampaign={handleStartCampaign}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
          />
        )}

        {currentView === 'campaign' && (
          <CampaignWizard
            groups={groups}
            contacts={contacts}
            templates={templates}
            session={session}
            onStartCampaign={handleStartCampaign}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
          />
        )}

        {currentView === 'autoresponder' && (
          <AutoResponderView
            rules={autoResponderRules}
            onUpdateRules={setAutoResponderRules}
            session={session}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
            onOpenAIModal={() => setIsAIModalOpen(true)}
          />
        )}

        {currentView === 'warmer' && (
          <ChipWarmerView
            session={session}
            warmer={chipWarmer}
            onUpdateWarmer={setChipWarmer}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
          />
        )}

        {currentView === 'templates' && (
          <TemplatesManager
            templates={templates}
            onUpdateTemplates={setTemplates}
            onUseTemplateInCampaign={handleUseTemplateInCampaign}
          />
        )}

        {currentView === 'scheduled' && (
          <ScheduledQueueView
            campaigns={campaigns}
            contacts={contacts}
            groups={groups}
            session={session}
            onRunCampaignNow={handleRunCampaignNow}
            onUpdateCampaigns={setCampaigns}
            onViewReport={handleViewReport}
            onOpenNewCampaign={() => setCurrentView('contacts')}
          />
        )}

        {currentView === 'reports' && (
          <ReportsView
            campaigns={campaigns}
            selectedCampaignId={reportSelectedCampaignId}
            onRetryCampaign={handleRunCampaignNow}
          />
        )}

        {currentView === 'antiban' && (
          <AntiBanGuideView
            session={session}
            settings={settings}
            onUpdateSettings={setSettings}
          />
        )}
      </main>

      {/* Floating Footer Status */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="font-black text-slate-800">
              ZapSender Turbo Pro • Painel Completo de Automação, Disparador Real & Anti-Ban
            </span>
          </div>
          <div className="text-slate-500 font-bold">WhatsApp Web Socket P2P • IA Ilimitada Sem Custos</div>
        </div>
      </footer>

      {/* QR Code / Connection Modal */}
      <ConnectionModal
        session={session}
        onUpdateSession={setSession}
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />

      {/* Quick Test Unit Modal */}
      <QuickTestModal
        isOpen={isQuickTestModalOpen}
        onClose={() => setIsQuickTestModalOpen(false)}
        session={session}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
      />

      {/* AI Copywriter Modal */}
      <AICopywriterModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onSelectMessage={(content) => {
          setCurrentView('contacts');
        }}
      />

      {/* Live Dispatcher Active Modal */}
      {activeLiveCampaign && (
        <LiveDispatcherModal
          campaign={activeLiveCampaign}
          contacts={contacts}
          session={session}
          isOpen={!!activeLiveCampaign}
          onClose={() => setActiveLiveCampaign(null)}
          onUpdateCampaign={handleUpdateActiveCampaign}
          onUpdateSession={setSession}
        />
      )}
    </div>
  );
}
