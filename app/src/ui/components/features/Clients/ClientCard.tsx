// ClientCard.tsx - Affiche un client Moonlight appairé (Story 6.1 - AC2)
// Avec bouton de suppression (Story 6.3 - AC1)

import { useTranslation } from 'react-i18next';
import { Monitor, Trash2 } from 'lucide-react';
import { Button } from '@ui/components/common/ui/button';
import type { MoonlightClient } from '@domain/types';

interface ClientCardProps {
  client: MoonlightClient;
  onDelete: (client: MoonlightClient) => void;
}

export function ClientCard({ client, onDelete }: ClientCardProps) {
  const { t } = useTranslation();

  return (
    <div className="group flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all duration-200">
      <div className="flex items-center gap-2.5">
        {/* Icône avec glow subtil */}
        <div className="w-7 h-7 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_8px_-4px_rgba(59,130,246,0.5)]">
          <Monitor size={14} className="text-blue-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] text-text-primary font-medium leading-tight">
            {client.name}
          </span>
          <span className="text-[10px] text-text-secondary/60 leading-tight">
            {t('dashboard.clients.moonlight')}
          </span>
        </div>
      </div>

      {/* Bouton supprimer - visible au hover */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(client)}
        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-all"
        title={t('dashboard.clients.forget')}
      >
        <Trash2 size={14} />
      </Button>
    </div>
  );
}
