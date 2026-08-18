"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useUiFeedback } from "@/components/UiFeedback";

export type SearchOption = { value: string; label: string; keywords?: string };

export function SearchSelect({ value, options, onChange, placeholder = "搜尋或選擇", label, required, disabled }: {
  value: string; options: SearchOption[]; onChange: (value: string) => void; placeholder?: string; label: string; required?: boolean; disabled?: boolean;
}) {
  const selected = options.find((item) => item.value === value);
  const [query, setQuery] = useState(selected?.label || "");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => setQuery(selected?.label || ""), [selected?.label]);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close);
  }, []);
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text || selected?.label === query) return options.slice(0, 40);
    return options.filter((item) => `${item.label} ${item.keywords || ""}`.toLowerCase().includes(text)).slice(0, 40);
  }, [options, query, selected?.label]);
  return <div ref={rootRef} className="search-select">
    <label className={`field-label ${required ? "required" : ""}`}>{label}</label>
    <input className="form-input" value={query} disabled={disabled} placeholder={placeholder} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); if (!event.target.value) onChange(""); }} />
    {open && !disabled ? <div className="search-select-menu" role="listbox">
      {filtered.map((item) => <button type="button" role="option" aria-selected={item.value === value} key={item.value} onClick={() => { onChange(item.value); setQuery(item.label); setOpen(false); }}>{item.label}</button>)}
      {!filtered.length ? <p>找不到符合項目</p> : null}
    </div> : null}
  </div>;
}

export function SideDrawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => { if (open) document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, [open]);
  if (!open) return null;
  return <div className="drawer-backdrop" onMouseDown={onClose} role="presentation"><aside className="side-drawer" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
    <header><h2>{title}</h2><button type="button" className="secondary-btn" onClick={onClose}>關閉</button></header><div className="drawer-content">{children}</div>
  </aside></div>;
}

export function MoreActions({ children }: { children: ReactNode }) {
  return <details className="more-actions"><summary>更多</summary><div>{children}</div></details>;
}

export function useUnsavedChanges(dirty: boolean, message = "尚有未儲存資料，確定離開此頁？") {
  const { confirm } = useUiFeedback();
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (!dirty) return; event.preventDefault(); event.returnValue = ""; };
    const click = async (event: MouseEvent) => {
      if (!dirty || event.defaultPrevented || event.button !== 0) return;
      const anchor = (event.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.origin !== window.location.origin || anchor.href === window.location.href) return;
      event.preventDefault();
      if (await confirm({ title: "資料尚未儲存", message, confirmLabel: "離開頁面", tone: "warning" })) window.location.href = anchor.href;
    };
    window.addEventListener("beforeunload", beforeUnload); document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", click, true); };
  }, [confirm, dirty, message]);
}
