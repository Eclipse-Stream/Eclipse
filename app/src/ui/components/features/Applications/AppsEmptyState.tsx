// AppsEmptyState.tsx - Story 7.3: État vide pour la page Applications
// Utilise le composant EmptyState unifié

import { AppWindow } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../../common/EmptyState";

interface AppsEmptyStateProps {
  onAdd: () => void;
}

export function AppsEmptyState({ onAdd }: AppsEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <EmptyState
      variant="full"
      icon={AppWindow}
      title={t('applications.noApps')}
      actionLabel={t('common.add')}
      onAction={onAdd}
    />
  );
}
