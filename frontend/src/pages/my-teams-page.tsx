import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ClipboardList,
  Clock3,
  Compass,
  Plus,
  UserCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/empty-state";
import { ApplicationStatusBadge, TeamStatusBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { formatRelative } from "@/lib/utils";
import type { JoinedTeam, MyApplication } from "@/types";

function JoinedTeamCard({ team }: { team: JoinedTeam }) {
  return (
    <Link
      to={`/teams/${team.id}`}
      className="group grid overflow-hidden rounded-lg border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lift focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/15 md:grid-cols-[190px_minmax(0,1fr)_56px]"
    >
      <div className="dot-grid-soft relative flex min-h-[174px] flex-col justify-between border-b border-border bg-[#F5F5F7] p-5 md:border-b-0 md:border-r">
        <TeamStatusBadge status={team.status} className="w-fit" />
        <div>
          <p className="font-display text-[52px] font-semibold leading-none tracking-[-0.08em] text-black/[0.09]">
            {team.name.slice(0, 2).toUpperCase()}
          </p>
          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">My team / HM-{String(team.id).padStart(4, "0")}</p>
        </div>
      </div>
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-[26px] font-semibold tracking-[-0.045em]">{team.name}</h3>
          <Badge variant="primary">{team.my_role}</Badge>
          {team.is_leader && <Badge variant="outline">队长</Badge>}
        </div>
        <p className="mt-2 line-clamp-2 max-w-2xl text-[13px] leading-6 text-muted-foreground">{team.tagline}</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span className="font-mono text-foreground">{team.member_count}/{team.capacity}</span> 人（含队长）
          </span>
          <span className="flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5" />
            队长 {team.leader.nickname}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" />
            更新于 {formatRelative(team.updated_at)}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {team.roles.slice(0, 4).map((role) => (
            <Badge key={role.id} variant="outline" className="px-2.5 py-1 font-normal">
              {role.name} <span className="text-primary">余 {role.remaining}</span>
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center border-t border-border md:border-l md:border-t-0">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-all group-hover:border-primary/30 group-hover:bg-primary/[0.06] group-hover:text-primary">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

function ApplicationRow({ application }: { application: MyApplication }) {
  return (
    <article className="rounded-md border border-border bg-card p-5 transition-colors hover:border-neutral-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[19px] font-semibold tracking-[-0.035em]">{application.team_name}</h3>
            <ApplicationStatusBadge status={application.status} />
            <Badge variant="outline" className="font-normal">{application.role_name}</Badge>
          </div>
          <p className="mt-1.5 line-clamp-2 text-[12px] leading-5 text-muted-foreground">{application.team_tagline}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            <span>提交于 {formatRelative(application.created_at)}</span>
            <span className="flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${application.team_status === "recruiting" ? "bg-primary" : "bg-neutral-400"}`} />
              队伍{application.team_status === "recruiting" ? "组队中" : "已完成组队"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/teams/${application.team_id}`}>查看队伍</Link>
          </Button>
          {application.can_reapply && (
            <Button asChild variant="secondary" size="sm">
              <Link to={`/teams/${application.team_id}?apply=1`}>
                重新申请
                <ArrowRight />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {application.status === "rejected" && (
        <div className="mt-4 rounded-sm border border-error/15 bg-error/[0.025] px-3.5 py-2.5">
          <p className="text-[11px] font-medium text-error">拒绝理由</p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            {application.rejection_reason || "队长没有留下拒绝理由。"}
          </p>
        </div>
      )}
      {application.status === "pending" && (
        <div className="mt-4 flex items-center gap-1.5 text-[11px] text-warning">
          <Clock3 className="h-3.5 w-3.5" />
          申请已送达队长，审核状态更新后刷新页面即可查看。
        </div>
      )}
    </article>
  );
}

export function MyTeamsPage() {
  const { dashboard, refreshDashboard } = useAuth();
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    setRefreshing(true);
    void refreshDashboard().finally(() => setRefreshing(false));
  }, [refreshDashboard]);

  if (!dashboard && refreshing) {
    return (
      <div className="page-shell py-12">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="mt-5 h-12 w-80" />
        <Skeleton className="mt-8 h-44 w-full rounded-lg" />
        <Skeleton className="mt-6 h-28 w-full rounded-md" />
      </div>
    );
  }

  const joinedTeam = dashboard?.joined_team ?? null;
  const applications = dashboard?.applications ?? [];
  const isEmpty = !joinedTeam && applications.length === 0;

  return (
    <div>
      <section className="border-b border-border">
        <div className="page-shell py-10 lg:py-12">
          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div>
              <p className="eyebrow flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Your table / {new Date().getFullYear()}
              </p>
              <h1 className="mt-4 font-display text-[44px] font-semibold leading-none tracking-[-0.055em]">我的队伍</h1>
              <p className="mt-4 max-w-xl text-[14px] leading-6 text-muted-foreground">
                查看你已经加入的队伍、队长待处理的申请，以及仍在等待结果的入队申请。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {dashboard?.can_create_team && (
                <Button asChild size="lg">
                  <Link to="/create-team">
                    <Plus />
                    创建队伍
                  </Link>
                </Button>
              )}
              <Button asChild variant="secondary" size="lg">
                <Link to="/">
                  <Compass />
                  去广场看看
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 grid max-w-2xl grid-cols-2 divide-x divide-border rounded-md border border-border bg-card">
            <div className="px-5 py-4">
              <p className="font-display text-[26px] font-semibold leading-none tracking-[-0.05em]">
                {String(applications.filter((application) => application.status === "pending").length).padStart(2, "0")}
              </p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">我的待审核申请</p>
            </div>
            <div className="px-5 py-4">
              <p className="font-display text-[26px] font-semibold leading-none tracking-[-0.05em]">
                {String(dashboard?.pending_review_count ?? 0).padStart(2, "0")}
              </p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">等待我审核的申请</p>
            </div>
          </div>
        </div>
      </section>

      <div className="page-shell py-9 lg:py-11">
        {dashboard && dashboard.pending_review_count > 0 && joinedTeam && (
          <Link
            to={`/teams/${joinedTeam.id}#applications`}
            className="group mb-7 flex flex-col gap-3 rounded-md border border-primary/20 bg-primary/[0.035] px-4 py-3.5 transition-colors hover:border-primary/35 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ClipboardList className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-[13px] font-medium">你有 {dashboard.pending_review_count} 份入队申请待审核</p>
                <p className="mt-1 text-[11px] text-muted-foreground">申请人正在等待你的决定。进入队伍详情即可查看资料与联系方式。</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
              去审核
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        )}

        {isEmpty ? (
          <EmptyState
            icon={Compass}
            title="你的队伍席位还是空的"
            description="你可以浏览广场上的招募公告，或者自己发起一支队伍，把想做的项目写下来。"
            actionLabel="去组队广场"
            actionTo="/"
          />
        ) : (
          <div className="space-y-11">
            <section>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">Joined team / 01</p>
                  <h2 className="mt-2 font-display text-[26px] font-semibold tracking-[-0.045em]">我加入的队伍</h2>
                </div>
                {joinedTeam && <span className="text-[11px] text-muted-foreground">每位用户最多加入一支队伍</span>}
              </div>
              <div className="mt-4">
                {joinedTeam ? (
                  <JoinedTeamCard team={joinedTeam} />
                ) : (
                  <div className="flex flex-col items-start justify-between gap-4 rounded-md border border-dashed border-border bg-card px-5 py-6 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-[13px] font-medium">你还没有加入队伍</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">浏览招募中的项目，找到合适的方向后提交申请。</p>
                    </div>
                    <Button asChild variant="secondary" size="sm">
                      <Link to="/">
                        浏览队伍
                        <ArrowUpRight />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">Applications / 02</p>
                  <h2 className="mt-2 font-display text-[26px] font-semibold tracking-[-0.045em]">我的申请</h2>
                </div>
                {applications.length > 0 && <span className="text-[11px] text-muted-foreground">按最近更新时间排序</span>}
              </div>

              <div className="mt-4 space-y-3">
                {applications.length > 0 ? (
                  applications.map((application) => (
                    <ApplicationRow key={`${application.team_id}-${application.id}`} application={application} />
                  ))
                ) : (
                  <div className="rounded-md border border-dashed border-border px-6 py-10 text-center">
                    <ClipboardList className="mx-auto h-4 w-4 text-muted-foreground" />
                    <p className="mt-3 font-display text-lg font-semibold">暂时没有进行中的申请</p>
                    <p className="mt-1 text-[12px] text-muted-foreground">被拒绝的申请也会保留在这里，方便你查看理由或重新申请。</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
