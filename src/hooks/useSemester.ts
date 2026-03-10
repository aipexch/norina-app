"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth-helpers";
import type { Semester } from "@/types";

export function useSemesters() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchSemesters = useCallback(async () => {
    const userId = await getUserId();

    const { data } = await supabase
      .from("semesters")
      .select("*")
      .eq("user_id", userId)
      .order("start_date", { ascending: false });

    if (data) {
      const typed = data as Semester[];
      setSemesters(typed);
      const active = typed.find((s) => s.is_active);
      setActiveSemester(active ?? null);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  async function createSemester(
    semester: Omit<Semester, "id" | "user_id" | "created_at" | "updated_at">
  ) {
    const userId = await getUserId();

    if (semester.is_active) {
      await supabase
        .from("semesters")
        .update({ is_active: false })
        .eq("user_id", userId);
    }

    const { data, error } = await supabase
      .from("semesters")
      .insert({ ...semester, user_id: userId })
      .select()
      .single();

    if (error) {
      console.error("Semester erstellen fehlgeschlagen:", error);
      return null;
    }
    await fetchSemesters();
    return data as Semester;
  }

  async function updateSemester(id: string, updates: Partial<Semester>) {
    const userId = await getUserId();

    if (updates.is_active) {
      await supabase
        .from("semesters")
        .update({ is_active: false })
        .eq("user_id", userId);
    }

    await supabase.from("semesters").update(updates).eq("id", id);
    await fetchSemesters();
  }

  async function deleteSemester(id: string) {
    await supabase.from("semesters").delete().eq("id", id);
    await fetchSemesters();
  }

  return {
    semesters,
    activeSemester,
    loading,
    createSemester,
    updateSemester,
    deleteSemester,
    refetch: fetchSemesters,
  };
}
