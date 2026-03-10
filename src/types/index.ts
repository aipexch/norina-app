// Day of week (ISO: 1=Montag, 5=Freitag)
export type DayOfWeek = 1 | 2 | 3 | 4 | 5;

export const DAY_NAMES: Record<DayOfWeek, string> = {
  1: "Montag",
  2: "Dienstag",
  3: "Mittwoch",
  4: "Donnerstag",
  5: "Freitag",
};

export const DAY_SHORT: Record<DayOfWeek, string> = {
  1: "Mo",
  2: "Di",
  3: "Mi",
  4: "Do",
  5: "Fr",
};

export interface TimeSlot {
  start: string;
  end: string;
  label: string;
}

export interface Semester {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  pensum_percent: number;
  lessons_per_week: number;
  minutes_per_lesson: number;
  is_active: boolean;
  time_slots: TimeSlot[];
  created_at: string;
  updated_at: string;
}

export interface TimetableEntry {
  id: string;
  user_id: string;
  semester_id: string;
  day_of_week: DayOfWeek;
  start_time: string; // "HH:mm"
  end_time: string;
  subject: string;
  is_pause: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeRecord {
  id: string;
  user_id: string;
  semester_id: string | null;
  date: string;
  clock_in: string;
  clock_out: string | null;
  is_manual: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailySummary {
  date: string;
  totalMinutesAtSchool: number;
  scheduledMinutes: number;
  overtimeMinutes: number;
  records: TimeRecord[];
  isRunning: boolean;
}

export interface WeeklySummary {
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  totalOvertimeMinutes: number;
  dailySummaries: DailySummary[];
}

export type TimerState = "idle" | "running";
