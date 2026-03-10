"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth-helpers";
import type { TimeRecord } from "@/types";

export function useTimeRecords(semesterId: string | null) {
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchRecords = useCallback(async () => {
    const userId = await getUserId();

    let query = supabase
      .from("time_records")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("clock_in", { ascending: false });

    if (semesterId) {
      query = query.eq("semester_id", semesterId);
    }

    const { data } = await query;

    if (data) {
      setRecords(data as TimeRecord[]);
    }
    setLoading(false);
  }, [supabase, semesterId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  async function addManualRecord(record: {
    date: string;
    clock_in: string;
    clock_out: string;
    notes?: string;
  }) {
    const userId = await getUserId();

    const { data, error } = await supabase
      .from("time_records")
      .insert({
        user_id: userId,
        semester_id: semesterId,
        date: record.date,
        clock_in: record.clock_in,
        clock_out: record.clock_out,
        is_manual: true,
        notes: record.notes ?? null,
      })
      .select()
      .single();

    if (error) return null;
    await fetchRecords();
    return data as TimeRecord;
  }

  async function updateRecord(id: string, updates: Partial<TimeRecord>) {
    await supabase
      .from("time_records")
      .update({ ...updates, is_manual: true })
      .eq("id", id);
    await fetchRecords();
  }

  async function deleteRecord(id: string) {
    await supabase.from("time_records").delete().eq("id", id);
    await fetchRecords();
  }

  function getRecordsForDate(date: string): TimeRecord[] {
    return records.filter((r) => r.date === date);
  }

  return {
    records,
    loading,
    addManualRecord,
    updateRecord,
    deleteRecord,
    getRecordsForDate,
    refetch: fetchRecords,
  };
}
