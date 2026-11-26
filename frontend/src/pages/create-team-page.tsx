import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

interface RoleDraft {
  key: string;
  name: string;
  plannedCount: string;
  requirements: string;
}

function makeRole(): RoleDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "",
    plannedCount: "1",
    requirements: "",
  };
}

function SectionTitle({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="mb-6">
      <p className="eyebrow flex items-center gap-2">
        <span className="text-primary">{number}</span>
        <span className="h-px w-5 bg-border" />
        {title}
      </p>
      <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

export function CreateTeamPage() {
  const { user, token, dashboard, refreshDashboard } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [track, setTrack] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [roles, setRoles] = useState<RoleDraft[]>([makeRole()]);
  const [hardRequirements, setHardRequirements] = useState("");
  const [bonusPreferences, setBonusPreferences] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const updateRole = (key: string, field: keyof Pick<RoleDraft, "name" | "plannedCount" | "requirements">, value: string) => {
    setRoles((current) => current.map((role) => (role.key === key ? { ...role, [field]: value } : role)));
  };

  const addRole = () => {
    if (roles.length >= 10) return;
    setRoles((current) => [...current, makeRole()]);
  };

  const removeRole = (key: string) => {
    if (roles.length === 1) return;
    setRoles((current) => current.filter((role) => role.key !== key));
  };

  const validate = (): string | null => {
    if (!name.trim()) return "请填写队伍名称";
    if (!tagline.trim()) return "请填写项目一句话介绍";
    if (!description.trim()) return "请填写项目完整介绍";
    const parsedCapacity = Number(capacity);
    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) return "预设名额至少为 1 人";
    if (roles.length === 0) return "请至少添加一个招募角色";
    for (const [index, role] of roles.entries()) {
      if (!role.name.trim()) return `请填写第 ${index + 1} 个招募角色的名称`;
      const planned = Number(role.plannedCount);
      if (!Number.isInteger(planned) || planned < 1) return `第 ${index + 1} 个角色的计划人数至少为 1`;
    }
    return null;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!token) {
      navigate("/login", { state: { from: "/create-team" } });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.createTeam(
        {
          name: name.trim(),
          tagline: tagline.trim(),
          description: description.trim(),
          track: track.trim() || null,
          capacity: Number(capacity),
          roles: roles.map((role) => ({
            name: role.name.trim(),
            planned_count: Number(role.plannedCount),
            requirements: role.requirements.trim(),
          })),
          hard_requirements: hardRequirements.trim() || null,
          bonus_preferences: bonusPreferences.trim() || null,
        },
        token,
      );
      toast({
        title: "队伍创建成功",
        description: "你已成为队长和第一名成员，可以开始等待队友申请了。",
        variant: "success",
      });
      await refreshDashboard();
      navigate(`/teams/${result.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "队伍创建失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  if (dashboard && !dashboard.can_create_team) {
    return (
      <div className="page-shell py-16">
        <EmptyState
          icon={Users}
          title="你已经在一支队伍里了"
          description="每位用户同一时间只能加入一支队伍。当前阶段不支持转让或解散队伍，先回到你的队伍看看吧。"
          actionLabel="查看我的队伍"
          actionTo="/my-teams"
        />
      </div>
    );
  }

  const validRoleCount = roles.filter((role) => role.name.trim()).length;
  const previewName = name.trim() || "你的队伍名称";
  const previewTagline = tagline.trim() || "用一句话说清楚你们想做什么，以及为什么值得被加入。";

  return (
    <div>
      <section className="border-b border-border">
        <div className="page-shell py-9 lg:py-11">
          <Link to="/" className="inline-flex items-center gap-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            返回组队广场
          </Link>
          <div className="mt-6 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="eyebrow flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Start a team / Begin with an idea
              </p>
              <h1 className="mt-4 font-display text-[44px] font-semibold leading-none tracking-[-0.055em] lg:text-[52px]">
                发起一支队伍
              </h1>
              <p className="mt-4 max-w-xl text-[14px] leading-6 text-muted-foreground">
                把项目背景和期待的队友写清楚。创建成功后，你会自动成为队长与第一名成员。
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success/10 text-success">
                <Check className="h-3.5 w-3.5" />
              </span>
              当前登录：{user?.nickname}
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={(event) => void submit(event)} className="page-shell py-9 lg:py-11">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-10">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="border-b border-border p-6">
                <SectionTitle
                  number="01"
                  title="基础信息"
                  description="这些内容会展示在广场卡片和队伍详情中，请尽量具体而清楚。"
                />
                <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_130px]">
                  <div className="space-y-2">
                    <Label htmlFor="team-name">
                      队伍名称 <span className="text-primary">*</span>
                    </Label>
                    <Input
                      id="team-name"
                      placeholder="例如：CodeRaft"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      maxLength={80}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">
                      预设名额 <span className="text-primary">*</span>
                    </Label>
                    <Input
                      id="capacity"
                      type="number"
                      min={1}
                      max={99}
                      value={capacity}
                      onChange={(event) => setCapacity(event.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground">包含队长</p>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <Label htmlFor="tagline">
                    项目一句话介绍 <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="tagline"
                    placeholder="用一句话说清楚这个项目在做什么。"
                    value={tagline}
                    onChange={(event) => setTagline(event.target.value)}
                    maxLength={160}
                  />
                  <div className="flex justify-end font-mono text-[10px] text-muted-foreground">{tagline.length} / 160</div>
                </div>

                <div className="mt-2 space-y-2">
                  <Label htmlFor="track">项目方向 / 赛道</Label>
                  <Input
                    id="track"
                    placeholder="例如：AI × 效率工具、消费级产品、硬件 × 交互"
                    value={track}
                    onChange={(event) => setTrack(event.target.value)}
                    maxLength={80}
                  />
                </div>

                <div className="mt-5 space-y-2">
                  <Label htmlFor="description">
                    项目完整介绍 <span className="text-primary">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="介绍项目背景、你们想解决的问题、目前的想法或进展，以及这次黑客松想做出什么。"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={5000}
                    className="min-h-[150px]"
                  />
                  <div className="flex justify-end font-mono text-[10px] text-muted-foreground">{description.length} / 5000</div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <SectionTitle
                    number="02"
                    title="招募角色"
                    description="填写希望队友承担的角色。计划人数不包含队长，仅作为规划参考，不会限制后续审核。"
                  />
                  <Badge variant="outline" className="mt-0.5">{roles.length} / 10 个角色</Badge>
                </div>

                <div className="space-y-4">
                  {roles.map((role, index) => (
                    <div key={role.key} className="rounded-md border border-border bg-background/60 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-muted-foreground">
                          Role / {String(index + 1).padStart(2, "0")}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeRole(role.key)}
                          disabled={roles.length === 1}
                          title={roles.length === 1 ? "至少保留一个招募角色" : "删除这个角色"}
                          aria-label="删除这个招募角色"
                          className="text-muted-foreground hover:text-error"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
                        <div className="space-y-2">
                          <Label htmlFor={`role-name-${role.key}`}>角色名称 <span className="text-primary">*</span></Label>
                          <Input
                            id={`role-name-${role.key}`}
                            placeholder="例如：前端工程师"
                            value={role.name}
                            onChange={(event) => updateRole(role.key, "name", event.target.value)}
                            maxLength={60}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`role-count-${role.key}`}>计划人数 <span className="text-primary">*</span></Label>
                          <Input
                            id={`role-count-${role.key}`}
                            type="number"
                            min={1}
                            max={99}
                            value={role.plannedCount}
                            onChange={(event) => updateRole(role.key, "plannedCount", event.target.value)}
                          />
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Label htmlFor={`role-requirements-${role.key}`}>角色要求</Label>
                        <Textarea
                          id={`role-requirements-${role.key}`}
                          placeholder="希望对方具备什么技能或经验？愿意承担哪些工作？"
                          value={role.requirements}
                          onChange={(event) => updateRole(role.key, "requirements", event.target.value)}
                          maxLength={1000}
                          className="min-h-[82px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addRole}
                  disabled={roles.length >= 10}
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-sm border border-dashed border-border text-[12px] font-medium text-muted-foreground transition-colors hover:border-primary/35 hover:bg-primary/[0.025] hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  添加一个招募角色
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-border bg-card p-6">
              <SectionTitle
                number="03"
                title="对队友的期待"
                description="选填。把硬性条件和加分项分开写，能帮助申请人判断彼此是否合适。"
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <Label htmlFor="hard-requirements">硬性要求</Label>
                  </div>
                  <Textarea
                    id="hard-requirements"
                    placeholder="例如：需要全程到场、有硬件调试经验……"
                    value={hardRequirements}
                    onChange={(event) => setHardRequirements(event.target.value)}
                    maxLength={2000}
                    className="min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    <Label htmlFor="bonus-preferences">加分项 / 偏好</Label>
                  </div>
                  <Textarea
                    id="bonus-preferences"
                    placeholder="例如：做过内容产品、喜欢做饭、有设计作品……"
                    value={bonusPreferences}
                    onChange={(event) => setBonusPreferences(event.target.value)}
                    maxLength={2000}
                    className="min-h-[120px]"
                  />
                </div>
              </div>
            </section>

            {error && (
              <div className="rounded-sm border border-error/20 bg-error/[0.04] px-4 py-3 text-[12px] leading-5 text-error">
                {error}
              </div>
            )}

            <div className="flex flex-col items-start justify-between gap-4 rounded-lg border border-border bg-card px-5 py-4 sm:flex-row sm:items-center">
              <p className="flex items-center gap-2 text-[11px] leading-5 text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                创建后将进入队伍详情；你名下的其他待审核申请会自动关闭。队伍信息本阶段暂不支持编辑。
              </p>
              <Button type="submit" size="lg" disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : <Check />}
                {submitting ? "正在创建队伍…" : "确认创建队伍"}
                {!submitting && <ArrowRight />}
              </Button>
            </div>
          </div>

          <aside className="lg:sticky lg:top-20">
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="dot-grid-soft relative min-h-[178px] overflow-hidden border-b border-border bg-[#F5F5F7] p-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-card/90 px-3 py-1 text-[11px] font-medium text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    组队中
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Live preview</span>
                </div>
                <p className={cn("mt-7 font-display text-[24px] font-semibold leading-tight tracking-[-0.04em]", !name.trim() && "text-neutral-400")}>
                  {previewName}
                </p>
                <p className={cn("mt-2 line-clamp-2 text-[11px] leading-5", tagline.trim() ? "text-muted-foreground" : "text-neutral-400")}>
                  {previewTagline}
                </p>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">预设名额</span>
                  <span className="font-mono text-[12px] text-foreground">1 / {capacity || "—"} 人</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full w-1/4 rounded-full bg-primary" />
                </div>

                <div className="my-4 h-px bg-border" />
                <p className="text-[11px] font-medium">招募角色</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {validRoleCount > 0 ? (
                    roles
                      .filter((role) => role.name.trim())
                      .map((role) => (
                        <Badge key={role.key} variant="outline" className="px-2.5 py-1 font-normal">
                          {role.name} <span className="text-primary">+{role.plannedCount || 0}</span>
                        </Badge>
                      ))
                  ) : (
                    <p className="text-[11px] text-muted-foreground">填写角色后会显示在这里。</p>
                  )}
                </div>

                <div className="mt-5 rounded-sm bg-secondary/65 p-3.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium">
                    <Users className="h-3.5 w-3.5" />
                    发布前确认
                  </p>
                  <ul className="mt-2.5 space-y-2">
                    {[
                      ["项目介绍足够具体", description.trim().length > 20],
                      ["至少一个招募角色", validRoleCount > 0],
                      ["预设名额有效", Number(capacity) >= 1],
                    ].map(([label, done]) => (
                      <li key={String(label)} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-full border", done ? "border-success/30 bg-success/10 text-success" : "border-border bg-card text-transparent")}>
                          <Check className="h-2.5 w-2.5" />
                        </span>
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <p className="mt-3 px-1 text-[10px] leading-5 text-muted-foreground">
              提示：队伍当前人数与角色人数均包含或统计已通过审核的成员。预设名额只用于规划，不会自动阻止你继续通过申请。
            </p>
          </aside>
        </div>
      </form>
    </div>
  );
}
