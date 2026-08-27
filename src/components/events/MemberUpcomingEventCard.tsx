import Link from "next/link";
import { RegisterEventForm } from "@/components/events/RegisterEventForm";
import { formatEventLongDate, formatTime12h } from "@/lib/dates";
import { eventTitleParts } from "@/utils/format";

export function MemberUpcomingEventCard({
  event,
  href,
  actionLabel,
  action,
  featured = false,
}: {
  event: {
    id: string;
    title: string;
    description: string;
    eventDate: Date;
    startTime: string;
    endTime: string;
    location: string;
    speakerName?: string | null;
    speakerTitle?: string | null;
    speakerOrganization?: string | null;
  };
  href: string;
  actionLabel: string;
  action?: React.ReactNode;
  featured?: boolean;
}) {
  const { heading, subtitle } = eventTitleParts(event.title);
  return (
    <section
      className={
        featured
          ? "rounded-2xl border-2 border-teal-700 bg-white p-8 shadow-lg sm:p-12"
          : "rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      }
    >
      {featured ? (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-800">Upcoming Event</p>
      ) : null}
      <Link href={href} className={featured ? "mt-4 block" : "block"}>
        <h2 className={featured ? "text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl" : "text-lg font-semibold text-teal-800"}>
          {heading}
        </h2>
        {subtitle ? (
          <p className={featured ? "mt-2 text-lg text-slate-700 sm:text-xl" : "mt-1 text-sm text-slate-700"}>{subtitle}</p>
        ) : null}
      </Link>
      <div className={featured ? "mt-8 grid gap-8 lg:grid-cols-2" : "mt-3 space-y-2"}>
        <div className={featured ? "space-y-2 text-base text-slate-800 sm:text-lg" : "space-y-1 text-sm text-slate-600"}>
          <p>{formatEventLongDate(event.eventDate)}</p>
          <p>
            {formatTime12h(event.startTime)} – {formatTime12h(event.endTime)}
          </p>
          <p className="whitespace-pre-line pt-1">{event.location}</p>
        </div>
        <div className={featured ? "space-y-1 text-base text-slate-800 sm:text-lg" : "text-sm text-slate-800"}>
          {event.speakerName ? <p className="font-semibold">{event.speakerName}</p> : null}
          {event.speakerTitle ? <p>{event.speakerTitle}</p> : null}
          {event.speakerOrganization ? <p>{event.speakerOrganization}</p> : null}
        </div>
      </div>
      {event.description ? (
        <p className={featured ? "mt-6 text-base text-slate-700" : "mt-3 text-sm text-slate-700"}>{event.description}</p>
      ) : null}
      <div className={featured ? "mt-8 border-t border-slate-200 pt-6" : "mt-4"}>
        {action ??
          (actionLabel === "Register" || actionLabel === "Spots Full" ? (
            <RegisterEventForm eventId={event.id} label={actionLabel} prominent={featured} />
          ) : (
            <p className="text-sm font-medium text-teal-800">{actionLabel}</p>
          ))}
      </div>
    </section>
  );
}
