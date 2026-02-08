// HelpCreditsSection.tsx - Section Crédits & Communauté (Story 10.1, AC4)
// Liens vers Discord, donations Sunshine et VDD

import { Heart, ExternalLink, Github } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import discordIcon from '../../../assets/discord-icon-svgrepo-com.svg';

// URLs configurables
const HELP_LINKS = {
  discord: 'https://discord.gg/RTAQjQzm',
  sunshineDonate: 'https://github.com/sponsors/LizardByte',
  vddDonate: 'https://github.com/sponsors/itsmikethetech',
  sunshineGithub: 'https://github.com/LizardByte/Sunshine',
  vddGithub: 'https://github.com/itsmikethetech/Virtual-Display-Driver',
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
      <div className="w-8 h-8 rounded-lg bg-corona/20 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-text-primary font-medium">{label}</span>
          <ExternalLink size={12} className="text-text-secondary/50 group-hover:text-corona transition-colors" />
        </div>
        {description && (
          <span className="text-[11px] text-text-secondary">{description}</span>
        )}
      </div>
    </button>
  );
}

export function HelpCreditsSection() {
  return (
    <GlassCard>
      <h2 className="section-title text-[14px] font-semibold uppercase tracking-wider text-[#a3a3a3] mb-4">
        Crédits & Communauté
      </h2>

      <div className="space-y-3">
        {/* Discord */}
        <ExternalLinkButton
          href={HELP_LINKS.discord}
          icon={<img src={discordIcon} alt="Discord" className="w-[18px] h-[18px]" />}
          label="Discord Eclipse"
          description="Rejoignez la communauté pour aide et discussions"
        />

        {/* Dons Sunshine */}
        <ExternalLinkButton
          href={HELP_LINKS.sunshineDonate}
          icon={<Heart size={18} className="text-corona" />}
          label="Soutenir Sunshine"
          description="GitHub Sponsors - LizardByte"
        />

        {/* Dons VDD */}
        <ExternalLinkButton
          href={HELP_LINKS.vddDonate}
          icon={<Heart size={18} className="text-corona" />}
          label="Soutenir VDD"
          description="GitHub Sponsors - itsmikethetech"
        />

        {/* GitHub Links */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => window.electronAPI.shell.openExternal(HELP_LINKS.sunshineGithub)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-[11px] text-text-secondary hover:text-text-primary"
          >
            <Github size={14} />
            Sunshine
          </button>
          <button
            onClick={() => window.electronAPI.shell.openExternal(HELP_LINKS.vddGithub)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-[11px] text-text-secondary hover:text-text-primary"
          >
            <Github size={14} />
            VDD
          </button>
        </div>
      </div>

      {/* Message de soutien */}
      <p className="text-[11px] text-text-secondary/70 text-center mt-4 pt-3 border-t border-white/5">
        Eclipse existe grâce à ces projets open-source. Soutenez-les !
      </p>
    </GlassCard>
  );
}

export default HelpCreditsSection;
