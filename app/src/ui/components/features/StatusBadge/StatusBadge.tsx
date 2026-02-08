// UI Layer - StatusBadge Component
// Displays Sunshine service status with visual indicator

import { Activity, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SunshineStatus } from '@domain/types'
import { cn } from '../../../lib/utils'

interface StatusBadgeProps {
  status: SunshineStatus | null
  className?: string
  showLabel?: boolean
}

export function StatusBadge({ status, className, showLabel = true }: StatusBadgeProps) {
  const { t } = useTranslation()

  const getStatusConfig = () => {
    switch (status) {
      case SunshineStatus.ONLINE:
        return {
          icon: CheckCircle,
          label: t('dashboard.sunshine.online'),
          color: 'text-corona',
          bgColor: 'bg-corona/10 border border-corona/20 shadow-[0_0_10px_-5px_var(--color-corona)]',
          dotColor: 'bg-corona shadow-[0_0_8px_var(--color-corona)]',
        }
      case SunshineStatus.OFFLINE:
        return {
          icon: AlertCircle,
          label: t('dashboard.sunshine.offline'),
          color: 'text-text-secondary',
          bgColor: 'bg-white/5 border border-white/10',
          dotColor: 'bg-text-secondary',
        }
      case SunshineStatus.AUTH_REQUIRED:
        return {
          icon: AlertCircle,
          label: t('dashboard.sunshine.authRequired'),
          color: 'text-amber',
          bgColor: 'bg-amber/10 border border-amber/20 shadow-[0_0_10px_-5px_var(--color-amber)]',
          dotColor: 'bg-amber shadow-[0_0_8px_var(--color-amber)]',
        }
      case SunshineStatus.UNKNOWN:
      default:
        return {
          icon: HelpCircle,
          label: t('dashboard.sunshine.unknown'),
          color: 'text-text-secondary',
          bgColor: 'bg-white/5 border border-white/10',
          dotColor: 'bg-text-secondary',
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-3 py-1.5',
        config.bgColor,
        className
      )}
      role="status"
      aria-label={`Sunshine status: ${config.label}`}
    >
      <div className="relative">
        <Icon className={cn('h-4 w-4', config.color)} />
        <span
          className={cn(
            'absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full',
            config.dotColor,
            status === SunshineStatus.ONLINE && 'animate-pulse'
          )}
        />
      </div>
      {showLabel && (
        <span className={cn('text-sm font-medium', config.color)}>{config.label}</span>
      )}
    </div>
  )
}
