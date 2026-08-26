"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/utils/format";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function ymd(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseYmd(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month: month - 1, day };
}

function formatSelected(value: string) {
  const parsed = parseYmd(value);
  if (!parsed) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parsed.year, parsed.month, parsed.day)));
}

export function EventDatePicker({
  name,
  value,
  onChange,
  required,
}: {
  name: string;
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
}) {
  const parsed = parseYmd(value);
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => ({
    year: parsed?.year ?? today.getUTCFullYear(),
    month: parsed?.month ?? today.getUTCMonth(),
  }));
  const rootRef = useRef<HTMLDivElement>(null);

  function openCalendar() {
    const next = parseYmd(value);
    setView({
      year: next?.year ?? today.getUTCFullYear(),
      month: next?.month ?? today.getUTCMonth(),
    });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const days = useMemo(() => {
    const first = new Date(Date.UTC(view.year, view.month, 1));
    const startPad = first.getUTCDay();
    const lastDay = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate();
    const cells: Array<{ label: number; value: string } | null> = [];
    for (let i = 0; i < startPad; i += 1) cells.push(null);
    for (let day = 1; day <= lastDay; day += 1) {
      cells.push({ label: day, value: ymd(view.year, view.month, day) });
    }
    return cells;
  }, [view.year, view.month]);

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(view.year, view.month, 1)));

  return (
    <div ref={rootRef} className="relative">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">Event date</span>
      <input type="hidden" name={name} value={value} required={required} />
      <button
        type="button"
        className={cn(
          "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20",
          value ? "text-slate-900" : "text-slate-400",
        )}
        onClick={() => (open ? setOpen(false) : openCalendar())}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {value ? formatSelected(value) : "Select a date"}
      </button>
      {open ? (
        <div className="absolute z-20 mt-1 w-72 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
              onClick={() => {
                const next = new Date(Date.UTC(view.year, view.month - 1, 1));
                setView({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
              }}
              aria-label="Previous month"
            >
              ‹
            </button>
            <p className="text-sm font-medium text-slate-800">{monthLabel}</p>
            <button
              type="button"
              className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
              onClick={() => {
                const next = new Date(Date.UTC(view.year, view.month + 1, 1));
                setView({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
              }}
              aria-label="Next month"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-500">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((cell, index) =>
              cell ? (
                <button
                  key={cell.value}
                  type="button"
                  className={cn(
                    "h-8 rounded text-sm hover:bg-teal-50",
                    cell.value === value ? "bg-teal-700 text-white hover:bg-teal-700" : "text-slate-800",
                  )}
                  onClick={() => {
                    onChange(cell.value);
                    setOpen(false);
                  }}
                >
                  {cell.label}
                </button>
              ) : (
                <span key={`empty-${index}`} />
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
