import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Loader2, Plus, Search, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/empty-state";
import { TeamCard } from "@/components/team-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { cn, pluralizeTeam } from "@/lib/utils";
import type { TeamCard as TeamCardType, TeamListResponse, TeamStatus } from "@/types";

type FilterStatus = TeamStatus | "all";

const filters: { value: FilterStatus; label: string }[] = [
  { value: "recruiting", label: "组队中" },
  { value: "completed", label: "已完成组队" },
  { value: "all", label: "全部" },
];

export function PlazaPage() {
  const { user, dashboard } = useAuth();
  const [status, setStatus] = useState<FilterStatus>("recruiting");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [data, setData] = useState<TeamListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 260);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        document.getElementById("teams")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .teams({ status, search: debouncedSearch })
      .then((response) => {
        if (alive) setData(response);
      })
      .catch((caught) => {
        if (!alive) return;
        setError(caught instanceof ApiError ? caught.message : "队伍列表加载失败");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [debouncedSearch, reloadKey, status]);

  const hasJoinedTeam = Boolean(dashboard?.joined_team);
  const primaryTo = !user ? "/login" : hasJoinedTeam ? "/my-teams" : "/create-team";
  const primaryLabel = !user ? "登录 / 注册" : hasJoinedTeam ? "查看我的队伍" : "创建我的队伍";

  return (
    <div>
      <section className="page-shell relative overflow-hidden pb-10 pt-12 lg:pb-14 lg:pt-16">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_360px] xl:gap-20">
          <div className="animate-fade-up">
            <div className="eyebrow flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Hackathon team-up board
              <span className="h-px w-8 bg-border" />
              <span className="text-foreground">{data?.recruiting_count ?? "—"} 支队伍正在招募</span>
            </div>

            <h1 className="mt-7 max-w-[760px] text-balance font-display text-[46px] font-semibold leading-[1.03] tracking-[-0.055em] sm:text-[56px] xl:text-[64px]">
              找到下一支
              <br />
              一起把想法
              <span className="ml-2 inline-block">做完</span>
              的队伍。
            </h1>

            <p className="mt-7 max-w-xl text-[15px] leading-7 text-muted-foreground">
              浏览现场正在组队的项目，看看他们在做什么、需要怎样的队友。也可以发起自己的队伍，把想法变成一次真正的合作。
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link to={primaryTo}>
                  {primaryLabel}
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <a href="#teams">
                  浏览招募公告
                  <ArrowUpRight />
                </a>
              </Button>
              {user && (
                <span className="ml-1 hidden items-center gap-2 text-[12px] text-muted-foreground sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  {user.nickname}，今天想和谁一起做点什么？
                </span>
              )}
            </div>
          </div>

          <aside className="relative hidden animate-fade-up overflow-hidden rounded-lg border border-border bg-card lg:block" style={{ animationDelay: "90ms" }}>
            <div className="dot-grid-soft relative border-b border-border bg-[#F5F5F7] px-7 py-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="eyebrow">Field guide / 01</p>
                  <h2 className="mt-3 font-display text-[25px] font-semibold tracking-[-0.04em]">从一次介绍开始。</h2>
                </div>
                <span className="mt-1 flex h-2 w-2 items-center justify-center">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                </span>
              </div>
              <p className="mt-4 max-w-[260px] text-[12px] leading-6 text-muted-foreground">
                好的组队不是凑齐人数，而是每个人都知道自己能贡献什么，也愿意理解别人正在做什么。
              </p>
            </div>
            <div className="p-7">
              <ol className="space-y-5">
                {[
                  ["01", "找到感兴趣的项目", "浏览角色、当前成员和队长的招募要求。"],
                  ["02", "认真地介绍自己", "说明你的技能、经历和能投入的时间。"],
                  ["03", "等待队长审核", "在「我的队伍」中查看申请进度。"],
                ].map(([number, title, description]) => (
                  <li key={number} className="grid grid-cols-[30px_1fr] gap-3">
                    <span className="pt-0.5 font-mono text-[10px] tracking-[0.12em] text-primary">{number}</span>
                    <div>
                      <p className="text-[13px] font-medium">{title}</p>
                      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{description}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-7 flex items-end justify-between border-t border-border pt-5">
                <div>
                  <p className="font-display text-[32px] font-semibold leading-none tracking-[-0.05em]">
                    {String(data?.recruiting_count ?? 0).padStart(2, "0")}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Open teams</p>
                </div>
                <Users className="mb-1 h-5 w-5 text-neutral-300" />
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section id="teams" className="scroll-mt-20 border-t border-border bg-background">
        <div className="page-shell py-9 lg:py-11">
          <div className="flex flex-col gap-5 border-b border-border pb-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow">Team bulletin / 正在发生</p>
              <h2 className="mt-3 font-display text-[32px] font-semibold tracking-[-0.045em]">组队广场</h2>
              <p className="mt-2 text-[13px] text-muted-foreground">找到方向契合的队伍，或者发出你自己的招募。</p>
            </div>
            <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
              <div className="relative w-full lg:w-[290px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="搜索队伍、简介或角色"
                  className="bg-card pl-9 pr-16"
                  maxLength={100}
                  aria-label="搜索队伍"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                  ⌘ K
                </span>
              </div>
              <div className="flex w-full items-center rounded-sm border border-border bg-card p-1 lg:w-auto">
                {filters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setStatus(filter.value)}
                    className={cn(
                      "flex-1 whitespace-nowrap rounded-[4px] px-3 py-1.5 text-[12px] font-medium transition-all lg:flex-none",
                      status === filter.value
                        ? "bg-foreground text-card shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-5 mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {loading ? "正在更新公告…" : `${pluralizeTeam(data?.total ?? 0)}匹配当前筛选`}
            </div>
            {search && (
              <button type="button" onClick={() => setSearch("")} className="text-[11px] text-primary hover:underline">
                清除搜索
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-lg border border-border bg-card">
                  <Skeleton className="h-[150px] rounded-none" />
                  <div className="space-y-4 p-5">
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <div className="flex justify-between border-t border-border pt-4">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-error/20 bg-error/[0.025] px-6 py-14 text-center">
              <p className="font-display text-xl font-semibold">广场暂时没有响应</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{error}</p>
              <Button variant="secondary" className="mt-5" onClick={() => setReloadKey((key) => key + 1)}>
                <Loader2 className="mr-1" />
                重新加载
              </Button>
            </div>
          ) : data && data.items.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {data.items.map((team: TeamCardType, index) => (
                <TeamCard key={team.id} team={team} index={index} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Plus}
              title={search ? "没有找到匹配的队伍" : status === "completed" ? "还没有完成组队的队伍" : "广场还很安静"}
              description={
                search
                  ? "试试更短的关键词，或者清除筛选条件重新看看。"
                  : "成为第一个发出组队公告的人，把你想做的事告诉大家。"
              }
              actionLabel={search ? "清除搜索" : "创建队伍"}
              onAction={search ? () => setSearch("") : undefined}
              actionTo={search ? undefined : user ? "/create-team" : "/login"}
            />
          )}
        </div>
      </section>
    </div>
  );
}
