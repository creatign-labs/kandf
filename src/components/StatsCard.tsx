import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "primary" | "success" | "warning";
}

export const StatsCard = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendValue,
  variant = "default",
}: StatsCardProps) => {
  const variantStyles = {
    default: "bg-card border-border/60",
    primary: "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20",
    success: "bg-gradient-to-br from-success/10 to-success/5 border-success/20",
    warning: "bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20",
  };

  const iconStyles = {
    default: "text-foreground",
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
  };

  return (
    <Card className={cn("p-3 md:p-6 transition-all hover:shadow-md", variantStyles[variant])}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2 truncate">{title}</p>
          <div className="flex items-baseline gap-1 md:gap-2">
            <h3 className="text-xl md:text-3xl font-bold tracking-tight">{value}</h3>
            {trendValue && (
              <span className={cn(
                "text-xs md:text-sm font-medium",
                trend === "up" && "text-success",
                trend === "down" && "text-destructive",
                trend === "neutral" && "text-muted-foreground"
              )}>
                {trendValue}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-2 truncate">{description}</p>
          )}
        </div>
        <div className={cn("p-2 md:p-3 rounded-lg md:rounded-xl bg-background/50 flex-shrink-0", iconStyles[variant])}>
          <Icon className="h-4 w-4 md:h-6 md:w-6" />
        </div>
      </div>
    </Card>
  );
};
