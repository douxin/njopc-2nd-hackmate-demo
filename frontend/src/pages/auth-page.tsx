import { useState, type FormEvent } from "react";
import { ArrowRight, KeyRound, Loader2, MessageSquareCode, Smartphone } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";

interface LocationState {
  from?: string;
}

export function AuthPage() {
  const { user, completeAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [mode, setMode] = useState<AuthMode>("login");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [schoolCompany, setSchoolCompany] = useState("");
  const [skills, setSkills] = useState("");
  const [desiredRole, setDesiredRole] = useState("");
  const [bio, setBio] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [registeredHint, setRegisteredHint] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const goAfterAuth = () => {
    const from = (location.state as LocationState | null)?.from;
    navigate(from && from !== "/login" ? from : "/", { replace: true });
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setCode("");
    setDevCode(null);
    setRegisteredHint(null);
  };

  const sendCode = async () => {
    if (!/^1\d{10}$/.test(phone.trim())) {
      setError("请先输入 11 位手机号");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const result = await api.sendCode(phone.trim());
      setDevCode(result.dev_code);
      setRegisteredHint(result.is_registered);
      toast({
        title: "开发验证码已生成",
        description: "验证码显示在手机号输入框下方，本地开发环境不会发送短信。",
      });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "验证码生成失败，请稍后重试");
    } finally {
      setSending(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!phone.trim() || !code.trim()) {
      setError("请填写手机号和验证码");
      return;
    }
    if (mode === "register" && !nickname.trim()) {
      setError("请给自己取一个昵称");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result =
        mode === "login"
          ? await api.login(phone.trim(), code.trim())
          : await api.register({
              phone: phone.trim(),
              code: code.trim(),
              nickname: nickname.trim(),
              school_company: schoolCompany.trim(),
              skills: skills.trim(),
              desired_role: desiredRole.trim(),
              bio: bio.trim(),
            });
      await completeAuth(result);
      toast({
        title: mode === "login" ? `欢迎回来，${result.user.nickname}` : "账号创建成功",
        description: mode === "login" ? "登录状态已保存在本地。" : "你已自动登录，可以开始浏览或创建队伍了。",
        variant: "success",
      });
      goAfterAuth();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "操作失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell py-10 lg:py-14">
      <div className="grid overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative flex min-h-[690px] flex-col justify-between overflow-hidden border-b border-border bg-[#F5F5F7] p-10 lg:border-b-0 lg:border-r lg:p-12">
          <div className="dot-grid-soft absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,black_10%,transparent_72%)]" />
          <div className="relative">
            <p className="eyebrow flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Build together / Hackathon field notes
            </p>
            <h1 className="mt-8 max-w-lg font-display text-[44px] font-semibold leading-[1.05] tracking-[-0.055em] xl:text-[56px]">
              一个人走得很快，
              <br />
              一群人走得
              <span className="inline-block">很远</span>
              。
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-7 text-muted-foreground">
              黑客松最珍贵的不是 36 小时，而是你身边坐着谁。用一次认真的自我介绍，找到愿意一起把想法做完的人。
            </p>
          </div>

          <div className="relative mt-12">
            <div className="mb-5 h-px w-full bg-black/[0.07]" />
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                ["01", "浏览正在组队的项目"],
                ["02", "提交你的角色与介绍"],
                ["03", "一起把 Demo 做出来"],
              ].map(([number, text]) => (
                <div key={number}>
                  <span className="font-mono text-[10px] tracking-[0.14em] text-primary">{number}</span>
                  <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 inline-flex items-center gap-3 rounded-md border border-black/[0.06] bg-card/75 px-4 py-3 backdrop-blur-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Smartphone className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[12px] font-medium">本地开发模式</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">验证码生成后直接显示，不会发送真实短信。</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-start justify-center p-6 sm:p-10 xl:p-12">
          <div className="w-full max-w-[480px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">{mode === "login" ? "Welcome back" : "Create your profile"}</p>
                <h2 className="mt-3 font-display text-[30px] font-semibold tracking-[-0.045em]">
                  {mode === "login" ? "欢迎回来" : "加入 HackMate"}
                </h2>
                <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                  {mode === "login" ? "用手机号和验证码登录你的账号。" : "先花一分钟介绍自己，让合适的队伍找到你。"}
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground">
                {mode === "login" ? <KeyRound className="h-4 w-4" /> : <MessageSquareCode className="h-4 w-4" />}
              </span>
            </div>

            <div className="mt-7 grid grid-cols-2 rounded-md border border-border bg-secondary p-1">
              {(["login", "register"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => switchMode(item)}
                  className={cn(
                    "h-8 rounded-sm text-[13px] font-medium transition-all",
                    mode === item ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item === "login" ? "登录" : "注册"}
                </button>
              ))}
            </div>

            <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">手机号</Label>
                <div className="relative">
                  <Input
                    id="phone"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="请输入 11 位手机号"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value.replace(/\s/g, ""))}
                    maxLength={11}
                    className="pr-[112px]"
                  />
                  <button
                    type="button"
                    onClick={() => void sendCode()}
                    disabled={sending}
                    className="absolute right-1.5 top-1/2 flex h-7 -translate-y-1/2 items-center gap-1.5 rounded-[4px] border border-border bg-secondary px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-neutral-300 disabled:opacity-50"
                  >
                    {sending && <Loader2 className="h-3 w-3 animate-spin" />}
                    发送验证码
                  </button>
                </div>
                {devCode ? (
                  <div className="flex items-center justify-between gap-3 rounded-sm border border-dashed border-primary/30 bg-primary/[0.035] px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">
                      开发验证码
                      <span className="ml-2 font-mono text-[15px] tracking-[0.18em] text-foreground">{devCode}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setCode(devCode)}
                      className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-primary hover:underline"
                    >
                      填入验证码
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] leading-5 text-muted-foreground">
                    点击发送后，6 位开发验证码会显示在这里。
                  </p>
                )}
                {registeredHint !== null && mode === "login" && !registeredHint && (
                  <p className="text-[11px] text-warning">
                    这个手机号还没有注册，切换到「注册」完成首次登录。
                  </p>
                )}
                {registeredHint !== null && mode === "register" && registeredHint && (
                  <p className="text-[11px] text-warning">
                    这个手机号已经注册，切换到「登录」即可继续。
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">验证码</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="输入 6 位验证码"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  maxLength={6}
                  className="font-mono tracking-[0.18em]"
                />
              </div>

              {mode === "register" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="nickname">昵称</Label>
                    <Input
                      id="nickname"
                      autoComplete="nickname"
                      placeholder="大家怎么称呼你？"
                      value={nickname}
                      onChange={(event) => setNickname(event.target.value)}
                      maxLength={40}
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                      选填资料
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="school">学校 / 公司</Label>
                      <Input
                        id="school"
                        placeholder="例如：浙江大学"
                        value={schoolCompany}
                        onChange={(event) => setSchoolCompany(event.target.value)}
                        maxLength={120}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="desired-role">希望担任的角色</Label>
                      <Input
                        id="desired-role"
                        placeholder="例如：全栈工程师"
                        value={desiredRole}
                        onChange={(event) => setDesiredRole(event.target.value)}
                        maxLength={80}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skills">技能标签</Label>
                    <Input
                      id="skills"
                      placeholder="用逗号分隔，例如：React, Python, 用户研究"
                      value={skills}
                      onChange={(event) => setSkills(event.target.value)}
                      maxLength={300}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">个人简介 / 项目经历</Label>
                    <Textarea
                      id="bio"
                      placeholder="简单说说你做过的项目、擅长的部分，或者想在这次黑客松里尝试什么。"
                      value={bio}
                      onChange={(event) => setBio(event.target.value)}
                      maxLength={600}
                      className="min-h-[92px]"
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="rounded-sm border border-error/20 bg-error/[0.04] px-3.5 py-2.5 text-[12px] leading-5 text-error">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="mt-2 w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    正在{ mode === "login" ? "登录" : "创建账号" }…
                  </>
                ) : (
                  <>
                    {mode === "login" ? "登录 HackMate" : "创建账号并登录"}
                    <ArrowRight />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-5 text-center text-[11px] leading-5 text-muted-foreground">
              继续即表示你同意在本次本地演示中使用手机号作为队内联系方式。
            </p>
            <div className="mt-7 flex items-center justify-between border-t border-border pt-5">
              <span className="text-[12px] text-muted-foreground">
                {mode === "login" ? "第一次来到 HackMate？" : "已经有账号了？"}
              </span>
              <button
                type="button"
                onClick={() => switchMode(mode === "login" ? "register" : "login")}
                className="text-[12px] font-medium text-primary hover:underline"
              >
                {mode === "login" ? "创建新账号" : "返回登录"}
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 flex items-center justify-between text-[11px] text-muted-foreground">
        <Link to="/" className="transition-colors hover:text-foreground">
          ← 先逛逛组队广场
        </Link>
        <span className="font-mono tracking-[0.08em]">LOCAL MVP / V0.1</span>
      </div>
    </div>
  );
}
