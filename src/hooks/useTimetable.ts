"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import type { TimetableEntry, DayOfWeek } from "@/types";

const STORAGE_KEY = "norina_timetable";

function loadLocal(): TimetableEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveLocal(data: TimetableEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function sortEntries(entries: TimetableEntry[]): TimetableEntry[] {
  return [...entries].sort(
    (a, b) =>
      a.day_of_week - b.day_of_week ||
      a.start_time.localeCompare(b.start_time)
  );
}

export function useTimetable(semesterId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["timetable", semesterId, user?.id ?? "local"] as const;

  const { data: entries = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!semesterId) return [];
      if (user) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("timetable_entries")
          .select("*")
          .eq("semester_id", semesterId)
          .order("day_of_week")
          .order("start_time");
        if (error) throw new Error(error.message);
        return (data ?? []) as TimetableEntry[];
      } else {
        const all = loadLocal();
        return sortEntries(all.filter((e) => e.semester_id === semesterId));
      }
    },
    enabled: user !== undefined && !!semesterId,
  });

  const addMutation = useMutation({
    mutationFn: async (
      entry: Omit<TimetableEntry, "id" | "user_id" | "created_at" | "updated_at">
    ) => {
      if (user) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("timetable_entries")
          .insert({ ...entry, user_id: user.id })
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data as TimetableEntry;
      } else {
        const now = new Date().toISOString();
        const newEntry: TimetableEntry = {
          ...entry,
          id: crypto.randomUUID(),
          user_id: "local",
          created_at: now,
          updated_at: now,
        };
        saveLocal([...loadLocal(), newEntry]);
        return newEntry;
      }
    },
    onMutate: async (entry) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TimetableEntry[]>(queryKey);
      const now = new Date().toISOString();
      const optimistic: TimetableEntry = {
        ...entry,
        id: crypto.randomUUID(),
        user_id: user?.id ?? "local",
        created_at: now,
        updated_at: now,
      };
      queryClient.setQueryData<TimetableEntry[]>(queryKey, (old = []) =>
        sortEntries([...old, optimistic])
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<TimetableEntry>;
    }) => {
      if (user) {
        const supabase = createClient();
        const { error } = await supabase
          .from("timetable_entries")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw new Error(error.message);
      } else {
        saveLocal(
          loadLocal().map((e) =>
            e.id === id
              ? { ...e, ...updates, updated_at: new Date().toISOString() }
              : e
          )
        );
      }
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TimetableEntry[]>(queryKey);
      queryClient.setQueryData<TimetableEntry[]>(queryKey, (old = []) =>
        old.map((e) =>
          e.id === id
            ? { ...e, ...updates, updated_at: new Date().toISOString() }
            : e
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (user) {
        const supabase = createClient();
        const { error } = await supabase.from("timetable_entries").delete().eq("id", id);
        if (error) throw new Error(error.message);
      } else {
        saveLocal(loadLocal().filter((e) => e.id !== id));
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TimetableEntry[]>(queryKey);
      queryClient.setQueryData<TimetableEntry[]>(queryKey, (old = []) =>
        old.filter((e) => e.id !== id)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  async function addEntry(
    entry: Omit<TimetableEntry, "id" | "user_id" | "created_at" | "updated_at">
  ) {
    return addMutation.mutateAsync(entry);
  }

  async function updateEntry(id: string, updates: Partial<TimetableEntry>) {
    return updateMutation.mutateAsync({ id, updates });
  }

  async function deleteEntry(id: string) {
    return deleteMutation.mutateAsync(id);
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
    refetch: () => queryClient.invalidateQueries({ queryKey }),
  };
}
