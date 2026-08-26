import { formatEventLongDate, formatTime12h } from "@/lib/dates";

export function registrationConfirmationEmail(input: {
  memberName: string;
  eventTitle: string;
  eventDate: Date;
  startTime: string;
  endTime: string;
  location: string;
  speakerName?: string | null;
  speakerTitle?: string | null;
  speakerOrganization?: string | null;
}) {
  const when = formatEventLongDate(input.eventDate);
  const hours = `${formatTime12h(input.startTime)} – ${formatTime12h(input.endTime)}`;
  const speaker = [input.speakerName, input.speakerTitle, input.speakerOrganization]
    .filter(Boolean)
    .join("\n");
  const text = [
    `Hi ${input.memberName},`,
    "",
    `You are registered for ${input.eventTitle}.`,
    "",
    when,
    hours,
    input.location,
    "",
    speaker ? `Speaker:\n${speaker}` : null,
    "",
    "Your registration is confirmed. We look forward to seeing you.",
  ]
    .filter((line) => line != null)
    .join("\n");

  return {
    subject: `You're registered — ${input.eventTitle}`,
    text,
  };
}
