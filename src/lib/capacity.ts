import { AppError } from "@/lib/errors";

/** Walk-in reserve is included in total capacity, not added on top. */
export function advanceRegistrationCapacity(capacity: number, walkInCapacity: number) {
  const total = Math.max(0, capacity);
  const walkIn = Math.max(0, walkInCapacity);
  if (walkIn > total) {
    throw new AppError("Walk-in reserve must be included in the total capacity.", 400);
  }
  return total - walkIn;
}
