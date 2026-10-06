import { cn, initials } from "@/lib/utils";

const SIZES = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
} as const;

const TONES = {
  light: "bg-slate-100 text-slate-700",
  dark: "bg-slate-900 text-white",
  blue: "bg-blue-50 text-blue-700",
} as const;

/** Round initials avatar (no remote images in this system). */
export function Avatar({
  name,
  size = "md",
  tone = "light",
  className,
}: {
  name: string | null | undefined;
  size?: keyof typeof SIZES;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        SIZES[size],
        TONES[tone],
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
