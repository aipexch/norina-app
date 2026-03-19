"use client";

import { useState, useEffect } from "react";
import WheelColumn from "./WheelColumn";

const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

interface WheelDatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function WheelDatePicker({ value, onConfirm, onCancel }: WheelDatePickerProps) {
  const [visible, setVisible] = useState(false);
  const parts = value ? value.split("-") : [];
  const [year, setYear] = useState(parseInt(parts[0]) || new Date().getFullYear());
  const [month, setMonth] = useState((parseInt(parts[1]) || new Date().getMonth() + 1) - 1);
  const [day, setDay] = useState(parseInt(parts[2]) || new Date().getDate());

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => (currentYear - 2 + i).toString());
  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, "0"));
  const clampedDay = Math.min(day, daysInMonth);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  function animateOut(cb: () => void) {
    setVisible(false);
    setTimeout(cb, 250);
  }

  function handleConfirm() {
    const m = (month + 1).toString().padStart(2, "0");
    const d = clampedDay.toString().padStart(2, "0");
    animateOut(() => onConfirm(`${year}-${m}-${d}`));
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
        className="mx-5 w-full max-w-[340px] rounded-3xl bg-card p-5 shadow-xl"
        style={{
          transform: visible ? "scale(1)" : "scale(0.85)",
          opacity: visible ? 1 : 0,
          transition: "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease",
        }}
      >
        <div className="flex items-center justify-center gap-1">
          <WheelColumn
            items={days}
            selected={clampedDay.toString().padStart(2, "0")}
            onChange={(v) => setDay(parseInt(v))}
            width={65}
          />
          <WheelColumn
            items={MONTHS}
            selected={MONTHS[month]}
            onChange={(v) => setMonth(MONTHS.indexOf(v))}
            width={110}
            fontSize="text-[18px]"
          />
          <WheelColumn
            items={years}
            selected={year.toString()}
            onChange={(v) => setYear(parseInt(v))}
            width={80}
          />
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => animateOut(onCancel)}
            className="flex-1 rounded-2xl border border-border py-3 text-[15px] font-medium text-muted-foreground"
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 rounded-2xl bg-primary py-3 text-[15px] font-medium text-white shadow-sm"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
