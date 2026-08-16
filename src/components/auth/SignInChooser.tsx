import Link from "next/link";
import { ClipboardCheck, Shield, Users, UserRound } from "lucide-react";
import { AuthBackdrop, AuthBrand } from "@/components/auth/AuthShell";
import { CommunityIllustration } from "@/components/auth/CommunityIllustration";

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
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-lg shadow-slate-200/70">
        <div className="grid items-center gap-6 border-b border-slate-100 bg-teal-50/60 px-8 py-6 md:grid-cols-[1fr_220px]">
          <div>
            <AuthBrand />
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Sign in</h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
              Choose your role. Members use an email code. Staff use email and password.
            </p>
          </div>
          <CommunityIllustration className="hidden h-36 w-full md:block" />
        </div>
        <div className="grid gap-4 p-8 sm:grid-cols-2">
          {CHOICES.map((choice) => {
            const Icon = choice.icon;
            return (
              <Link
                key={choice.href}
                href={choice.href}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-600 hover:shadow-md"
              >
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border ${choice.accent}`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
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
