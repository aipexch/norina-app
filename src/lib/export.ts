import { format, getISODay } from "date-fns";
import { de } from "date-fns/locale";
import type { DailySummary } from "@/types";
import { DAY_NAMES, type DayOfWeek } from "@/types";

export function exportToCSV(summaries: DailySummary[]): string {
  const header =
    "Datum;Wochentag;Ankunft;Abgang;Zeit_an_Schule_Min;Lektionen_Min;Überstunden_Min;Manuell\n";

  const rows = summaries
    .flatMap((day) =>
      day.records.map((record) => {
        const dow = getISODay(new Date(day.date)) as DayOfWeek;
        return [
          format(new Date(day.date), "dd.MM.yyyy"),
          dow <= 5 ? DAY_NAMES[dow] : "Wochenende",
          format(new Date(record.clock_in), "HH:mm"),
          record.clock_out
            ? format(new Date(record.clock_out), "HH:mm")
            : "laufend",
          Math.round(day.totalMinutesAtSchool),
          day.scheduledMinutes,
          Math.round(day.overtimeMinutes),
          record.is_manual ? "Ja" : "Nein",
        ].join(";");
      })
    )
    .join("\n");

  return header + rows;
}

export function exportToJSON(summaries: DailySummary[]): string {
  return JSON.stringify(
    summaries.map((s) => ({
      datum: s.date,
      wochentag:
        getISODay(new Date(s.date)) <= 5
          ? DAY_NAMES[getISODay(new Date(s.date)) as DayOfWeek]
          : "Wochenende",
      zeit_an_schule_minuten: Math.round(s.totalMinutesAtSchool),
      lektionen_minuten: s.scheduledMinutes,
      ueberstunden_minuten: Math.round(s.overtimeMinutes),
      timer_laeuft: s.isRunning,
      eintraege: s.records.map((r) => ({
        ankunft: r.clock_in,
        abgang: r.clock_out,
        manuell: r.is_manual,
        notiz: r.notes,
      })),
    })),
    null,
    2
  );
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
) {
  // BOM for Excel UTF-8 compatibility
  const bom = mimeType.includes("csv") ? "\uFEFF" : "";
  const blob = new Blob([bom + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
