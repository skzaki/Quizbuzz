import * as React from "react"
import { cva } from "class-variance-authority";
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
                secondary:
                    "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
                destructive:
                    "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
                outline:
                    "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
                ghost:
                    "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
                link: "text-primary underline-offset-4 hover:underline",
                success: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
                warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
                error: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
                info: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
            },
            size: {
                sm: "h-5 px-2 py-0.5 text-xs",
                md: "h-6 px-2.5 py-1 text-sm",
                lg: "h-7 px-3 py-1.5 text-base"
            },
        },
        defaultVariants: {
            variant: "default",
            size: "md",
        },
    }
)

function Badge({
    className,
    variant = "default",
    size = "md",
    asChild = false,
    ...props
}) {
    const Comp = asChild ? Slot.Root : "span"

    return (
        <Comp
            data-slot="badge"
            data-variant={variant}
            data-size={size}
            className={cn(badgeVariants({ variant, size }), className)}
            {...props} />
    );
}

export default Badge
export { Badge, badgeVariants }
