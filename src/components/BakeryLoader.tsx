import { Cake, CakeSlice, Cookie, Croissant, Wheat } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = [Croissant, Cookie, Cake, CakeSlice, Wheat];

interface BakeryLoaderProps {
  message?: string;
  fullPage?: boolean;
  className?: string;
}

/**
 * Engaging loading indicator: bakery icons bobbing in a wave.
 * Use fullPage for route-level loading screens, inline for content areas.
 */
export function BakeryLoader({ message = "Loading...", fullPage = false, className }: BakeryLoaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-background",
        fullPage && "min-h-screen",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <div className="flex items-end justify-center gap-3 mb-5">
          {ICONS.map((Icon, i) => (
            <span
              key={i}
              className="bakery-bob inline-flex text-primary"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <Icon className="h-8 w-8" strokeWidth={1.75} />
            </span>
          ))}
        </div>
        <p className="text-muted-foreground font-medium">{message}</p>
      </div>
    </div>
  );
}
