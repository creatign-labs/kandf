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
    <Card className={cn("p-6 transition-all hover:shadow-md", variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
            {trendValue && (
              <span className={cn(
                "text-sm font-medium",
                trend === "up" && "text-success",
                trend === "down" && "text-destructive",
                trend === "neutral" && "text-muted-foreground"
              )}>
                {trendValue}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-2">{description}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl bg-background/50", iconStyles[variant])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
};
