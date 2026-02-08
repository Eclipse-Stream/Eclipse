// UI Layer - StatusBadge Tests
// Unit tests for StatusBadge component

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'
import { SunshineStatus } from '@domain/types'

describe('StatusBadge', () => {
  it('should render ONLINE status with green color', () => {
    render(<StatusBadge status={SunshineStatus.ONLINE} />)
    
    const badge = screen.getByRole('status')
    expect(badge).toBeInTheDocument()
    expect(screen.getByText('En ligne')).toBeInTheDocument()
  })

  it('should render OFFLINE status with gray color', () => {
    render(<StatusBadge status={SunshineStatus.OFFLINE} />)
    
    expect(screen.getByText('Hors ligne')).toBeInTheDocument()
  })

  it('should render AUTH_REQUIRED status with orange color', () => {
    render(<StatusBadge status={SunshineStatus.AUTH_REQUIRED} />)
    
    expect(screen.getByText('Auth requise')).toBeInTheDocument()
  })

  it('should render UNKNOWN status', () => {
    render(<StatusBadge status={SunshineStatus.UNKNOWN} />)
    
    expect(screen.getByText('Inconnu')).toBeInTheDocument()
  })

  it('should render null status as UNKNOWN', () => {
    render(<StatusBadge status={null} />)
    
    expect(screen.getByText('Inconnu')).toBeInTheDocument()
  })

  it('should hide label when showLabel is false', () => {
    render(<StatusBadge status={SunshineStatus.ONLINE} showLabel={false} />)
    
    expect(screen.queryByText('En ligne')).not.toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(<StatusBadge status={SunshineStatus.ONLINE} className="custom-class" />)
    
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('custom-class')
  })

  it('should have proper accessibility attributes', () => {
    render(<StatusBadge status={SunshineStatus.ONLINE} />)
    
    const badge = screen.getByRole('status')
    expect(badge).toHaveAttribute('aria-label', 'Sunshine status: En ligne')
  })
})
