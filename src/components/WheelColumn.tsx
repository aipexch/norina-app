"use client";

import { useRef, useEffect, useCallback } from "react";

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
export const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface WheelColumnProps {
  items: string[];
  selected: string;
  onChange: (value: string) => void;
  width?: number;
  fontSize?: string;
}

export default function WheelColumn({
  items,
  selected,
  onChange,
  width,
  fontSize = "text-[22px]",
}: WheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx >= 0) {
      setTimeout(() => scrollToIndex(idx, false), 20);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleScroll() {
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const index = Math.round(el.scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(index, items.length - 1));
      scrollToIndex(clamped);
      if (items[clamped] !== selected) {
        onChange(items[clamped]);
      }
    }, 80);
  }

  return (
    <div className="relative" style={{ height: PICKER_HEIGHT, width }}>
      <div
        className="pointer-events-none absolute left-0 right-0 z-10 rounded-xl bg-primary/8 border-y border-primary/15"
        style={{ top: ITEM_HEIGHT * 2, height: ITEM_HEIGHT }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20"
        style={{
          height: ITEM_HEIGHT * 2,
          background: "linear-gradient(to bottom, var(--color-card) 0%, transparent 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
        style={{
          height: ITEM_HEIGHT * 2,
          background: "linear-gradient(to top, var(--color-card) 0%, transparent 100%)",
        }}
      />
      <div
        ref={containerRef}
        className="h-full overflow-y-auto"
        onScroll={handleScroll}
        style={{
          scrollSnapType: "y mandatory",
          scrollPaddingTop: ITEM_HEIGHT * 2,
          scrollPaddingBottom: ITEM_HEIGHT * 2,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ height: ITEM_HEIGHT * 2 }} />
        {items.map((item) => (
          <div
            key={item}
            className={`flex items-center justify-center ${fontSize} font-semibold tabular-nums tracking-tight select-none`}
            style={{ height: ITEM_HEIGHT, scrollSnapAlign: "start" }}
          >
            {item}
          </div>
        ))}
        <div style={{ height: ITEM_HEIGHT * 2 }} />
      </div>
    </div>
  );
}
