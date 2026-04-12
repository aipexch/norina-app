"use client";

import { useState, useRef, useEffect } from "react";
import { useSemesters } from "@/hooks/useSemester";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import TopBar from "@/components/layout/TopBar";
import { Plus, Check, Download, Upload, X, Calendar, Percent, BookOpen, Timer, LogOut, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatDateShort } from "@/lib/date-utils";
import WheelDatePicker from "@/components/WheelDatePicker";
import WheelNumberPicker from "@/components/WheelNumberPicker";
import type { TimeSlot } from "@/types";
import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;

const backupSchema = z.object({
  norina_semesters: z.array(z.object({
    id: z.string(),
    name: z.string().max(200),
    start_date: z.string().regex(dateRegex, "Invalid date format"),
    end_date: z.string().regex(dateRegex, "Invalid date format"),
    pensum_percent: z.number().int().min(1).max(100).optional().default(100),
    lessons_per_week: z.number(),
    minutes_per_lesson: z.number().optional().default(45),
    is_active: z.boolean().optional(),
    time_slots: z.array(z.object({
      start: z.string(),
      end: z.string(),
      label: z.string(),
    })).optional().default([]),
  })).optional().default([]),
  norina_timetable: z.array(z.object({
    semester_id: z.string(),
    day_of_week: z.number().int().min(1).max(5),
    start_time: z.string().regex(timeRegex, "Invalid time format"),
    end_time: z.string().regex(timeRegex, "Invalid time format"),
    subject: z.string().max(200),
    is_pause: z.boolean().optional().default(false),
    notes: z.string().nullable().optional().default(null),
  })).optional().default([]),
  norina_records: z.array(z.object({
    semester_id: z.string().nullable().optional().default(null),
    date: z.string().regex(dateRegex, "Invalid date format"),
    clock_in: z.string().regex(timeRegex, "Invalid time format"),
    clock_out: z.string().regex(timeRegex, "Invalid time format").nullable().optional().default(null),
    break_minutes: z.number().optional().default(0),
    is_manual: z.boolean().optional().default(false),
    notes: z.string().nullable().optional().default(null),
  })).optional().default([]),
});

const STORAGE_KEYS = ["norina_semesters", "norina_timetable", "norina_records"] as const;

export default function EinstellungenPage() {
  const { user } = useAuth();
  const { semesters, activeSemester, createSemester, updateSemester, deleteSemester, refetch } = useSemesters();
  const [showForm, setShowForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    if (user) {
      const supabase = createClient();
      const [semRes, ttRes, trRes] = await Promise.all([
        supabase.from("semesters").select("*"),
        supabase.from("timetable_entries").select("*"),
        supabase.from("time_records").select("*"),
      ]);
      if (semRes.error) throw new Error(`Semester: ${semRes.error.message}`);
      if (ttRes.error) throw new Error(`Stundenplan: ${ttRes.error.message}`);
      if (trRes.error) throw new Error(`Zeiterfassung: ${trRes.error.message}`);
      const data = {
        norina_semesters: semRes.data ?? [],
        norina_timetable: ttRes.data ?? [],
        norina_records: trRes.data ?? [],
      };
      downloadJson(data);
    } else {
      const data: Record<string, unknown> = {};
      for (const key of STORAGE_KEYS) {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
        }
      }
      downloadJson(data);
    }
  }

  function downloadJson(data: Record<string, unknown>) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timely-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        setImporting(true);
        const raw = JSON.parse(ev.target?.result as string);
        const parsed = backupSchema.safeParse(raw);
        if (!parsed.success) {
          setImporting(false);
          alert(`Ungültiges Backup-Format:\n${parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).slice(0, 5).join("\n")}`);
          return;
        }
        const data = parsed.data;

        if (user) {
          const supabase = createClient();
          const idMap = new Map<string, string>();
          const errors: string[] = [];
          let semOk = 0, ttOk = 0, recOk = 0;

          // 1. Import semesters
          if (data.norina_semesters?.length) {
            for (const sem of data.norina_semesters) {
              const oldId = sem.id;
              const { data: inserted, error } = await supabase
                .from("semesters")
                .insert({
                  name: sem.name,
                  start_date: sem.start_date,
                  end_date: sem.end_date,
                  pensum_percent: sem.pensum_percent ?? 100,
                  lessons_per_week: sem.lessons_per_week,
                  minutes_per_lesson: sem.minutes_per_lesson ?? 45,
                  is_active: false,
                  time_slots: sem.time_slots ?? [],
                  user_id: user.id,
                })
                .select("id")
                .single();
              if (error) {
                errors.push(`Semester "${sem.name}": ${error.message}`);
              } else if (inserted) {
                idMap.set(oldId, inserted.id);
                semOk++;
              }
            }
          }

          // 2. Import timetable entries (batched)
          if (data.norina_timetable.length) {
            const ttRows = data.norina_timetable
              .filter((entry) => idMap.has(entry.semester_id))
              .map((entry) => ({
                semester_id: idMap.get(entry.semester_id)!,
                day_of_week: entry.day_of_week,
                start_time: entry.start_time,
                end_time: entry.end_time,
                subject: entry.subject,
                is_pause: entry.is_pause,
                notes: entry.notes,
                user_id: user.id,
              }));
            if (ttRows.length) {
              const { error, data: inserted } = await supabase
                .from("timetable_entries")
                .insert(ttRows)
                .select("id");
              if (error) {
                errors.push(`Stundenplan: ${error.message}`);
              } else {
                ttOk = inserted?.length ?? 0;
              }
            }
          }

          // 3. Import time records (batched)
          if (data.norina_records.length) {
            const recRows = data.norina_records.map((record) => ({
              semester_id: record.semester_id ? (idMap.get(record.semester_id) ?? null) : null,
              date: record.date,
              clock_in: record.clock_in,
              clock_out: record.clock_out,
              break_minutes: record.break_minutes,
              is_manual: record.is_manual,
              notes: record.notes,
              user_id: user.id,
            }));
            if (recRows.length) {
              const { error, data: inserted } = await supabase
                .from("time_records")
                .insert(recRows)
                .select("id");
              if (error) {
                errors.push(`Zeiterfassung: ${error.message}`);
              } else {
                recOk = inserted?.length ?? 0;
              }
            }
          }

          setImporting(false);

          if (errors.length > 0) {
            alert(`Import: ${semOk} Semester, ${ttOk} Stundenplan, ${recOk} Zeiten OK.\n\nFehler:\n${errors.slice(0, 5).join("\n")}`);
          }

          refetch();
          window.location.reload();
        } else {
          for (const key of STORAGE_KEYS) {
            if (key in data) {
              localStorage.setItem(key, JSON.stringify(data[key]));
            }
          }
          window.location.reload();
        }
      } catch (err) {
        setImporting(false);
        alert(`Import fehlgeschlagen: ${err instanceof Error ? err.message : "Unbekannter Fehler"}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <>
      <TopBar title="Einstellungen" />
      <div className="px-5 py-6 space-y-6">
        {/* Semester Section */}
        <section>
          <div className="mb-3 flex items-center justify-between px-1">
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

          <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
            {semesters.map((semester, i) => (
              <Link
                key={semester.id}
                href={`/einstellungen/semester/${semester.id}`}
                className={`flex items-center gap-3 px-4 py-3.5 active:bg-muted/30 ${
                  i > 0 ? "border-t border-border/20" : ""
                }`}
              >
                <div className="shrink-0">
                  {semester.is_active ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-border" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold truncate">{semester.name}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {formatDateShort(semester.start_date)} – {formatDateShort(semester.end_date)}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {semester.pensum_percent}% · {semester.lessons_per_week} Lekt./Wo · {semester.minutes_per_lesson}min
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
              </Link>
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

        {/* Daten Section */}
        <section>
          <p className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            Daten
          </p>
          <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
            <button
              onClick={handleExport}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-[15px] font-medium active:bg-muted/50 transition-colors"
            >
              <Download className="h-5 w-5 text-primary" />
              <span>Backup exportieren</span>
            </button>
            <div className="border-t border-border/20">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-[15px] font-medium active:bg-muted/50 transition-colors"
              >
                <Upload className="h-5 w-5 text-primary" />
                <span>{importing ? "Importiert..." : "Backup importieren"}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </div>
          </div>
        </section>

        {/* Abmelden */}
        {user && (
          <section>
            <button
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                window.location.href = "/anmelden";
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-danger/20 bg-danger/5 py-3.5 text-[15px] font-medium text-danger transition-colors active:bg-danger/10"
            >
              <LogOut className="h-4 w-4" />
              Abmelden
            </button>
          </section>
        )}

        {/* Version */}
        <p className="text-center text-[12px] text-muted-foreground/60">
          Timely v1.13
        </p>

      </div>
    </>
  );
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "Datum wählen";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "short", year: "numeric" });
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
  const [activePicker, setActivePicker] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  async function handleSubmit() {
    if (!name.trim() || !startDate || !endDate) return;
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
        { start: "13:15", end: "14:00", label: "13:15" },
        { start: "14:05", end: "14:50", label: "14:05" },
        { start: "15:05", end: "15:50", label: "15:05" },
        { start: "15:55", end: "16:40", label: "15:55" },
      ],
    });
    setSaving(false);
  }

  return (
    <>
      <div className="mb-4 overflow-hidden rounded-2xl bg-card p-5 shadow-sm">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[17px] font-bold">Neues Semester</h2>
            <button
              onClick={onCancel}
              className="rounded-full bg-muted p-1.5"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
              Bezeichnung
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. FS 2026"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-[15px] outline-none focus:border-primary"
            />
          </div>

          {/* Date pickers */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                Start
              </label>
              <button
                onClick={() => setActivePicker("startDate")}
                className="flex w-full items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-left text-[15px] active:bg-muted/50"
              >
                <Calendar className="h-4 w-4 shrink-0 text-primary" />
                <span className={startDate ? "font-medium" : "text-muted-foreground"}>
                  {formatDateDisplay(startDate)}
                </span>
              </button>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                Ende
              </label>
              <button
                onClick={() => setActivePicker("endDate")}
                className="flex w-full items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-left text-[15px] active:bg-muted/50"
              >
                <Calendar className="h-4 w-4 shrink-0 text-primary" />
                <span className={endDate ? "font-medium" : "text-muted-foreground"}>
                  {formatDateDisplay(endDate)}
                </span>
              </button>
            </div>
          </div>

          {/* Number pickers */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                Pensum
              </label>
              <button
                onClick={() => setActivePicker("pensum")}
                className="flex w-full items-center gap-2 rounded-2xl border border-border bg-background px-3 py-3 text-[15px] font-medium active:bg-muted/50"
              >
                <Percent className="h-3.5 w-3.5 shrink-0 text-primary" />
                {pensum}%
              </button>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                Lekt./Wo
              </label>
              <button
                onClick={() => setActivePicker("lessons")}
                className="flex w-full items-center gap-2 rounded-2xl border border-border bg-background px-3 py-3 text-[15px] font-medium active:bg-muted/50"
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
                {Number.isInteger(lessons) ? lessons : `${Math.floor(lessons)} ${["", "¼", "½", "¾"][Math.round((lessons % 1) * 4)]}`}
              </button>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                Min/Lekt.
              </label>
              <button
                onClick={() => setActivePicker("minutes")}
                className="flex w-full items-center gap-2 rounded-2xl border border-border bg-background px-3 py-3 text-[15px] font-medium active:bg-muted/50"
              >
                <Timer className="h-3.5 w-3.5 shrink-0 text-primary" />
                {minutesPerLesson}
              </button>
            </div>
          </div>

          {/* Info text */}
          <p className="text-[12px] text-muted-foreground">
            Das neue Semester wird automatisch aktiviert. Der Stundenplan des bisherigen Semesters bleibt erhalten.
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-2xl border border-border py-3 text-[15px] font-medium text-muted-foreground"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !name.trim() || !startDate || !endDate}
              className="flex-1 rounded-2xl bg-primary py-3 text-[15px] font-medium text-white shadow-sm disabled:opacity-40"
            >
              {saving ? "..." : "Erstellen"}
            </button>
          </div>
      </div>

      {/* Wheel pickers */}
      {activePicker === "startDate" && (
        <WheelDatePicker
          value={startDate}
          onConfirm={(v) => { setStartDate(v); setActivePicker(null); }}
          onCancel={() => setActivePicker(null)}
        />
      )}
      {activePicker === "endDate" && (
        <WheelDatePicker
          value={endDate}
          onConfirm={(v) => { setEndDate(v); setActivePicker(null); }}
          onCancel={() => setActivePicker(null)}
        />
      )}
      {activePicker === "pensum" && (
        <WheelNumberPicker
          value={pensum}
          min={10}
          max={100}
          step={5}
          suffix="%"
          title="Pensum"
          onConfirm={(v) => { setPensum(v); setActivePicker(null); }}
          onCancel={() => setActivePicker(null)}
        />
      )}
      {activePicker === "lessons" && (
        <WheelNumberPicker
          value={lessons}
          min={1}
          max={40}
          fractions
          title="Lektionen pro Woche"
          onConfirm={(v) => { setLessons(v); setActivePicker(null); }}
          onCancel={() => setActivePicker(null)}
        />
      )}
      {activePicker === "minutes" && (
        <WheelNumberPicker
          value={minutesPerLesson}
          min={30}
          max={90}
          step={5}
          suffix="min"
          title="Minuten pro Lektion"
          onConfirm={(v) => { setMinutesPerLesson(v); setActivePicker(null); }}
          onCancel={() => setActivePicker(null)}
        />
      )}
    </>
  );
}

