import Link from "next/link";
import { ClipboardCheck, Shield, Users, UserRound } from "lucide-react";
import { AuthBackdrop, AuthBrand } from "@/components/auth/AuthShell";

const CHOICES = [
  {
    href: "/member-login",
    title: "Member",
    description: "Email one-time code. No password.",
    icon: UserRound,
    accent: "bg-teal-50 text-teal-800 border-teal-200",
  },
  {
    href: "/login?role=admin",
    title: "Administrator",
    description: "Email and password.",
    icon: Shield,
    accent: "bg-slate-100 text-slate-800 border-slate-200",
  },
  {
    href: "/login?role=coordinator",
    title: "Youth Coordinator",
    description: "Email and password.",
    icon: Users,
    accent: "bg-slate-100 text-slate-800 border-slate-200",
  },
  {
    href: "/login?role=volunteer",
    title: "Attendance Volunteer",
    description: "Email and password.",
    icon: ClipboardCheck,
    accent: "bg-slate-100 text-slate-800 border-slate-200",
  },
] as const;

export function SignInChooser() {
  return (
    <AuthBackdrop>
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-8 shadow-lg shadow-slate-200/70 backdrop-blur">
        <AuthBrand />
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Sign in</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Choose your role to continue. Members cannot create their own profile — an
          administrator or coordinator must register you first.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {CHOICES.map((choice) => {
            const Icon = choice.icon;
            return (
              <Link
                key={choice.href}
                href={choice.href}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-600 hover:shadow-md"
              >
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border ${choice.accent}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="mt-4 block text-base font-semibold text-slate-900 group-hover:text-teal-800">
                  {choice.title}
                </span>
                <span className="mt-1 block text-sm text-slate-500">{choice.description}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </AuthBackdrop>
  );
}
