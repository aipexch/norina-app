"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import type { Semester } from "@/types";

const STORAGE_KEY = "norina_semesters";
const QUERY_KEY = ["semesters"] as const;

function loadLocal(): Semester[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveLocal(data: Semester[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useSemesters() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: semesters = [], isLoading: loading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (user) {
        const supabase = createClient();
        const { data } = await supabase
          .from("semesters")
          .select("id,name,start_date,end_date,pensum_percent,lessons_per_week,minutes_per_lesson,is_active,time_slots,created_at")
          .order("created_at", { ascending: false });
        return (data ?? []) as Semester[];
      }
      return loadLocal();
    },
    enabled: user !== undefined,
  });

  const activeSemester = semesters.find((s) => s.is_active) ?? null;

  const createMutation = useMutation({
    mutationFn: async (
      semester: Omit<Semester, "id" | "user_id" | "created_at" | "updated_at">
    ) => {
      if (user) {
        const supabase = createClient();
        if (semester.is_active) {
          await supabase
            .from("semesters")
            .update({ is_active: false })
            .eq("user_id", user.id);
        }
        const { data, error } = await supabase
          .from("semesters")
          .insert({ ...semester, user_id: user.id })
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data as Semester;
      } else {
        const data = loadLocal();
        const base = semester.is_active
          ? data.map((s) => ({ ...s, is_active: false }))
          : data;
        const now = new Date().toISOString();
        const newSemester: Semester = {
          ...semester,
          id: crypto.randomUUID(),
          user_id: "local",
          created_at: now,
          updated_at: now,
        };
        saveLocal([newSemester, ...base]);
        return newSemester;
      }
    },
    onMutate: async (semester) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<Semester[]>(QUERY_KEY);
      const now = new Date().toISOString();
      const optimistic: Semester = {
        ...semester,
        id: crypto.randomUUID(),
        user_id: user?.id ?? "local",
        created_at: now,
        updated_at: now,
      };
      queryClient.setQueryData<Semester[]>(QUERY_KEY, (old = []) => {
        const base = semester.is_active
          ? old.map((s) => ({ ...s, is_active: false }))
          : old;
        return [optimistic, ...base];
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Semester>;
    }) => {
      if (user) {
        const supabase = createClient();
        if (updates.is_active) {
          await supabase
            .from("semesters")
            .update({ is_active: false })
            .eq("user_id", user.id);
        }
        const { error } = await supabase
          .from("semesters")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw new Error(error.message);
      } else {
        let data = loadLocal();
        if (updates.is_active) {
          data = data.map((s) => ({ ...s, is_active: false }));
        }
        data = data.map((s) =>
          s.id === id
            ? { ...s, ...updates, updated_at: new Date().toISOString() }
            : s
        );
        saveLocal(data);
      }
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<Semester[]>(QUERY_KEY);
      queryClient.setQueryData<Semester[]>(QUERY_KEY, (old = []) => {
        let result = updates.is_active
          ? old.map((s) => ({ ...s, is_active: false }))
          : [...old];
        return result.map((s) =>
          s.id === id
            ? { ...s, ...updates, updated_at: new Date().toISOString() }
            : s
        );
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (user) {
        const supabase = createClient();
        const { error } = await supabase.from("semesters").delete().eq("id", id);
        if (error) throw new Error(error.message);
      } else {
        saveLocal(loadLocal().filter((s) => s.id !== id));
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<Semester[]>(QUERY_KEY);
      queryClient.setQueryData<Semester[]>(QUERY_KEY, (old = []) =>
        old.filter((s) => s.id !== id)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  async function createSemester(
    semester: Omit<Semester, "id" | "user_id" | "created_at" | "updated_at">
  ) {
    return createMutation.mutateAsync(semester);
  }

  async function updateSemester(id: string, updates: Partial<Semester>) {
    return updateMutation.mutateAsync({ id, updates });
  }

  async function deleteSemester(id: string) {
    return deleteMutation.mutateAsync(id);
  }

  return {
    semesters,
    activeSemester,
    loading,
    createSemester,
    updateSemester,
    deleteSemester,
    refetch: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  };
}
