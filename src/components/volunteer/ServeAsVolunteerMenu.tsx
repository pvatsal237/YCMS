"use client";

import { useActionState, useState } from "react";
import { submitVolunteerInterestAction } from "@/actions/enrollment";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { departmentLabel } from "@/utils/format";
import type { ActionResult } from "@/types";

const DEPARTMENTS = [
  "KITCHEN",
  "TRANSPORTATION",
  "SEATING_SETUP",
  "AUDIO_VIDEO",
  "RECREATION",
  "RISEUP_SUPPORT",
  "GENERAL_EVENT_SUPPORT",
] as const;

const NOTE_HINTS: Record<(typeof DEPARTMENTS)[number], string> = {
  KITCHEN: "Good at Gujarati, Punjabi and Italian dishes",
  TRANSPORTATION: "Can drive and take up to 4 passengers",
  SEATING_SETUP: "Comfortable helping with chairs and cleanup",
  AUDIO_VIDEO: "Experience with microphones and projectors",
  RECREATION: "Comfortable organizing games",
  RISEUP_SUPPORT: "Happy to help with RiseUp check-in and guests",
  GENERAL_EVENT_SUPPORT: "Glad to help wherever the event needs a hand",
};

export function ServeAsVolunteerMenu() {
  const [open, setOpen] = useState(false);
  const [availability, setAvailability] = useState("AVAILABLE");
  const [selected, setSelected] = useState<string[]>([]);
  const [state, action, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await submitVolunteerInterestAction(prev, formData);
      if (result.ok) {
        setOpen(false);
        setSelected([]);
        setAvailability("AVAILABLE");
      }
      return result;
    },
    { ok: true } as ActionResult,
  );

  return (
    <div className="relative shrink-0">
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen((value) => !value)}>
        Serve as Volunteer
      </Button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-40 bg-slate-900/40 md:bg-transparent" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-xl border bg-white p-4 shadow-xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-full md:mt-2 md:w-[22rem] md:rounded-lg">
            <form action={action} className="space-y-3">
              {!state.ok ? <Alert>{state.error}</Alert> : null}
              <p className="text-sm font-medium text-slate-900">Where would you enjoy serving?</p>
              <p className="text-xs text-slate-500">How would you like to help? You can choose more than one.</p>
              <div className="space-y-2 text-sm">
                {DEPARTMENTS.map((code) => {
                  const checked = selected.includes(code);
                  return (
                    <div key={code} className="space-y-1">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="departmentCode"
                          value={code}
                          checked={checked}
                          onChange={(event) =>
                            setSelected((current) =>
                              event.target.checked ? [...current, code] : current.filter((item) => item !== code),
                            )
                          }
                        />
                        <span>{departmentLabel(code)}</span>
                      </label>
                      {checked ? (
                        <Textarea
                          name={`notes_${code}`}
                          className="min-h-12 text-xs"
                          placeholder={NOTE_HINTS[code]}
                        />
                      ) : null}
                    </div>
                  );
                })}
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="wherever" />
                  <span>I can help wherever needed</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="unsure" />
                  <span>I would like to help, but I am not sure where</span>
                </label>
              </div>
              <Field label="Your availability">
                <Select name="availability" value={availability} onChange={(event) => setAvailability(event.target.value)}>
                  <option value="AVAILABLE">Available</option>
                  <option value="PARTIAL">Partially Available</option>
                  <option value="NOT_AVAILABLE">Not Available</option>
                </Select>
              </Field>
              {availability === "PARTIAL" ? (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Available From">
                    <Input name="availableFrom" type="time" required />
                  </Field>
                  <Field label="Available Until">
                    <Input name="availableUntil" type="time" required />
                  </Field>
                </div>
              ) : null}
              <Field label="Share any skills or experience if you wish">
                <Textarea name="notes" className="min-h-16" placeholder="Anything else you would like the team to know" />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isNewVolunteer" />
                New to volunteering
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="oneTime" />
                I can help once for now
              </label>
              <p className="text-xs text-slate-500">You can change your availability anytime. A lead will welcome you before you are added to a team.</p>
              <Button type="submit" size="sm" className="w-full" disabled={pending}>
                {pending ? "Sending..." : "Submit"}
              </Button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}
