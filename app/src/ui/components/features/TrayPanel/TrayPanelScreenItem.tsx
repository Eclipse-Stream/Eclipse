/**
 * TrayPanelScreenItem - Story 9.3: Panel Glassmorphism - Section Ecrans
 * Individual screen preset item with ON/OFF toggle
 *
 * AC3: Affiche nom du preset + toggle ON/OFF
 * AC4: Toggle ON allume le VDD avec la resolution du preset
 * AC5: Toggle OFF eteint le VDD
 */
import { Switch } from '@ui/components/common/ui/switch';
import type { ScreenPreset } from '@domain/types';

interface TrayPanelScreenItemProps {
  preset: ScreenPreset;
  isActive: boolean;
  isLoading: boolean;
  onToggle: () => void;
}

export function TrayPanelScreenItem({
  preset,
  isActive,
  isLoading,
  onToggle,
}: TrayPanelScreenItemProps) {
  // Format resolution for display
  const resolutionLabel = `${preset.resolution.width}x${preset.resolution.height}`;

  return (
    <div
      className={`
        flex items-center justify-between py-1.5 px-3 rounded-lg
        transition-colors
        ${isLoading ? 'opacity-50' : 'hover:bg-white/5'}
      `}
    >
      <div className="flex flex-col min-w-0 flex-1 mr-3">
        <span className="text-sm text-text-primary truncate">
          {preset.name}
        </span>
        <span className="text-xs text-text-secondary">
          {resolutionLabel} @ {preset.refreshRate}Hz
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Loading spinner */}
        {isLoading && (
          <div className="w-4 h-4 border-2 border-corona border-t-transparent rounded-full animate-spin" />
        )}

        {/* Toggle switch (AC3, AC4, AC5) */}
        <Switch
          checked={isActive}
          onCheckedChange={onToggle}
          disabled={isLoading}
          aria-label={`Toggle ${preset.name}`}
        />
      </div>
    </div>
  );
}
