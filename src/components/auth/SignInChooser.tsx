import Link from "next/link";
import { AuthBackdrop, AuthBrand } from "@/components/auth/AuthShell";

const CHOICES = [
  {
    href: "/member-login",
    title: "Member",
    description: "Sign in with an email code. No password.",
  },
  {
    href: "/login?role=admin",
    title: "Administrator",
    description: "Sign in with email and password.",
  },
  {
    href: "/login?role=coordinator",
    title: "Youth Coordinator",
    description: "Sign in with email and password.",
  },
  {
    href: "/login?role=volunteer",
    title: "Attendance Volunteer",
    description: "Sign in with email and password.",
  },
] as const;

export function SignInChooser() {
  return (
    <AuthBackdrop>
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <AuthBrand />
        <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Choose your role. Members use an email code. Staff use email and password.
        </p>
        <div className="mt-6 grid gap-3">
          {CHOICES.map((choice) => (
            <Link
              key={choice.href}
              href={choice.href}
              className="rounded-lg border border-slate-200 px-4 py-3 hover:border-teal-700 hover:bg-slate-50"
            >
              <span className="block font-medium text-slate-900">{choice.title}</span>
              <span className="mt-0.5 block text-sm text-slate-600">{choice.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </AuthBackdrop>
  );
}
