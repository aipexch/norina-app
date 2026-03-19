"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import type { TimeRecord } from "@/types";

const STORAGE_KEY = "norina_records";

function loadLocal(): TimeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveLocal(data: TimeRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function sortRecords(records: TimeRecord[]): TimeRecord[] {
  return [...records].sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    return d !== 0 ? d : b.clock_in.localeCompare(a.clock_in);
  });
}

export function useTimeRecords(semesterId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["time-records", semesterId] as const;

  const { data: records = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (user) {
        const supabase = createClient();
        let query = supabase
          .from("time_records")
          .select("id,semester_id,date,clock_in,clock_out,break_minutes,is_manual,notes")
          .order("date", { ascending: false })
          .order("clock_in", { ascending: false });
        if (semesterId) {
          query = query.eq("semester_id", semesterId);
        }
        const { data } = await query;
        return (data ?? []) as TimeRecord[];
      } else {
        const all = loadLocal();
        const filtered = semesterId
          ? all.filter((r) => r.semester_id === semesterId)
          : all;
        return sortRecords(filtered);
      }
    },
    enabled: user !== undefined,
  });

  const addMutation = useMutation({
    mutationFn: async (record: {
      date: string;
      clock_in: string;
      clock_out: string;
      notes?: string;
    }) => {
      if (user) {
        const supabase = createClient();
        const { data } = await supabase
          .from("time_records")
          .insert({
            user_id: user.id,
            semester_id: semesterId,
            date: record.date,
            clock_in: record.clock_in,
            clock_out: record.clock_out,
            break_minutes: 0,
            is_manual: true,
            notes: record.notes ?? null,
          })
          .select()
          .single();
        return data as TimeRecord;
      } else {
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
        saveLocal([...loadLocal(), newRecord]);
        return newRecord;
      }
    },
    onMutate: async (record) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TimeRecord[]>(queryKey);
      const now = new Date().toISOString();
      const optimistic: TimeRecord = {
        id: crypto.randomUUID(),
        user_id: user?.id ?? "local",
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
      queryClient.setQueryData<TimeRecord[]>(queryKey, (old = []) =>
        sortRecords([...old, optimistic])
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
      updates: Partial<TimeRecord>;
    }) => {
      if (user) {
        const supabase = createClient();
        await supabase
          .from("time_records")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", id);
      } else {
        saveLocal(
          loadLocal().map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...updates,
                  is_manual: true,
                  updated_at: new Date().toISOString(),
                }
              : r
          )
        );
      }
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TimeRecord[]>(queryKey);
      queryClient.setQueryData<TimeRecord[]>(queryKey, (old = []) =>
        old.map((r) =>
          r.id === id
            ? { ...r, ...updates, updated_at: new Date().toISOString() }
            : r
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
        await supabase.from("time_records").delete().eq("id", id);
      } else {
        saveLocal(loadLocal().filter((r) => r.id !== id));
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TimeRecord[]>(queryKey);
      queryClient.setQueryData<TimeRecord[]>(queryKey, (old = []) =>
        old.filter((r) => r.id !== id)
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

  async function addManualRecord(record: {
    date: string;
    clock_in: string;
    clock_out: string;
    notes?: string;
  }) {
    return addMutation.mutateAsync(record);
  }

  async function updateRecord(id: string, updates: Partial<TimeRecord>) {
    return updateMutation.mutateAsync({ id, updates });
  }

  async function deleteRecord(id: string) {
    return deleteMutation.mutateAsync(id);
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
    refetch: () => queryClient.invalidateQueries({ queryKey }),
  };
}
