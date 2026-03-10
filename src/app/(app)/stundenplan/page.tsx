"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useSemesters } from "@/hooks/useSemester";
import { useTimetable } from "@/hooks/useTimetable";
import TopBar from "@/components/layout/TopBar";
import { Plus, Coffee } from "lucide-react";
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
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-rose-100 text-rose-800 border-rose-200",
  "bg-cyan-100 text-cyan-800 border-cyan-200",
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-teal-100 text-teal-800 border-teal-200",
];

function getSubjectColor(subject: string, allSubjects: string[]): string {
  const idx = allSubjects.indexOf(subject);
  return SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
}

export default function StundenplanPage() {
  const { activeSemester } = useSemesters();
  const { entries, addEntry, deleteEntry } = useTimetable(activeSemester?.id ?? null);
  const [editingCell, setEditingCell] = useState<string | null>(null);

  // Use semester's time slots, fall back to defaults
  const timeSlots =
    activeSemester?.time_slots?.length ? activeSemester.time_slots : DEFAULT_TIME_SLOTS;

  const allSubjects = useMemo(() => {
    const set = new Set(entries.filter((e) => !e.is_pause).map((e) => e.subject));
    return Array.from(set);
  }, [entries]);

  if (!activeSemester) {
    return (
      <>
        <TopBar title="Stundenplan" />
        <div className="px-4 py-12 text-center">
          <p className="text-muted-foreground">
            Bitte erstelle zuerst ein Semester in den Einstellungen.
          </p>
        </div>
      </>
    );
  }

  function findEntry(day: DayOfWeek, slot: TimeSlot): TimetableEntry | undefined {
    return entries.find(
      (e) =>
        e.day_of_week === day &&
        e.start_time.slice(0, 5) === slot.start &&
        e.end_time.slice(0, 5) === slot.end
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[340px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="w-[50px] p-2 text-left text-[11px] font-medium text-muted-foreground">
                Zeit
              </th>
              {DAYS.map((day) => (
                <th key={day} className="p-2 text-center text-xs font-semibold">
                  {DAY_SHORT[day]}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {timeSlots.map((slot, slotIndex) => (
              <tr key={slotIndex} className="border-b border-border/40">
                <td className="p-1 text-right align-middle">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {slot.start}
                  </span>
                </td>

                {DAYS.map((day) => {
                  const entry = findEntry(day, slot);
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
                      ) : isEditing ? (
                        <EditableCell
                          allSubjects={allSubjects}
                          onSave={(subject) => {
                            saveEntry(day, slot, subject);
                            setEditingCell(null);
                          }}
                          onSavePause={() => {
                            savePause(day, slot);
                            setEditingCell(null);
                          }}
                          onCancel={() => setEditingCell(null)}
                        />
                      ) : (
                        <button
                          onClick={() => setEditingCell(cellKey)}
                          className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-dashed border-border/40 text-border/60 hover:border-primary/30 hover:bg-primary/5"
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
      <div className="flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-danger/30 bg-danger/5 p-1">
        <button
          onClick={() => { onDelete(); setConfirm(false); }}
          className="rounded-md bg-danger px-2 py-1 text-[10px] font-semibold text-white"
        >
          Löschen
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="rounded-md border border-border bg-card px-2 py-1 text-[10px]"
        >
          Nein
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className={`flex min-h-[44px] w-full items-center justify-center rounded-lg border p-1 ${
        entry.is_pause
          ? "border-dashed border-border bg-muted/30"
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
  onSave,
  onSavePause,
  onCancel,
}: {
  allSubjects: string[];
  onSave: (subject: string) => void;
  onSavePause: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="rounded-lg border-2 border-primary bg-primary/5 p-1 space-y-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Fach"
        className="w-full rounded-md border border-border bg-background px-1.5 py-1 text-[11px] outline-none focus:border-primary"
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) onSave(value);
          if (e.key === "Escape") onCancel();
        }}
        onBlur={() => setTimeout(() => { if (!value.trim()) onCancel(); }, 200)}
      />

      {allSubjects.length > 0 && (
        <div className="flex flex-wrap gap-0.5">
          {allSubjects.map((s) => (
            <button
              key={s}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSave(s)}
              className="rounded border border-border/60 bg-card px-1 py-0.5 text-[9px] font-medium hover:border-primary hover:text-primary"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-0.5">
        {value.trim() && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSave(value)}
            className="flex-1 rounded-md bg-primary py-1 text-[10px] font-semibold text-white"
          >
            OK
          </button>
        )}
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={onSavePause}
          title="Pause"
          className="flex-1 rounded-md border border-dashed border-border py-1 text-[10px] text-muted-foreground hover:border-primary"
        >
          <Coffee className="mx-auto h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
