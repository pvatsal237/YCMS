"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function AttendanceChart({
  data,
}: {
  data: Array<{ date: string; percent: number; present: number }>;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500">No attendance data yet.</p>;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" fontSize={12} />
          <YAxis fontSize={12} domain={[0, 100]} />
          <Tooltip />
          <Bar dataKey="percent" fill="#0f766e" name="Attendance %" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
