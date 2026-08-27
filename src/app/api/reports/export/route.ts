import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canViewReports } from "@/lib/authorization";
import { exportEventCsv } from "@/services/reports";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
  }
  if (!canViewReports(session.user.role)) {
    return NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "Unknown export." }, { status: 400 });
  const exported = await exportEventCsv(eventId);
  if (!exported) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  return new NextResponse(exported.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exported.filename}"`,
    },
  });
}
