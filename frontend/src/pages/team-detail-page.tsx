import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Loader2,
  LockKeyhole,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { ApplyDialog } from "@/components/apply-dialog";
import { EmptyState } from "@/components/empty-state";
import { LeaderApplications } from "@/components/leader-applications";
import { TeamStatusBadge } from "@/components/status-badges";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { cn, formatRelative } from "@/lib/utils";
import type {
  LeaderApplicationsResponse,
  TeamDetail,
  TeamMember,
} from "@/types";

function SectionHeading({ number, eyebrow, title, description }: { number: string; eyebrow: string; title: string; description?: string }) {
  return (
    <div>
      <p className="eyebrow flex items-center gap-2">
        <span className="text-primary">{number}</span>
        <span className="h-px w-5 bg-border" />
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-[28px] font-semibold tracking-[-0.045em]">{title}</h2>
      {description && <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground">{description}</p>}
    </div>
  );
}

function TeamSkeleton() {
  return (
    <div className="page-shell py-10">
      <Skeleton className="h-4 w-24" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-4 h-12 w-2/3" />
          <Skeleton className="mt-3 h-5 w-1/2" />
          <Skeleton className="mt-8 h-40 w-full" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
        </div>
        <Skeleton className="h-[470px] w-full" />
      </div>
    </div>
  );
}

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const numericTeamId = Number(teamId);
  const { user, token, refreshDashboard } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [applications, setApplications] = useState<LeaderApplicationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [profileTarget, setProfileTarget] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const autoApplyHandled = useRef(false);

  const fetchTeam = useCallback(
    async (initial = false) => {
      if (!Number.isFinite(numericTeamId)) {
        setError("队伍地址无效");
        setLoading(false);
        return;
      }
      if (initial) setLoading(true);
      try {
        const result = await api.team(numericTeamId);
        setTeam(result);
        setError(null);
      } catch (caught) {
        const message = caught instanceof ApiError ? caught.message : "队伍信息加载失败";
        if (initial || !team) setError(message);
        else toast({ title: "队伍信息刷新失败", description: message, variant: "error" });
      } finally {
        if (initial) setLoading(false);
      }
    },
    [numericTeamId, team, toast],
  );

  const fetchApplications = useCallback(async () => {
    if (!token) return;
    setApplicationsLoading(true);
    try {
      const result = await api.teamApplications(numericTeamId, token);
      setApplications(result);
    } catch (caught) {
      toast({
        title: "申请列表加载失败",
        description: caught instanceof ApiError ? caught.message : "请刷新页面后重试",
        variant: "error",
      });
    } finally {
      setApplicationsLoading(false);
    }
  }, [numericTeamId, toast, token]);

  useEffect(() => {
    void fetchTeam(true);
    // Initial load only. Subsequent refresh happens through explicit actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericTeamId]);

  useEffect(() => {
    if (team?.viewer.is_leader) void fetchApplications();
  }, [fetchApplications, team?.viewer.is_leader]);

  useEffect(() => {
    if (team) document.title = `${team.name} · HackMate`;
    return () => {
      document.title = "HackMate · 找到你的下一支队伍";
    };
  }, [team]);

  useEffect(() => {
    if (autoApplyHandled.current || !team) return;
    autoApplyHandled.current = true;
    if (searchParams.get("apply") === "1" && team.viewer.can_apply) setApplyOpen(true);
  }, [searchParams, team]);

  const refreshAfterMemberChange = async () => {
    await fetchTeam(false);
    await refreshDashboard();
  };

  const refreshLeaderData = async () => {
    await Promise.all([fetchTeam(false), fetchApplications()]);
    await refreshDashboard();
  };

  const handleApplyClick = () => {
    if (!user) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    setApplyOpen(true);
  };

  const handleRemove = async () => {
    if (!removeTarget || !token) return;
    setRemoving(true);
    try {
      await api.removeMember(numericTeamId, removeTarget.membership_id, token);
      toast({
        title: `已将 ${removeTarget.nickname} 移出队伍`,
        description: "对方已失去查看队内联系方式的权限。",
        variant: "success",
      });
      setRemoveTarget(null);
      await refreshAfterMemberChange();
    } catch (caught) {
      toast({
        title: "移除成员失败",
        description: caught instanceof ApiError ? caught.message : "请稍后重试",
        variant: "error",
      });
    } finally {
      setRemoving(false);
    }
  };

  const handleComplete = async () => {
    if (!token) return;
    setLifecycleLoading(true);
    setLifecycleError(null);
    try {
      await api.completeTeam(numericTeamId, token);
      toast({
        title: "队伍已完成组队",
        description: "所有待审核申请已自动关闭，队伍将不再接收新申请。",
        variant: "success",
      });
      setCompleteOpen(false);
      await refreshLeaderData();
    } catch (caught) {
      setLifecycleError(caught instanceof ApiError ? caught.message : "操作失败，请稍后重试");
    } finally {
      setLifecycleLoading(false);
    }
  };

  const handleReopen = async () => {
    if (!token) return;
    setLifecycleLoading(true);
    try {
      await api.reopenTeam(numericTeamId, token);
      toast({ title: "已重新开放招募", description: "队伍恢复为组队中，可以继续接收申请。", variant: "success" });
      await refreshLeaderData();
    } catch (caught) {
      toast({
        title: "重新开放失败",
        description: caught instanceof ApiError ? caught.message : "请稍后重试",
        variant: "error",
      });
    } finally {
      setLifecycleLoading(false);
    }
  };

  if (loading) return <TeamSkeleton />;

  if (error || !team) {
    return (
      <div className="page-shell py-16">
        <EmptyState
          icon={AlertCircle}
          title="没有找到这支队伍"
          description={error || "队伍可能不存在，或已经下线。"}
          actionLabel="返回广场"
          actionTo="/"
        />
      </div>
    );
  }

  const latestApplication = team.viewer.latest_application;
  const isPending = latestApplication?.status === "pending";
  const isRejected = latestApplication?.status === "rejected";
  const filledPercent = Math.min(100, Math.round((team.member_count / Math.max(1, team.capacity)) * 100));

  const primaryAction = (() => {
    if (team.viewer.is_leader) {
      return (
        <Button asChild size="lg">
          <a href="#applications">
            查看入队申请
            {team.viewer.pending_application_count > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 font-mono text-[10px]">
                {team.viewer.pending_application_count}
              </span>
            )}
            <ArrowUpRight />
          </a>
        </Button>
      );
    }
    if (team.viewer.is_member) {
      return (
        <Badge variant="success" className="h-[38px] gap-2 px-4 text-[12px]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          你已经是队伍成员
        </Badge>
      );
    }
    if (isPending) {
      return (
        <Button variant="secondary" size="lg" disabled>
          <Clock3 />
          申请审核中
        </Button>
      );
    }
    if (team.viewer.can_apply) {
      return (
        <Button size="lg" onClick={handleApplyClick}>
          <UserPlus />
          {isRejected ? "重新申请加入" : "申请加入"}
          <ArrowRight />
        </Button>
      );
    }
    if (team.viewer.has_other_team) {
      return (
        <Button variant="secondary" size="lg" disabled>
          你已加入其他队伍
        </Button>
      );
    }
    if (team.status === "completed") {
      return (
        <Button variant="secondary" size="lg" disabled>
          招募已结束
        </Button>
      );
    }
    if (!user) {
      return (
        <Button asChild size="lg">
          <Link to="/login" state={{ from: location.pathname }}>
            登录后申请加入
            <ArrowRight />
          </Link>
        </Button>
      );
    }
    return null;
  })();

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div className="dot-grid-soft absolute right-0 top-0 hidden h-full w-[420px] opacity-45 [mask-image:linear-gradient(to_left,black,transparent)] lg:block" />
        <div className="page-shell relative py-7 lg:py-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回组队广场
          </Link>

          <div className="mt-7 flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <TeamStatusBadge status={team.status} />
                <Badge variant="outline" className="bg-card/70 font-mono text-[10px] uppercase tracking-[0.11em]">
                  {team.track || "OPEN TRACK"}
                </Badge>
                <span className="text-[11px] text-muted-foreground">更新于 {formatRelative(team.updated_at)}</span>
              </div>
              <h1 className="mt-5 max-w-3xl font-display text-[44px] font-semibold leading-[1.03] tracking-[-0.055em] lg:text-[54px]">
                {team.name}
              </h1>
              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted-foreground">{team.tagline}</p>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <strong className="font-mono text-[11px] font-medium text-foreground">{team.member_count} / {team.capacity}</strong>
                  人（含队长）
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" />
                  面向现场队友开放
                </span>
                {team.member_count >= team.capacity && (
                  <span className="flex items-center gap-1.5 text-warning">
                    <AlertCircle className="h-3.5 w-3.5" />
                    已达到预设名额
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {primaryAction}
              {team.viewer.is_leader && (
                <>
                  {team.status === "recruiting" ? (
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => {
                        setLifecycleError(null);
                        setCompleteOpen(true);
                      }}
                    >
                      完成组队
                    </Button>
                  ) : (
                    <Button variant="secondary" size="lg" onClick={() => void handleReopen()} disabled={lifecycleLoading}>
                      {lifecycleLoading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                      重新开放招募
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="page-shell pt-6">
        {isPending && latestApplication && (
          <div className="flex items-start gap-3 rounded-md border border-warning/25 bg-warning/[0.055] px-4 py-3.5">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <p className="text-[13px] font-medium">你的申请正在等待队长审核</p>
              <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                申请角色：{latestApplication.role_name}。审核结果可在「我的队伍」查看。
              </p>
            </div>
          </div>
        )}
        {isRejected && latestApplication && (
          <div className="flex flex-col gap-3 rounded-md border border-error/20 bg-error/[0.035] px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
              <div>
                <p className="text-[13px] font-medium">上一次申请未通过</p>
                <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                  {latestApplication.rejection_reason || "队长没有留下拒绝理由。"}
                </p>
              </div>
            </div>
            {team.viewer.can_apply && (
              <Button variant="secondary" size="sm" onClick={handleApplyClick}>
                重新申请
              </Button>
            )}
          </div>
        )}
        {!team.viewer.is_authenticated && (
          <div className="flex items-start gap-3 rounded-md border border-border bg-secondary/50 px-4 py-3.5">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-[12px] leading-5 text-muted-foreground">
              游客可以浏览队伍公开信息。登录后可以申请加入，并在通过审核后查看队内联系方式。
            </p>
          </div>
        )}
      </div>

      <div className="page-shell grid gap-10 pb-16 pt-9 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        <div className="min-w-0 space-y-10">
          <section>
            <SectionHeading
              number="01"
              eyebrow="Project brief"
              title="关于这个项目"
              description="这是队长写下的项目背景、目标和当前进展。"
            />
            <div className="mt-5 rounded-md border border-border bg-card p-6">
              <p className="whitespace-pre-line text-[14px] leading-7 text-foreground/85">{team.description}</p>
              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
                <span className="eyebrow mr-1">Track</span>
                <Badge variant="outline">{team.track || "开放方向"}</Badge>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-400">
                  Created {formatRelative(team.created_at)}
                </span>
              </div>
            </div>
          </section>

          <section>
            <SectionHeading
              number="02"
              eyebrow="Open roles"
              title="正在招募"
              description="角色计划人数不包含队长，仅作为规划参考。达到计划人数后，队长仍可继续通过申请。"
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {team.roles.map((role, index) => (
                <article key={role.id} className="group rounded-md border border-border bg-card p-5 transition-colors hover:border-neutral-300">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        Role / {String(index + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mt-2 font-display text-[20px] font-semibold tracking-[-0.035em]">{role.name}</h3>
                    </div>
                    {role.remaining > 0 ? (
                      <Badge variant="primary">余 {role.remaining}</Badge>
                    ) : (
                      <Badge variant="warning">已达到计划人数</Badge>
                    )}
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>已通过 {role.filled_count} 人</span>
                      <span className="font-mono">计划 {role.planned_count} 人</span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all"
                        style={{ width: `${Math.min(100, (role.filled_count / role.planned_count) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <p className="mt-4 min-h-[42px] text-[12px] leading-6 text-muted-foreground">
                    {role.requirements || "队长未填写这个角色的具体要求。"}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section>
            <SectionHeading number="03" eyebrow="What we look for" title="我们希望你具备" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-foreground" />
                  <h3 className="text-[13px] font-medium">硬性要求</h3>
                </div>
                <p className="mt-3 whitespace-pre-line text-[12px] leading-6 text-muted-foreground">
                  {team.hard_requirements || "队长没有填写硬性要求，欢迎先提交申请聊聊。"}
                </p>
              </div>
              <div className="rounded-md border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-foreground" />
                  <h3 className="text-[13px] font-medium">加分项 / 偏好</h3>
                </div>
                <p className="mt-3 whitespace-pre-line text-[12px] leading-6 text-muted-foreground">
                  {team.bonus_preferences || "队长没有特别填写加分项。"}
                </p>
              </div>
            </div>
          </section>

          {team.viewer.is_leader && (
            <LeaderApplications
              teamName={team.name}
              applications={applications}
              loading={applicationsLoading && !applications}
              token={token}
              onChanged={refreshLeaderData}
            />
          )}
        </div>

        <aside className="min-w-0">
          <div className="space-y-5 lg:sticky lg:top-20">
            <div className="overflow-hidden rounded-md border border-border bg-card">
              <div className="dot-grid-soft border-b border-border bg-[#F5F5F7] px-5 py-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="eyebrow">Team snapshot</p>
                    <h2 className="mt-2 font-display text-[21px] font-semibold tracking-[-0.04em]">队伍概况</h2>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-card">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-display text-[38px] font-semibold leading-none tracking-[-0.06em]">
                    {String(team.member_count).padStart(2, "0")}
                  </span>
                  <span className="font-mono text-[13px] text-muted-foreground">/ {String(team.capacity).padStart(2, "0")}</span>
                  <span className="ml-1 text-[11px] text-muted-foreground">人（含队长）</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${filledPercent}%` }} />
                </div>
                <p className="mt-2.5 text-[10px] leading-4 text-muted-foreground">
                  {team.member_count >= team.capacity
                    ? "已达到预设名额，但队长仍可继续审核成员。"
                    : `距离预设名额还有 ${team.capacity - team.member_count} 人，预设名额仅作规划参考。`}
                </p>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-3">
                  <Avatar name={team.leader.nickname} avatarKey={team.leader.avatar_key} className="h-9 w-9" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{team.leader.nickname}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      队长{team.leader.desired_role ? ` · ${team.leader.desired_role}` : ""}
                    </p>
                  </div>
                  <Badge variant="primary" className="ml-auto">Captain</Badge>
                </div>

                <div className="my-5 h-px bg-border" />

                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-medium">队伍成员</p>
                  <span className="font-mono text-[10px] text-muted-foreground">{team.members.length} MEMBERS</span>
                </div>
                <div className="mt-4 space-y-4">
                  {team.members.map((member) => (
                    <div key={member.membership_id} className="group flex items-start gap-2.5">
                      <Avatar name={member.nickname} avatarKey={member.avatar_key} className="h-8 w-8" textClassName="text-[10px]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={!team.viewer.is_member}
                            onClick={() => setProfileTarget(member)}
                            className={cn(
                              "max-w-full truncate text-left text-[12px] font-medium outline-none",
                              team.viewer.is_member
                                ? "underline decoration-transparent underline-offset-2 transition-colors hover:text-primary hover:decoration-primary/30 focus-visible:text-primary"
                                : "cursor-default",
                            )}
                            title={team.viewer.is_member ? "查看成员资料" : undefined}
                          >
                            {member.nickname}
                          </button>
                          {member.is_leader ? (
                            <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">队长</span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground">
                              {member.role_name || "队员"}
                            </span>
                          )}
                        </div>
                        {team.viewer.is_member && member.phone && (
                          <a
                            href={`tel:${member.phone}`}
                            className="mt-1 flex items-center gap-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-primary"
                          >
                            <Phone className="h-2.5 w-2.5" />
                            {member.phone}
                          </a>
                        )}
                        {team.viewer.is_member && member.school_company && (
                          <p className="mt-0.5 truncate text-[10px] text-neutral-400">{member.school_company}</p>
                        )}
                      </div>
                      {team.viewer.is_leader && !member.is_leader && (
                        <button
                          type="button"
                          onClick={() => setRemoveTarget(member)}
                          className="mt-0.5 rounded-sm p-1 text-neutral-400 opacity-0 transition-all hover:bg-error/5 hover:text-error group-hover:opacity-100"
                          title={`移除 ${member.nickname}`}
                          aria-label={`移除 ${member.nickname}`}
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {!team.viewer.is_member && (
                  <div className="mt-5 flex items-start gap-2 rounded-sm border border-border bg-secondary/50 px-3 py-2.5">
                    <LockKeyhole className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    <p className="text-[10px] leading-4 text-muted-foreground">加入队伍并通过审核后，可查看队内成员手机号。</p>
                  </div>
                )}
              </div>
            </div>

            {team.viewer.is_member && (
              <div className="rounded-md border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  <p className="text-[12px] font-medium">队内联系方式已解锁</p>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                  你可以在上方成员列表中查看同队成员的登录手机号。离开队伍后，该权限会立即失效。
                </p>
              </div>
            )}

            <div className="flex items-center justify-between rounded-md border border-border bg-card px-5 py-4">
              <span className="text-[11px] text-muted-foreground">队伍 ID</span>
              <span className="font-mono text-[11px] text-foreground">HM-{String(team.id).padStart(4, "0")}</span>
            </div>
          </div>
        </aside>
      </div>

      <Dialog open={Boolean(profileTarget)} onOpenChange={(open) => !open && setProfileTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar
                name={profileTarget?.nickname ?? ""}
                avatarKey={profileTarget?.avatar_key ?? 0}
                className="h-12 w-12"
                textClassName="text-[14px]"
              />
              <div className="min-w-0">
                <DialogTitle>{profileTarget?.nickname}</DialogTitle>
                <DialogDescription>
                  {profileTarget?.is_leader ? "队长" : profileTarget?.role_name || "队伍成员"}
                  {profileTarget ? ` · 加入于 ${formatRelative(profileTarget.joined_at)}` : ""}
                </DialogDescription>
              </div>
              <Badge variant="outline" className="ml-auto shrink-0">仅队内可见</Badge>
            </div>
          </DialogHeader>
          {profileTarget && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-sm border border-border bg-secondary/45 px-3.5 py-3">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">联系电话</p>
                  {profileTarget.phone ? (
                    <a href={`tel:${profileTarget.phone}`} className="mt-1.5 flex items-center gap-1.5 font-mono text-[12px] text-foreground hover:text-primary">
                      <Phone className="h-3 w-3" />
                      {profileTarget.phone}
                    </a>
                  ) : (
                    <p className="mt-1.5 text-[12px] text-muted-foreground">未填写</p>
                  )}
                </div>
                <div className="rounded-sm border border-border bg-secondary/45 px-3.5 py-3">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">学校 / 公司</p>
                  <p className="mt-1.5 truncate text-[12px] text-foreground">{profileTarget.school_company || "未填写"}</p>
                </div>
              </div>
              <div>
                <p className="eyebrow">希望担任的角色</p>
                <p className="mt-2 text-[12px] text-foreground">{profileTarget.desired_role || "未填写"}</p>
              </div>
              <div>
                <p className="eyebrow">技能标签</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profileTarget.skills && profileTarget.skills.length > 0 ? (
                    profileTarget.skills.map((skill) => (
                      <Badge key={skill} variant="outline" className="px-2.5 py-1 font-normal">{skill}</Badge>
                    ))
                  ) : (
                    <p className="text-[12px] text-muted-foreground">未填写</p>
                  )}
                </div>
              </div>
              <div>
                <p className="eyebrow">个人简介 / 项目经历</p>
                <p className="mt-2 whitespace-pre-line rounded-sm border border-border bg-secondary/35 px-3.5 py-3 text-[12px] leading-6 text-foreground/80">
                  {profileTarget.bio || "未填写"}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setProfileTarget(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ApplyDialog
        team={team}
        open={applyOpen}
        onOpenChange={setApplyOpen}
        token={token}
        onSubmitted={refreshAfterMemberChange}
      />

      <Dialog open={Boolean(removeTarget)} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-error/10 text-error">
              <Trash2 className="h-4 w-4" />
            </div>
            <DialogTitle>移除这位成员？</DialogTitle>
            <DialogDescription>
              {removeTarget
                ? `${removeTarget.nickname} 将不再是 ${team.name} 的成员，并会失去查看队内联系方式的权限。此操作不可撤销。`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveTarget(null)} disabled={removing}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => void handleRemove()} disabled={removing}>
              {removing ? <Loader2 className="animate-spin" /> : <UserMinus />}
              确认移除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <DialogTitle>完成组队？</DialogTitle>
            <DialogDescription>
              {team.viewer.pending_application_count > 0
                ? `队伍将被标记为「已完成组队」，${team.viewer.pending_application_count} 份待审核申请会自动关闭，拒绝理由为“该队伍已完成组队”。`
                : "队伍将被标记为「已完成组队」，不再接收新申请。之后你仍可以重新开放招募。"}
            </DialogDescription>
          </DialogHeader>
          {lifecycleError && <p className="text-[12px] text-error">{lifecycleError}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCompleteOpen(false)} disabled={lifecycleLoading}>
              取消
            </Button>
            <Button onClick={() => void handleComplete()} disabled={lifecycleLoading}>
              {lifecycleLoading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              确认完成组队
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
