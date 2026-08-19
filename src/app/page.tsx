import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { defaultHomePath } from "@/lib/authorization";
import { UnifiedLoginForm } from "@/components/auth/UnifiedLoginForm";
import { AuthBackdrop, AuthBrand } from "@/components/auth/AuthShell";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect(defaultHomePath(session.user.role));
  }
  return (
    <AuthBackdrop>
      <div className="rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
        <AuthBrand />
        <h1 className="text-center text-[1.65rem] font-semibold tracking-tight text-slate-900">
          Welcome back
        </h1>
        <p className="mt-2 mb-8 text-center text-sm text-slate-500">Sign in to continue</p>
        <UnifiedLoginForm />
      </div>
    </AuthBackdrop>
  );
}
