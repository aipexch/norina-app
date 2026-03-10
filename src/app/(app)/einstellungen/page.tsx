"use client";

import { useState } from "react";
import { useSemesters } from "@/hooks/useSemester";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import { Plus, Check, Trash2, LogOut, ChevronRight, Clock } from "lucide-react";
import { formatDateShort } from "@/lib/date-utils";
import type { TimeSlot } from "@/types";

export default function EinstellungenPage() {
  const { semesters, activeSemester, createSemester, updateSemester, deleteSemester } = useSemesters();
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/anmelden");
    router.refresh();
  }

  return (
    <>
      <TopBar title="Einstellungen" />
      <div className="px-4 py-6 space-y-6">
        {/* Semester Section */}
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
              Semester
            </h2>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 text-[15px] font-semibold text-primary"
            >
              <Plus className="h-4 w-4" />
              Neu
            </button>
          </div>

          {showForm && (
            <SemesterForm
              onSave={async (data) => {
                await createSemester(data);
                setShowForm(false);
              }}
              onCancel={() => setShowForm(false)}
            />
          )}

          {/* iOS-style grouped list */}
          <div className="overflow-hidden rounded-xl bg-card">
            {semesters.map((semester, i) => (
              <div
                key={semester.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i > 0 ? "border-t border-border/30" : ""
                }`}
              >
                {/* Active indicator */}
                <div className="shrink-0">
                  {semester.is_active ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent">
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    </div>
                  ) : (
                    <button
                      onClick={() => updateSemester(semester.id, { is_active: true })}
                      className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-border"
                    />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium truncate">{semester.name}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {formatDateShort(semester.start_date)} – {formatDateShort(semester.end_date)}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {semester.pensum_percent}% · {semester.lessons_per_week} Lekt./Wo · {semester.minutes_per_lesson}min
                  </p>
                </div>

                {/* Delete */}
                <button
                  onClick={() => {
                    if (confirm("Semester wirklich löschen?")) {
                      deleteSemester(semester.id);
                    }
                  }}
                  className="shrink-0 rounded-full p-1.5 text-muted-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {semesters.length === 0 && !showForm && (
              <div className="px-4 py-8 text-center">
                <p className="text-[15px] text-muted-foreground">Kein Semester vorhanden</p>
                <p className="text-[13px] text-muted-foreground">
                  Erstelle ein Semester um loszulegen
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Active Semester Info */}
        {activeSemester && (
          <section>
            <p className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
              Aktives Semester
            </p>
            <div className="rounded-xl bg-card px-4 py-3 mb-4">
              <p className="text-[15px]">
                <span className="font-medium">{activeSemester.name}</span>
                {" — "}
                <span className="text-muted-foreground">
                  Neue Einträge werden diesem Semester zugeordnet.
                </span>
              </p>
            </div>

            <TimeSlotsEditor
              timeSlots={activeSemester.time_slots || []}
              onSave={async (slots) => {
                await updateSemester(activeSemester.id, { time_slots: slots });
              }}
            />
          </section>
        )}

        {/* Account */}
        <section>
          <p className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            Account
          </p>
          <div className="overflow-hidden rounded-xl bg-card">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center px-4 py-3 text-[17px] text-danger"
            >
              Abmelden
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

function SemesterForm({
  onSave,
  onCancel,
}: {
  onSave: (data: {
    name: string;
    start_date: string;
    end_date: string;
    pensum_percent: number;
    lessons_per_week: number;
    minutes_per_lesson: number;
    is_active: boolean;
    time_slots: TimeSlot[];
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pensum, setPensum] = useState(100);
  const [lessons, setLessons] = useState(28);
  const [minutesPerLesson, setMinutesPerLesson] = useState(45);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      name,
      start_date: startDate,
      end_date: endDate,
      pensum_percent: pensum,
      lessons_per_week: lessons,
      minutes_per_lesson: minutesPerLesson,
      is_active: true,
      time_slots: [
        { start: "07:30", end: "08:15", label: "07:30" },
        { start: "08:20", end: "09:05", label: "08:20" },
        { start: "09:20", end: "10:05", label: "09:20" },
        { start: "10:10", end: "10:55", label: "10:10" },
        { start: "11:00", end: "11:45", label: "11:00" },
        { start: "13:15", end: "14:00", "label": "13:15" },
        { start: "14:05", end: "14:50", "label": "14:05" },
        { start: "15:05", end: "15:50", "label": "15:05" },
        { start: "15:55", end: "16:40", "label": "15:55" },
      ],
    });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 overflow-hidden rounded-xl bg-card">
      <div className="border-b border-border/30 px-4 py-2.5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Bezeichnung (z.B. FS 2026)"
          className="w-full bg-transparent text-[16px] outline-none placeholder:text-muted-foreground/50"
        />
      </div>

      <div className="grid grid-cols-2 border-b border-border/30">
        <div className="border-r border-border/30 px-4 py-2.5">
          <label className="mb-0.5 block text-[11px] uppercase tracking-wider text-muted-foreground">Start</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full bg-transparent text-[15px] outline-none"
          />
        </div>
        <div className="px-4 py-2.5">
          <label className="mb-0.5 block text-[11px] uppercase tracking-wider text-muted-foreground">Ende</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className="w-full bg-transparent text-[15px] outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 border-b border-border/30">
        <div className="border-r border-border/30 px-4 py-2.5">
          <label className="mb-0.5 block text-[11px] uppercase tracking-wider text-muted-foreground">Pensum %</label>
          <input
            type="number"
            value={pensum}
            onChange={(e) => setPensum(Number(e.target.value))}
            min={1}
            max={100}
            required
            className="w-full bg-transparent text-[15px] outline-none"
          />
        </div>
        <div className="border-r border-border/30 px-4 py-2.5">
          <label className="mb-0.5 block text-[11px] uppercase tracking-wider text-muted-foreground">Lekt./Wo</label>
          <input
            type="number"
            value={lessons}
            onChange={(e) => setLessons(Number(e.target.value))}
            min={1}
            step={0.5}
            required
            className="w-full bg-transparent text-[15px] outline-none"
          />
        </div>
        <div className="px-4 py-2.5">
          <label className="mb-0.5 block text-[11px] uppercase tracking-wider text-muted-foreground">Min/Lekt.</label>
          <input
            type="number"
            value={minutesPerLesson}
            onChange={(e) => setMinutesPerLesson(Number(e.target.value))}
            min={30}
            max={90}
            required
            className="w-full bg-transparent text-[15px] outline-none"
          />
        </div>
      </div>

      <div className="flex">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border-r border-border/30 py-3 text-[17px] text-primary"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 text-[17px] font-semibold text-primary disabled:opacity-50"
        >
          {saving ? "..." : "Speichern"}
        </button>
      </div>
    </form>
  );
}

function TimeSlotsEditor({
  timeSlots,
  onSave,
}: {
  timeSlots: TimeSlot[];
  onSave: (slots: TimeSlot[]) => Promise<void>;
}) {
  const [slots, setSlots] = useState<TimeSlot[]>(timeSlots);
  const [saving, setSaving] = useState(false);
  const isDirty = JSON.stringify(slots) !== JSON.stringify(timeSlots);


  function handleAdd() {
    setSlots([...slots, { start: "12:00", end: "12:45", label: "12:00" }]);
  }

  function handleRemove(index: number) {
    setSlots(slots.filter((_, i) => i !== index));
  }

  function handleChange(index: number, field: keyof TimeSlot, value: string) {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    if (field === "start") {
      newSlots[index].label = value;
    }
    setSlots(newSlots);
  }

  async function handleSave() {
    setSaving(true);
    const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
    setSlots(sorted);
    await onSave(sorted);
    setSaving(false);
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Raster für Stundenplan
        </h3>
        {isDirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-semibold text-white bg-primary px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            {saving ? "..." : "Speichern"}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {slots.map((slot, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="time"
              value={slot.start}
              onChange={(e) => handleChange(i, "start", e.target.value)}
              className="flex-1 rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:border-primary bg-background"
            />
            <span className="text-muted-foreground text-sm">–</span>
            <input
              type="time"
              value={slot.end}
              onChange={(e) => handleChange(i, "end", e.target.value)}
              className="flex-1 rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:border-primary bg-background"
            />
            <button
              onClick={() => handleRemove(i)}
              className="shrink-0 p-1.5 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        <button
          onClick={handleAdd}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" />
          Neuer Zeitslot
        </button>
      </div>
    </div>
  );
}
