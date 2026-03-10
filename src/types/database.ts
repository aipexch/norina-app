export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      semesters: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          start_date: string;
          end_date: string;
          pensum_percent: number;
          lessons_per_week: number;
          minutes_per_lesson: number;
          is_active: boolean;
          time_slots: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          start_date: string;
          end_date: string;
          pensum_percent?: number;
          lessons_per_week: number;
          minutes_per_lesson?: number;
          is_active?: boolean;
          time_slots?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          start_date?: string;
          end_date?: string;
          pensum_percent?: number;
          lessons_per_week?: number;
          minutes_per_lesson?: number;
          is_active?: boolean;
          time_slots?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      timetable_entries: {
        Row: {
          id: string;
          user_id: string;
          semester_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          subject: string;
          is_pause: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          semester_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          subject: string;
          is_pause?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          semester_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          subject?: string;
          is_pause?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      time_records: {
        Row: {
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
        };
        Insert: {
          id?: string;
          user_id: string;
          semester_id?: string | null;
          date: string;
          clock_in: string;
          clock_out?: string | null;
          is_manual?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          semester_id?: string | null;
          date?: string;
          clock_in?: string;
          clock_out?: string | null;
          is_manual?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
