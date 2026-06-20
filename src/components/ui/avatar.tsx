import { cn } from "@/lib/utils";

const TONES = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
];

function toneFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

interface AvatarProps {
  initials: string;
  seed?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Avatar({ initials, seed, className, size = "md" }: AvatarProps) {
  const sizes = {
    sm: "size-7 text-2xs",
    md: "size-9 text-xs",
    lg: "size-12 text-sm",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold",
        sizes[size],
        toneFor(seed ?? initials),
        className,
      )}
    >
      {initials}
    </span>
  );
}
