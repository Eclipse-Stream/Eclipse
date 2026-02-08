"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@ui/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-white/10 transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-corona/50 data-[state=checked]:bg-corona/10 data-[state=checked]:shadow-[0_0_10px_-3px_var(--color-corona)] data-[state=unchecked]:bg-white/5",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-3.5 rounded-full shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%)] data-[state=unchecked]:translate-x-0.5 data-[state=checked]:bg-corona data-[state=checked]:shadow-[0_0_8px_var(--color-corona)] data-[state=unchecked]:bg-white/40"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
