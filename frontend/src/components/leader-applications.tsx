import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  GraduationCap,
  Loader2,
  MailOpen,
  Phone,
  Sparkles,
  X,
} from "lucide-react";

import { ApplicationStatusBadge } from "@/components/status-badges";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { LeaderApplication, LeaderApplicationsResponse } from "@/types";

interface LeaderApplicationsProps {
  teamName: string;
  applications: LeaderApplicationsResponse | null;
  loading: boolean;
  token: string | null;
  onChanged: () => Promise<void>;
}

function ApplicationCard({
  application,
  onApprove,
  onReject,
  approving,
}: {
  application: LeaderApplication;
  onApprove: (application: LeaderApplication) => void;
  onReject: (application: LeaderApplication) => void;
  approving: boolean;
}) {
  const { applicant } = application;
  const isPending = application.status === "pending";
  return (
    <article className="rounded-md border border-border bg-card p-5 transition-colors hover:border-neutral-300">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Avatar name={applicant.nickname} avatarKey={applicant.avatar_key} className="h-10 w-10" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-display text-[18px] font-semibold tracking-[-0.03em]">{applicant.nickname}</h4>
              <ApplicationStatusBadge status={application.status} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">申请于 {formatDate(application.created_at)}</p>
          </div>
        </div>
        <a
          href={`tel:${applicant.phone}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 font-mono text-[11px] text-foreground transition-colors hover:border-primary/30 hover:text-primary"
          title="拨打电话"
        >
          <Phone className="h-3 w-3" />
          {applicant.phone}
        </a>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {applicant.school_company && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">
            <GraduationCap className="h-3 w-3" />
            {applicant.school_company}
          </span>
        )}
        {applicant.desired_role && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">
            <BriefcaseBusiness className="h-3 w-3" />
            想担任 {applicant.desired_role}
          </span>
        )}
        {applicant.skills.map((skill) => (
          <Badge key={skill} variant="outline" className="px-2.5 py-1 font-normal">
            {skill}
          </Badge>
        ))}
      </div>

      {applicant.bio && (
        <p className="mt-3 border-l-2 border-border pl-3 text-[12px] leading-6 text-muted-foreground">{applicant.bio}</p>
      )}

      <div className="mt-4 rounded-sm border border-border bg-secondary/50 p-4">
        <div className="flex items-center gap-2">
          <span className="eyebrow">Target role</span>
          <span className="h-px flex-1 bg-border" />
          <span className="rounded-full bg-card px-2.5 py-1 text-[11px] font-medium">{application.role_name}</span>
        </div>
        <p className="mt-3 whitespace-pre-line text-[13px] leading-6 text-foreground/85">{application.message}</p>
      </div>

      {application.rejection_reason && (
        <p className="mt-3 text-[11px] leading-5 text-error">
          处理说明：{application.rejection_reason}
        </p>
      )}

      {isPending && (
        <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onReject(application)}
            disabled={approving}
          >
            <X />
            拒绝
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="border-success/30 bg-success/[0.06] text-success hover:border-success/40 hover:bg-success/10"
            onClick={() => onApprove(application)}
            disabled={approving}
          >
            {approving ? <Loader2 className="animate-spin" /> : <Check />}
            同意加入
          </Button>
        </div>
      )}

      {application.status === "approved" && (
        <p className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-[11px] text-success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          该申请人已成为队伍成员
        </p>
      )}
    </article>
  );
}

export function LeaderApplications({ teamName, applications, loading, token, onChanged }: LeaderApplicationsProps) {
  const { toast } = useToast();
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<LeaderApplication | null>(null);
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const pending = useMemo(
    () => applications?.items.filter((application) => application.status === "pending") ?? [],
    [applications],
  );
  const processed = useMemo(
    () => applications?.items.filter((application) => application.status !== "pending") ?? [],
    [applications],
  );

  const approve = async (application: LeaderApplication) => {
    if (!token) return;
    setActionId(application.id);
    try {
      await api.approveApplication(application.id, token);
      toast({
        title: `${application.applicant.nickname} 已加入队伍`,
        description: `角色：${application.role_name}。其他待审核申请已按规则自动关闭。`,
        variant: "success",
      });
      await onChanged();
    } catch (caught) {
      toast({
        title: "没有通过这份申请",
        description: caught instanceof ApiError ? caught.message : "请稍后再试",
        variant: "error",
      });
    } finally {
      setActionId(null);
    }
  };

  const openReject = (application: LeaderApplication) => {
    setReason("");
    setRejectError(null);
    setRejectTarget(application);
  };

  const reject = async () => {
    if (!rejectTarget || !token) return;
    setRejecting(true);
    setRejectError(null);
    try {
      await api.rejectApplication(rejectTarget.id, reason.trim() || null, token);
      toast({
        title: "已拒绝该申请",
        description: reason.trim() ? "拒绝理由将对申请人可见。" : "未填写拒绝理由。",
      });
      setRejectTarget(null);
      await onChanged();
    } catch (caught) {
      setRejectError(caught instanceof ApiError ? caught.message : "操作失败，请稍后再试");
    } finally {
      setRejecting(false);
    }
  };

  return (
    <section id="applications" className="scroll-mt-20 border-t border-border pt-9">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Captain&apos;s desk / 04</p>
          <h2 className="mt-3 font-display text-[28px] font-semibold tracking-[-0.045em]">入队申请</h2>
          <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
            查看申请人的资料与介绍。通过后，对方会立即成为 {teamName} 的成员。
          </p>
        </div>
        <Badge variant={pending.length > 0 ? "warning" : "success"} className="mt-1 px-3.5 py-1.5">
          {pending.length > 0 ? `${pending.length} 份待审核` : "全部处理完毕"}
        </Badge>
      </div>

      {loading ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-52 w-full rounded-md" />
          <Skeleton className="h-52 w-full rounded-md" />
        </div>
      ) : applications && applications.total > 0 ? (
        <Tabs defaultValue="pending" className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="pending">待审核 · {pending.length}</TabsTrigger>
              <TabsTrigger value="history">已处理 · {processed.length}</TabsTrigger>
            </TabsList>
            <span className="text-[11px] text-muted-foreground">申请人手机号仅队长可见</span>
          </div>
          <TabsContent value="pending" className="space-y-4">
            {pending.length > 0 ? (
              pending.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  approving={actionId === application.id}
                  onApprove={(item) => void approve(item)}
                  onReject={openReject}
                />
              ))
            ) : (
              <div className="rounded-md border border-dashed border-border px-6 py-12 text-center">
                <CheckCircle2 className="mx-auto h-5 w-5 text-success" />
                <p className="mt-3 font-display text-lg font-semibold">没有待处理的申请</p>
                <p className="mt-1 text-[12px] text-muted-foreground">新的申请提交后会出现在这里。</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="history" className="space-y-4">
            {processed.length > 0 ? (
              processed.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  approving={false}
                  onApprove={() => undefined}
                  onReject={() => undefined}
                />
              ))
            ) : (
              <div className="rounded-md border border-dashed border-border px-6 py-12 text-center">
                <MailOpen className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-3 font-display text-lg font-semibold">还没有处理记录</p>
                <p className="mt-1 text-[12px] text-muted-foreground">同意或拒绝申请后，会在这里留下记录。</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="mt-6 rounded-md border border-dashed border-border px-6 py-12 text-center">
          <Sparkles className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="mt-3 font-display text-lg font-semibold">还没有收到申请</p>
          <p className="mt-1 text-[12px] text-muted-foreground">把队伍分享给感兴趣的伙伴，申请人会出现在这里。</p>
        </div>
      )}

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>拒绝这份申请？</DialogTitle>
            <DialogDescription>
              {rejectTarget ? `${rejectTarget.applicant.nickname} 将无法加入 ${teamName}。拒绝理由选填，但申请人可以看到。` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium">拒绝理由（选填）</span>
              <span className="font-mono text-[10px] text-muted-foreground">{reason.length} / 500</span>
            </div>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value.slice(0, 500))}
              placeholder="例如：这次更希望找有后端经验的队友，欢迎下次活动再来。"
              className="min-h-[100px]"
              maxLength={500}
            />
          </div>
          {rejectError && <p className="text-[12px] text-error">{rejectError}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectTarget(null)} disabled={rejecting}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => void reject()} disabled={rejecting}>
              {rejecting ? <Loader2 className="animate-spin" /> : <X />}
              确认拒绝
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
