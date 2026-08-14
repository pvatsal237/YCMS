export const FOLLOW_UP_OUTCOMES = [
  {
    value: "CALLED_SPOKE",
    label: "Called — spoke with them",
    status: "CONTACTED",
    suggestCallback: false,
  },
  {
    value: "CALLED_NO_ANSWER",
    label: "Called — no answer / did not pick up",
    status: "CONTACTED",
    suggestCallback: true,
  },
  {
    value: "CALLED_BUSY_CALLBACK",
    label: "Called — busy (exams/work), call back later",
    status: "CONTACTED",
    suggestCallback: true,
  },
  {
    value: "CALLED_IN_HURRY_CALLBACK",
    label: "Called — in a hurry, call back later",
    status: "CONTACTED",
    suggestCallback: true,
  },
  {
    value: "MESSAGE_SENT",
    label: "Sent a message / WhatsApp",
    status: "CONTACTED",
    suggestCallback: false,
  },
  {
    value: "WILL_ATTEND",
    label: "They will attend the next meetup",
    status: "CONTACTED",
    suggestCallback: false,
  },
  {
    value: "COMPLETED",
    label: "Follow-up complete — no further action",
    status: "COMPLETED",
    suggestCallback: false,
  },
  {
    value: "UNABLE_TO_REACH",
    label: "Unable to reach after trying",
    status: "UNABLE_TO_REACH",
    suggestCallback: false,
  },
] as const;

export type FollowUpOutcomeValue = (typeof FOLLOW_UP_OUTCOMES)[number]["value"];

export function followUpOutcomeLabel(value?: string | null): string {
  const match = FOLLOW_UP_OUTCOMES.find((item) => item.value === value);
  return match?.label ?? "Not logged yet";
}

export function outcomeToStatus(value: string): "CONTACTED" | "COMPLETED" | "UNABLE_TO_REACH" {
  const match = FOLLOW_UP_OUTCOMES.find((item) => item.value === value);
  return (match?.status ?? "CONTACTED") as "CONTACTED" | "COMPLETED" | "UNABLE_TO_REACH";
}
