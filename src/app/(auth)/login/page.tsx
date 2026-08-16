import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignInChooser } from "@/components/auth/SignInChooser";
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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">YCMS</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{copy.title}</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">{copy.description}</p>
        <LoginForm errorFromQuery={params.error} />
      </div>
    </div>
  );
}
