import * as React from "react"
import { cn } from "../../lib/utils"

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
    const variants = {
        default: "bg-primary-600/20 text-primary-300 border-primary-500/30",
        secondary: "bg-slate-700/50 text-slate-300 border-slate-600/30",
        destructive: "bg-red-500/15 text-red-400 border-red-500/30",
        outline: "text-slate-300 border-slate-600",
        success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    }

    return (
        <div
            ref={ref}
            className={cn(
                "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold transition-colors",
                variants[variant],
                className
            )}
            {...props}
        />
    )
})
Badge.displayName = "Badge"

export { Badge }
