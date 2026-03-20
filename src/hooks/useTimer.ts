"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import { todayISO } from "@/lib/date-utils";
import type { TimeRecord, TimerState } from "@/types";

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

export function useTimer(semesterId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [state, setState] = useState<TimerState>("idle");
  const [activeRecord, setActiveRecord] = useState<TimeRecord | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const calcElapsed = useCallback((clockIn: string) => {
    return Math.floor((Date.now() - new Date(clockIn).getTime()) / 1000);
  }, []);

  const checkRunningTimer = useCallback(async () => {
    let running: TimeRecord | null = null;

    if (user) {
      const supabase = createClient();
      const { data } = await supabase
        .from("time_records")
        .select("id,semester_id,date,clock_in,clock_out,break_minutes,is_manual,notes")
        .is("clock_out", null)
        .limit(1)
        .maybeSingle();
      running = (data as TimeRecord) ?? null;
    } else {
      running = loadLocal().find((r) => !r.clock_out) ?? null;
    }

    if (running) {
      setActiveRecord(running);
      setState("running");
      setElapsedSeconds(calcElapsed(running.clock_in));
    }
    setLoading(false);
  }, [user, calcElapsed]);

  useEffect(() => {
    checkRunningTimer();
  }, [checkRunningTimer]);

  useEffect(() => {
    if (state === "running" && activeRecord) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(calcElapsed(activeRecord.clock_in));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state, activeRecord, calcElapsed]);

  const startMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      if (user) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("time_records")
          .insert({
            user_id: user.id,
            semester_id: semesterId,
            date: todayISO(),
            clock_in: now,
            clock_out: null,
            break_minutes: 0,
            is_manual: false,
            notes: null,
          })
          .select()
          .single();
        if (error) throw new Error(`Timer start failed: ${error.message}`);
        return data as TimeRecord;
      } else {
        const newRecord: TimeRecord = {
          id: crypto.randomUUID(),
          user_id: "local",
          semester_id: semesterId,
          date: todayISO(),
          clock_in: now,
          clock_out: null,
          break_minutes: 0,
          is_manual: false,
          notes: null,
          created_at: now,
          updated_at: now,
        };
        saveLocal([...loadLocal(), newRecord]);
        return newRecord;
      }
    },
    onSuccess: (record) => {
      setActiveRecord(record);
      setState("running");
      setElapsedSeconds(0);
      // Invalidate time records so other components see the new record
      queryClient.invalidateQueries({ queryKey: ["time-records"] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      if (!activeRecord) return null;
      const now = new Date().toISOString();
      const id = activeRecord.id;

      if (user) {
        const supabase = createClient();
        const { error } = await supabase
          .from("time_records")
          .update({ clock_out: now, updated_at: now })
          .eq("id", id);
        if (error) throw new Error(`Timer stop failed: ${error.message}`);
      } else {
        saveLocal(
          loadLocal().map((r) =>
            r.id === id ? { ...r, clock_out: now, updated_at: now } : r
          )
        );
      }
      return id;
    },
    onSuccess: () => {
      setState("idle");
      setActiveRecord(null);
      setElapsedSeconds(0);
      // Invalidate time records so other components see the update
      queryClient.invalidateQueries({ queryKey: ["time-records"] });
    },
  });

  async function startTimer() {
    await startMutation.mutateAsync();
  }

  async function stopTimer(): Promise<string | null> {
    return stopMutation.mutateAsync();
  }

  return {
    state,
    activeRecord,
    elapsedSeconds,
    startTimer,
    stopTimer,
    loading,
    refetch: checkRunningTimer,
  };
}
