import { Button } from "@/components/ui/button";
import iconFd from "@/assets/images/icon-fd.png";
import { cn } from "@/lib/utils";

interface FortalezaDigitalButtonProps {
  text: string;
  onClick: () => void;
  size?: "sm" | "md" | "lg";
}

export function FortalezaDigitalButton({
  text,
  onClick,
  size = "lg",
}: FortalezaDigitalButtonProps) {
  return (
    <Button
      onClick={onClick}
      size={size === "md" ? "default" : size}
      variant="outline"
      className={cn(
        "border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold rounded-none shadow-lg flex items-center gap-3",
        size === "lg" && "px-8 py-6 my-3 text-lg",
      )}
    >
      <img
        src={iconFd}
        alt="Ícone Fortaleza Digital"
        className={cn(
          size === "lg" ? "w-8 h-8" : size === "md" ? "w-6 h-6" : "w-4 h-4",
          "portal-image",
        )}
      />
      {text}
    </Button>
  );
}
