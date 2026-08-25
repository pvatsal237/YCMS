import { NextResponse } from "next/server";
import { sendDueEventReminders } from "@/services/reminders";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const sent = await sendDueEventReminders();
  return NextResponse.json({ ok: true, sent });
}
