import { NextResponse } from "next/server";
import { requireCoordinator } from "@/lib/session";
import { eventReport, guidanceReport } from "@/services/reports";
import { toCsv } from "@/utils/csv";
import { formatDateTime } from "@/lib/dates";

export async function GET(request: Request) {
  await requireCoordinator();
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  if (type === "event") {
    const eventId = url.searchParams.get("eventId");
    if (!eventId) return NextResponse.json({ error: "Missing event" }, { status: 400 });
    const report = await eventReport(eventId);
    const csv = toCsv(
      ["Member", "Email", "Type", "Registered", "Checked In", "Check-In Time"],
      report.participants.map((row) => [
        row.name,
        row.email,
        row.type,
        "yes",
        row.checkedIn ? "yes" : "no",
        row.checkInTime ? formatDateTime(row.checkInTime) : "",
      ]),
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${report.event.title.replaceAll(" ", "-")}-report.csv"`,
      },
    });
  }
  if (type === "guidance") {
    const report = await guidanceReport({});
    const csv = toCsv(
      ["Member", "Email", "Category", "Status", "Coordinator", "Submitted"],
      report.rows.map((row) => [
        `${row.member.firstName} ${row.member.lastName}`,
        row.member.email,
        row.category,
        row.status,
        row.assignedTo?.name ?? "",
        formatDateTime(row.createdAt),
      ]),
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=guidance-report.csv",
      },
    });
  }
  return NextResponse.json({ error: "Unknown export" }, { status: 400 });
}
