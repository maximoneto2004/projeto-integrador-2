import { HeartPulse } from "lucide-react";
import { APP_NAME } from "@/constants/app";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  tone?: "default" | "light";
  className?: string;
};

const SIZES = {
  sm: { icon: "h-6 w-6", text: "text-sm" },
  md: { icon: "h-9 w-9", text: "text-lg" },
  lg: { icon: "h-14 w-14 md:h-20 md:w-20", text: "text-xl md:text-3xl" },
};

export function BrandLogo({ size = "md", tone = "default", className }: BrandLogoProps) {
  const { icon, text } = SIZES[size];
  const cor = tone === "light" ? "text-white" : "text-primary";

  return (
    <div className={cn("flex items-center gap-2", className)} aria-label={APP_NAME}>
      <HeartPulse className={cn(icon, cor, "shrink-0")} aria-hidden="true" />
      <span className={cn(text, cor, "font-extrabold leading-tight tracking-tight")}>{APP_NAME}</span>
    </div>
  );
}
