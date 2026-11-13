export function AppLogo({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="appLogoFrameBg"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#1c1c20" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>
        <linearGradient
          id="appLogoWarmLight"
          x1="10"
          y1="8"
          x2="22"
          y2="24"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient
          id="appLogoCoolFilter"
          x1="12"
          y1="8"
          x2="22"
          y2="24"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>

      {/* Outer film chassis */}
      <rect width="32" height="32" rx="7" fill="url(#appLogoFrameBg)" />
      <rect
        x="0.75"
        y="0.75"
        width="30.5"
        height="30.5"
        rx="6.25"
        stroke="#27272a"
        strokeWidth="1.5"
      />

      {/* Film Sprocket holes (35mm) */}
      <rect x="5" y="3.5" width="3" height="2" rx="0.6" fill="#3f3f46" />
      <rect x="11" y="3.5" width="3" height="2" rx="0.6" fill="#3f3f46" />
      <rect x="18" y="3.5" width="3" height="2" rx="0.6" fill="#3f3f46" />
      <rect x="24" y="3.5" width="3" height="2" rx="0.6" fill="#3f3f46" />

      <rect x="5" y="26.5" width="3" height="2" rx="0.6" fill="#3f3f46" />
      <rect x="11" y="26.5" width="3" height="2" rx="0.6" fill="#3f3f46" />
      <rect x="18" y="26.5" width="3" height="2" rx="0.6" fill="#3f3f46" />
      <rect x="24" y="26.5" width="3" height="2" rx="0.6" fill="#3f3f46" />

      {/* Inner 3:2 negative frame */}
      <rect
        x="4.5"
        y="7.5"
        width="23"
        height="17"
        rx="3"
        fill="#121215"
        stroke="#27272a"
        strokeWidth="1"
      />

      {/* Aperture ring & chromatic light filter */}
      <circle
        cx="16"
        cy="16"
        r="6"
        stroke="url(#appLogoWarmLight)"
        strokeWidth="1.75"
      />
      <path
        d="M16 10C19.3137 10 22 12.6863 22 16C22 19.3137 19.3137 22 16 22"
        stroke="url(#appLogoCoolFilter)"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="2.5" fill="url(#appLogoWarmLight)" />
      <circle cx="18.5" cy="13.5" r="0.8" fill="#ffffff" />
    </svg>
  );
}
