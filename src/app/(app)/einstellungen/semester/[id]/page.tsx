"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSemesters } from "@/hooks/useSemester";
import { useTimetable } from "@/hooks/useTimetable";
import { useToast } from "@/components/Toast";
import { formatDateShort } from "@/lib/date-utils";
import WheelTimePicker from "@/components/WheelTimePicker";
import WheelDatePicker from "@/components/WheelDatePicker";
import WheelNumberPicker from "@/components/WheelNumberPicker";
import {
  ArrowLeft, Plus, Coffee, Check, Trash2, Clock, GripVertical,
  Calendar, Percent, BookOpen, Timer,
} from "lucide-react";
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

export default function SemesterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { semesters, updateSemester, deleteSemester, loading } = useSemesters();
  const semester = semesters.find((s) => s.id === id);
  const { entries, addEntry, deleteEntry } = useTimetable(id);
  const { showToast } = useToast();

  const [activePicker, setActivePicker] = useState<string | null>(null);
  const [deletingConfirm, setDeletingConfirm] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pensum, setPensum] = useState(100);
  const [lessons, setLessons] = useState(28);
  const [minutesPerLesson, setMinutesPerLesson] = useState(45);

  // Sync state when semester loads
  useEffect(() => {
    if (semester) {
      setName(semester.name);
      setStartDate(semester.start_date);
      setEndDate(semester.end_date);
      setPensum(semester.pensum_percent);
      setLessons(semester.lessons_per_week);
      setMinutesPerLesson(semester.minutes_per_lesson);
    }
  }, [semester]);

  // Timetable
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editOrigin, setEditOrigin] = useState<{ x: number; y: number; bottom: number } | null>(null);

  const timeSlots = semester?.time_slots?.length ? semester.time_slots : DEFAULT_TIME_SLOTS;

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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!semester) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-muted-foreground">Semester nicht gefunden.</p>
        <button onClick={() => router.push("/einstellungen")} className="mt-4 text-primary font-medium">
          Zurück
        </button>
      </div>
    );
  }

  const isDirty =
    name !== semester.name ||
    startDate !== semester.start_date ||
    endDate !== semester.end_date ||
    pensum !== semester.pensum_percent ||
    lessons !== semester.lessons_per_week ||
    minutesPerLesson !== semester.minutes_per_lesson;

  async function handleSave() {
    await updateSemester(semester!.id, {
      name,
      start_date: startDate,
      end_date: endDate,
      pensum_percent: pensum,
      lessons_per_week: lessons,
      minutes_per_lesson: minutesPerLesson,
    });
    showToast("Semester gespeichert", "success");
  }

  async function handleDelete() {
    try {
      await deleteSemester(semester!.id);
      router.push("/einstellungen");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Löschen fehlgeschlagen", "error");
    }
  }

  async function saveEntry(day: DayOfWeek, slot: TimeSlot, subject: string) {
    await addEntry({
      semester_id: semester!.id,
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
      semester_id: semester!.id,
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
      {/* Header */}
      <header className="flex items-center gap-3 pt-4 pb-2 px-5">
        <button onClick={() => router.push("/einstellungen")} className="rounded-full p-1.5 -ml-1.5">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[22px] font-bold tracking-tight truncate flex-1">{semester.name}</h1>
        {semester.is_active && (
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            Aktiv
          </span>
        )}
      </header>

      <div className="px-5 py-4 space-y-6">
        {/* Semester Details */}
        <section className="rounded-2xl bg-card p-4 shadow-sm space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">Bezeichnung</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[15px] outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">Start</label>
              <button
                onClick={() => setActivePicker("startDate")}
                className="flex w-full items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-[15px] font-medium"
              >
                <Calendar className="h-4 w-4 shrink-0 text-primary" />
                {formatDateShort(startDate)}
              </button>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">Ende</label>
              <button
                onClick={() => setActivePicker("endDate")}
                className="flex w-full items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-[15px] font-medium"
              >
                <Calendar className="h-4 w-4 shrink-0 text-primary" />
                {formatDateShort(endDate)}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">Pensum</label>
              <button
                onClick={() => setActivePicker("pensum")}
                className="flex w-full items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-[15px] font-medium"
              >
                <Percent className="h-3.5 w-3.5 shrink-0 text-primary" />
                {pensum}%
              </button>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">Lekt./Wo</label>
              <button
                onClick={() => setActivePicker("lessons")}
                className="flex w-full items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-[15px] font-medium"
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
                {Number.isInteger(lessons) ? lessons : `${Math.floor(lessons)} ${["", "¼", "½", "¾"][Math.round((lessons % 1) * 4)]}`}
              </button>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">Min/Lekt.</label>
              <button
                onClick={() => setActivePicker("minutes")}
                className="flex w-full items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-[15px] font-medium"
              >
                <Timer className="h-3.5 w-3.5 shrink-0 text-primary" />
                {minutesPerLesson}
              </button>
            </div>
          </div>

          {isDirty && (
            <button
              onClick={handleSave}
              className="w-full rounded-2xl bg-primary py-3 text-[15px] font-medium text-white shadow-sm"
            >
              Speichern
            </button>
          )}
        </section>

        {/* Time Slots */}
        <TimeSlotsEditor
          timeSlots={semester.time_slots || []}
          onSave={async (slots) => {
            await updateSemester(semester.id, { time_slots: slots });
            showToast("Zeitraster gespeichert", "success");
          }}
        />

        {/* Stundenplan */}
        <section>
          <p className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            Stundenplan
          </p>
          <div className="overflow-x-auto">
            <div className="rounded-2xl bg-card p-3 shadow-sm">
              <table className="w-full min-w-[340px] border-collapse table-fixed">
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
                              <FilledCell entry={entry} allSubjects={allSubjects} onDelete={() => deleteEntry(entry.id)} />
                            ) : (
                              <button
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setEditOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, bottom: rect.bottom });
                                  setEditingCell(cellKey);
                                }}
                                className={`flex min-h-[44px] w-full items-center justify-center rounded-xl transition-colors ${
                                  isEditing ? "border-2 border-primary bg-primary/5" : "bg-background/60 text-border/60 hover:bg-background hover:text-muted-foreground"
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
        </section>

        {/* Delete */}
        {deletingConfirm ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4 space-y-3">
            <p className="text-[13px] text-danger font-medium">
              Stundenplan-Einträge werden ebenfalls gelöscht. Bist du sicher?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingConfirm(false)} className="flex-1 rounded-2xl border border-border py-2.5 text-[13px] text-muted-foreground">
                Abbrechen
              </button>
              <button onClick={handleDelete} className="flex-1 rounded-2xl bg-danger py-2.5 text-[13px] font-medium text-white">
                Semester löschen
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setDeletingConfirm(true)}
            className="flex w-full items-center justify-center gap-1.5 py-3 text-[13px] text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Semester löschen
          </button>
        )}

        <div className="h-20" />
      </div>

      {/* Timetable cell editor */}
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
              try { await saveEntry(day, slot, subject); } catch { showToast("Fehler beim Speichern", "error"); }
              setEditingCell(null);
              setEditOrigin(null);
            }}
            onSavePause={async () => {
              try { await savePause(day, slot); } catch { showToast("Fehler beim Speichern", "error"); }
              setEditingCell(null);
              setEditOrigin(null);
            }}
            onCancel={() => { setEditingCell(null); setEditOrigin(null); }}
          />
        );
      })()}

      {/* Pickers */}
      {activePicker === "startDate" && (
        <WheelDatePicker value={startDate} onConfirm={(v) => { setStartDate(v); setActivePicker(null); }} onCancel={() => setActivePicker(null)} />
      )}
      {activePicker === "endDate" && (
        <WheelDatePicker value={endDate} onConfirm={(v) => { setEndDate(v); setActivePicker(null); }} onCancel={() => setActivePicker(null)} />
      )}
      {activePicker === "pensum" && (
        <WheelNumberPicker value={pensum} min={1} max={100} step={1} suffix="%" title="Pensum" onConfirm={(v) => { setPensum(v); setActivePicker(null); }} onCancel={() => setActivePicker(null)} />
      )}
      {activePicker === "lessons" && (
        <WheelNumberPicker value={lessons} min={1} max={40} fractions title="Lektionen pro Woche" onConfirm={(v) => { setLessons(v); setActivePicker(null); }} onCancel={() => setActivePicker(null)} />
      )}
      {activePicker === "minutes" && (
        <WheelNumberPicker value={minutesPerLesson} min={30} max={90} step={5} suffix="min" title="Minuten pro Lektion" onConfirm={(v) => { setMinutesPerLesson(v); setActivePicker(null); }} onCancel={() => setActivePicker(null)} />
      )}
    </>
  );
}

// --- Sub-components (FilledCell, EditableCell, TimeSlotsEditor) ---

function FilledCell({ entry, allSubjects, onDelete }: { entry: TimetableEntry; allSubjects: string[]; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <div className="flex min-h-[44px] items-center justify-center gap-1 rounded-xl bg-danger/5 p-1">
        <button onClick={() => { onDelete(); setConfirm(false); }} className="rounded-lg bg-danger px-2 py-1 text-[10px] font-semibold text-white">Ja</button>
        <button onClick={() => setConfirm(false)} className="rounded-lg bg-card px-2 py-1 text-[10px] shadow-sm">Nein</button>
      </div>
    );
  }
  return (
    <button onClick={() => setConfirm(true)} className={`flex min-h-[44px] w-full items-center justify-center rounded-xl p-1 ${entry.is_pause ? "border border-dashed border-border/50 bg-muted/30" : getSubjectColor(entry.subject, allSubjects)}`}>
      {entry.is_pause ? <Coffee className="h-3 w-3 text-muted-foreground" /> : <span className="text-[11px] font-semibold text-center leading-tight line-clamp-2 overflow-hidden hyphens-auto" lang="de">{entry.subject}</span>}
    </button>
  );
}

function EditableCell({ allSubjects, origin, dayLabel, timeLabel, onSave, onSavePause, onCancel }: {
  allSubjects: string[]; origin: { x: number; y: number; bottom: number }; dayLabel: string; timeLabel: string;
  onSave: (subject: string) => void; onSavePause: () => void; onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  useEffect(() => { if (visible) setTimeout(() => inputRef.current?.focus(), 100); }, [visible]);
  function animateOut(cb: () => void) { setVisible(false); setTimeout(cb, 250); }

  const popupWidth = 260;
  const spaceBelow = window.innerHeight - origin.bottom - 16;
  const spaceAbove = origin.y - (origin.bottom - origin.y) / 2 - 16;
  const openAbove = spaceBelow < 280 && spaceAbove > spaceBelow;
  const popupTop = openAbove ? undefined : origin.bottom + 8;
  const popupBottom = openAbove ? window.innerHeight - origin.y + (origin.bottom - origin.y) / 2 + 8 : undefined;
  const clampedLeft = Math.max(12, Math.min(origin.x - popupWidth / 2, window.innerWidth - popupWidth - 12));
  const pinLeft = origin.x - clampedLeft;

  return (
    <div className="fixed inset-0 z-50" style={{ backgroundColor: visible ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0)", transition: "background-color 250ms ease" }} onClick={(e) => { if (e.target === e.currentTarget) animateOut(onCancel); }}>
      <div className="absolute rounded-2xl bg-card shadow-xl space-y-3" style={{ top: popupTop, bottom: popupBottom, left: clampedLeft, width: popupWidth, padding: "16px", transformOrigin: `${pinLeft}px ${openAbove ? "calc(100% + 8px)" : "-8px"}`, transform: visible ? "scale(1)" : "scale(0.3)", opacity: visible ? 1 : 0, transition: "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease" }}>
        <p className="text-[13px] font-semibold text-muted-foreground">{dayLabel}, {timeLabel}</p>
        <input ref={inputRef} type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Fach eingeben…" maxLength={100}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[14px] outline-none focus:border-primary"
          onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) animateOut(() => onSave(value)); if (e.key === "Escape") animateOut(onCancel); }} />
        {allSubjects.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allSubjects.map((s) => (
              <button key={s} onMouseDown={(e) => e.preventDefault()} onClick={() => animateOut(() => onSave(s))} className={`rounded-lg px-2.5 py-1 text-[12px] font-medium ${getSubjectColor(s, allSubjects)}`}>{s}</button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 pt-1">
          {value.trim() && (
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => animateOut(() => onSave(value))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <Check className="h-5 w-5" strokeWidth={2.5} />
            </button>
          )}
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => animateOut(onSavePause)} className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-[13px] text-muted-foreground">
            <Coffee className="h-3.5 w-3.5" /> Pause
          </button>
        </div>
      </div>
    </div>
  );
}

function TimeSlotsEditor({ timeSlots, onSave }: { timeSlots: TimeSlot[]; onSave: (slots: TimeSlot[]) => Promise<void> }) {
  const [slots, setSlots] = useState<TimeSlot[]>(timeSlots);
  const [saving, setSaving] = useState(false);
  const [editingPicker, setEditingPicker] = useState<{ index: number; field: "start" | "end" } | null>(null);
  const isDirty = JSON.stringify(slots) !== JSON.stringify(timeSlots);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0); // px offset of dragged item from its natural position
  const [hoverTarget, setHoverTarget] = useState<number | null>(null); // where it would drop
  const containerRef = useRef<HTMLDivElement>(null);
  const rowHeight = useRef(0);
  const dragStartY = useRef(0);
  const dragOriginIndex = useRef(0);

  function getRowHeight() {
    if (rowHeight.current > 0) return rowHeight.current;
    const container = containerRef.current;
    if (!container) return 52;
    const rows = container.querySelectorAll("[data-slot-row]");
    if (rows.length < 2) return 52;
    const h = (rows[1] as HTMLElement).offsetTop - (rows[0] as HTMLElement).offsetTop;
    rowHeight.current = h;
    return h;
  }

  function startDrag(index: number, clientY: number) {
    rowHeight.current = 0; // recalculate
    setDragIndex(index);
    setDragOffset(0);
    setHoverTarget(index);
    dragStartY.current = clientY;
    dragOriginIndex.current = index;
  }

  function moveDrag(clientY: number) {
    if (dragIndex === null) return;
    const dy = clientY - dragStartY.current;
    setDragOffset(dy);
    const rh = getRowHeight();
    const steps = Math.round(dy / rh);
    const target = Math.max(0, Math.min(slots.length - 1, dragOriginIndex.current + steps));
    setHoverTarget(target);
  }

  function endDrag() {
    if (dragIndex === null || hoverTarget === null) return;
    if (dragOriginIndex.current !== hoverTarget) {
      setSlots(prev => {
        const n = [...prev];
        const [moved] = n.splice(dragOriginIndex.current, 1);
        n.splice(hoverTarget, 0, moved);
        return n;
      });
    }
    setDragIndex(null);
    setDragOffset(0);
    setHoverTarget(null);
  }

  // Block page scroll while dragging
  useEffect(() => {
    if (dragIndex === null) return;
    function preventScroll(e: TouchEvent) { e.preventDefault(); }
    document.addEventListener("touchmove", preventScroll, { passive: false });
    return () => document.removeEventListener("touchmove", preventScroll);
  }, [dragIndex]);

  // Touch handlers
  function handleTouchStart(index: number, e: React.TouchEvent) {
    e.preventDefault();
    startDrag(index, e.touches[0].clientY);
  }
  function handleTouchMove(e: React.TouchEvent) {
    moveDrag(e.touches[0].clientY);
  }
  function handleTouchEnd() { endDrag(); }

  // Mouse handlers
  function handleMouseDown(index: number, e: React.MouseEvent) {
    e.preventDefault();
    startDrag(index, e.clientY);
    function onMove(ev: MouseEvent) { moveDrag(ev.clientY); }
    function onUp() { endDrag(); window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // Calculate transform for each row
  function getRowStyle(index: number): React.CSSProperties {
    if (dragIndex === null || hoverTarget === null) return {};
    const rh = getRowHeight();
    const from = dragOriginIndex.current;
    const to = hoverTarget;

    if (index === from) {
      // The dragged item follows the cursor
      return {
        transform: `translateY(${dragOffset}px) scale(1.02)`,
        zIndex: 50,
        position: "relative",
      };
    }

    // Other items shift to make room
    if (from < to) {
      // Dragging down: items between from+1..to shift up
      if (index > from && index <= to) {
        return { transform: `translateY(${-rh}px)`, transition: "transform 200ms cubic-bezier(0.2, 0, 0, 1)" };
      }
    } else if (from > to) {
      // Dragging up: items between to..from-1 shift down
      if (index >= to && index < from) {
        return { transform: `translateY(${rh}px)`, transition: "transform 200ms cubic-bezier(0.2, 0, 0, 1)" };
      }
    }

    return { transition: "transform 200ms cubic-bezier(0.2, 0, 0, 1)" };
  }

  async function handleSave() {
    setSaving(true);
    const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
    setSlots(sorted);
    await onSave(sorted);
    setSaving(false);
  }

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-bold flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Zeitraster</h3>
        {isDirty && <button onClick={handleSave} disabled={saving} className="text-[13px] font-semibold text-white bg-primary px-4 py-1.5 rounded-full disabled:opacity-50">{saving ? "..." : "Speichern"}</button>}
      </div>
      <div ref={containerRef} className="space-y-2">
        {slots.map((slot, i) => (
          <div
            key={`${slot.start}-${slot.end}-${i}`}
            data-slot-row
            className={`flex items-center gap-1.5 rounded-xl ${dragIndex === i ? "bg-card" : ""}`}
            style={getRowStyle(i)}
          >
            <div
              className={`shrink-0 touch-none p-1.5 outline-none select-none ${dragIndex === i ? "cursor-grabbing text-primary" : "cursor-grab text-muted-foreground/40"}`}
              style={{ WebkitTapHighlightColor: "transparent", WebkitUserSelect: "none" }}
              onTouchStart={(e) => handleTouchStart(i, e)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={(e) => handleMouseDown(i, e)}
            >
              <GripVertical className="h-4 w-4" />
            </div>
            <button onClick={() => dragIndex === null && setEditingPicker({ index: i, field: "start" })} className="flex-1 rounded-xl border border-border px-3 py-2.5 text-left text-[15px] font-medium tabular-nums bg-background">{slot.start}</button>
            <span className="text-muted-foreground text-sm">–</span>
            <button onClick={() => dragIndex === null && setEditingPicker({ index: i, field: "end" })} className="flex-1 rounded-xl border border-border px-3 py-2.5 text-left text-[15px] font-medium tabular-nums bg-background">{slot.end}</button>
            <button onClick={() => setSlots(slots.filter((_, j) => j !== i))} className="shrink-0 p-2 text-muted-foreground hover:text-danger rounded-xl"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <button onClick={() => setSlots([...slots, { start: "12:00", end: "12:45", label: "12:00" }])} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
          <Plus className="h-4 w-4" /> Neuer Zeitslot
        </button>
      </div>
      {editingPicker && (
        <WheelTimePicker value={slots[editingPicker.index][editingPicker.field]} onConfirm={(val) => {
          const newSlots = [...slots]; newSlots[editingPicker.index] = { ...newSlots[editingPicker.index], [editingPicker.field]: val };
          if (editingPicker.field === "start") newSlots[editingPicker.index].label = val;
          setSlots(newSlots); setEditingPicker(null);
        }} onCancel={() => setEditingPicker(null)} />
      )}
    </div>
  );
}
