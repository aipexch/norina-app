"use client";

import { useState, useMemo } from "react";
import { useSemesters } from "@/hooks/useSemester";
import { useTimeRecords } from "@/hooks/useTimeRecords";
import { useTimetable } from "@/hooks/useTimetable";
import { buildDailySummary } from "@/lib/calculations";
import { exportToCSV, exportToJSON, downloadFile } from "@/lib/export";
import TopBar from "@/components/layout/TopBar";
import { Download, FileSpreadsheet, FileJson } from "lucide-react";
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
    const filename = `norina-export-${startDate}-bis-${endDate}.csv`;
    downloadFile(csv, filename, "text/csv;charset=utf-8");
  }

  function handleExportJSON() {
    const json = exportToJSON(filteredSummaries);
    const filename = `norina-export-${startDate}-bis-${endDate}.json`;
    downloadFile(json, filename, "application/json");
  }

  return (
    <>
      <TopBar title="Daten exportieren" />
      <div className="px-4 py-6 space-y-6">
        <p className="text-sm text-muted">
          Exportiere deine Zeiterfassungsdaten als CSV (für Excel) oder JSON
          (für programmatische Analyse).
        </p>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Von</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Bis</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold">{filteredSummaries.length}</p>
          <p className="text-sm text-muted">Tage im gewählten Zeitraum</p>
        </div>

        {/* Export Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleExportCSV}
            disabled={filteredSummaries.length === 0}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-accent py-3.5 text-base font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-40"
          >
            <FileSpreadsheet className="h-5 w-5" />
            Als CSV exportieren (Excel)
          </button>

          <button
            onClick={handleExportJSON}
            disabled={filteredSummaries.length === 0}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border py-3.5 text-base font-medium transition-colors hover:bg-card-hover disabled:opacity-40"
          >
            <FileJson className="h-5 w-5" />
            Als JSON exportieren
          </button>
        </div>

        {/* CSV Format Info */}
        <div className="rounded-xl bg-card-hover p-4">
          <h3 className="mb-2 text-sm font-semibold">CSV-Format</h3>
          <p className="text-xs text-muted">
            Spalten: Datum, Wochentag, Ankunft, Abgang, Zeit an Schule (Min),
            Lektionen (Min), Überstunden (Min), Manuell
          </p>
          <p className="mt-1 text-xs text-muted">
            Trennzeichen: Semikolon (;) — kompatibel mit Excel in der Schweiz.
            UTF-8 mit BOM für korrekte Umlaute.
          </p>
        </div>
      </div>
    </>
  );
}
