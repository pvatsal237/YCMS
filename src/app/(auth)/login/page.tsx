import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignInChooser } from "@/components/auth/SignInChooser";
import { AuthBackdrop, AuthBrand } from "@/components/auth/AuthShell";
import { defaultHomePath } from "@/lib/authorization";

const ROLE_COPY: Record<string, { title: string; description: string }> = {
  admin: {
    title: "Administrator login",
    description: "Use your administrator email and password.",
  },
  coordinator: {
    title: "Youth Coordinator login",
    description: "Use your coordinator email and password.",
  },
  volunteer: {
    title: "Attendance Volunteer login",
    description: "Use your volunteer email and password.",
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; role?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect(defaultHomePath(session.user.role));
  }
  const params = await searchParams;
  const copy = ROLE_COPY[params.role ?? ""];
  if (!copy) {
    return <SignInChooser />;
  }
  return (
    <AuthBackdrop>
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200/80 bg-white/90 p-8 shadow-lg shadow-slate-200/70 backdrop-blur">
        <AuthBrand />
        <h1 className="text-2xl font-semibold text-slate-900">{copy.title}</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">{copy.description}</p>
        <LoginForm errorFromQuery={params.error} />
      </div>
    </AuthBackdrop>
  );
}
