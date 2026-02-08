// ClientsList.tsx - Liste des clients Moonlight appairés (Story 6.1)
// AC2: Affichage de la liste avec cartes distinctes
// AC3: Empty state avec bouton d'appairage
// Fix: Toast d'erreur si suppression échoue (Story 6.3)

import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, RefreshCw, Loader2, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@ui/components/common/ui/button';
import { EmptyState } from '@ui/components/common/EmptyState';
import { ClientCard } from './ClientCard';
import { PairingDialog } from './PairingDialog';
import { ConfirmDeleteDialog } from '@ui/components/common/ConfirmDeleteDialog';
import { useClientStore, useAppStore } from '@application/stores';
import type { MoonlightClient } from '@domain/types';

export function ClientsList() {
  const { t } = useTranslation();
  const {
    clients,
    isLoadingClients,
    clientsError,
    fetchClients,
    unpairClient,
  } = useClientStore();

  const sunshineStatus = useAppStore((state) => state.sunshineStatus);

  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<MoonlightClient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const hasFetched = useRef(false);

  // Charger les clients quand Sunshine est ONLINE
  useEffect(() => {
    if (sunshineStatus === 'ONLINE' && !hasFetched.current) {
      hasFetched.current = true;
      fetchClients();
    }
  }, [sunshineStatus, fetchClients]);

  // Reset le flag si Sunshine passe offline
  useEffect(() => {
    if (sunshineStatus !== 'ONLINE') {
      hasFetched.current = false;
    }
  }, [sunshineStatus]);

  // Gestion de la suppression (Story 6.3)
  const handleDeleteClick = (client: MoonlightClient) => {
    setClientToDelete(client);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;

    const clientName = clientToDelete.name;
    setIsDeleting(true);
    const result = await unpairClient(clientToDelete.uuid);
    setIsDeleting(false);

    if (result.success) {
      toast.success(t('toasts.success.deleted'), {
        description: t('dashboard.clients.deviceRemoved', { name: clientName }),
      });
    } else {
      console.error('[ClientsList] Failed to unpair:', result.error);
      toast.error(t('toasts.error.delete'), {
        description: result.error || t('toasts.error.generic'),
      });
    }

    setClientToDelete(null);
  };

  const handleCancelDelete = () => {
    setClientToDelete(null);
  };

  // Sunshine pas encore prêt
  if (sunshineStatus !== 'ONLINE') {
    return (
      <div className="flex items-center gap-2.5 py-3 px-3 rounded-lg bg-white/5 border border-white/5">
        <WifiOff size={16} className="text-text-tertiary" />
        <span className="text-[12px] text-text-secondary flex-1">
          {t('dashboard.clients.sunshineRequired')}
        </span>
        <Loader2 size={12} className="animate-spin text-text-tertiary" />
      </div>
    );
  }

  // État de chargement
  if (isLoadingClients && clients.length === 0) {
    return (
      <div className="flex items-center gap-2.5 py-3 px-3 rounded-lg bg-white/5 border border-white/5">
        <Loader2 size={16} className="animate-spin text-blue-400" />
        <span className="text-[12px] text-text-secondary">
          {t('common.loading')}
        </span>
      </div>
    );
  }

  // État d'erreur
  if (clientsError && clients.length === 0) {
    return (
      <div className="flex items-center gap-2.5 py-3 px-3 rounded-lg bg-red-500/5 border border-red-500/10">
        <WifiOff size={16} className="text-red-400" />
        <span className="text-[12px] text-red-300/80 flex-1">{clientsError}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchClients()}
          className="h-6 px-2 text-[11px] text-red-300 hover:text-red-200 hover:bg-red-500/10"
        >
          <RefreshCw size={12} className="mr-1" />
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  // Empty state (AC3)
  if (clients.length === 0) {
    return (
      <>
        <EmptyState
          variant="compact"
          icon={Wifi}
          iconClassName="text-text-tertiary"
          title={t('dashboard.clients.noClients')}
          actionLabel={t('dashboard.clients.pair')}
          onAction={() => setIsPairingOpen(true)}
        />

        <PairingDialog
          isOpen={isPairingOpen}
          onClose={() => setIsPairingOpen(false)}
        />
      </>
    );
  }

  // Liste des clients (AC2)
  return (
    <>
      {/* Liste des appareils */}
      <div className="space-y-1.5">
        {clients.map((client) => (
          <ClientCard
            key={client.uuid}
            client={client}
            onDelete={handleDeleteClick}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1.5 pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchClients()}
          disabled={isLoadingClients}
          className="h-6 w-6 p-0"
          title={t('common.refresh')}
        >
          <RefreshCw size={12} className={isLoadingClients ? 'animate-spin' : ''} />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsPairingOpen(true)}
          className="h-6 text-[11px]"
        >
          <Plus size={12} className="mr-1" />
          {t('dashboard.clients.pair')}
        </Button>
      </div>

      {/* Dialog d'appairage */}
      <PairingDialog
        isOpen={isPairingOpen}
        onClose={() => setIsPairingOpen(false)}
      />

      {/* Dialog de confirmation de suppression */}
      <ConfirmDeleteDialog
        isOpen={!!clientToDelete}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title={t('dashboard.clients.forgetDevice', { name: clientToDelete?.name || t('dashboard.clients.thisDevice') })}
        description={t('dashboard.clients.forgetDescription')}
        confirmText={isDeleting ? t('common.deleting') : t('dashboard.clients.forget')}
        cancelText={t('common.cancel')}
      />
    </>
  );
}
