"use client";

import { useState, useEffect } from "react";
import WheelColumn from "./WheelColumn";

const FRACTION_LABELS = ["0", "¼", "½", "¾"];
const FRACTION_VALUES = [0, 0.25, 0.5, 0.75];

interface WheelNumberPickerProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  title?: string;
  fractions?: boolean;
  onConfirm: (value: number) => void;
  onCancel: () => void;
}

export default function WheelNumberPicker({
  value,
  min,
  max,
  step = 1,
  suffix,
  title,
  fractions,
  onConfirm,
  onCancel,
}: WheelNumberPickerProps) {
  const [visible, setVisible] = useState(false);

  const wholeItems: string[] = [];
  for (let i = min; i <= max; i += step) {
    wholeItems.push(i.toString());
  }

  // Split value into whole + fraction
  const wholeValue = Math.floor(value);
  const fracValue = value - wholeValue;

  const closestWhole = wholeItems.reduce((prev, curr) =>
    Math.abs(Number(curr) - wholeValue) < Math.abs(Number(prev) - wholeValue) ? curr : prev
  );
  const closestFrac = FRACTION_VALUES.reduce((prev, curr) =>
    Math.abs(curr - fracValue) < Math.abs(prev - fracValue) ? curr : prev
  );

  const [selectedWhole, setSelectedWhole] = useState(closestWhole);
  const [selectedFrac, setSelectedFrac] = useState(
    FRACTION_LABELS[FRACTION_VALUES.indexOf(closestFrac)]
  );

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  function animateOut(cb: () => void) {
    setVisible(false);
    setTimeout(cb, 250);
  }

  function handleConfirm() {
    const whole = Number(selectedWhole);
    const frac = fractions ? FRACTION_VALUES[FRACTION_LABELS.indexOf(selectedFrac)] : 0;
    animateOut(() => onConfirm(whole + frac));
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
        className={`mx-5 w-full rounded-3xl bg-card p-5 shadow-xl ${fractions ? "max-w-[300px]" : "max-w-[260px]"}`}
        style={{
          transform: visible ? "scale(1)" : "scale(0.85)",
          opacity: visible ? 1 : 0,
          transition:
            "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease",
        }}
      >
        {title && (
          <p className="mb-2 text-center text-[13px] font-semibold text-muted-foreground">
            {title}
          </p>
        )}

        <div className="flex items-center justify-center">
          <WheelColumn
            items={wholeItems}
            selected={selectedWhole}
            onChange={setSelectedWhole}
            width={fractions ? 80 : 100}
          />
          {fractions && (
            <WheelColumn
              items={FRACTION_LABELS}
              selected={selectedFrac}
              onChange={setSelectedFrac}
              width={60}
              fontSize="text-[24px]"
            />
          )}
          {suffix && (
            <span className="ml-1 text-[18px] font-semibold text-muted-foreground">
              {suffix}
            </span>
          )}
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
