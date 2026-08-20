"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type ToastTone = "success" | "error" | "warning" | "info";
type Toast = { id: number; message: string; tone: ToastTone; actionLabel?: string; onAction?: () => void };
type ConfirmOptions = { title?: string; message: string; confirmLabel?: string; tone?: "default" | "warning" };
type UiFeedbackValue = {
  toast: (message: string, tone?: ToastTone, action?: { label: string; onClick: () => void }) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const UiFeedbackContext = createContext<UiFeedbackValue | null>(null);

export function UiFeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);
  const toast = useCallback((message: string, tone: ToastTone = "info", action?: { label: string; onClick: () => void }) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-2), { id, message, tone, actionLabel: action?.label, onAction: action?.onClick }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4200);
  }, []);
  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...options, resolve })), []);
  const value = useMemo(() => ({ toast, confirm }), [confirm, toast]);
  useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = (message?: unknown) => {
      const text = String(message ?? "");
      const tone: ToastTone = /失敗|錯誤|異常|無法|未授權/i.test(text) ? "error" : /警告|衝突|缺少|尚未|請先/i.test(text) ? "warning" : /成功|完成|已建立|已更新|已儲存/i.test(text) ? "success" : "info";
      toast(text, tone);
    };
    return () => { window.alert = nativeAlert; };
  }, [toast]);
  useEffect(() => {
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { dialog.resolve(false); setDialog(null); } };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialog]);
  function closeDialog(result: boolean) { dialog?.resolve(result); setDialog(null); }

  return <UiFeedbackContext.Provider value={value}>
    {children}
    <div className="toast-stack" aria-live="polite">
      {toasts.map((item) => <div key={item.id} className={`toast toast-${item.tone}`} role="status">
        <span>{item.message}</span>
        {item.actionLabel ? <button type="button" onClick={item.onAction}>{item.actionLabel}</button> : null}
        <button type="button" aria-label="關閉通知" onClick={() => setToasts((current) => current.filter((row) => row.id !== item.id))}>×</button>
      </div>)}
    </div>
    {dialog ? <div className="dialog-backdrop" role="presentation" onMouseDown={() => closeDialog(false)}>
      <section className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="ui-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <p className="eyebrow">需要確認</p><h2 id="ui-dialog-title">{dialog.title || "確認操作"}</h2><p>{dialog.message}</p>
        <div className="dialog-actions"><button type="button" className="secondary-btn" onClick={() => closeDialog(false)}>取消</button><button type="button" className={dialog.tone === "warning" ? "warning-btn" : "primary-btn"} onClick={() => closeDialog(true)}>{dialog.confirmLabel || "確認"}</button></div>
      </section>
    </div> : null}
  </UiFeedbackContext.Provider>;
}

export function useUiFeedback() {
  const value = useContext(UiFeedbackContext);
  if (!value) throw new Error("useUiFeedback 必須在 UiFeedbackProvider 內使用");
  return value;
}
