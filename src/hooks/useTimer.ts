"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth-helpers";
import { todayISO } from "@/lib/date-utils";
import type { TimeRecord, TimerState } from "@/types";

export function useTimer(semesterId: string | null) {
  const [state, setState] = useState<TimerState>("idle");
  const [activeRecord, setActiveRecord] = useState<TimeRecord | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supabase = createClient();

  const calcElapsed = useCallback((clockIn: string) => {
    return Math.floor((Date.now() - new Date(clockIn).getTime()) / 1000);
  }, []);

  const checkRunningTimer = useCallback(async () => {
    const userId = await getUserId();

    const { data } = await supabase
      .from("time_records")
      .select("*")
      .eq("user_id", userId)
      .is("clock_out", null)
      .limit(1)
      .single();

    if (data) {
      const record = data as TimeRecord;
      setActiveRecord(record);
      setState("running");
      setElapsedSeconds(calcElapsed(record.clock_in));
    }
    setLoading(false);
  }, [supabase, calcElapsed]);

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

  async function startTimer() {
    const userId = await getUserId();

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("time_records")
      .insert({
        user_id: userId,
        semester_id: semesterId,
        date: todayISO(),
        clock_in: now,
        is_manual: false,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Timer starten fehlgeschlagen:", error);
      return;
    }

    const record = data as TimeRecord;
    setActiveRecord(record);
    setState("running");
    setElapsedSeconds(0);
  }

  async function stopTimer() {
    if (!activeRecord) return;

    const now = new Date().toISOString();
    await supabase
      .from("time_records")
      .update({ clock_out: now })
      .eq("id", activeRecord.id);

    setState("idle");
    setActiveRecord(null);
    setElapsedSeconds(0);
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
