import { ArrowUpRight, Phone, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { TeamStatusBadge } from "@/components/status-badges";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { TeamCard as TeamCardType } from "@/types";
import { formatRelative } from "@/lib/utils";

function monogram(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function TeamCard({ team, index = 0 }: { team: TeamCardType; index?: number }) {
  return (
    <Link
      to={`/teams/${team.id}`}
      className="group flex animate-fade-up flex-col overflow-hidden rounded-lg border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lift focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/15"
      style={{ animationDelay: `${Math.min(index, 6) * 55}ms` }}
    >
      <div className="dot-grid-soft relative h-[150px] overflow-hidden border-b border-border bg-[#F5F5F7] p-5">
        <div className="relative z-10 flex items-start justify-between gap-3">
          <TeamStatusBadge status={team.status} />
          <span className="max-w-[55%] truncate rounded-full border border-black/[0.05] bg-card/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground backdrop-blur-sm">
            {team.track || "OPEN TRACK"}
          </span>
        </div>
        <span className="absolute -bottom-5 left-4 select-none font-display text-[92px] font-semibold leading-none tracking-[-0.09em] text-black/[0.055]">
          {monogram(team.name)}
        </span>
        <div className="absolute bottom-5 right-5 flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-neutral-300" />
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
          <span className="h-2 w-2 rounded-full bg-primary/80 transition-transform duration-300 group-hover:scale-125" />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-[23px] font-semibold leading-tight tracking-[-0.04em] text-foreground">
              {team.name}
            </h3>
            <p className="mt-1.5 line-clamp-2 min-h-[42px] text-[13px] leading-[1.65] text-muted-foreground">
              {team.tagline}
            </p>
          </div>
          <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-neutral-300 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar name={team.leader.nickname} avatarKey={team.leader.avatar_key} className="h-7 w-7" textClassName="text-[10px]" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{team.leader.nickname}</p>
              <p className="text-[11px] text-muted-foreground">队长</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="font-mono text-[11px] text-foreground">
              {team.member_count}/{team.capacity}
            </span>
            <span className="text-[11px]">人</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {team.roles.map((role) => (
            <Badge key={role.id} variant="outline" className="max-w-full px-2.5 py-1 font-normal">
              <span className="truncate">{role.name}</span>
              <span className={role.remaining === 0 ? "text-muted-foreground/70" : "text-primary"}>
                {role.remaining === 0 ? "已满" : `余 ${role.remaining}`}
              </span>
            </Badge>
          ))}
        </div>

        {team.leader_phone && (
          <div className="mt-3 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <Phone className="h-3 w-3 text-success" />
            {team.leader_phone}
            <span className="font-sans text-[10px]">· 队内可见</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <span className="text-[11px] text-neutral-400">更新于 {formatRelative(team.updated_at)}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-400 transition-colors group-hover:text-primary">
          View team
        </span>
      </div>
    </Link>
  );
}
