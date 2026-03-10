"use client";

import { useState, useMemo } from "react";
import { useSemesters } from "@/hooks/useSemester";
import { useTimetable } from "@/hooks/useTimetable";
import TopBar from "@/components/layout/TopBar";
import { Plus, Trash2, X, Check } from "lucide-react";
import { formatDuration } from "@/lib/calculations";
import { DAY_SHORT, type DayOfWeek, type TimetableEntry } from "@/types";

const DAYS: DayOfWeek[] = [1, 2, 3, 4, 5];

// Typische Schweizer Schulzeiten (Zeitslots)
const TIME_SLOTS = [
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

// Farben für Fächer
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
  const {
    entries,
    addEntry,
    deleteEntry,
    getEntriesForDay,
    getTotalMinutesForDay,
    getTotalMinutesPerWeek,
  } = useTimetable(activeSemester?.id ?? null);

  const [editCell, setEditCell] = useState<{
    day: DayOfWeek;
    slotIndex: number;
  } | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editIsPause, setEditIsPause] = useState(false);

  const timeSlots = activeSemester?.time_slots || [];

  // Unique subjects for color mapping
  const allSubjects = useMemo(() => {
    const set = new Set(entries.map((e) => e.subject));
    return Array.from(set);
  }, [entries]);

  if (!activeSemester) {
    return (
      <>
        <TopBar title="Stundenplan" />
        <div className="px-4 py-12 text-center">
          <p className="text-muted">
            Bitte erstelle zuerst ein Semester in den Einstellungen.
          </p>
        </div>
      </>
    );
  }

  // Find entry for a specific cell
  function findEntry(day: DayOfWeek, slot: TimeSlot): TimetableEntry | undefined {
    return entries.find(
      (e) =>
        e.day_of_week === day &&
        e.start_time.slice(0, 5) === slot.start &&
        e.end_time.slice(0, 5) === slot.end
    );
  }

  function handleCellClick(day: DayOfWeek, slotIndex: number) {
    const slot = timeSlots[slotIndex];
    const existing = findEntry(day, slot);

    if (existing) {
      // Click on existing → delete
      return;
    }

    // Open inline editor
    setEditCell({ day, slotIndex });
    setEditSubject("");
    setEditIsPause(false);
  }

  async function handleSave() {
    if (!editCell) return;
    if (!editIsPause && !editSubject.trim()) return;

    const slot = timeSlots[editCell.slotIndex];
    await addEntry({
      semester_id: activeSemester!.id,
      day_of_week: editCell.day,
      subject: editIsPause ? "Pause" : editSubject.trim(),
      start_time: slot.start,
      end_time: slot.end,
      is_pause: editIsPause,
      notes: null,
    });
    setEditCell(null);
    setEditSubject("");
    setEditIsPause(false);
  }

  async function handleDelete(entry: TimetableEntry) {
    await deleteEntry(entry.id);
  }

  const totalWeekMinutes = getTotalMinutesPerWeek();

  return (
    <>
      <TopBar title="Stundenplan" />
      <div className="px-2 py-4 space-y-3">
        {/* Semester Info */}
        <div className="mx-2 rounded-xl bg-primary/5 px-4 py-3">
          <p className="text-sm font-medium">{activeSemester.name}</p>
          <p className="text-xs text-muted">
            {formatDuration(totalWeekMinutes)} / Woche · {entries.length} Lektionen
          </p>
        </div>

        {/* Timetable Grid */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] border-collapse">
            {/* Header: Days */}
            <thead>
              <tr>
                <th className="w-12 p-1 text-[10px] font-medium text-muted">Zeit</th>
                {DAYS.map((day) => {
                  const mins = getTotalMinutesForDay(day);
                  return (
                    <th key={day} className="p-1 text-center">
                      <span className="text-xs font-semibold">{DAY_SHORT[day]}</span>
                      {mins > 0 && (
                        <span className="block text-[9px] font-normal text-muted">
                          {formatDuration(mins)}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Body: Time slots */}
            <tbody>
              {timeSlots.map((slot, slotIndex) => (
                <tr key={slotIndex + slot.start} className="border-t border-border/50">
                  {/* Time label */}
                  <td className="p-1 text-right align-top">
                    <span className="text-[10px] font-medium text-muted">
                      {slot.label}
                    </span>
                  </td>

                  {/* Day cells */}
                  {DAYS.map((day) => {
                    const entry = findEntry(day, slot);
                    const isEditing =
                      editCell?.day === day && editCell?.slotIndex === slotIndex;

                    return (
                      <td key={day} className="p-0.5 align-top">
                        {isEditing ? (
                          /* Inline Edit */
                          <div className="rounded-lg border-2 border-primary bg-primary/5 p-1">
                            {!editIsPause && (
                              <input
                                type="text"
                                value={editSubject}
                                onChange={(e) => setEditSubject(e.target.value)}
                                placeholder="Fach"
                                autoFocus
                                className="mb-1 w-full rounded border border-border px-1.5 py-1 text-[11px] outline-none focus:border-primary bg-background"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSave();
                                  if (e.key === "Escape") setEditCell(null);
                                }}
                              />
                            )}
                            <label className="flex items-center gap-1.5 px-0.5 mb-1 cursor-pointer text-[10px] text-muted">
                              <input
                                type="checkbox"
                                checked={editIsPause}
                                onChange={(e) => setEditIsPause(e.target.checked)}
                                className="rounded text-primary focus:ring-primary"
                              />
                              Ist Pause
                            </label>
                            <div className="flex gap-1">
                              <button
                                onClick={handleSave}
                                className="flex-1 rounded bg-primary p-0.5 text-white"
                              >
                                <Check className="mx-auto h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setEditCell(null)}
                                className="flex-1 rounded bg-gray-200 p-0.5"
                              >
                                <X className="mx-auto h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ) : entry ? (
                          /* Filled cell */
                          <div
                            className={`group relative min-h-[40px] cursor-pointer rounded-lg border p-1 transition-all hover:opacity-80 flex flex-col items-center justify-center ${
                              entry.is_pause
                                ? "bg-muted/10 border-dashed border-muted text-muted"
                                : getSubjectColor(entry.subject, allSubjects)
                            }`}
                          >
                            <p className="text-[11px] font-semibold leading-tight text-center">
                              {entry.subject}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(entry);
                              }}
                              className="absolute -right-1 -top-1 hidden rounded-full bg-danger p-0.5 text-white shadow group-hover:block"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ) : (
                          /* Empty cell */
                          <button
                            onClick={() => handleCellClick(day, slotIndex)}
                            className="flex min-h-[40px] w-full items-center justify-center rounded-lg border border-dashed border-border/60 text-border transition-all hover:border-primary hover:bg-primary/5"
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

        {/* Quick Add: Custom time slot */}
        <QuickAddSection
          semesterId={activeSemester.id}
          allSubjects={allSubjects}
          onAdd={addEntry}
        />

        {/* Subject Legend */}
        {allSubjects.length > 0 && (
          <div className="mx-2">
            <p className="mb-2 text-xs font-medium text-muted">Fächer</p>
            <div className="flex flex-wrap gap-1.5">
              {allSubjects.map((subject) => (
                <span
                  key={subject}
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${getSubjectColor(subject, allSubjects)}`}
                >
                  {subject}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** Schnell-Eingabe für Lektionen mit eigenen Zeiten */
function QuickAddSection({
  semesterId,
  allSubjects,
  onAdd,
}: {
  semesterId: string;
  allSubjects: string[];
  onAdd: (entry: {
    semester_id: string;
    day_of_week: DayOfWeek;
    subject: string;
    start_time: string;
    end_time: string;
    is_pause: boolean;
    notes: string | null;
  }) => Promise<TimetableEntry | null>;
}) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<DayOfWeek>(1);
  const [subject, setSubject] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:45");
  const [isPause, setIsPause] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!isPause && !subject.trim()) return;
    setSaving(true);
    await onAdd({
      semester_id: semesterId,
      day_of_week: day,
      subject: isPause ? "Pause" : subject.trim(),
      start_time: startTime,
      end_time: endTime,
      is_pause: isPause,
      notes: null,
    });
    setSaving(false);
    setSubject("");
    setIsPause(false);
  }

  if (!open) {
    return (
      <div className="mx-2">
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Lektion mit eigener Zeit hinzufügen
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleAdd}
      className="mx-2 rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Eigene Lektion</p>
        <button type="button" onClick={() => setOpen(false)} className="text-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-5 gap-1">
        {DAYS.map((d) => (
          <button
            type="button"
            key={d}
            onClick={() => setDay(d)}
            className={`rounded-lg py-1.5 text-xs font-medium transition-colors ${
              day === d
                ? "bg-primary text-white"
                : "bg-white border border-border text-muted"
            }`}
          >
            {DAY_SHORT[d]}
          </button>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        {!isPause && (
          <>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Fach"
              required={!isPause}
              list="subject-suggestions"
              className="flex-1 rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:border-primary bg-background"
            />
            <datalist id="subject-suggestions">
              {allSubjects.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </>
        )}
        <label className="flex items-center gap-1.5 px-2 text-sm text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={isPause}
            onChange={(e) => setIsPause(e.target.checked)}
            className="rounded text-primary focus:ring-primary"
          />
          Pause
        </label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="flex-1 rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:border-primary"
        />
        <span className="text-xs text-muted">–</span>
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="flex-1 rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "..." : "OK"}
        </button>
      </div>
    </form>
  );
}
