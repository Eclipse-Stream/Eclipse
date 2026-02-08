// HelpIntroSection.tsx - Section "Qu'est-ce qu'Eclipse ?" (Story 10.1, AC1)
// Focus: Remplacer le câble HDMI par un écran virtuel streamé

import { Monitor, Wifi } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../../components/common/GlassCard';

export function HelpIntroSection() {
  const { t } = useTranslation();

  return (
    <GlassCard>
      <h2 className="section-title text-[14px] font-semibold uppercase tracking-wider text-[#a3a3a3] mb-4">
        {t('help.intro.title')}
      </h2>

      <div className="space-y-4 text-[13px] text-text-secondary">
        <p>
          <span className="text-text-primary font-medium">{t('help.intro.paragraph1Start')}</span> {t('help.intro.paragraph1')}{' '}
          <span className="text-corona">{t('help.intro.dedicatedScreen')}</span>{' '}
          <span className="text-text-primary">Moonlight</span>.
        </p>

        <p>
          {t('help.intro.paragraph2')}
        </p>

        {/* Visual: PC + Eclipse + Réseau = Écran */}
        <div className="flex items-center justify-center gap-2 py-4 px-4 bg-white/5 rounded-lg">
          <div className="flex items-center gap-2">
            <Monitor size={20} className="text-corona" />
            <span className="text-text-primary text-[12px] font-medium">{t('help.intro.visualPc')}</span>
          </div>

          <span className="text-text-secondary/50 text-[14px]">+</span>

          <div className="flex items-center gap-1 px-2 py-1 bg-corona/20 rounded">
            <span className="text-[11px] text-corona font-medium">Eclipse</span>
          </div>

          <span className="text-text-secondary/50 text-[14px]">+</span>

          <div className="flex items-center gap-1">
            <Wifi size={16} className="text-corona animate-pulse" />
          </div>

          <span className="text-corona text-[14px] font-bold">=</span>

          <div className="flex items-center gap-2">
            <Monitor size={20} className="text-corona" />
            <span className="text-text-primary text-[12px] font-medium">{t('help.intro.visualScreen')}</span>
          </div>
        </div>

        <p className="text-[12px] text-text-secondary/70">
          {t('help.intro.paragraph3')}
        </p>
      </div>
    </GlassCard>
  );
}

export default HelpIntroSection;
