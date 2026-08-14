"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import type { ActionResult } from "@/types";
import type { MemberFormInput } from "@/validations/member";

const steps = [
  "Personal",
  "Addresses",
  "Emergency",
  "Education",
  "Immigration",
  "Employment",
  "Accommodation",
];

type EducationRow = MemberFormInput["education"][number];

const emptyEducation = (): EducationRow => ({
  country: "Canada",
  institution: "",
  program: "",
  fieldOfStudy: "",
  startDate: "",
  endDate: "",
  currentlyStudying: true,
});

export function MemberForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (
    prev: ActionResult,
    formData: FormData,
  ) => Promise<ActionResult>;
  defaults?: Partial<MemberFormInput>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: true } as ActionResult);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState(defaults?.immigrationStatus ?? "STUDENT");
  const [education, setEducation] = useState<EducationRow[]>(
    defaults?.education?.length ? defaults.education : [emptyEducation()],
  );

  const payload = useMemo(() => JSON.stringify(education), [education]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="education" value={payload} />
      <input type="hidden" name="active" value={defaults?.active === false ? "false" : "true"} />
      {!state.ok ? <Alert>{state.error}</Alert> : null}

      <ol className="flex flex-wrap gap-2 text-sm">
        {steps.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(index)}
              className={`rounded-full px-3 py-1 ${
                index === step
                  ? "bg-slate-900 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {index + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <Input name="firstName" defaultValue={defaults?.firstName} required />
          </Field>
          <Field label="Middle name (optional)">
            <Input name="middleName" defaultValue={defaults?.middleName} />
          </Field>
          <Field label="Last name">
            <Input name="lastName" defaultValue={defaults?.lastName} required />
          </Field>
          <Field label="Date of birth">
            <Input type="date" name="dateOfBirth" defaultValue={defaults?.dateOfBirth} required />
          </Field>
          <Field label="Gender">
            <Select name="gender" defaultValue={defaults?.gender ?? "PREFER_NOT_TO_SAY"}>
              <option value="FEMALE">Female</option>
              <option value="MALE">Male</option>
              <option value="NON_BINARY">Non-binary</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              <option value="OTHER">Other</option>
            </Select>
          </Field>
          <Field label="Phone number">
            <Input name="phone" defaultValue={defaults?.phone} required />
          </Field>
          <Field label="Email">
            <Input type="email" name="email" defaultValue={defaults?.email} required />
          </Field>
          <Field label="Blood group">
            <Input name="bloodGroup" defaultValue={defaults?.bloodGroup} />
          </Field>
          <Field label="Date joined">
            <Input type="date" name="dateJoined" defaultValue={defaults?.dateJoined} required />
          </Field>
          <Field label="Referred by">
            <Input name="referredBy" defaultValue={defaults?.referredBy} />
          </Field>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Canadian address</h3>
            <Field label="Address line 1">
              <Input name="canadianAddressLine1" defaultValue={defaults?.canadianAddressLine1} required />
            </Field>
            <Field label="Address line 2">
              <Input name="canadianAddressLine2" defaultValue={defaults?.canadianAddressLine2} />
            </Field>
            <Field label="City">
              <Input name="canadianCity" defaultValue={defaults?.canadianCity} required />
            </Field>
            <Field label="Province">
              <Input name="canadianProvince" defaultValue={defaults?.canadianProvince ?? "Ontario"} required />
            </Field>
            <Field label="Postal code">
              <Input name="canadianPostalCode" defaultValue={defaults?.canadianPostalCode} required />
            </Field>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Home country address</h3>
            <Field label="Address">
              <Input name="homeAddressLine1" defaultValue={defaults?.homeAddressLine1} required />
            </Field>
            <Field label="Address line 2">
              <Input name="homeAddressLine2" defaultValue={defaults?.homeAddressLine2} />
            </Field>
            <Field label="City">
              <Input name="homeCity" defaultValue={defaults?.homeCity} required />
            </Field>
            <Field label="State / province">
              <Input name="homeProvince" defaultValue={defaults?.homeProvince} required />
            </Field>
            <Field label="Postal code">
              <Input name="homePostalCode" defaultValue={defaults?.homePostalCode} required />
            </Field>
            <Field label="Country">
              <Input name="homeCountry" defaultValue={defaults?.homeCountry ?? "India"} required />
            </Field>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Emergency contact name">
            <Input name="emergencyName" defaultValue={defaults?.emergencyName} required />
          </Field>
          <Field label="Relationship">
            <Input name="emergencyRelationship" defaultValue={defaults?.emergencyRelationship} required />
          </Field>
          <Field label="Phone">
            <Input name="emergencyPhone" defaultValue={defaults?.emergencyPhone} required />
          </Field>
          <Field label="Alternate phone">
            <Input name="emergencyAlternatePhone" defaultValue={defaults?.emergencyAlternatePhone} />
          </Field>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          {education.map((row, index) => (
            <div key={index} className="grid gap-4 rounded-md border border-slate-200 p-4 sm:grid-cols-2">
              <Field label="Country">
                <Input
                  value={row.country}
                  onChange={(event) => {
                    const next = [...education];
                    next[index] = { ...row, country: event.target.value };
                    setEducation(next);
                  }}
                />
              </Field>
              <Field label="Institution">
                <Input
                  value={row.institution}
                  onChange={(event) => {
                    const next = [...education];
                    next[index] = { ...row, institution: event.target.value };
                    setEducation(next);
                  }}
                />
              </Field>
              <Field label="Program / course">
                <Input
                  value={row.program}
                  onChange={(event) => {
                    const next = [...education];
                    next[index] = { ...row, program: event.target.value };
                    setEducation(next);
                  }}
                />
              </Field>
              <Field label="Field of study">
                <Input
                  value={row.fieldOfStudy}
                  onChange={(event) => {
                    const next = [...education];
                    next[index] = { ...row, fieldOfStudy: event.target.value };
                    setEducation(next);
                  }}
                />
              </Field>
              <Field label="Start date">
                <Input
                  type="date"
                  value={row.startDate}
                  onChange={(event) => {
                    const next = [...education];
                    next[index] = { ...row, startDate: event.target.value };
                    setEducation(next);
                  }}
                />
              </Field>
              <Field label="End date">
                <Input
                  type="date"
                  value={row.endDate ?? ""}
                  onChange={(event) => {
                    const next = [...education];
                    next[index] = { ...row, endDate: event.target.value };
                    setEducation(next);
                  }}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={row.currentlyStudying}
                  onChange={(event) => {
                    const next = [...education];
                    next[index] = { ...row, currentlyStudying: event.target.checked };
                    setEducation(next);
                  }}
                />
                Currently studying
              </label>
              {education.length > 1 ? (
                <button
                  type="button"
                  className="text-sm text-red-700"
                  onClick={() => setEducation(education.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() => setEducation([...education, emptyEducation()])}
          >
            Add education record
          </Button>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Immigration status">
            <Select
              name="immigrationStatus"
              value={status}
              onChange={(event) => setStatus(event.target.value as MemberFormInput["immigrationStatus"])}
            >
              <option value="STUDENT">Student</option>
              <option value="WORKER">Worker</option>
              <option value="PERMANENT_RESIDENT">Permanent Resident</option>
              <option value="CITIZEN">Citizen</option>
              <option value="VISITOR">Visitor</option>
              <option value="OTHER">Other</option>
            </Select>
          </Field>
          {status === "STUDENT" ? (
            <>
              <Field label="College / university">
                <Input name="college" defaultValue={defaults?.college} />
              </Field>
              <Field label="Program">
                <Input name="program" defaultValue={defaults?.program} />
              </Field>
              <Field label="Study permit expiry">
                <Input type="date" name="studyPermitExpiry" defaultValue={defaults?.studyPermitExpiry} />
              </Field>
            </>
          ) : null}
          {status === "WORKER" ? (
            <>
              <Field label="Work permit type">
                <Input name="workPermitType" defaultValue={defaults?.workPermitType} />
              </Field>
              <Field label="Work permit expiry">
                <Input type="date" name="workPermitExpiry" defaultValue={defaults?.workPermitExpiry} />
              </Field>
            </>
          ) : null}
          {status === "PERMANENT_RESIDENT" ? (
            <Field label="PR card expiry">
              <Input type="date" name="prCardExpiry" defaultValue={defaults?.prCardExpiry} />
            </Field>
          ) : null}
          <Field label="Passport number (optional)">
            <Input name="passportNumber" defaultValue={defaults?.passportNumber} />
          </Field>
          <Field label="Passport expiry">
            <Input type="date" name="passportExpiry" defaultValue={defaults?.passportExpiry} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <Textarea name="immigrationNotes" defaultValue={defaults?.immigrationNotes} />
            </Field>
          </div>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Employment status">
            <Select name="employmentStatus" defaultValue={defaults?.employmentStatus ?? "STUDENT"}>
              <option value="EMPLOYED">Employed</option>
              <option value="UNEMPLOYED">Unemployed</option>
              <option value="SELF_EMPLOYED">Self-employed</option>
              <option value="STUDENT">Student</option>
              <option value="OTHER">Other</option>
            </Select>
          </Field>
          <Field label="Employer">
            <Input name="employer" defaultValue={defaults?.employer} />
          </Field>
          <Field label="Job title">
            <Input name="jobTitle" defaultValue={defaults?.jobTitle} />
          </Field>
          <Field label="Desired job / field">
            <Input name="desiredField" defaultValue={defaults?.desiredField} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="fieldRelated" defaultChecked={defaults?.fieldRelated} />
            This is a field-related job
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="lookingForJob" defaultChecked={defaults?.lookingForJob} />
            Looking for a new job
          </label>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <Textarea name="employmentNotes" defaultValue={defaults?.employmentNotes} />
            </Field>
          </div>
        </div>
      ) : null}

      {step === 6 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              name="lookingForAccommodation"
              defaultChecked={defaults?.lookingForAccommodation}
            />
            Looking for accommodation
          </label>
          <Field label="Preferred city / area">
            <Input name="preferredLocation" defaultValue={defaults?.preferredLocation} />
          </Field>
          <Field label="Desired move-in date">
            <Input type="date" name="moveInDate" defaultValue={defaults?.moveInDate} />
          </Field>
          <Field label="Budget">
            <Input name="budget" defaultValue={defaults?.budget} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Accommodation notes">
              <Textarea name="accommodationNotes" defaultValue={defaults?.accommodationNotes} />
            </Field>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>
          Back
        </Button>
        <div className="flex gap-3">
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((value) => value + 1)}>Next</Button>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
