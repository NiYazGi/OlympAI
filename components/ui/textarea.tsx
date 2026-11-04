import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-transparent bg-foreground/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-foreground/[0.07] focus-visible:bg-foreground/[0.07] px-2.5 py-2 text-base transition-colors outline-none placeholder:text-smoke focus-visible:border-foreground/20 focus-visible:ring-2 focus-visible:ring-foreground/10 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
