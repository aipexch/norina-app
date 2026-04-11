-- Change timetable_entries FK from CASCADE to RESTRICT to prevent silent data loss
ALTER TABLE timetable_entries DROP CONSTRAINT timetable_entries_semester_id_fkey;
ALTER TABLE timetable_entries ADD CONSTRAINT timetable_entries_semester_id_fkey
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE RESTRICT;
