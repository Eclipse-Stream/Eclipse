// CreditsPage.tsx - Page Crédits & Communauté (Story 10.1)
// Accessible via le clic sur la version dans la sidebar

import { Heart, ExternalLink, Github, ArrowLeft } from 'lucide-react';
import discordIcon from '../../assets/discord-icon-svgrepo-com.svg';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../components/common/GlassCard';
import { Button } from '../components/common/ui/button';
import { useAppStore } from '@application/stores';

// URLs configurables
const CREDITS_LINKS = {
  discord: 'https://discord.gg/RTAQjQzm',
  sunshineDonate: 'https://github.com/sponsors/LizardByte',
  vddDonate: 'https://github.com/sponsors/itsmikethetech',
  sunshineGithub: 'https://github.com/LizardByte/Sunshine',
  vddGithub: 'https://github.com/itsmikethetech/Virtual-Display-Driver',
  moonlightGithub: 'https://github.com/moonlight-stream',
  nirsoftDonate: 'https://www.nirsoft.net/donate.html',
  nirsoftWebsite: 'https://www.nirsoft.net/utils/multi_monitor_tool.html',
};

interface ExternalLinkButtonProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
}

function ExternalLinkButton({ href, icon, label, description }: ExternalLinkButtonProps) {
  const handleClick = () => {
    window.electronAPI.shell.openExternal(href);
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-3 w-full px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-left group"
    >
      <div className="w-10 h-10 rounded-lg bg-corona/20 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-text-primary font-medium">{label}</span>
          <ExternalLink size={12} className="text-text-secondary/50 group-hover:text-corona transition-colors" />
        </div>
        {description && (
          <span className="text-[12px] text-text-secondary">{description}</span>
        )}
      </div>
    </button>
  );
}

export function CreditsPage() {
  const { t } = useTranslation();
  const setPage = useAppStore((state) => state.setPage);

  const handleBack = () => {
    setPage('help');
  };

  return (
    <div className="page-container p-8 overflow-y-auto">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft size={18} />
        </Button>
        <h1 className="page-title text-[18px] font-semibold text-text-primary">
          {t('credits.title')}
        </h1>
      </div>

      <div className="space-y-4 max-w-2xl">
        {/* Section Communauté */}
        <GlassCard>
          <h2 className="section-title text-[14px] font-semibold uppercase tracking-wider text-[#a3a3a3] mb-4">
            {t('credits.community')}
          </h2>

          <ExternalLinkButton
            href={CREDITS_LINKS.discord}
            icon={<img src={discordIcon} alt="Discord" className="w-5 h-5" />}
            label="Discord Eclipse"
            description={t('credits.discordDesc')}
          />

          <p className="text-[12px] text-text-secondary/70 mt-3">
            {t('credits.communityHelp')}
          </p>
        </GlassCard>

        {/* Section Soutenir */}
        <GlassCard>
          <h2 className="section-title text-[14px] font-semibold uppercase tracking-wider text-[#a3a3a3] mb-4">
            {t('credits.support')}
          </h2>

          <div className="space-y-3">
            <ExternalLinkButton
              href={CREDITS_LINKS.sunshineDonate}
              icon={<Heart size={20} className="text-pink-400" />}
              label={t('credits.donate')}
              description="GitHub Sponsors - LizardByte"
            />

            <ExternalLinkButton
              href={CREDITS_LINKS.vddDonate}
              icon={<Heart size={20} className="text-pink-400" />}
              label={t('credits.donate')}
              description="GitHub Sponsors - itsmikethetech"
            />

            <ExternalLinkButton
              href={CREDITS_LINKS.nirsoftDonate}
              icon={<Heart size={20} className="text-pink-400" />}
              label={t('credits.donate')}
              description="NirSoft - MultiMonitorTool"
            />
          </div>
        </GlassCard>

        {/* Section Projets */}
        <GlassCard>
          <h2 className="section-title text-[14px] font-semibold uppercase tracking-wider text-[#a3a3a3] mb-4">
            {t('credits.technologies')}
          </h2>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => window.electronAPI.shell.openExternal(CREDITS_LINKS.sunshineGithub)}
              className="flex flex-col items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Github size={20} className="text-text-secondary" />
              <span className="text-[12px] text-text-primary font-medium">Sunshine</span>
              <span className="text-[10px] text-text-secondary">{t('credits.sunshineDesc')}</span>
            </button>

            <button
              onClick={() => window.electronAPI.shell.openExternal(CREDITS_LINKS.moonlightGithub)}
              className="flex flex-col items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Github size={20} className="text-text-secondary" />
              <span className="text-[12px] text-text-primary font-medium">Moonlight</span>
              <span className="text-[10px] text-text-secondary">{t('credits.moonlightDesc')}</span>
            </button>

            <button
              onClick={() => window.electronAPI.shell.openExternal(CREDITS_LINKS.vddGithub)}
              className="flex flex-col items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Github size={20} className="text-text-secondary" />
              <span className="text-[12px] text-text-primary font-medium">VDD</span>
              <span className="text-[10px] text-text-secondary">{t('credits.vddDesc')}</span>
            </button>

            <button
              onClick={() => window.electronAPI.shell.openExternal(CREDITS_LINKS.nirsoftWebsite)}
              className="flex flex-col items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ExternalLink size={20} className="text-text-secondary" />
              <span className="text-[12px] text-text-primary font-medium">MultiMonitorTool</span>
              <span className="text-[10px] text-text-secondary">{t('credits.mmtDesc')}</span>
            </button>
          </div>
        </GlassCard>

        {/* Section À propos */}
        <GlassCard size="sm">
          <div className="text-center">
            <p className="text-[13px] text-text-primary font-medium mb-1">Eclipse v1.0.0</p>
            <p className="text-[11px] text-text-secondary">
              {t('credits.tagline')}
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

export default CreditsPage;
