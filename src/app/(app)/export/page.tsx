"use client";

import { useState, useMemo } from "react";
import { useSemesters } from "@/hooks/useSemester";
import { useTimeRecords } from "@/hooks/useTimeRecords";
import { useTimetable } from "@/hooks/useTimetable";
import { buildDailySummary } from "@/lib/calculations";
import { exportToCSV, exportToJSON, downloadFile } from "@/lib/export";
import TopBar from "@/components/layout/TopBar";
import { FileSpreadsheet, FileJson } from "lucide-react";
import { format } from "date-fns";

export default function ExportPage() {
  const { activeSemester } = useSemesters();
  const { records } = useTimeRecords(activeSemester?.id ?? null);
  const { entries } = useTimetable(activeSemester?.id ?? null);
  const [startDate, setStartDate] = useState(activeSemester?.start_date ?? "");
  const [endDate, setEndDate] = useState(
    activeSemester?.end_date ?? format(new Date(), "yyyy-MM-dd")
  );

  const filteredSummaries = useMemo(() => {
    const dateMap = new Map<string, typeof records>();
    for (const record of records) {
      if (record.date < startDate || record.date > endDate) continue;
      if (!dateMap.has(record.date)) dateMap.set(record.date, []);
      dateMap.get(record.date)!.push(record);
    }

    return Array.from(dateMap.entries())
      .map(([date, dateRecords]) =>
        buildDailySummary(date, dateRecords, entries)
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [records, entries, startDate, endDate]);

  function handleExportCSV() {
    const csv = exportToCSV(filteredSummaries);
    const filename = `timely-export-${startDate}-bis-${endDate}.csv`;
    downloadFile(csv, filename, "text/csv;charset=utf-8");
  }

  function handleExportJSON() {
    const json = exportToJSON(filteredSummaries);
    const filename = `timely-export-${startDate}-bis-${endDate}.json`;
    downloadFile(json, filename, "application/json");
  }

  return (
    <>
      <TopBar title="Daten exportieren" />
      <div className="px-5 py-6 space-y-6">
        <p className="text-[15px] text-muted-foreground">
          Exportiere deine Zeiterfassungsdaten als CSV oder JSON.
        </p>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-muted-foreground">Von</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary shadow-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-medium text-muted-foreground">Bis</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary shadow-sm"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-2xl bg-card p-5 text-center shadow-sm">
          <p className="text-[28px] font-bold">{filteredSummaries.length}</p>
          <p className="text-[13px] text-muted-foreground">Tage im gewählten Zeitraum</p>
        </div>

        {/* Export Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleExportCSV}
            disabled={filteredSummaries.length === 0}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-white shadow-sm disabled:opacity-40"
          >
            <FileSpreadsheet className="h-5 w-5" />
            Als CSV exportieren (Excel)
          </button>

          <button
            onClick={handleExportJSON}
            disabled={filteredSummaries.length === 0}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-card py-3.5 text-[15px] font-medium shadow-sm disabled:opacity-40"
          >
            <FileJson className="h-5 w-5" />
            Als JSON exportieren
          </button>
        </div>

        {/* CSV Format Info */}
        <div className="rounded-2xl bg-card p-4 shadow-sm">
          <h3 className="mb-2 text-[13px] font-bold">CSV-Format</h3>
          <p className="text-[12px] text-muted-foreground">
            Spalten: Datum, Wochentag, Ankunft, Abgang, Zeit an Schule (Min),
            Lektionen (Min), Überstunden (Min), Manuell
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Trennzeichen: Semikolon (;) — kompatibel mit Excel in der Schweiz.
          </p>
        </div>
      </div>
    </>
  );
}
