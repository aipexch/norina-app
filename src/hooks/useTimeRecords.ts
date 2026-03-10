"use client";

import { useState, useEffect, useCallback } from "react";
import type { TimeRecord } from "@/types";

const STORAGE_KEY = "norina_records";

function load(): TimeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(data: TimeRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useTimeRecords(semesterId: string | null) {
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(() => {
    const all = load();
    let filtered = semesterId ? all.filter((r) => r.semester_id === semesterId) : all;
    filtered = [...filtered].sort((a, b) => {
      const d = b.date.localeCompare(a.date);
      return d !== 0 ? d : b.clock_in.localeCompare(a.clock_in);
    });
    setRecords(filtered);
    setLoading(false);
  }, [semesterId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  async function addManualRecord(record: {
    date: string;
    clock_in: string;
    clock_out: string;
    notes?: string;
  }) {
    const now = new Date().toISOString();
    const newRecord: TimeRecord = {
      id: crypto.randomUUID(),
      user_id: "local",
      semester_id: semesterId,
      date: record.date,
      clock_in: record.clock_in,
      clock_out: record.clock_out,
      break_minutes: 0,
      is_manual: true,
      notes: record.notes ?? null,
      created_at: now,
      updated_at: now,
    };
    save([...load(), newRecord]);
    fetchRecords();
    return newRecord;
  }

  async function updateRecord(id: string, updates: Partial<TimeRecord>) {
    save(
      load().map((r) =>
        r.id === id
          ? { ...r, ...updates, is_manual: true, updated_at: new Date().toISOString() }
          : r
      )
    );
    fetchRecords();
  }

  async function deleteRecord(id: string) {
    save(load().filter((r) => r.id !== id));
    fetchRecords();
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
