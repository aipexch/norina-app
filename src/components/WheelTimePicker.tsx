"use client";

import { useState, useEffect } from "react";
import WheelColumn from "./WheelColumn";

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"));

interface WheelTimePickerProps {
  value: string; // "HH:MM"
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function WheelTimePicker({ value, onConfirm, onCancel }: WheelTimePickerProps) {
  const [visible, setVisible] = useState(false);
  const [hours, setHours] = useState(value.split(":")[0] || "08");
  const [minutes, setMinutes] = useState(() => {
    const m = parseInt(value.split(":")[1] || "0", 10);
    const snapped = Math.round(m / 5) * 5;
    return (snapped % 60).toString().padStart(2, "0");
  });

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  function animateOut(cb: () => void) {
    setVisible(false);
    setTimeout(cb, 250);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{
        backgroundColor: visible ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0)",
        transition: "background-color 250ms ease",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) animateOut(onCancel);
      }}
    >
      <div
        className="mx-5 w-full max-w-[300px] rounded-3xl bg-card p-5 shadow-xl"
        style={{
          transform: visible ? "scale(1)" : "scale(0.85)",
          opacity: visible ? 1 : 0,
          transition:
            "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease",
        }}
      >
        <div className="flex items-center justify-center gap-0">
          <WheelColumn items={HOURS} selected={hours} onChange={setHours} width={90} />
          <span className="text-[28px] font-bold text-muted-foreground pb-1">:</span>
          <WheelColumn items={MINUTES} selected={minutes} onChange={setMinutes} width={90} />
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => animateOut(onCancel)}
            className="flex-1 rounded-2xl border border-border py-3 text-[15px] font-medium text-muted-foreground"
          >
            Abbrechen
          </button>
          <button
            onClick={() => animateOut(() => onConfirm(`${hours}:${minutes}`))}
            className="flex-1 rounded-2xl bg-primary py-3 text-[15px] font-medium text-white shadow-sm"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
