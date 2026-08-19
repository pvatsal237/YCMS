import { describe, expect, it } from "vitest";
import { formatTime12h } from "@/lib/dates";

describe("formatTime12h", () => {
  it("formats weekly meetup hours as 8:00 PM – 10:00 PM", () => {
    expect(formatTime12h("20:00")).toBe("8:00 PM");
    expect(formatTime12h("22:00")).toBe("10:00 PM");
  });
});
