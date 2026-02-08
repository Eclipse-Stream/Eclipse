// HelpPresetsGuide.tsx - Section "Comment utiliser Eclipse" (Story 10.1, AC3)
// Guide pour les presets d'écran ET les configurations Sunshine

import { Settings, Plus, Power, Zap, Play, Monitor, Sliders } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../../components/common/GlassCard';

export function HelpPresetsGuide() {
  const { t } = useTranslation();

  return (
    <GlassCard>
      <h2 className="section-title text-[14px] font-semibold uppercase tracking-wider text-[#a3a3a3] mb-4">
        {t('help.presets.howToUse')}
      </h2>

      {/* Section 1: Presets d'écran */}
      <div className="mb-6">
        <h3 className="text-[13px] text-text-primary font-medium mb-3 flex items-center gap-2">
          <Monitor size={14} className="text-corona" />
          {t('help.presets.createScreenPreset')}
        </h3>

        <div className="space-y-3 text-[12px] pl-1">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-corona/20 flex items-center justify-center flex-shrink-0 text-[10px] text-corona font-medium">1</div>
            <p className="text-text-secondary">
              {t('help.presets.step1Screen')}
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-corona/20 flex items-center justify-center flex-shrink-0 text-[10px] text-corona font-medium">2</div>
            <p className="text-text-secondary">
              {t('help.presets.step2Screen')}
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-corona/20 flex items-center justify-center flex-shrink-0 text-[10px] text-corona font-medium">3</div>
            <p className="text-text-secondary">
              {t('help.presets.step3Screen')}
            </p>
          </div>

          <p className="text-[11px] text-text-secondary/70 pl-8">
            <Zap size={12} className="inline mr-1 text-corona" />
            {t('help.presets.tipScreen')}
          </p>
        </div>
      </div>

      {/* Séparateur */}
      <div className="border-t border-white/5 my-4" />

      {/* Section 2: Configuration Sunshine */}
      <div>
        <h3 className="text-[13px] text-text-primary font-medium mb-3 flex items-center gap-2">
          <Sliders size={14} className="text-corona" />
          {t('help.presets.createSunshineConfig')}
        </h3>

        <div className="space-y-3 text-[12px] pl-1">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-corona/20 flex items-center justify-center flex-shrink-0 text-[10px] text-corona font-medium">1</div>
            <p className="text-text-secondary">
              {t('help.presets.step1Config')}
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-corona/20 flex items-center justify-center flex-shrink-0 text-[10px] text-corona font-medium">2</div>
            <div className="text-text-secondary">
              <p>{t('help.presets.step2ConfigIntro')}</p>
              <ul className="mt-1 ml-3 space-y-1 text-[11px]">
                <li>• <span className="text-text-primary">{t('help.presets.qualityOption')}</span></li>
                <li>• <span className="text-text-primary">{t('help.presets.audioOption')}</span></li>
                <li>• <span className="text-text-primary">{t('help.presets.screenOption')}</span></li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-corona/20 flex items-center justify-center flex-shrink-0 text-[10px] text-corona font-medium">3</div>
            <p className="text-text-secondary">
              {t('help.presets.step3Config')}
            </p>
          </div>

          <div className="flex items-start gap-3 mt-2 p-2 bg-corona/10 rounded-lg">
            <Play size={14} className="text-corona mt-0.5 flex-shrink-0" />
            <p className="text-text-secondary text-[11px]">
              {t('help.presets.autoTip')}
            </p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export default HelpPresetsGuide;
