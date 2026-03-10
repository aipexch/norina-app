"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth-helpers";
import type { TimetableEntry, DayOfWeek } from "@/types";

export function useTimetable(semesterId: string | null) {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchEntries = useCallback(async () => {
    if (!semesterId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("timetable_entries")
      .select("*")
      .eq("semester_id", semesterId)
      .order("day_of_week")
      .order("start_time");

    if (data) {
      setEntries(data as TimetableEntry[]);
    }
    setLoading(false);
  }, [supabase, semesterId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function addEntry(
    entry: Omit<TimetableEntry, "id" | "user_id" | "created_at" | "updated_at">
  ) {
    const userId = await getUserId();

    const { data, error } = await supabase
      .from("timetable_entries")
      .insert({ ...entry, user_id: userId })
      .select()
      .single();

    if (error) return null;
    await fetchEntries();
    return data as TimetableEntry;
  }

  async function updateEntry(id: string, updates: Partial<TimetableEntry>) {
    await supabase.from("timetable_entries").update(updates).eq("id", id);
    await fetchEntries();
  }

  async function deleteEntry(id: string) {
    await supabase.from("timetable_entries").delete().eq("id", id);
    await fetchEntries();
  }

  function getEntriesForDay(day: DayOfWeek): TimetableEntry[] {
    return entries.filter((e) => e.day_of_week === day);
  }

  function getTotalMinutesForDay(day: DayOfWeek): number {
    return getEntriesForDay(day).reduce((sum, entry) => {
      const [startH, startM] = entry.start_time.split(":").map(Number);
      const [endH, endM] = entry.end_time.split(":").map(Number);
      return sum + (endH * 60 + endM) - (startH * 60 + startM);
    }, 0);
  }

  function getTotalMinutesPerWeek(): number {
    return ([1, 2, 3, 4, 5] as DayOfWeek[]).reduce(
      (sum, day) => sum + getTotalMinutesForDay(day),
      0
    );
  }

  return {
    entries,
    loading,
    addEntry,
    updateEntry,
    deleteEntry,
    getEntriesForDay,
    getTotalMinutesForDay,
    getTotalMinutesPerWeek,
    refetch: fetchEntries,
  };
}
