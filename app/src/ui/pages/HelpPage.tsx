// HelpPage.tsx - Page d'aide complète (Story 10.1)
// AC1-8: Structure, Introduction, Schéma, Presets, FAQ, Boutons, Style
// Note: Crédits déplacés vers CreditsPage (accessible via version en bas à gauche)

import { useTranslation } from 'react-i18next';
import { HelpIntroSection } from './help/HelpIntroSection';
import { HelpDiagramSection } from './help/HelpDiagramSection';
import { HelpPresetsGuide } from './help/HelpPresetsGuide';
import { HelpFaqSection } from './help/HelpFaqSection';
import { HelpActionsSection } from './help/HelpActionsSection';
import { NetworkDiagnosticSection } from './help/NetworkDiagnosticSection';

export function HelpPage() {
  const { t } = useTranslation();

  return (
    <div className="page-container p-8 overflow-y-auto">
      <h1 className="page-title text-[18px] font-semibold text-text-primary mb-6">
        {t('help.title')}
      </h1>

      <div className="space-y-4 max-w-2xl">
        {/* AC1: Section Introduction */}
        <HelpIntroSection />

        {/* AC2: Section Schéma "Comment ça marche" */}
        <HelpDiagramSection />

        {/* AC3: Section Guide Presets */}
        <HelpPresetsGuide />

        {/* AC5: Section FAQ */}
        <HelpFaqSection />

        {/* Story 12.6: Section Diagnostic Réseau */}
        <NetworkDiagnosticSection />

        {/* AC6, AC7: Boutons d'action */}
        <HelpActionsSection />
      </div>
    </div>
  );
}

export default HelpPage;
