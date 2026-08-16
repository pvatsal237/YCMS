/** Simple flat illustration for the sign-in page. Decorative only. */
export function CommunityIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 160"
      className={className}
      role="img"
      aria-label="Youth meetup illustration"
    >
      <rect x="0" y="0" width="280" height="160" rx="20" fill="#f0fdfa" />
      <path d="M0 118h280v42H0z" fill="#ccfbf1" />
      <circle cx="48" cy="36" r="14" fill="#5eead4" />
      <rect x="28" y="92" width="56" height="8" rx="4" fill="#99f6e4" />
      <circle cx="92" cy="78" r="16" fill="#0f766e" />
      <path d="M68 128c0-18 11-28 24-28s24 10 24 28" fill="#134e4a" />
      <circle cx="140" cy="70" r="18" fill="#0d9488" />
      <path d="M112 128c0-22 13-34 28-34s28 12 28 34" fill="#115e59" />
      <circle cx="188" cy="80" r="16" fill="#14b8a6" />
      <path d="M164 128c0-18 11-28 24-28s24 10 24 28" fill="#0f766e" />
      <rect x="214" y="70" width="40" height="58" rx="8" fill="#99f6e4" />
      <rect x="222" y="80" width="24" height="4" rx="2" fill="#0f766e" />
      <rect x="222" y="90" width="18" height="4" rx="2" fill="#5eead4" />
    </svg>
  );
}
