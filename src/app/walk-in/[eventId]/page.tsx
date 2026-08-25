import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { eventTimeLabel } from "@/services/events";
import { APP_NAME } from "@/lib/authorization";
import { WalkInJoin } from "@/components/events/WalkInJoin";

export default async function WalkInPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { eventId } = await params;
  const { t } = await searchParams;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || !t || event.walkInToken !== t) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">This walk-in link is not valid.</h1>
      </main>
    );
  }
  const session = await auth();
  const callback = `/walk-in/${eventId}?t=${t}`;

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <p className="text-xs font-semibold tracking-[0.2em] text-teal-800">{APP_NAME}</p>
        <h1 className="mt-2 text-2xl font-semibold">{event.title}</h1>
        <p className="text-stone-600">{eventTimeLabel(event)}</p>
        <p className="mt-4 text-sm text-stone-500">Sign in with Google to join today’s meetup.</p>
        <div className="mt-6">
          <GoogleSignInButton callbackUrl={callback} label="Sign in to register" />
        </div>
      </main>
    );
  }

  if (session.user.role !== "MEMBER") {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p>Walk-in registration is for members. Coordinators should use Event Check-In.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl font-semibold">{event.title}</h1>
      <p className="text-stone-600">{eventTimeLabel(event)}</p>
      <WalkInJoin eventId={eventId} token={t} />
    </main>
  );
}
