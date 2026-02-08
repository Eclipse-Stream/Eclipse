import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ServiceControlButtons } from './ServiceControlButtons';
import { SunshineStatus } from '../../../../domain/types';

// Mock zustand store
vi.mock('../../../../application/stores/app-store', () => ({
  useAppStore: vi.fn(() => ({
    sunshineStatus: 'OFFLINE',
    fetchSunshineStatus: vi.fn(),
  })),
}));

// Mock sunshine control service
vi.mock('../../../../application/services/sunshine-control', () => ({
  getSunshineControlService: vi.fn(() => ({
    start: vi.fn().mockResolvedValue({ success: true }),
    stop: vi.fn().mockResolvedValue({ success: true }),
    restart: vi.fn().mockResolvedValue({ success: true }),
  })),
}));

describe('ServiceControlButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all three control buttons', () => {
    render(<ServiceControlButtons />);

    expect(screen.getByText('Démarrer')).toBeInTheDocument();
    expect(screen.getByText('Arrêter')).toBeInTheDocument();
    expect(screen.getByText('Redémarrer')).toBeInTheDocument();
  });

  it('should render with correct button states based on service status', () => {
    render(<ServiceControlButtons />);

    const startButton = screen.getByText('Démarrer').closest('button');
    const stopButton = screen.getByText('Arrêter').closest('button');
    const restartButton = screen.getByText('Redémarrer').closest('button');

    expect(startButton).not.toBeDisabled();
    expect(stopButton).toBeDisabled(); // Service is offline
    expect(restartButton).toBeDisabled(); // Service is offline
  });

  it('should have correct variant classes for each button', () => {
    render(<ServiceControlButtons />);

    const stopButton = screen.getByText('Arrêter').closest('button');

    // Destructive variant should have specific classes
    expect(stopButton?.className).toContain('destructive');
  });
});
