"use client";

import { useActionState, useMemo, useState } from "react";
import { saveDepartmentPlanAction } from "@/actions/volunteer";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { DEPARTMENT_TASK_TEMPLATES } from "@/utils/volunteer-templates";
import type { ActionResult } from "@/types";

type VolunteerOption = { id: string; name: string };
type Requirement = {
  task: string;
  neededCount: string;
  requestDate: string;
  startTime: string;
  endTime: string;
  notes: string;
  preAssignedUserId: string;
};

export function DepartmentPlanForm({
  meetupId,
  departmentId,
  departmentCode,
  defaultDate,
  eventStart,
  eventEnd,
  volunteers,
  locked,
  initial,
}: {
  meetupId: string;
  departmentId: string;
  departmentCode: string;
  defaultDate: string;
  eventStart: string;
  eventEnd: string;
  volunteers: VolunteerOption[];
  locked: boolean;
  initial?: {
    cuisine?: string | null;
    sponsorName?: string | null;
    preparationLocation?: string | null;
    kitchenNotes?: string | null;
    knownAssignments?: Array<{ label: string; userId: string }>;
    requirements?: Requirement[];
  };
}) {
  const templates = DEPARTMENT_TASK_TEMPLATES[departmentCode] ?? ["Other"];
  const [state, action, pending] = useActionState(saveDepartmentPlanAction, { ok: true } as ActionResult);
  const [submitFlag, setSubmitFlag] = useState("0");
  const kitchen = departmentCode === "KITCHEN";
  const transport = departmentCode === "TRANSPORTATION";
  const [known, setKnown] = useState<Array<{ label: string; userId: string }>>(
    initial?.knownAssignments?.length
      ? initial.knownAssignments
      : kitchen
        ? [
            { label: "Grocery Person", userId: "" },
            { label: "Food Delivery Person", userId: "" },
            { label: "Other pre-assigned volunteer", userId: "" },
          ]
        : transport
          ? [{ label: "Known driver", userId: "" }]
          : [{ label: "Known volunteer", userId: "" }],
  );
  const [rows, setRows] = useState<Requirement[]>(
    initial?.requirements?.length
      ? initial.requirements
      : templates.slice(0, kitchen ? 5 : transport ? 4 : 2).map((task) => ({
          task,
          neededCount: kitchen && task === "Chopping" ? "10" : "2",
          requestDate: defaultDate,
          startTime: eventStart || "20:00",
          endTime: eventEnd || "22:00",
          notes: "",
          preAssignedUserId: "",
        })),
  );

  const payload = useMemo(
    () => ({
      knownAssignments: known.filter((row) => row.userId),
      requirements: rows.filter((row) => row.task.trim() && Number(row.neededCount) > 0),
    }),
    [known, rows],
  );

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="meetupId" value={meetupId} />
      <input type="hidden" name="departmentId" value={departmentId} />
      <input type="hidden" name="submit" value={submitFlag} />
      <input type="hidden" name="knownAssignments" value={JSON.stringify(payload.knownAssignments)} />
      <input type="hidden" name="requirements" value={JSON.stringify(payload.requirements)} />
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}

      {kitchen ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cuisine / Menu">
            <Input name="cuisine" defaultValue={initial?.cuisine ?? ""} disabled={locked} />
          </Field>
          <Field label="Sponsor name">
            <Input name="sponsorName" defaultValue={initial?.sponsorName ?? ""} disabled={locked} />
          </Field>
          <Field label="Preparation location">
            <Input name="preparationLocation" defaultValue={initial?.preparationLocation ?? ""} disabled={locked} />
          </Field>
          <Field label="Kitchen notes">
            <Textarea name="kitchenNotes" defaultValue={initial?.kitchenNotes ?? ""} className="min-h-16" disabled={locked} />
          </Field>
        </div>
      ) : null}

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-800">Optional known assignments</p>
        {known.map((row, index) => (
          <div key={`${row.label}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              value={row.label}
              disabled={locked}
              onChange={(event) =>
                setKnown((current) => current.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)))
              }
            />
            <Select
              value={row.userId}
              disabled={locked}
              onChange={(event) =>
                setKnown((current) => current.map((item, i) => (i === index ? { ...item, userId: event.target.value } : item)))
              }
            >
              <option value="">Select volunteer</option>
              {volunteers.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </Select>
            {locked ? null : (
              <Button type="button" size="sm" variant="ghost" onClick={() => setKnown((current) => current.filter((_, i) => i !== index))}>
                Remove
              </Button>
            )}
          </div>
        ))}
        {locked ? null : (
          <Button type="button" size="sm" variant="secondary" onClick={() => setKnown((current) => [...current, { label: "Other", userId: "" }])}>
            Add known assignment
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-slate-800">Staffing requirements</p>
        {rows.map((row, index) => (
          <div key={index} className="grid gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-6">
            <Field label={transport ? "Area / route" : "Task"} >
              <Input
                list={`tasks-${departmentCode}`}
                value={row.task}
                disabled={locked}
                onChange={(event) =>
                  setRows((current) => current.map((item, i) => (i === index ? { ...item, task: event.target.value } : item)))
                }
              />
            </Field>
            <Field label={transport ? "Drivers needed" : "Volunteers needed"}>
              <Input
                type="number"
                min={1}
                value={row.neededCount}
                disabled={locked}
                onChange={(event) =>
                  setRows((current) => current.map((item, i) => (i === index ? { ...item, neededCount: event.target.value } : item)))
                }
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={row.requestDate}
                disabled={locked}
                onChange={(event) =>
                  setRows((current) => current.map((item, i) => (i === index ? { ...item, requestDate: event.target.value } : item)))
                }
              />
            </Field>
            <Field label="Start">
              <Input
                value={row.startTime}
                disabled={locked}
                onChange={(event) =>
                  setRows((current) => current.map((item, i) => (i === index ? { ...item, startTime: event.target.value } : item)))
                }
              />
            </Field>
            <Field label="End">
              <Input
                value={row.endTime}
                disabled={locked}
                onChange={(event) =>
                  setRows((current) => current.map((item, i) => (i === index ? { ...item, endTime: event.target.value } : item)))
                }
              />
            </Field>
            <Field label="Already assigned">
              <Select
                value={row.preAssignedUserId}
                disabled={locked}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item, i) => (i === index ? { ...item, preAssignedUserId: event.target.value } : item)),
                  )
                }
              >
                <option value="">None</option>
                {volunteers.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-6">
              <Field label="Notes">
                <Input
                  value={row.notes}
                  disabled={locked}
                  onChange={(event) =>
                    setRows((current) => current.map((item, i) => (i === index ? { ...item, notes: event.target.value } : item)))
                  }
                />
              </Field>
            </div>
            {locked ? null : (
              <Button type="button" size="sm" variant="ghost" onClick={() => setRows((current) => current.filter((_, i) => i !== index))}>
                Remove requirement
              </Button>
            )}
          </div>
        ))}
        <datalist id={`tasks-${departmentCode}`}>
          {templates.map((task) => (
            <option key={task} value={task} />
          ))}
        </datalist>
        {locked ? null : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              setRows((current) => [
                ...current,
                {
                  task: "",
                  neededCount: "1",
                  requestDate: defaultDate,
                  startTime: eventStart || "20:00",
                  endTime: eventEnd || "22:00",
                  notes: "",
                  preAssignedUserId: "",
                },
              ])
            }
          >
            Add requirement
          </Button>
        )}
      </div>

      {locked ? null : (
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" variant="secondary" disabled={pending} onClick={() => setSubmitFlag("0")}>
            Save draft
          </Button>
          <Button type="submit" size="sm" disabled={pending} onClick={() => setSubmitFlag("1")}>
            Submit for approval
          </Button>
        </div>
      )}
    </form>
  );
}
