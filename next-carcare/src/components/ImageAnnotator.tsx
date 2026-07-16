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

export default function ImageAnnotator({
  imageUrl,
  onChange
}: {
  imageUrl: string;
  onChange: (boxes: AnnotationBox[]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [boxes, setBoxes] = useState<AnnotationBox[]>([]);

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
    const label = window.prompt("施工區域名稱") || "未命名區域";
    const price = Number(window.prompt("區域價格") || 0);
    const next = [
      ...boxes,
      {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        w: Math.abs(end.x - start.x),
        h: Math.abs(end.y - start.y),
        label,
        price
      }
    ];
    setBoxes(next);
    onChange(next);
    setStart(null);
  }

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="車內照片" className="w-full select-none" />
      {boxes.map((box, index) => (
        <div
          key={`${box.label}-${index}`}
          className="absolute border-2 border-carcare-yellow bg-carcare-yellow/30"
          style={{
            left: box.x,
            top: box.y,
            width: box.w,
            height: box.h
          }}
        >
          <span className="rounded-br-lg bg-carcare-black px-2 py-1 text-xs font-black text-white">
            {box.label} ${box.price}
          </span>
        </div>
      ))}
    </div>
  );
}

