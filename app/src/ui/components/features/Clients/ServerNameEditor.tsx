// ServerNameEditor.tsx - Affiche et modifie le nom du serveur Sunshine (Story 6.4)
// AC1: Affichage du nom actuel
// AC2: Modification avec validation

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Check, X, Loader2, Server } from 'lucide-react';
import { Button } from '@ui/components/common/ui/button';
import { useClientStore, useSettingsStore } from '@application/stores';

export function ServerNameEditor() {
  const { t } = useTranslation();
  const { serverName, isLoadingServerName, fetchServerName, setServerName } = useClientStore();
  const setSunshineName = useSettingsStore((state) => state.setSunshineName);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(serverName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger le nom au montage (AC1)
  useEffect(() => {
    fetchServerName();
  }, [fetchServerName]);

  // Synchroniser la valeur d'édition avec le nom
  useEffect(() => {
    setEditValue(serverName);
  }, [serverName]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(serverName);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(serverName);
    setError(null);
  };

  const handleSave = async () => {
    const trimmed = editValue.trim();

    if (!trimmed) {
      setError(t('dashboard.computerName.emptyName'));
      return;
    }

    if (trimmed === serverName) {
      setIsEditing(false);
      return;
    }

    // Sauvegarder directement sans dialog de confirmation
    // (cohérent avec les autres modifications qui redémarrent aussi Sunshine)
    setIsSaving(true);
    setError(null);

    const result = await setServerName(trimmed);

    setIsSaving(false);

    if (result.success) {
      // Also save to settings store for persistence across reinstalls
      setSunshineName(trimmed);
      setIsEditing(false);
    } else {
      setError(result.error || t('dashboard.computerName.saveError'));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isLoadingServerName) {
    return (
      <div className="flex items-center gap-2 text-text-secondary">
        <Loader2 size={14} className="animate-spin" />
        <span className="text-[13px]">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Server size={16} className="text-text-tertiary" />

      {isEditing ? (
        <div className="flex items-center gap-2 flex-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            autoFocus
            className="flex-1 px-2 py-1 text-[13px] bg-white/5 border border-white/20 rounded text-text-primary focus:border-blue-500 focus:outline-none disabled:opacity-50"
            placeholder={t('dashboard.computerName.placeholder')}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-7 w-7 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isSaving}
            className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <X size={14} />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[13px] text-text-primary">{serverName}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            className="h-6 w-6 p-0 text-text-tertiary hover:text-text-secondary"
            title={t('dashboard.computerName.edit')}
          >
            <Pencil size={12} />
          </Button>
        </div>
      )}

      {error && (
        <span className="text-[11px] text-red-400">{error}</span>
      )}
    </div>
  );
}
