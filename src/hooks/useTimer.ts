"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { todayISO } from "@/lib/date-utils";
import type { TimeRecord, TimerState } from "@/types";

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

export function useTimer(semesterId: string | null) {
  const [state, setState] = useState<TimerState>("idle");
  const [activeRecord, setActiveRecord] = useState<TimeRecord | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const calcElapsed = useCallback((clockIn: string) => {
    return Math.floor((Date.now() - new Date(clockIn).getTime()) / 1000);
  }, []);

  const checkRunningTimer = useCallback(() => {
    const running = load().find((r) => !r.clock_out) ?? null;
    if (running) {
      setActiveRecord(running);
      setState("running");
      setElapsedSeconds(calcElapsed(running.clock_in));
    }
    setLoading(false);
  }, [calcElapsed]);

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
    const now = new Date().toISOString();
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
    save([...load(), newRecord]);
    setActiveRecord(newRecord);
    setState("running");
    setElapsedSeconds(0);
  }

  async function stopTimer(): Promise<string | null> {
    if (!activeRecord) return null;
    const now = new Date().toISOString();
    const id = activeRecord.id;
    save(
      load().map((r) =>
        r.id === id ? { ...r, clock_out: now, updated_at: now } : r
      )
    );
    setState("idle");
    setActiveRecord(null);
    setElapsedSeconds(0);
    return id;
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
