import { LogOut, Plus, Users } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export function DotMark({ className }: { className?: string }) {
  return (
    <span className={cn("grid h-[18px] w-[18px] grid-cols-3 gap-[2px]", className)} aria-hidden="true">
      {Array.from({ length: 9 }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-[4px] w-[4px] rounded-full bg-foreground/80",
            index === 4 && "bg-primary",
            index === 2 && "bg-transparent",
            index === 6 && "bg-transparent",
          )}
        />
      ))}
    </span>
  );
}

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    "rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors",
    isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
  );
}

export function AppShell() {
  const { user, pendingReviewCount, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await logout();
    toast({ title: "已退出登录", description: "你可以使用另一个手机号重新登录。" });
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="page-shell flex h-14 items-center justify-between gap-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="HackMate 首页">
            <DotMark />
            <span className="font-display text-[18px] font-semibold tracking-[-0.045em]">HackMate</span>
            <span className="ml-1 hidden rounded-full border border-border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground xl:inline">
              Local build
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
            <NavLink to="/" end className={navClass}>
              广场
            </NavLink>
            <NavLink to="/create-team" className={navClass}>
              创建队伍
            </NavLink>
            {user && (
              <NavLink to="/my-teams" className={navClass}>
                <span className="flex items-center gap-1.5">
                  我的队伍
                  {pendingReviewCount > 0 && (
                    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] leading-none text-primary-foreground">
                      {pendingReviewCount}
                    </span>
                  )}
                </span>
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  to="/my-teams"
                  className="hidden items-center gap-2.5 rounded-sm px-1 py-1 transition-colors hover:bg-secondary sm:flex"
                  aria-label="进入我的队伍"
                >
                  <Avatar name={user.nickname} avatarKey={user.avatar_key} className="h-7 w-7" textClassName="text-[10px]" />
                  <div className="hidden leading-tight lg:block">
                    <p className="max-w-[110px] truncate text-[12px] font-medium">{user.nickname}</p>
                    <p className="font-mono text-[9px] text-muted-foreground">{user.phone}</p>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void handleLogout()}
                  title="退出登录"
                  aria-label="退出登录"
                >
                  <LogOut />
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link to="/login">登录</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/login">
                    登录 / 注册
                    <Plus className="hidden xl:block" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border">
        <div className="page-shell flex flex-col gap-5 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <DotMark />
              <span className="font-display text-[16px] font-semibold tracking-[-0.04em]">HackMate</span>
            </div>
            <p className="mt-2 max-w-sm text-[12px] leading-5 text-muted-foreground">
              为黑客松现场而做。认真介绍自己，找到愿意一起把想法做完的人。
            </p>
          </div>
          <div className="flex items-center gap-5 font-mono text-[10px] uppercase tracking-[0.13em] text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              Build together
            </span>
            <span>© {new Date().getFullYear()} HackMate</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
