export function defaultDeadline(eventDate: Date, startTime: string) {
  const [hours, minutes] = startTime.split(":").map(Number);
  const start = new Date(eventDate);
  start.setUTCHours(hours || 0, minutes || 0, 0, 0);
  return new Date(start.getTime() - 48 * 60 * 60 * 1000);
}

export function defaultCheckInOpensAt(eventDate: Date, checkInTime = "08:00") {
  const [hours, minutes] = checkInTime.split(":").map(Number);
  const opens = new Date(eventDate);
  opens.setUTCHours(hours || 8, minutes || 0, 0, 0);
  return opens;
}
