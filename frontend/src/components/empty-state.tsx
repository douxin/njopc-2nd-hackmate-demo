import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center", className)}>
      <div className="dot-grid-soft absolute inset-x-0 top-0 h-24 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="relative mx-auto flex max-w-sm flex-col items-center">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="font-display text-xl font-semibold tracking-[-0.03em]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        {(actionLabel && actionTo) || onAction ? (
          <div className="mt-6">
            {actionTo ? (
              <Button asChild size="sm">
                <Link to={actionTo}>
                  {actionLabel}
                  <ArrowUpRight />
                </Link>
              </Button>
            ) : (
              <Button size="sm" onClick={onAction}>
                {actionLabel}
                <ArrowUpRight />
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
