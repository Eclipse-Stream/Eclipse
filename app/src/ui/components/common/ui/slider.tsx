"use client"

import * as React from "react"
import { cn } from "@ui/lib/utils"

interface SliderProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  className?: string
  disabled?: boolean
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  className,
  disabled = false,
}: SliderProps) {
  const [localValue, setLocalValue] = React.useState(value)
  const [isDragging, setIsDragging] = React.useState(false)
  const trackRef = React.useRef<HTMLDivElement>(null)

  // Throttle onChange to prevent parent render lag (60fps cap)
  const lastEmit = React.useRef(0)
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange

  // Sync local value with prop value ONLY when not interacting
  React.useEffect(() => {
    if (!isDragging) {
      setLocalValue(value)
    }
  }, [value, isDragging])

  const emitChange = (newValue: number, force = false) => {
    const now = Date.now()
    if (force || now - lastEmit.current >= 16) {
      onChangeRef.current(newValue)
      lastEmit.current = now
    }
  }

  const snap = (val: number) => {
    const stepped = Math.round(val / step) * step
    return Math.max(min, Math.min(max, stepped))
  }

  const calculateValue = (clientX: number) => {
    if (!trackRef.current) return min
    const rect = trackRef.current.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return snap(min + percentage * (max - min))
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || !trackRef.current) return
    e.preventDefault()
    
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)

    // Immediate jump to click position
    const newValue = calculateValue(e.clientX)
    setLocalValue(newValue)
    emitChange(newValue, true)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || disabled) return
    e.preventDefault()

    const newValue = calculateValue(e.clientX)
    
    // Only update if value actually changed (after snap)
    if (newValue !== localValue) {
      setLocalValue(newValue)
      emitChange(newValue)
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (disabled) return
    
    setIsDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
    
    // Ensure final value is emitted
    emitChange(localValue, true)
  }

  const percentage = ((localValue - min) / (max - min)) * 100

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative flex w-full touch-none select-none items-center py-4 cursor-pointer group",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Track Background */}
      <div className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/10 border border-white/5 transition-colors group-hover:bg-white/15">
        {/* Fill Track */}
        <div
          className="absolute h-full bg-corona shadow-[0_0_10px_-2px_var(--color-corona)] transition-all duration-75 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Thumb */}
      <div
        className={cn(
          "absolute h-4 w-4 rounded-full border border-corona/50 bg-eclipse-bg shadow-[0_0_10px_var(--color-corona)] ring-offset-background transition-transform duration-75 ease-out outline-none",
          "group-hover:scale-125",
          // When dragging, scale up and glow more
          isDragging && "scale-150 bg-corona border-white shadow-[0_0_20px_var(--color-corona)]"
        )}
        style={{ left: `calc(${percentage}% - 8px)` }}
      />
    </div>
  )
}
