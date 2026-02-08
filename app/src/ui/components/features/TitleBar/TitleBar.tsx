// TitleBar.tsx - Custom titlebar for Eclipse V2 (Story 1.2)
// Implements FR77 (no Maximize), FR78 (Minimize + Close only)

import { Minus, X } from 'lucide-react'
import { Button } from '@ui/components/common/ui/button'
import logoTitlebar from '../../../../assets/logo-titlebar.svg'

export function TitleBar() {
  const handleMinimize = () => {
    window.electronAPI.windowMinimize()
  }

  const handleClose = () => {
    window.electronAPI.windowClose()
  }

  return (
    <div
      className="titlebar h-9 flex items-center justify-between px-3 bg-[#050505]/60 backdrop-blur-md border-b border-white/5 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left side - Logo and title */}
      <div className="flex items-center gap-2">
        {/* Eclipse Guardian logo */}
        <img src={logoTitlebar} alt="Eclipse" className="w-5 h-5" />
        <span className="text-sm font-medium text-white/90">Eclipse</span>
      </div>

      {/* Right side - Window controls */}
      <div
        className="flex items-center -mr-3"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Minimize button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMinimize}
          className="w-11 h-9 rounded-none text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Minimize"
        >
          <Minus size={16} />
        </Button>

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="w-11 h-9 rounded-none text-white/70 hover:bg-[#e81123] hover:text-white"
          aria-label="Close"
        >
          <X size={16} />
        </Button>
      </div>
    </div>
  )
}

export default TitleBar
