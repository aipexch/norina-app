-- ============================================
-- NORINA APP — Datenbank-Schema
-- ============================================

-- SEMESTER / SCHULPERIODEN
CREATE TABLE semesters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pensum_percent INTEGER NOT NULL DEFAULT 100,
  lessons_per_week NUMERIC(4,1) NOT NULL,
  minutes_per_lesson INTEGER NOT NULL DEFAULT 45,
  is_active BOOLEAN NOT NULL DEFAULT false,
  time_slots JSONB NOT NULL DEFAULT '[
    { "start": "07:30", "end": "08:15", "label": "07:30" },
    { "start": "08:20", "end": "09:05", "label": "08:20" },
    { "start": "09:20", "end": "10:05", "label": "09:20" },
    { "start": "10:10", "end": "10:55", "label": "10:10" },
    { "start": "11:00", "end": "11:45", "label": "11:00" },
    { "start": "13:15", "end": "14:00", "label": "13:15" },
    { "start": "14:05", "end": "14:50", "label": "14:05" },
    { "start": "15:05", "end": "15:50", "label": "15:05" },
    { "start": "15:55", "end": "16:40", "label": "15:55" }
  ]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_date_range CHECK (end_date > start_date),
  CONSTRAINT valid_pensum CHECK (pensum_percent > 0 AND pensum_percent <= 100)
);

CREATE INDEX idx_semesters_user ON semesters(user_id);
CREATE INDEX idx_semesters_active ON semesters(user_id, is_active) WHERE is_active = true;

-- STUNDENPLAN-EINTRÄGE
CREATE TABLE timetable_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject TEXT NOT NULL,
  is_pause BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_day CHECK (day_of_week BETWEEN 1 AND 5)
);

CREATE INDEX idx_timetable_user_semester ON timetable_entries(user_id, semester_id);
CREATE INDEX idx_timetable_day ON timetable_entries(semester_id, day_of_week);

-- ZEITERFASSUNG / TIME RECORDS
CREATE TABLE time_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_records_user_date ON time_records(user_id, date);
CREATE INDEX idx_records_running ON time_records(user_id) WHERE clock_out IS NULL;
CREATE INDEX idx_records_semester ON time_records(user_id, semester_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own semesters"
  ON semesters FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own timetable"
  ON timetable_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own time records"
  ON time_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
