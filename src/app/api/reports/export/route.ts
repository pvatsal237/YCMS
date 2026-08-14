import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canViewReports } from "@/lib/authorization";
import {
  exportAttendanceCsv,
  exportImmigrationCsv,
  exportMembersCsv,
} from "@/services/reports";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Session expired. Please sign in again." },
      { status: 401 },
    );
  }
  if (!canViewReports(session.user.role)) {
    return NextResponse.json(
      { error: "You do not have permission to perform this action." },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  let csv = "";
  let filename = "ycms-report.csv";
  if (type === "attendance") {
    csv = await exportAttendanceCsv(from, to);
    filename = "ycms-attendance.csv";
  } else if (type === "members") {
    csv = await exportMembersCsv();
    filename = "ycms-members.csv";
  } else if (type === "immigration") {
    csv = await exportImmigrationCsv();
    filename = "ycms-immigration.csv";
  } else {
    return NextResponse.json({ error: "Unknown export type." }, { status: 400 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
