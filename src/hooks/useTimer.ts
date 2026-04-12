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
    if (user === undefined) {
      // Auth still loading — keep loading true but don't block forever
      return;
    }

    let running: TimeRecord | null = null;

    if (user) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("time_records")
          .select("id, clock_in, semester_id, user_id, date, clock_out, break_minutes, is_manual, notes, created_at, updated_at")
          .is("clock_out", null)
          .limit(1)
          .maybeSingle();
        if (!error) running = (data as TimeRecord) ?? null;
      } catch {
        // Network error — don't block loading
      }
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

  // Ensure loading becomes false even if auth takes too long
  useEffect(() => {
    if (user !== undefined && loading) {
      checkRunningTimer();
    }
  }, [user, loading, checkRunningTimer]);

  useEffect(() => {
    if (state === "running" && activeRecord) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(calcElapsed(activeRecord.clock_in));
      }, 1000);

      const handleVisibility = () => {
        if (!document.hidden) {
          setElapsedSeconds(calcElapsed(activeRecord.clock_in));
        }
      };
      document.addEventListener("visibilitychange", handleVisibility);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        document.removeEventListener("visibilitychange", handleVisibility);
      };
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
      // Guard: if timer is already running, return the active record
      if (state === "running" && activeRecord) {
        return activeRecord;
      }

      const now = new Date().toISOString();
      if (user) {
        const supabase = createClient();

        // Check for any existing open timer before inserting
        const { data: existing } = await supabase
          .from("time_records")
          .select("*")
          .eq("user_id", user.id)
          .is("clock_out", null)
          .limit(1)
          .maybeSingle();
        if (existing) {
          return existing as TimeRecord;
        }

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
        // Local: check for existing open timer
        const localRecords = loadLocal();
        const existingLocal = localRecords.find((r) => !r.clock_out);
        if (existingLocal) {
          return existingLocal;
        }

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
        saveLocal([...localRecords, newRecord]);
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
          .eq("id", id)
          .eq("user_id", user.id);
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

  async function adjustStartTime(timeStr: string) {
    if (!activeRecord) return;
    const dateStr = activeRecord.clock_in.split("T")[0];
    const newClockIn = new Date(dateStr + "T" + timeStr + ":00").toISOString();
    const now = new Date().toISOString();

    if (user) {
      const supabase = createClient();
      const { error } = await supabase
        .from("time_records")
        .update({ clock_in: newClockIn, updated_at: now })
        .eq("id", activeRecord.id)
        .eq("user_id", user.id);
      if (error) throw new Error(`Startzeit anpassen fehlgeschlagen: ${error.message}`);
    } else {
      saveLocal(
        loadLocal().map((r) =>
          r.id === activeRecord.id ? { ...r, clock_in: newClockIn, updated_at: now } : r
        )
      );
    }

    const updated = { ...activeRecord, clock_in: newClockIn, updated_at: now };
    setActiveRecord(updated);
    setElapsedSeconds(calcElapsed(newClockIn));
    queryClient.invalidateQueries({ queryKey: ["time-records"] });
  }

  return {
    state,
    activeRecord,
    elapsedSeconds,
    startTimer,
    stopTimer,
    adjustStartTime,
    loading,
    refetch: checkRunningTimer,
  };
}
