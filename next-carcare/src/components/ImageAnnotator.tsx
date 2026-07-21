"use client";

import { useRef, useState } from "react";

export type AnnotationBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  price: number;
};

export type AnnotationMark = AnnotationBox & {
  type?: "box" | "text" | "highlight";
  color?: string;
};

export default function ImageAnnotator({
  imageUrl,
  initialBoxes = [],
  onChange
}: {
  imageUrl: string;
  initialBoxes?: AnnotationMark[];
  onChange: (boxes: AnnotationMark[]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<"box" | "text" | "highlight">("box");
  const [boxes, setBoxes] = useState<AnnotationMark[]>(initialBoxes);

  function point(e: React.PointerEvent) {
    const rect = ref.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    setStart(point(e));
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!start) return;
    const end = point(e);
    const label =
      mode === "text"
        ? window.prompt("標註文字") || "文字標記"
        : window.prompt("施工區域名稱") || (mode === "highlight" ? "重點標示" : "未命名區域");
    const price = mode === "box" ? Number(window.prompt("區域價格") || 0) : 0;
    const next = [
      ...boxes,
      {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        w: Math.max(Math.abs(end.x - start.x), mode === "text" ? 120 : 24),
        h: Math.max(Math.abs(end.y - start.y), mode === "text" ? 36 : 24),
        label,
        price,
        type: mode,
        color: mode === "highlight" ? "#ffc107" : undefined
      }
    ];
    setBoxes(next);
    onChange(next);
    setStart(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {[
          ["box", "框選區域"],
          ["text", "文字標記"],
          ["highlight", "黃色塗抹"]
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={mode === value ? "primary-btn" : "secondary-btn"}
            onClick={() => setMode(value as "box" | "text" | "highlight")}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className="secondary-btn"
          onClick={() => {
            const next = boxes.slice(0, -1);
            setBoxes(next);
            onChange(next);
          }}
          disabled={!boxes.length}
        >
          復原上一筆
        </button>
      </div>
      <div
        ref={ref}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="車內照片" className="w-full select-none" loading="lazy" />
        {boxes.map((box, index) => (
          <div
            key={`${box.label}-${index}`}
            className={`absolute ${
              box.type === "text"
                ? "border-0 bg-transparent"
                : "border-2 border-carcare-yellow bg-carcare-yellow/30"
            }`}
            style={{
              left: box.x,
              top: box.y,
              width: box.w,
              height: box.h
            }}
          >
            <span className="rounded-br-lg bg-carcare-black px-2 py-1 text-xs font-black text-white">
              {box.label}
              {box.price ? ` $${box.price}` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
