import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  helperText?: string;
  label?: string;
  buttonText?: string;
  loading?: boolean;
  disabled?: boolean;
};

export function CidadaoSearchBar({
  value,
  onChange,
  onSearch,
  placeholder,
  helperText,
  label,
  buttonText = "Buscar",
  loading = false,
  disabled = false,
}: Props) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
      <div className="flex gap-2 items-center">
        <div className="flex-1 space-y-2">
          {label && <Label>{label}</Label>}
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={loading || disabled}
          />
        </div>
        <Button type="submit" className="gap-2" disabled={loading || disabled}>
          {buttonText}
        </Button>
      </div>
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
    </form>
  );
}
