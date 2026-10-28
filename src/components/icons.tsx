import type { SVGProps } from "react";

/** Stroke icons drawn on a 24px grid; they inherit color from text (currentColor). */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const LampIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 3h8l3 7H5l3-7Z" />
    <path d="M12 10v8M8 21h8M12 18v3" />
  </Icon>
);
export const WindowIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="3" width="16" height="18" rx="1.5" />
    <path d="M12 3v18M4 12h16" />
  </Icon>
);
export const CoffeeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" />
    <path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16M8 2.5c-.8 1 .8 2 0 3.5M12 2.5c-.8 1 .8 2 0 3.5" />
  </Icon>
);
export const DrawerIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="1.5" />
    <path d="M3 12h18M10 8h4M10 16h4" />
  </Icon>
);
export const LaptopIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="4" width="14" height="10" rx="1.2" />
    <path d="M2.5 18h19l-1.5-4H4l-1.5 4Z" />
  </Icon>
);
export const NotebookIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6V3Z" />
    <path d="M6 3v18M4 7h4M4 12h4M4 17h4M10 8h6M10 12h5" />
  </Icon>
);
export const SpinnerIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="5" r="2.6" />
    <circle cx="5.9" cy="15.5" r="2.6" />
    <circle cx="18.1" cy="15.5" r="2.6" />
  </Icon>
);
export const PlayIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 4.5v15l12-7.5-12-7.5Z" fill="currentColor" />
  </Icon>
);
export const PauseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 4.5v15M16 4.5v15" strokeWidth={3} />
  </Icon>
);
export const SkipIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 5l10 7-10 7V5ZM19 5v14" />
  </Icon>
);
export const ResetIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" />
  </Icon>
);
export const MusicIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 18V5l11-2v13" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="17.5" cy="16" r="2.5" />
  </Icon>
);
export const VolumeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9h4l5-4v14l-5-4H4V9Z" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
  </Icon>
);
export const MuteIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9h4l5-4v14l-5-4H4V9Z" />
    <path d="M17 9l5 6M22 9l-5 6" />
  </Icon>
);
export const PaletteIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.9 1.4-1.9-.5-1.2.3-2.1 1.5-2.1H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10Z" />
    <circle cx="7.5" cy="11" r="1.2" fill="currentColor" />
    <circle cx="10.5" cy="7" r="1.2" fill="currentColor" />
    <circle cx="15.5" cy="8" r="1.2" fill="currentColor" />
  </Icon>
);
export const SlidersIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </Icon>
);
export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);
export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </Icon>
);
export const DownloadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </Icon>
);
export const UploadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 16V5M7 10l5-5 5 5M5 20h14" />
  </Icon>
);
export const TimerIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2.5M9 2h6" />
  </Icon>
);
export const FlameIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3c3.5 4 6 6.5 6 10.5a6 6 0 0 1-12 0C6 11 7.5 9 9 7.5c.3 2 1.2 3 2.3 3.5C11 8 11.5 5.5 12 3Z" />
  </Icon>
);
export const SunIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);
export const RainIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 15a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6 1.4A3.5 3.5 0 0 1 17 15H7Z" />
    <path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3" />
  </Icon>
);
export const SnowIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 2v20M4 7l16 10M20 7L4 17M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5" />
  </Icon>
);
export const MoonIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </Icon>
);
export const SunsetIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 16a5 5 0 0 1 10 0M2 16h20M5 20h14M12 3v5M9 6l3 2 3-2M4.6 9.6l1.4 1.4M19.4 9.6L18 11" />
  </Icon>
);
export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
);
export const SparkleIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16Z" />
  </Icon>
);
export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

export const CurtainsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 3h18M5 3c0 6 2 12 4 18H5V3ZM19 3c0 6-2 12-4 18h4V3Z" />
  </Icon>
);
export const FrameIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="3" width="16" height="18" rx="1" />
    <path d="M7 17l3.5-4 2.5 3 2-2 2 3" />
    <circle cx="9" cy="8" r="1.5" />
  </Icon>
);
export const ChairIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 3h10v8H7zM5 11h14v3H5zM7 14v7M17 14v7" />
  </Icon>
);
export const PhoneIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
    <path d="M11 18.5h2" />
  </Icon>
);
export const BedIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 18V6M3 14h18v4M21 18v-4a3 3 0 0 0-3-3h-8v3" />
    <circle cx="6.5" cy="11" r="1.6" />
  </Icon>
);
export const ImageIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 16l5-5 4 4 3-3 6 6" />
    <circle cx="15.5" cy="8.5" r="1.5" />
  </Icon>
);
export const StandIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="4.5" r="2" />
    <path d="M12 7v7M8 10l4-2 4 2M9.5 21l2.5-7 2.5 7" />
  </Icon>
);

export const UserIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Icon>
);

export function MilaMark({ size = 26 }: { size?: number }) {
  // A tiny desk lamp over a book: the Mila mark.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false">
      <path d="M9 4h10l4 8H5l4-8Z" fill="var(--mila-accent)" />
      <path d="M14 12v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 24c3.5-2 7.5-2 11 0 3.5-2 7.5-2 11 0v4c-3.5-2-7.5-2-11 0-3.5-2-7.5-2-11 0v-4Z" fill="currentColor" opacity="0.85" />
      <circle cx="14" cy="13.5" r="2" fill="var(--mila-glow-color)" opacity="0.9" />
    </svg>
  );
}
