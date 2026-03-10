"use client";

import { useState, useEffect, useCallback } from "react";
import type { TimetableEntry, DayOfWeek } from "@/types";

const STORAGE_KEY = "norina_timetable";

function load(): TimetableEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(data: TimetableEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useTimetable(semesterId: string | null) {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(() => {
    if (!semesterId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    const all = load();
    const filtered = all
      .filter((e) => e.semester_id === semesterId)
      .sort(
        (a, b) =>
          a.day_of_week - b.day_of_week ||
          a.start_time.localeCompare(b.start_time)
      );
    setEntries(filtered);
    setLoading(false);
  }, [semesterId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function addEntry(
    entry: Omit<TimetableEntry, "id" | "user_id" | "created_at" | "updated_at">
  ) {
    const now = new Date().toISOString();
    const newEntry: TimetableEntry = {
      ...entry,
      id: crypto.randomUUID(),
      user_id: "local",
      created_at: now,
      updated_at: now,
    };
    save([...load(), newEntry]);
    fetchEntries();
    return newEntry;
  }

  async function updateEntry(id: string, updates: Partial<TimetableEntry>) {
    save(
      load().map((e) =>
        e.id === id ? { ...e, ...updates, updated_at: new Date().toISOString() } : e
      )
    );
    fetchEntries();
  }

  async function deleteEntry(id: string) {
    save(load().filter((e) => e.id !== id));
    fetchEntries();
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
