import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MemberLoginForm } from "@/components/auth/MemberLoginForm";
import { AuthBackdrop, AuthBrand } from "@/components/auth/AuthShell";
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
    <AuthBackdrop>
      <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <AuthBrand />
        <h1 className="text-2xl font-semibold text-slate-900">Member login</h1>
        <p className="mt-1 mb-6 text-sm leading-6 text-slate-500">
          Enter the email used when you were registered. We will send a one-time code.
          Members cannot create their own profile.
        </p>
        <MemberLoginForm errorFromQuery={params.error} />
      </div>
    </AuthBackdrop>
  );
}
