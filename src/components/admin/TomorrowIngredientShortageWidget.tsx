import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, Loader2, Package, ArrowRight, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, format, formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

interface IngredientRow {
  inventory_id: string;
  name: string;
  unit: string;
  required: number;
  current_stock: number;
  shortfall: number;
}

const TomorrowIngredientShortageWidget = () => {
  const tomorrow = useMemo(() => addDays(new Date(), 1), []);
  const tomorrowStr = format(tomorrow, "yyyy-MM-dd");

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["tomorrow-ingredient-shortage", tomorrowStr],
    staleTime: 5 * 60 * 1000, // 5 min cache — manual refresh forces refetch
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data: bookings, error: bErr } = await supabase
        .from("bookings")
        .select("id, course_id, recipe_id, recipe_ids")
        .eq("booking_date", tomorrowStr)
        .eq("status", "confirmed");
      if (bErr) throw bErr;

      if (!bookings || bookings.length === 0) {
        return { rows: [] as IngredientRow[], totalStudents: 0, recipeCount: 0 };
      }

      // Resolve recipes per booking (explicit IDs, fallback to course_recipes)
      const courseIdsNeedingFallback = new Set<string>();
      for (const b of bookings as any[]) {
        const explicit = [
          ...((b.recipe_ids as string[]) || []),
          ...(b.recipe_id ? [b.recipe_id] : []),
        ].filter(Boolean);
        if (explicit.length === 0 && b.course_id) courseIdsNeedingFallback.add(b.course_id);
      }

      const courseToRecipes: Record<string, string[]> = {};
      if (courseIdsNeedingFallback.size > 0) {
        const { data: cr } = await supabase
          .from("course_recipes")
          .select("course_id, recipe_id")
          .in("course_id", Array.from(courseIdsNeedingFallback));
        for (const r of cr || []) {
          (courseToRecipes[r.course_id] ||= []).push(r.recipe_id);
        }
      }

      // recipe -> student count
      const recipeStudentCount: Record<string, number> = {};
      for (const b of bookings as any[]) {
        const explicit = [
          ...((b.recipe_ids as string[]) || []),
          ...(b.recipe_id ? [b.recipe_id] : []),
        ].filter(Boolean);
        const resolved: string[] =
          explicit.length > 0
            ? Array.from(new Set(explicit))
            : b.course_id
              ? courseToRecipes[b.course_id] || []
              : [];
        for (const rid of resolved) recipeStudentCount[rid] = (recipeStudentCount[rid] || 0) + 1;
      }

      const recipeIds = Object.keys(recipeStudentCount);
      if (recipeIds.length === 0) {
        return { rows: [], totalStudents: bookings.length, recipeCount: 0 };
      }

      const { data: ingr } = await supabase
        .from("recipe_ingredients")
        .select("recipe_id, quantity_per_student, inventory(id, name, unit, current_stock)")
        .in("recipe_id", recipeIds);

      const totals: Record<string, IngredientRow> = {};
      for (const ri of (ingr || []) as any[]) {
        const inv = ri.inventory;
        if (!inv) continue;
        const required = Number(ri.quantity_per_student) * (recipeStudentCount[ri.recipe_id] || 0);
        if (!totals[inv.id]) {
          totals[inv.id] = {
            inventory_id: inv.id,
            name: inv.name,
            unit: inv.unit,
            required: 0,
            current_stock: Number(inv.current_stock) || 0,
            shortfall: 0,
          };
        }
        totals[inv.id].required += required;
      }
      for (const id of Object.keys(totals)) {
        totals[id].shortfall = Math.max(0, totals[id].required - totals[id].current_stock);
      }

      const rows = Object.values(totals).sort((a, b) => b.shortfall - a.shortfall || b.required - a.required);

      return { rows, totalStudents: bookings.length, recipeCount: recipeIds.length };
    },
  });

  const rows = data?.rows || [];
  const shortages = rows.filter((r) => r.shortfall > 0);
  const topRows = (shortages.length > 0 ? shortages : rows).slice(0, 6);

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg md:text-xl font-semibold mb-1 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Tomorrow's Ingredient Requirements
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            {format(tomorrow, "EEE, dd MMM yyyy")} · {data?.totalStudents || 0} student bookings · {data?.recipeCount || 0} recipes
          </p>
          {dataUpdatedAt > 0 && (
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              Updated {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {shortages.length > 0 ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> {shortages.length} shortage{shortages.length > 1 ? "s" : ""}
            </Badge>
          ) : rows.length > 0 ? (
            <Badge variant="outline" className="gap-1 border-green-500 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" /> Stock OK
            </Badge>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1">
            <Link to="/admin/required-daily-ingredients">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Calculating requirements…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No confirmed bookings for tomorrow.
        </div>
      ) : (
        <div className="space-y-3">
          {topRows.map((r) => {
            const pct = r.required > 0 ? Math.min(100, (r.current_stock / r.required) * 100) : 100;
            const short = r.shortfall > 0;
            return (
              <div
                key={r.inventory_id}
                className={`p-3 rounded-lg border ${short ? "border-destructive/50 bg-destructive/5" : "bg-card"}`}
              >
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <div className="font-medium text-sm flex items-center gap-2 min-w-0">
                    {short && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                    <span className="truncate">{r.name}</span>
                  </div>
                  {short ? (
                    <Badge variant="destructive" className="shrink-0">
                      Short {r.shortfall.toFixed(2)} {r.unit}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0">
                      OK
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>
                    Need: <span className="font-semibold text-foreground">{r.required.toFixed(2)} {r.unit}</span>
                  </span>
                  <span>
                    In stock: <span className="font-semibold text-foreground">{r.current_stock.toFixed(2)} {r.unit}</span>
                  </span>
                </div>
                <Progress value={pct} className={short ? "[&>div]:bg-destructive" : ""} />
              </div>
            );
          })}
          {shortages.length > topRows.length && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              + {shortages.length - topRows.length} more shortage(s) — view full list
            </p>
          )}
        </div>
      )}
    </Card>
  );
};

export default TomorrowIngredientShortageWidget;
