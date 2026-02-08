// HelpDiagramSection.tsx - Section "Comment ça marche" avec schéma (Story 10.1, AC2)
// Schéma visuel du flux de streaming + explication des composants + inputs

import { Monitor, Wifi, Server, ScreenShare, Gamepad2, Smartphone, AppWindow } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../../components/common/GlassCard';

export function HelpDiagramSection() {
  const { t } = useTranslation();

  return (
    <GlassCard>
      <h2 className="section-title text-[14px] font-semibold uppercase tracking-wider text-[#a3a3a3] mb-4">
        {t('help.diagram.title')}
      </h2>

      {/* Schéma visuel */}
      <div className="flex items-center justify-center gap-2 py-6 px-4 bg-white/5 rounded-lg mb-4">
        {/* PC */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-lg bg-corona/20 flex items-center justify-center">
            <Monitor size={24} className="text-corona" />
          </div>
          <span className="text-[11px] text-text-primary font-medium">{t('help.diagram.yourPc')}</span>
          <span className="text-[10px] text-text-secondary">(Eclipse)</span>
        </div>

        {/* Flèches bidirectionnelles */}
        <div className="flex flex-col items-center gap-1">
          {/* Image vers client */}
          <div className="flex items-center gap-1 text-corona/50">
            <div className="w-6 h-[2px] bg-gradient-to-r from-corona/20 to-corona/60" />
            <Wifi size={12} className="text-corona animate-pulse" />
            <div className="w-6 h-[2px] bg-gradient-to-r from-corona/60 to-corona/20" />
          </div>
          <span className="text-[9px] text-text-secondary/60">{t('help.diagram.imageSound')}</span>
          {/* Inputs retour */}
          <div className="flex items-center gap-1 text-corona/30">
            <div className="w-6 h-[1px] bg-gradient-to-l from-corona/20 to-corona/40" />
            <Gamepad2 size={10} className="text-corona/60" />
            <div className="w-6 h-[1px] bg-gradient-to-l from-corona/40 to-corona/20" />
          </div>
          <span className="text-[9px] text-text-secondary/60">{t('help.diagram.inputs')}</span>
        </div>

        {/* Client (générique) */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-lg bg-corona/20 flex items-center justify-center">
            <Smartphone size={24} className="text-corona" />
          </div>
          <span className="text-[11px] text-text-primary font-medium">{t('help.diagram.yourScreen')}</span>
          <span className="text-[10px] text-text-secondary">(Moonlight)</span>
        </div>
      </div>

      {/* Explication des composants */}
      <div className="space-y-3 text-[12px]">
        <div className="flex items-start gap-3">
          <Server size={16} className="text-corona mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-text-primary font-medium">Sunshine</span>
            <span className="text-text-secondary"> — {t('help.diagram.sunshineDesc')}</span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <ScreenShare size={16} className="text-corona mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-text-primary font-medium">VDD (Virtual Display Driver)</span>
            <span className="text-text-secondary"> — {t('help.diagram.vddDesc')}</span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Smartphone size={16} className="text-corona mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-text-primary font-medium">Moonlight</span>
            <span className="text-text-secondary"> — {t('help.diagram.moonlightDesc')}</span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <AppWindow size={16} className="text-corona mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-text-primary font-medium">MultiMonitorTool</span>
            <span className="text-text-secondary"> — {t('help.diagram.mmtDesc')}</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export default HelpDiagramSection;
