/**
 * TrayPanelConfigItem - Story 9.2
 * Individual config item in the tray panel list
 */
import { Check } from 'lucide-react';
import type { SunshinePreset } from '@domain/types';

interface TrayPanelConfigItemProps {
  config: SunshinePreset;
  isActive: boolean;
  onSelect: () => void;
}

export function TrayPanelConfigItem({ config, isActive, onSelect }: TrayPanelConfigItemProps) {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full flex items-center justify-between px-3 py-2 rounded-lg
        text-left text-sm transition-all duration-150
        ${isActive
          ? 'bg-corona/20 text-corona border border-corona/30'
          : 'hover:bg-white/5 text-text-secondary hover:text-text-primary border border-transparent'
        }
      `}
    >
      <span className="truncate">{config.name}</span>
      {isActive && (
        <Check className="w-4 h-4 text-corona flex-shrink-0 ml-2" />
      )}
    </button>
  );
}
