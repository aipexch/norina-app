"use client";

import { useState, useEffect, useCallback } from "react";
import WheelColumn from "./WheelColumn";

const LUNCH_ITEMS: string[] = [];
for (let i = 0; i <= 90; i += 5) LUNCH_ITEMS.push(i.toString());

const SHORT_ITEMS: string[] = [];
for (let i = 0; i <= 45; i += 5) SHORT_ITEMS.push(i.toString());

function formatBreakLabel(minutes: number): string {
  if (minutes === 0) return "Keine";
  if (minutes < 60) return `${minutes} min`;
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
  const [selectedLunch, setSelectedLunch] = useState("45");
  const [selectedShort, setSelectedShort] = useState("0");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const animateOut = useCallback((cb: () => void) => {
    setVisible(false);
    setTimeout(cb, 250);
  }, []);

  function handleLunchConfirm() {
    const mins = Number(selectedLunch);
    if (mins === 0) {
      setStep("short");
      setLunchMinutes(0);
    } else {
      setLunchMinutes(mins);
      setStep("short");
    }
  }

  function handleShortConfirm() {
    const total = lunchMinutes + Number(selectedShort);
    if (total === 0) {
      animateOut(onSkip);
    } else {
      animateOut(() => onSelect(total));
    }
  }

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
          visible ? "scale-100 opacity-100" : "scale-90 opacity-0"
        }`}
      >
        {step === "lunch" ? (
          <>
            <h2 className="mb-1 text-center text-[17px] font-bold">
              Mittagspause
            </h2>
            <p className="mb-4 text-center text-[13px] text-muted-foreground">
              Wie lange war deine Mittagspause?
            </p>

            <div className="flex items-center justify-center">
              <WheelColumn
                items={LUNCH_ITEMS}
                selected={selectedLunch}
                onChange={setSelectedLunch}
                width={100}
              />
              <span className="ml-1 text-[18px] font-semibold text-muted-foreground">
                min
              </span>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => animateOut(onSkip)}
                className="flex-1 rounded-2xl border border-border py-3 text-[15px] font-medium text-muted-foreground"
              >
                Überspringen
              </button>
              <button
                onClick={handleLunchConfirm}
                className="flex-1 rounded-2xl bg-primary py-3 text-[15px] font-medium text-white shadow-sm"
              >
                Weiter
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-1 text-center text-[17px] font-bold">
              Weitere Pausen
            </h2>
            <p className="mb-1 text-center text-[13px] text-muted-foreground">
              Hattest du noch zusätzliche Pausen?
            </p>
            {lunchMinutes > 0 && (
              <p className="mb-3 text-center text-[12px] text-primary font-medium">
                Mittagspause: {formatBreakLabel(lunchMinutes)}
              </p>
            )}

            <div className="flex items-center justify-center">
              <WheelColumn
                items={SHORT_ITEMS}
                selected={selectedShort}
                onChange={setSelectedShort}
                width={100}
              />
              <span className="ml-1 text-[18px] font-semibold text-muted-foreground">
                min
              </span>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  if (lunchMinutes > 0) {
                    animateOut(() => onSelect(lunchMinutes));
                  } else {
                    animateOut(onSkip);
                  }
                }}
                className="flex-1 rounded-2xl border border-border py-3 text-[15px] font-medium text-muted-foreground"
              >
                Keine weiteren
              </button>
              <button
                onClick={handleShortConfirm}
                className="flex-1 rounded-2xl bg-primary py-3 text-[15px] font-medium text-white shadow-sm"
              >
                Fertig
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
