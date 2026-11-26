import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowUpRight, FileText, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import type { TeamDetail } from "@/types";

interface ApplyDialogProps {
  team: TeamDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => Promise<void> | void;
  token: string | null;
}

export function ApplyDialog({ team, open, onOpenChange, onSubmitted, token }: ApplyDialogProps) {
  const { toast } = useToast();
  const [roleId, setRoleId] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRoleId((current) => current || String(team.roles[0]?.id ?? ""));
      setError(null);
    }
  }, [open, team.roles]);

  const selectedRole = useMemo(
    () => team.roles.find((role) => String(role.id) === roleId) ?? null,
    [roleId, team.roles],
  );

  const submit = async () => {
    if (!token) {
      setError("登录状态已失效，请刷新页面后重新登录");
      return;
    }
    if (!roleId) {
      setError("请选择你想申请的角色");
      return;
    }
    if (!message.trim()) {
      setError("请填写一段文字介绍，让队长了解你");
      return;
    }
    if (message.length > 1000) {
      setError("文字介绍不能超过 1000 字");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.apply(team.id, { role_id: Number(roleId), message: message.trim() }, token);
      toast({
        title: "申请已提交",
        description: "正在等待队长审核。你可以在「我的队伍」查看申请状态。",
        variant: "success",
      });
      setMessage("");
      onOpenChange(false);
      await onSubmitted();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "申请提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[580px]">
        <DialogHeader>
          <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <DialogTitle>申请加入 {team.name}</DialogTitle>
          <DialogDescription>
            选择你想承担的角色，并认真介绍技能、相关经历、可投入的时间和加入动机。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="apply-role">目标角色</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger id="apply-role">
                <SelectValue placeholder="选择一个招募角色" />
              </SelectTrigger>
              <SelectContent>
                {team.roles.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    <span>{role.name}</span>
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                      {role.remaining > 0 ? `余 ${role.remaining}` : "已满可审"}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRole && (
              <div className="rounded-sm border border-border bg-secondary/60 px-3.5 py-3">
                <p className="text-[11px] leading-5 text-muted-foreground">{selectedRole.requirements || "队长未填写该角色的具体要求。"}</p>
                {selectedRole.remaining === 0 && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-warning">
                    <AlertCircle className="h-3 w-3" />
                    该角色已达到计划人数，但队长仍可审核通过。
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="apply-message">文字介绍</Label>
              <span className="font-mono text-[10px] text-muted-foreground">{message.length} / 1000</span>
            </div>
            <Textarea
              id="apply-message"
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, 1000))}
              placeholder="例如：我做过什么、擅长哪些工具、希望在这个项目中负责什么，以及这次能投入的时间。"
              className="min-h-[150px]"
              maxLength={1000}
            />
            <p className="flex items-center gap-1.5 text-[11px] leading-5 text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              本阶段仅支持文字介绍，不提供附件上传。提交后待审核期间不能修改。
            </p>
          </div>

          {error && (
            <div className="rounded-sm border border-error/20 bg-error/[0.04] px-3.5 py-2.5 text-[12px] leading-5 text-error">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="mt-1">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={() => void submit()} disabled={submitting}>
            {submitting ? <Loader2 className="animate-spin" /> : <ArrowUpRight />}
            {submitting ? "正在提交…" : "提交申请"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
