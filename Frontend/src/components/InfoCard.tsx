import { LucideIcon } from "lucide-react";

interface InfoCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  variant?: "orange" | "default";
}

export const InfoCard = ({ icon: Icon, title, description, variant = "default" }: InfoCardProps) => {
  const gradientClass = variant === "orange" 
    ? "bg-gradient-to-br from-primary via-orange-300 to-orange-50"
    : "bg-gradient-card";
  
  return (
    <div className="flex gap-4 items-start">
      <div className={`${gradientClass} p-6 rounded-2xl shadow-md min-w-[100px] h-[100px] flex items-center justify-center`}>
        <Icon className="w-12 h-12 text-white" strokeWidth={2} />
      </div>
      <div className="flex-1 pt-2">
        <h3 className="font-bold text-lg mb-2 text-foreground">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
};
