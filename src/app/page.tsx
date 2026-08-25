import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { defaultHomePath, APP_NAME, APP_SHORT_NAME } from "@/lib/authorization";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect(defaultHomePath(session.user.role));
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white px-8 py-10 shadow-sm">
        <p className="text-center text-xs font-semibold tracking-[0.2em] text-teal-800">{APP_SHORT_NAME}</p>
        <h1 className="mt-3 text-center text-2xl font-semibold tracking-tight text-stone-900">{APP_NAME}</h1>
        <p className="mt-2 mb-8 text-center text-sm text-stone-500">
          Sign in with Google to register for meetups, request guidance, or coordinate events.
        </p>
        <GoogleSignInButton callbackUrl={params.callbackUrl} />
        <p className="mt-6 text-center text-xs text-stone-400">
          Coordinators must use an approved Google account. Everyone else joins as a member.
        </p>
      </div>
    </main>
  );
}
