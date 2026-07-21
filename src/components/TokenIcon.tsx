import budolLogoImage from "../../public/assets/budol-market.png";

type TokenIconProps = {
  symbol?: string;
};

export function TokenIcon({ symbol }: TokenIconProps) {
  const normalized = tokenClass(symbol);
  if (normalized === "budol") {
    return <img src={budolLogoImage} alt="" />;
  }
  if (normalized === "zen") {
    return (
      <svg viewBox="0 0 48 48" role="img">
        <rect width="48" height="48" rx="8" fill="#f6c515" />
        <path
          d="M36.5 9.8C29.5 4.6 18.9 4.9 12.1 10.9 5.2 17.1 4.4 27.4 9.9 34.6l7.1-7.1c-1.1-3.2-.2-6.8 2.4-9.1 2.9-2.6 7.2-2.8 10.3-.7L36.5 9.8Z"
          fill="#071328"
        />
        <path
          d="M11.4 38.2c7 5.2 17.7 4.9 24.5-1.1 6.9-6.2 7.7-16.5 2.2-23.7l-7.1 7.1c1.1 3.2.2 6.8-2.4 9.1-2.9 2.6-7.2 2.8-10.3.7l-6.9 7.9Z"
          fill="#071328"
        />
        <path
          d="M13.5 31.2c5.9-7.8 14-11.5 23.4-10.1-5.8 1.5-11.7 3.5-18.7 8.2l-4.7 1.9Z"
          fill="#f6c515"
        />
      </svg>
    );
  }
  if (normalized === "eth") {
    return (
      <svg viewBox="0 0 48 48" role="img">
        <defs>
          <linearGradient id="eth-token-gradient" x1="12" x2="36" y1="6" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f6f9ff" />
            <stop offset=".48" stopColor="#8ea7ff" />
            <stop offset="1" stopColor="#536dfe" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="20" fill="#102033" />
        <path d="M24 6 13 25l11 6 11-6L24 6Z" fill="url(#eth-token-gradient)" />
        <path d="M13 27.5 24 42l11-14.5-11 6-11-6Z" fill="#7f92ff" />
        <path d="m24 6v25l11-6L24 6Z" fill="#dfe6ff" opacity=".52" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" role="img">
      <circle cx="24" cy="24" r="20" fill="currentColor" opacity=".25" />
      <circle cx="24" cy="24" r="5" fill="currentColor" />
    </svg>
  );
}

export function tokenClass(value?: string) {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("budol")) return "budol";
  if (normalized.includes("zen")) return "zen";
  if (normalized.includes("eth")) return "eth";
  return "token";
}
