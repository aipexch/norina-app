"use client";

import { useState, useEffect, useCallback } from "react";
import type { Semester } from "@/types";

const STORAGE_KEY = "norina_semesters";

function load(): Semester[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(data: Semester[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useSemesters() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const data = load();
    setSemesters(data);
    setActiveSemester(data.find((s) => s.is_active) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createSemester(
    semester: Omit<Semester, "id" | "user_id" | "created_at" | "updated_at">
  ) {
    const data = load();
    const base = semester.is_active ? data.map((s) => ({ ...s, is_active: false })) : data;
    const now = new Date().toISOString();
    const newSemester: Semester = {
      ...semester,
      id: crypto.randomUUID(),
      user_id: "local",
      created_at: now,
      updated_at: now,
    };
    save([newSemester, ...base]);
    refresh();
    return newSemester;
  }

  async function updateSemester(id: string, updates: Partial<Semester>) {
    let data = load();
    if (updates.is_active) {
      data = data.map((s) => ({ ...s, is_active: false }));
    }
    data = data.map((s) =>
      s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s
    );
    save(data);
    refresh();
  }

  async function deleteSemester(id: string) {
    save(load().filter((s) => s.id !== id));
    refresh();
  }

  return {
    semesters,
    activeSemester,
    loading,
    createSemester,
    updateSemester,
    deleteSemester,
    refetch: refresh,
  };
}
