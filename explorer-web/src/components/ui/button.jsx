import * as React from "react"
import { cn } from "../../lib/utils"

const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants = {
        default: "bg-primary-600 text-white hover:bg-primary-500 shadow-lg shadow-primary-600/20 hover:shadow-primary-500/30",
        outline: "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white",
        ghost: "text-slate-400 hover:bg-white/5 hover:text-white",
        link: "text-primary-400 underline-offset-4 hover:underline hover:text-primary-300",
    }

    const sizes = {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-8 text-base",
        icon: "h-9 w-9",
    }

    return (
        <button
            ref={ref}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        />
    )
})
Button.displayName = "Button"

export { Button }
