import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface ToastInput {
  title: string;
  description?: string;
  variant?: "success" | "error" | "default";
}

interface ToastItem extends ToastInput {
  id: string;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setItems((current) => [...current, { ...input, id }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-[80] flex w-[360px] max-w-[calc(100vw-3rem)] flex-col gap-2">
        {items.map((item) => {
          const isSuccess = item.variant === "success";
          const isError = item.variant === "error";
          return (
            <div
              key={item.id}
              className={cn(
                "pointer-events-auto flex animate-toast-in items-start gap-3 rounded-md border bg-card p-4 shadow-popover",
                isSuccess && "border-success/25",
                isError && "border-error/25",
              )}
            >
              {isSuccess ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              ) : isError ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
              ) : (
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-5 text-foreground">{item.title}</p>
                {item.description && <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{item.description}</p>}
              </div>
              <button
                onClick={() => dismiss(item.id)}
                className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="关闭提示"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
