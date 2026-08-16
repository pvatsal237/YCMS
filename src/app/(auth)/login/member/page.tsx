import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MemberLoginForm } from "@/components/auth/MemberLoginForm";
import { defaultHomePath } from "@/lib/authorization";

export default async function MemberLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect(defaultHomePath(session.user.role));
  }
  const params = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">YCMS</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Member sign in</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          Enter the email used when a coordinator registered you. We will send a one-time code.
          Members cannot create their own profile.
        </p>
        <MemberLoginForm errorFromQuery={params.error} />
      </div>
    </div>
  );
}
