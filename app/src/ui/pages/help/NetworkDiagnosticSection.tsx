// NetworkDiagnosticSection.tsx - Story 12.6: Diagnostic Réseau dans la page Aide
// AC4: Vérifie firewall, accessibilité Sunshine, IP locale

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Wifi, Globe, Copy, Check, Loader2, Activity } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Button } from '../../components/common/ui/button';

interface DiagnosticResult {
  firewallOk: boolean | null;
  sunshineOk: boolean | null;
  localIp: string | null;
}

export function NetworkDiagnosticSection() {
  const { t } = useTranslation();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [ipCopied, setIpCopied] = useState(false);

  const runDiagnostic = useCallback(async () => {
    setIsRunning(true);
    setResult(null);

    try {
      // Run all checks in parallel
      const [firewallResult, sunshineStatus, localIp] = await Promise.all([
        window.electronAPI.system.checkFirewall(),
        window.electronAPI.sunshine.getStatus(),
        window.electronAPI.system.getLocalIP(),
      ]);

      setResult({
        firewallOk: firewallResult.ruleExists,
        sunshineOk: sunshineStatus === 'ONLINE',
        localIp,
      });
    } catch (error) {
      console.error('[NetworkDiagnostic] Error:', error);
      setResult({
        firewallOk: null,
        sunshineOk: null,
        localIp: null,
      });
    } finally {
      setIsRunning(false);
    }
  }, []);

  const handleCopyIp = useCallback(async () => {
    if (!result?.localIp) return;
    await navigator.clipboard.writeText(result.localIp);
    setIpCopied(true);
    setTimeout(() => setIpCopied(false), 2000);
  }, [result?.localIp]);

  return (
    <GlassCard>
      <h2 className="section-title text-[14px] font-semibold uppercase tracking-wider text-[#a3a3a3] mb-4">
        {t('help.network.title')}
      </h2>

      <Button
        onClick={runDiagnostic}
        disabled={isRunning}
        variant="secondary"
        className="w-full justify-center gap-2 mb-4"
      >
        {isRunning ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {t('help.network.running')}
          </>
        ) : (
          <>
            <Activity size={16} />
            {t('help.network.runDiagnostic')}
          </>
        )}
      </Button>

      {result && (
        <div className="space-y-3">
          {/* Firewall Rule */}
          <DiagnosticItem
            icon={<Shield size={16} />}
            label={t('help.network.firewallRule')}
            ok={result.firewallOk}
            okText={t('help.network.firewallPresent')}
            failText={t('help.network.firewallAbsent')}
            advice={result.firewallOk === false ? t('help.network.firewallAdvice') : undefined}
          />

          {/* Sunshine Reachable */}
          <DiagnosticItem
            icon={<Wifi size={16} />}
            label={t('help.network.sunshineReachable')}
            ok={result.sunshineOk}
            okText={t('help.network.sunshineReachableYes')}
            failText={t('help.network.sunshineReachableNo')}
            advice={result.sunshineOk === false ? t('help.network.sunshineAdvice') : undefined}
          />

          {/* Local IP */}
          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02]">
            <div className="mt-0.5 text-text-secondary">
              <Globe size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-text-secondary">{t('help.network.localIp')}</span>
                {result.localIp ? (
                  <span className="text-[12px]">✅</span>
                ) : (
                  <span className="text-[12px]">❌</span>
                )}
              </div>
              {result.localIp ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[13px] text-text-primary font-mono bg-white/[0.04] px-2 py-0.5 rounded">
                    {result.localIp}
                  </span>
                  <button
                    onClick={handleCopyIp}
                    className="p-1 rounded hover:bg-white/[0.06] transition-colors text-text-secondary/60 hover:text-text-secondary"
                    title={t('help.network.copyIp')}
                  >
                    {ipCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                  {ipCopied && (
                    <span className="text-[11px] text-emerald-400">{t('help.network.copied')}</span>
                  )}
                </div>
              ) : (
                <p className="text-[12px] text-red-400/80 mt-0.5">{t('help.network.localIpNotFound')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function DiagnosticItem({
  icon,
  label,
  ok,
  okText,
  failText,
  advice,
}: {
  icon: React.ReactNode;
  label: string;
  ok: boolean | null;
  okText: string;
  failText: string;
  advice?: string;
}) {
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02]">
      <div className="mt-0.5 text-text-secondary">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-text-secondary">{label}</span>
          {ok === true && <span className="text-[12px]">✅</span>}
          {ok === false && <span className="text-[12px]">❌</span>}
          {ok === null && <span className="text-[12px] text-text-secondary/40">—</span>}
        </div>
        <p className={`text-[12px] mt-0.5 ${ok === true ? 'text-emerald-400/80' : ok === false ? 'text-red-400/80' : 'text-text-secondary/50'}`}>
          {ok === true ? okText : ok === false ? failText : ''}
        </p>
        {advice && (
          <p className="text-[11px] text-amber-400/70 mt-1">
            💡 {advice}
          </p>
        )}
      </div>
    </div>
  );
}

export default NetworkDiagnosticSection;
