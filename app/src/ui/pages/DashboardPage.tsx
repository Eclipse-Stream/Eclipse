// DashboardPage.tsx - Page principale (Story 1.5, Task 3)
// AC#1: Affiche titre, 3 GlassCards pour Sunshine, Credentials, Appairage
// Story 2.1: Intégration StatusBadge et monitoring Sunshine

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@ui/components/common/GlassCard';
import { Activity, Key, Monitor, Wifi, Copy, Check } from 'lucide-react';
import { StatusBadge } from '@ui/components/features/StatusBadge';
import { ServiceControlButtons } from '@ui/components/features/ServiceControls/ServiceControlButtons';
import { CredentialsManager } from '@ui/components/features/Credentials';
import { ClientsList } from '@ui/components/features/Clients';
import { useAppStore } from '@application/stores';
import { sunshineMonitor } from '@application/services/sunshine-monitor';
import { credentialService } from '@application/services/credential-service';

export function DashboardPage() {
  const { t } = useTranslation();
  const sunshineStatus = useAppStore((state) => state.sunshineStatus);
  const username = useAppStore((state) => state.username);
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  // Story 12.6: Local IP display
  const [localIp, setLocalIp] = useState<string | null>(null);
  const [showIp, setShowIp] = useState(false);
  const [ipCopied, setIpCopied] = useState(false);

  const handleShowIp = useCallback(async () => {
    if (showIp) {
      setShowIp(false);
      return;
    }
    const ip = await window.electronAPI.system.getLocalIP();
    setLocalIp(ip);
    setShowIp(true);
  }, [showIp]);

  const handleCopyIp = useCallback(async () => {
    if (!localIp) return;
    await navigator.clipboard.writeText(localIp);
    setIpCopied(true);
    setTimeout(() => setIpCopied(false), 2000);
  }, [localIp]);

  useEffect(() => {
    // Polling plus rapide (1.5s) pour détecter les redémarrages via localhost
    sunshineMonitor.startPolling(1500);

    return () => {
      sunshineMonitor.stopPolling();
    };
  }, []);

  const loadCredentials = async () => {
    const creds = await credentialService.getCredentials();
    if (creds) {
      setCredentials(creds);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, [username]);

  return (
    <div className="page-container p-8 overflow-y-auto">
      <h1 className="page-title text-[18px] font-semibold text-text-primary mb-6">{t('nav.dashboard')}</h1>

      <div className="grid grid-cols-1 gap-4 max-w-2xl">
        {/* Appareils appairés - Epic 6 */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Monitor size={20} className="text-blue-500" />
              <h2 className="text-[15px] font-medium text-text-primary">{t('dashboard.clients.title')}</h2>
            </div>
          </div>
          {/* Liste des clients (Story 6.1, 6.2, 6.3) */}
          <ClientsList />

          {/* Story 12.6: Bouton discret "Afficher mon IP" */}
          <div className="mt-3 pt-3 border-t border-white/[0.04]">
            <button
              onClick={handleShowIp}
              className="flex items-center gap-1.5 text-[12px] text-text-secondary/60 hover:text-text-secondary transition-colors"
            >
              <Wifi size={12} />
              {showIp ? t('help.ip.hideIp') : t('help.ip.showIp')}
            </button>
            {showIp && localIp && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[13px] text-text-primary font-mono bg-white/[0.04] px-2 py-1 rounded">
                  {localIp}
                </span>
                <button
                  onClick={handleCopyIp}
                  className="p-1 rounded hover:bg-white/[0.06] transition-colors text-text-secondary/60 hover:text-text-secondary"
                  title={t('help.network.copyIp')}
                >
                  {ipCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
                {ipCopied && (
                  <span className="text-[11px] text-emerald-400">{t('help.ip.copied')}</span>
                )}
              </div>
            )}
            {showIp && localIp && (
              <p className="mt-1 text-[11px] text-text-secondary/50">
                {t('help.ip.hint')}
              </p>
            )}
            {showIp && !localIp && (
              <p className="mt-2 text-[12px] text-text-secondary/60">
                {t('help.network.localIpNotFound')}
              </p>
            )}
          </div>
        </GlassCard>

        {/* Identifiants - Configuration secondaire */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-4">
            <Key size={20} className="text-amber-500" />
            <h2 className="text-[15px] font-medium text-text-primary">{t('dashboard.credentials.title')}</h2>
          </div>
          {credentials ? (
            <CredentialsManager
              username={credentials.username}
              password={credentials.password}
              onCredentialsUpdated={loadCredentials}
            />
          ) : (
            <p className="text-[14px] text-text-secondary">
              {t('dashboard.credentials.notConfigured')}
            </p>
          )}
        </GlassCard>

        {/* État Sunshine - Contrôle avancé en dernier */}
        <GlassCard>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Activity size={20} className="text-emerald-500" />
              <h2 className="text-[15px] font-medium text-text-primary">{t('dashboard.sunshine.title')}</h2>
            </div>
            <StatusBadge status={sunshineStatus} />
          </div>
          <p className="text-[14px] text-text-secondary mb-4">
            {sunshineStatus === null && t('common.loading')}
            {sunshineStatus === 'ONLINE' && t('dashboard.sunshine.ready')}
            {sunshineStatus === 'OFFLINE' && t('dashboard.sunshine.stopped')}
            {sunshineStatus === 'AUTH_REQUIRED' && t('dashboard.sunshine.authRequired')}
            {sunshineStatus === 'UNKNOWN' && t('dashboard.sunshine.unknown')}
          </p>
          {/* Service Control Buttons - Story 2.2 */}
          <ServiceControlButtons />
        </GlassCard>
      </div>
    </div>
  );
}

export default DashboardPage;
