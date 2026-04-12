"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useSemesters } from "@/hooks/useSemester";
import { useTimetable } from "@/hooks/useTimetable";
import { useToast } from "@/components/Toast";
import TopBar from "@/components/layout/TopBar";
import { Plus, Coffee, Check } from "lucide-react";
import { DAY_SHORT, type DayOfWeek, type TimetableEntry, type TimeSlot } from "@/types";

const DAYS: DayOfWeek[] = [1, 2, 3, 4, 5];

const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { start: "07:30", end: "08:15", label: "07:30" },
  { start: "08:20", end: "09:05", label: "08:20" },
  { start: "09:20", end: "10:05", label: "09:20" },
  { start: "10:10", end: "10:55", label: "10:10" },
  { start: "11:00", end: "11:45", label: "11:00" },
  { start: "13:15", end: "14:00", label: "13:15" },
  { start: "14:05", end: "14:50", label: "14:05" },
  { start: "15:05", end: "15:50", label: "15:05" },
  { start: "15:55", end: "16:40", label: "15:55" },
];

const SUBJECT_COLORS = [
  "bg-emerald-100 text-emerald-800",
  "bg-blue-100 text-blue-800",
  "bg-amber-100 text-amber-800",
  "bg-purple-100 text-purple-800",
  "bg-rose-100 text-rose-800",
  "bg-cyan-100 text-cyan-800",
  "bg-orange-100 text-orange-800",
  "bg-indigo-100 text-indigo-800",
  "bg-pink-100 text-pink-800",
  "bg-teal-100 text-teal-800",
];

function getSubjectColor(subject: string, allSubjects: string[]): string {
  const idx = allSubjects.indexOf(subject);
  return SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
}

export default function StundenplanPage() {
  const { activeSemester, loading: semesterLoading } = useSemesters();
  const { entries, addEntry, deleteEntry, loading: timetableLoading } = useTimetable(activeSemester?.id ?? null);
  const { showToast } = useToast();
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editOrigin, setEditOrigin] = useState<{ x: number; y: number; bottom: number } | null>(null);

  const timeSlots =
    activeSemester?.time_slots?.length ? activeSemester.time_slots : DEFAULT_TIME_SLOTS;

  const allSubjects = useMemo(() => {
    const set = new Set(entries.filter((e) => !e.is_pause).map((e) => e.subject));
    return Array.from(set);
  }, [entries]);

  const entryMap = useMemo(() => {
    const map = new Map<string, TimetableEntry>();
    for (const e of entries) {
      map.set(`${e.day_of_week}-${e.start_time.slice(0, 5)}-${e.end_time.slice(0, 5)}`, e);
    }
    return map;
  }, [entries]);

  if (semesterLoading || timetableLoading) {
    return (
      <>
        <TopBar title="Stundenplan" />
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </>
    );
  }

  if (!activeSemester) {
    return (
      <>
        <TopBar title="Stundenplan" />
        <div className="px-5 py-12 text-center">
          <p className="text-muted-foreground">
            Bitte erstelle zuerst ein Semester in den Einstellungen.
          </p>
        </div>
      </>
    );
  }

  async function saveEntry(day: DayOfWeek, slot: TimeSlot, subject: string) {
    await addEntry({
      semester_id: activeSemester!.id,
      day_of_week: day,
      subject: subject.trim(),
      start_time: slot.start,
      end_time: slot.end,
      is_pause: false,
      notes: null,
    });
  }

  async function savePause(day: DayOfWeek, slot: TimeSlot) {
    await addEntry({
      semester_id: activeSemester!.id,
      day_of_week: day,
      subject: "Pause",
      start_time: slot.start,
      end_time: slot.end,
      is_pause: true,
      notes: null,
    });
  }

  return (
    <>
      <TopBar title="Stundenplan" />
      <div className="overflow-x-auto px-3">
        <div className="rounded-2xl bg-card p-3 shadow-sm">
          <table className="w-full min-w-[340px] border-collapse">
            <thead>
              <tr>
                <th className="w-[50px] pb-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Zeit
                </th>
                {DAYS.map((day) => (
                  <th key={day} className="pb-2 text-center text-[12px] font-bold text-foreground">
                    {DAY_SHORT[day]}
                  </th>
                ))}
              </tr>
              <tr>
                <td colSpan={6} className="pb-1">
                  <div className="h-px bg-border/40" />
                </td>
              </tr>
            </thead>

            <tbody>
              {timeSlots.map((slot, slotIndex) => (
                <tr key={slotIndex}>
                  <td className="py-0.5 pr-1 text-right align-middle">
                    <span className="rounded-lg bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {slot.start}
                    </span>
                  </td>

                  {DAYS.map((day) => {
                    const entry = entryMap.get(`${day}-${slot.start}-${slot.end}`);
                    const cellKey = `${day}-${slotIndex}`;
                    const isEditing = editingCell === cellKey;

                    return (
                      <td key={day} className="p-0.5 align-middle">
                        {entry ? (
                          <FilledCell
                            entry={entry}
                            allSubjects={allSubjects}
                            onDelete={() => deleteEntry(entry.id)}
                          />
                        ) : (
                          <button
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setEditOrigin({
                                x: rect.left + rect.width / 2,
                                y: rect.top + rect.height / 2,
                                bottom: rect.bottom,
                              });
                              setEditingCell(cellKey);
                            }}
                            className={`flex min-h-[44px] w-full items-center justify-center rounded-xl transition-colors ${
                              isEditing
                                ? "border-2 border-primary bg-primary/5"
                                : "bg-background/60 text-border/60 hover:bg-background hover:text-muted-foreground"
                            }`}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingCell && editOrigin && (() => {
        const [dayStr, slotStr] = editingCell.split("-");
        const day = Number(dayStr) as DayOfWeek;
        const slot = timeSlots[Number(slotStr)];
        return (
          <EditableCell
            allSubjects={allSubjects}
            origin={editOrigin}
            dayLabel={DAY_SHORT[day]}
            timeLabel={slot.start}
            onSave={async (subject) => {
              try {
                await saveEntry(day, slot, subject);
              } catch {
                showToast("Fehler beim Speichern des Fachs", "error");
              }
              setEditingCell(null);
              setEditOrigin(null);
            }}
            onSavePause={async () => {
              try {
                await savePause(day, slot);
              } catch {
                showToast("Fehler beim Speichern der Pause", "error");
              }
              setEditingCell(null);
              setEditOrigin(null);
            }}
            onCancel={() => {
              setEditingCell(null);
              setEditOrigin(null);
            }}
          />
        );
      })()}
    </>
  );
}

function FilledCell({
  entry,
  allSubjects,
  onDelete,
}: {
  entry: TimetableEntry;
  allSubjects: string[];
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <div className="flex min-h-[44px] items-center justify-center gap-1 rounded-xl bg-danger/5 p-1">
        <button
          onClick={() => { onDelete(); setConfirm(false); }}
          className="rounded-lg bg-danger px-2 py-1 text-[10px] font-semibold text-white"
        >
          Ja
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="rounded-lg bg-card px-2 py-1 text-[10px] shadow-sm"
        >
          Nein
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className={`flex min-h-[44px] w-full items-center justify-center rounded-xl p-1 ${
        entry.is_pause
          ? "border border-dashed border-border/50 bg-muted/30"
          : getSubjectColor(entry.subject, allSubjects)
      }`}
    >
      {entry.is_pause ? (
        <Coffee className="h-3 w-3 text-muted-foreground" />
      ) : (
        <span className="text-[11px] font-semibold text-center leading-tight">
          {entry.subject}
        </span>
      )}
    </button>
  );
}

function EditableCell({
  allSubjects,
  origin,
  dayLabel,
  timeLabel,
  onSave,
  onSavePause,
  onCancel,
}: {
  allSubjects: string[];
  origin: { x: number; y: number; bottom: number };
  dayLabel: string;
  timeLabel: string;
  onSave: (subject: string) => void;
  onSavePause: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (visible) setTimeout(() => inputRef.current?.focus(), 100);
  }, [visible]);

  function animateOut(cb: () => void) {
    setVisible(false);
    setTimeout(cb, 250);
  }

  // Measure available space below vs above
  const popupWidth = 260;
  const popupEstimatedHeight = 280;
  const spaceBelow = window.innerHeight - origin.bottom - 16;
  const spaceAbove = origin.y - (origin.bottom - origin.y) / 2 - 16;
  const openAbove = spaceBelow < popupEstimatedHeight && spaceAbove > spaceBelow;

  const popupTop = openAbove ? undefined : origin.bottom + 8;
  const popupBottom = openAbove ? window.innerHeight - origin.y + (origin.bottom - origin.y) / 2 + 8 : undefined;

  const clampedLeft = Math.max(12, Math.min(origin.x - popupWidth / 2, window.innerWidth - popupWidth - 12));
  const pinLeft = origin.x - clampedLeft;
  const transformOriginY = openAbove ? "calc(100% + 8px)" : "-8px";

  return (
    <div
      className="fixed inset-0 z-50"
      style={{
        backgroundColor: visible ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0)",
        transition: "background-color 250ms ease",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) animateOut(onCancel); }}
    >
      <div
        ref={popupRef}
        className="absolute rounded-2xl bg-card shadow-xl space-y-3"
        style={{
          top: popupTop,
          bottom: popupBottom,
          left: clampedLeft,
          width: popupWidth,
          padding: "16px",
          transformOrigin: `${pinLeft}px ${transformOriginY}`,
          transform: visible ? "scale(1)" : "scale(0.3)",
          opacity: visible ? 1 : 0,
          transition: "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease",
        }}
      >
        {/* Arrow pointing to cell */}
        {openAbove ? (
          <div
            className="absolute -bottom-[7px]"
            style={{ left: pinLeft - 8 }}
          >
            <div className="h-0 w-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-card" />
          </div>
        ) : (
          <div
            className="absolute -top-[7px]"
            style={{ left: pinLeft - 8 }}
          >
            <div className="h-0 w-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-card" />
          </div>
        )}

        {/* Header with context */}
        <p className="text-[13px] font-semibold text-muted-foreground">
          {dayLabel}, {timeLabel}
        </p>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Fach eingeben…"
          maxLength={100}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[14px] outline-none focus:border-primary"
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) animateOut(() => onSave(value));
            if (e.key === "Escape") animateOut(onCancel);
          }}
        />

        {allSubjects.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allSubjects.map((s) => (
              <button
                key={s}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => animateOut(() => onSave(s))}
                className={`rounded-lg px-2.5 py-1 text-[12px] font-medium ${getSubjectColor(s, allSubjects)}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          {value.trim() && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => animateOut(() => onSave(value))}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm"
            >
              <Check className="h-5 w-5" strokeWidth={2.5} />
            </button>
          )}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => animateOut(onSavePause)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-[13px] text-muted-foreground"
          >
            <Coffee className="h-3.5 w-3.5" />
            Pause
          </button>
        </div>
      </div>
    </div>
  );
}
