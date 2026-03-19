"use client";

import { useState, useEffect, useCallback } from "react";

const LUNCH_OPTIONS = [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85];
const SHORT_BREAK_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40];

function formatBreakLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function BreakSheet({
  onSelect,
  onSkip,
}: {
  onSelect: (minutes: number) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState<"lunch" | "short">("lunch");
  const [lunchMinutes, setLunchMinutes] = useState(0);

  function handleLunchSelect(minutes: number) {
    setLunchMinutes(minutes);
    setStep("short");
  }

  function handleShortSelect(minutes: number) {
    onSelect(lunchMinutes + minutes);
  }

  function handleLunchSkip() {
    setStep("short");
  }

  function handleShortSkip() {
    if (lunchMinutes > 0) {
      onSelect(lunchMinutes);
    } else {
      onSkip();
    }
  }

  if (step === "lunch") {
    return (
      <BreakPopover
        key="lunch"
        title="Wie lange war deine Mittagspause?"
        subtitle="Diese Zeit wird von der Schulzeit abgezogen."
        options={LUNCH_OPTIONS}
        onSelect={handleLunchSelect}
        onSkip={handleLunchSkip}
      />
    );
  }

  return (
    <BreakPopover
      key="short"
      title="Weitere kurze Pausen?"
      subtitle="Falls du noch zusätzliche Pausen hattest."
      options={SHORT_BREAK_OPTIONS}
      onSelect={handleShortSelect}
      onSkip={handleShortSkip}
      skipLabel="Keine weiteren"
    />
  );
}

function BreakPopover({
  title,
  subtitle,
  options,
  onSelect,
  onSkip,
  skipLabel = "Überspringen",
}: {
  title: string;
  subtitle: string;
  options: number[];
  onSelect: (minutes: number) => void;
  onSkip: () => void;
  skipLabel?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const animateOut = useCallback((cb: () => void) => {
    setVisible(false);
    setTimeout(cb, 250);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-5 transition-colors duration-250 ease-out ${
        visible ? "bg-black/30" : "bg-black/0"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) animateOut(onSkip);
      }}
    >
      <div
        className={`w-full max-w-sm rounded-3xl bg-card p-5 shadow-xl transition-all duration-250 ease-out ${
          visible
            ? "scale-100 opacity-100"
            : "scale-90 opacity-0"
        }`}
      >
        <h2 className="mb-1 text-center text-[17px] font-bold">
          {title}
        </h2>
        <p className="mb-5 text-center text-[13px] text-muted-foreground">
          {subtitle}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {options.map((min) => (
            <button
              key={min}
              onClick={() => animateOut(() => onSelect(min))}
              className="rounded-2xl bg-background py-3 text-[14px] font-medium active:bg-primary active:text-white"
            >
              {formatBreakLabel(min)}
            </button>
          ))}
        </div>
        <button
          onClick={() => animateOut(onSkip)}
          className="mt-5 w-full py-3 text-[15px] text-muted-foreground"
        >
          {skipLabel}
        </button>
      </div>
    </div>
  );
}
