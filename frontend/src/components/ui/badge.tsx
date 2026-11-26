import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium leading-none transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-secondary text-muted-foreground",
        outline: "border-border bg-transparent text-muted-foreground",
        primary: "border-primary/15 bg-primary/10 text-primary",
        success: "border-success/15 bg-success/10 text-success",
        warning: "border-warning/15 bg-warning/10 text-warning",
        destructive: "border-error/15 bg-error/10 text-error",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
