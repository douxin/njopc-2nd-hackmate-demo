import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus, TeamStatus } from "@/types";
import { cn } from "@/lib/utils";

export function TeamStatusBadge({ status, className }: { status: TeamStatus; className?: string }) {
  if (status === "recruiting") {
    return (
      <Badge variant="primary" className={cn("gap-1.5 bg-card/90 backdrop-blur-sm", className)}>
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-primary" />
        组队中
      </Badge>
    );
  }
  return (
    <Badge variant="default" className={cn("gap-1.5 bg-card/90 text-muted-foreground backdrop-blur-sm", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
      已完成组队
    </Badge>
  );
}

export function ApplicationStatusBadge({ status, className }: { status: ApplicationStatus; className?: string }) {
  if (status === "pending") {
    return (
      <Badge variant="warning" className={className}>
        <span className="h-1.5 w-1.5 rounded-full bg-warning" />
        待审核
      </Badge>
    );
  }
  if (status === "approved") {
    return (
      <Badge variant="success" className={className}>
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        已通过
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className={className}>
      <span className="h-1.5 w-1.5 rounded-full bg-error" />
      已拒绝
    </Badge>
  );
}
