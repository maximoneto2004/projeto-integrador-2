import { APP_NAME } from "@/constants/app";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  tone?: "default" | "light";
  className?: string;
};

const SIZES = {
  sm: { icon: "h-9 w-9", text: "text-lg" },
  md: { icon: "h-10 w-10", text: "text-xl" },
  lg: { icon: "h-14 w-14 md:h-20 md:w-20", text: "text-2xl md:text-4xl" },
};

// Mesmas cores de public/logo.svg: pin verde-petróleo, coração branco e cruz laranja.
const TONES = {
  default: {
    pin: "#2C8576",
    coracao: "#FFFFFF",
    cruz: "#E2672A",
    primeira: "text-[#2A2724] dark:text-white",
    segunda: "text-[#2C8576] dark:text-[#86C2B4]",
  },
  light: {
    pin: "#FFFFFF",
    coracao: "#2C8576",
    cruz: "#E2672A",
    primeira: "text-white",
    segunda: "text-[#BFE3DA]",
  },
};

export function BrandLogo({ size = "md", tone = "default", className }: BrandLogoProps) {
  const { icon, text } = SIZES[size];
  const cores = TONES[tone];
  const [primeira, ...resto] = APP_NAME.split(" ");

  return (
    <div className={cn("flex items-center gap-2", className)} aria-label={APP_NAME}>
      <svg viewBox="0 0 64 64" className={cn(icon, "shrink-0")} aria-hidden="true">
        <path d="M32 61C32 61 11 41.5 11 26a21 21 0 0 1 42 0C53 41.5 32 61 32 61Z" fill={cores.pin} />
        <path
          d="M32 39.5S19.5 32.2 19.5 23.8c0-4.1 3.1-6.8 6.5-6.8 2.5 0 4.7 1.4 6 3.6 1.3-2.2 3.5-3.6 6-3.6 3.4 0 6.5 2.7 6.5 6.8C44.5 32.2 32 39.5 32 39.5Z"
          fill={cores.coracao}
        />
        <rect x="30.2" y="21" width="3.6" height="10.4" rx="1.2" fill={cores.cruz} />
        <rect x="26.8" y="24.4" width="10.4" height="3.6" rx="1.2" fill={cores.cruz} />
      </svg>
      <span className={cn(text, "font-extrabold leading-tight tracking-tight")}>
        <span className={cores.primeira}>{primeira}</span> <span className={cores.segunda}>{resto.join(" ")}</span>
      </span>
    </div>
  );
}
