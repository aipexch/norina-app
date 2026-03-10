"use client";

const BREAK_OPTIONS = [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85];

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
  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSkip();
      }}
    >
      <div className="w-full rounded-t-2xl bg-background px-4 pb-10 pt-4">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" />
        <h2 className="mb-1 text-center text-[17px] font-semibold">
          Wie lange war deine Mittagspause?
        </h2>
        <p className="mb-5 text-center text-[13px] text-muted-foreground">
          Diese Zeit wird von der Schulzeit abgezogen.
        </p>
        <div className="grid grid-cols-4 gap-2">
          {BREAK_OPTIONS.map((min) => (
            <button
              key={min}
              onClick={() => onSelect(min)}
              className="rounded-xl bg-card py-3 text-[14px] font-medium active:bg-primary active:text-white"
            >
              {formatBreakLabel(min)}
            </button>
          ))}
        </div>
        <button
          onClick={onSkip}
          className="mt-5 w-full py-3 text-[15px] text-muted-foreground"
        >
          Überspringen
        </button>
      </div>
    </div>
  );
}
