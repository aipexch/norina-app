-- Add time_slots to semesters
ALTER TABLE semesters ADD COLUMN IF NOT EXISTS time_slots JSONB NOT NULL DEFAULT '[
  { "start": "07:30", "end": "08:15", "label": "07:30" },
  { "start": "08:20", "end": "09:05", "label": "08:20" },
  { "start": "09:20", "end": "10:05", "label": "09:20" },
  { "start": "10:10", "end": "10:55", "label": "10:10" },
  { "start": "11:00", "end": "11:45", "label": "11:00" },
  { "start": "13:15", "end": "14:00", "label": "13:15" },
  { "start": "14:05", "end": "14:50", "label": "14:05" },
  { "start": "15:05", "end": "15:50", "label": "15:05" },
  { "start": "15:55", "end": "16:40", "label": "15:55" }
]'::jsonb;

-- Add is_pause and remove room from timetable_entries
ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS is_pause BOOLEAN NOT NULL DEFAULT false;

DO $$ 
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns 
            WHERE table_name='timetable_entries' and column_name='room') 
  THEN
      ALTER TABLE timetable_entries DROP COLUMN room;
  END IF;
END $$;
