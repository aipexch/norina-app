-- Ensure RLS is enabled on all tables (was found disabled in production)
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;

-- Re-create policies if they don't exist (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'semesters' AND policyname = 'Users manage own semesters') THEN
    CREATE POLICY "Users manage own semesters" ON semesters FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timetable_entries' AND policyname = 'Users manage own timetable') THEN
    CREATE POLICY "Users manage own timetable" ON timetable_entries FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'time_records' AND policyname = 'Users manage own time records') THEN
    CREATE POLICY "Users manage own time records" ON time_records FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
