import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-primary/15 focus-visible:border-primary disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-primary bg-primary text-primary-foreground hover:-translate-y-px hover:border-primary-hover hover:bg-primary-hover hover:shadow-glow",
        secondary:
          "border border-border bg-card text-foreground hover:-translate-y-px hover:border-neutral-300 hover:bg-secondary",
        outline:
          "border border-border bg-transparent text-foreground hover:-translate-y-px hover:border-neutral-300 hover:bg-secondary",
        ghost: "border border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
        destructive:
          "border border-error/30 bg-transparent text-error hover:-translate-y-px hover:border-error/50 hover:bg-error/5",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        default: "h-[38px] px-4",
        lg: "h-11 px-5",
        icon: "h-[38px] w-[38px]",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
