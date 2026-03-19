-- Add break_minutes column to time_records
ALTER TABLE time_records ADD COLUMN IF NOT EXISTS break_minutes INTEGER DEFAULT 0;
