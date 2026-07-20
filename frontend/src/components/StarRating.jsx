import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({ value, onChange, readOnly = false, size = 18 }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-1">
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          data-testid={readOnly ? undefined : `rating-star-${n}`}
          onClick={() => onChange && onChange(n)}
          className={cn("transition-transform", !readOnly && "hover:scale-110 cursor-pointer")}
        >
          <Star
            size={size}
            strokeWidth={1.5}
            className={cn(n <= value ? "fill-accent text-accent" : "text-muted-foreground/40")}
          />
        </button>
      ))}
    </div>
  );
}
