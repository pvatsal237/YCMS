import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthBackdrop, AuthBrand } from "@/components/auth/AuthShell";
import { defaultHomePath } from "@/lib/authorization";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect(defaultHomePath(session.user.role));
  const params = await searchParams;
  return (
    <AuthBackdrop>
      <div className="rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
        <AuthBrand />
        <h1 className="text-center text-[1.65rem] font-semibold tracking-tight text-slate-900">Sign in</h1>
        <p className="mt-2 mb-8 text-center text-sm text-slate-500">We will email you a 6-digit code. No password needed.</p>
        <LoginForm errorFromQuery={params.error} nextPath={params.next} />
      </div>
    </AuthBackdrop>
  );
}
