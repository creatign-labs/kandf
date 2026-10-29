import { supabase } from "@/integrations/supabase/client";

// Utility: split comma/pipe separated string into trimmed array
const toList = (v: string): string[] =>
  (v || "")
    .split(/[|,;]/)
    .map(s => s.trim())
    .filter(Boolean);

const toNum = (v: string, def = 0): number => {
  const n = Number((v || "").toString().trim());
  return Number.isFinite(n) ? n : def;
};

const toDate = (v: string): string | null => {
  const s = (v || "").trim();
  if (!s) return null;
  return s;
};

const canonicalDay = (d: string): string => {
  const map: Record<string, string> = {
    mon: "Monday", monday: "Monday",
    tue: "Tuesday", tues: "Tuesday", tuesday: "Tuesday",
    wed: "Wednesday", weds: "Wednesday", wednesday: "Wednesday",
    thu: "Thursday", thurs: "Thursday", thursday: "Thursday",
    fri: "Friday", friday: "Friday",
    sat: "Saturday", saturday: "Saturday",
    sun: "Sunday", sunday: "Sunday",
  };
  return map[d.toLowerCase()] ?? d;
};

// -------- COURSES --------
export const coursesImport = {
  templateColumns: ["title", "description", "duration", "level", "base_fee", "course_code", "days_of_week"],
  requiredColumns: ["title", "duration", "level", "base_fee"],
  buildPayload: (rows: Record<string, string>[]) =>
    rows.map(r => ({
      title: r.title,
      description: r.description || null,
      duration: r.duration,
      level: r.level,
      base_fee: toNum(r.base_fee),
      course_code: r.course_code || null,
      days_of_week: toList(r.days_of_week).map(canonicalDay),
    })),
};

// -------- BATCHES --------
export const batchesImport = {
  templateColumns: ["course_title", "batch_name", "time_slot", "total_seats", "start_date", "end_date", "days_of_week"],
  requiredColumns: ["course_title", "batch_name", "time_slot", "total_seats"],
  buildPayload: async (rows: Record<string, string>[]) => {
    const titles = [...new Set(rows.map(r => r.course_title))];
    const { data: courses, error } = await supabase
      .from("courses")
      .select("id, title")
      .in("title", titles);
    if (error) throw error;
    const map = new Map((courses || []).map(c => [c.title.toLowerCase(), c.id]));
    return rows.map((r, i) => {
      const cid = map.get(r.course_title.toLowerCase());
      if (!cid) throw new Error(`Row ${i + 2}: course "${r.course_title}" not found`);
      const seats = toNum(r.total_seats, 30);
      return {
        course_id: cid,
        batch_name: r.batch_name,
        time_slot: r.time_slot,
        total_seats: seats,
        available_seats: seats,
        start_date: toDate(r.start_date),
        end_date: toDate(r.end_date),
        days_of_week: toList(r.days_of_week).map(canonicalDay),
      };
    });
  },
};

// -------- RECIPES --------
// Columns mirror the "Add New Recipe" form exactly. One row per ingredient;
// repeat the recipe title/code/video on each row of the same recipe.
const R = {
  title: "Recipe Title",
  code: "Recipe Code",
  video: "YouTube Video URL",
  ingredient: "Ingredient Name",
  qty: "Quantity per Student",
  unit: "Unit",
} as const;
const RECIPE_UNITS = ["ml", "g", "pieces"];

let inventoryCache: Promise<Map<string, { id: string; unit: string }>> | null = null;
const loadInventory = () => {
  if (!inventoryCache) {
    inventoryCache = (async () => {
      const { data, error } = await supabase.from("inventory").select("id, name, unit");
      if (error) { inventoryCache = null; throw error; }
      return new Map((data || []).map(i => [i.name.trim().toLowerCase(), { id: i.id, unit: i.unit }]));
    })();
  }
  return inventoryCache;
};

export const recipesImport = {
  templateColumns: [R.title, R.code, R.video, R.ingredient, R.qty, R.unit],
  requiredColumns: [R.title],
  templateSample: [
    ["Apple Pie", "RCP-001", "https://www.youtube.com/watch?v=xxxx", "Flour", "250", "g"],
    ["Apple Pie", "RCP-001", "https://www.youtube.com/watch?v=xxxx", "Butter", "100", "g"],
    ["Apple Pie", "RCP-001", "https://www.youtube.com/watch?v=xxxx", "Milk", "50", "ml"],
    ["Chocolate Brownie", "RCP-002", "", "Eggs", "2", "pieces"],
  ],
  templateHint:
    "One row per ingredient. For a recipe with several ingredients, repeat the same Recipe Title, Code and Video URL on each row. Ingredient names must match items in Inventory. Unit: ml, g or pieces.",
  validateRow: async (r: Record<string, string>, _i: number, all: Record<string, string>[]) => {
    const title = (r[R.title] || "").trim();
    const code = (r[R.code] || "").trim();
    if (title.length > 100) return "Recipe title must be 100 characters or less";
    if (code.length > 20) return "Recipe code must be 20 characters or less";
    const video = (r[R.video] || "").trim();
    if (video && !/^https?:\/\//i.test(video)) return "Video URL must start with http:// or https://";
    // Same title must keep the same code across rows
    const clash = all.find(o => (o[R.title] || "").trim().toLowerCase() === title.toLowerCase() && (o[R.code] || "").trim() !== code);
    if (clash) return `Recipe "${title}" has different codes on different rows`;
    const codeClash = code && all.find(o => (o[R.code] || "").trim().toLowerCase() === code.toLowerCase() && (o[R.title] || "").trim().toLowerCase() !== title.toLowerCase());
    if (codeClash) return `Code "${code}" is used for two different recipes`;
    const ing = (r[R.ingredient] || "").trim();
    const qty = (r[R.qty] || "").trim();
    const unit = (r[R.unit] || "").trim().toLowerCase();
    if (!ing) {
      if (qty || unit) return "Ingredient Name is missing";
      return null;
    }
    const inv = await loadInventory();
    if (!inv.get(ing.toLowerCase())) return `Ingredient "${ing}" not found in Inventory`;
    const n = Number(qty);
    if (!qty || !Number.isFinite(n) || n <= 0) return "Quantity per Student must be a number above 0";
    if (unit && !RECIPE_UNITS.includes(unit)) return "Unit must be ml, g or pieces";
    return null;
  },
  buildPayload: async (rows: Record<string, string>[]) => {
    inventoryCache = null; // refresh
    const inv = await loadInventory();
    const groups = new Map<string, { title: string; recipe_code: string | null; video_url: string | null; ingredients: { inventory_id: string; quantity_per_student: number; unit: string }[] }>();
    rows.forEach(r => {
      const title = r[R.title].trim();
      const key = title.toLowerCase();
      if (!groups.has(key)) {
        groups.set(key, {
          title,
          recipe_code: (r[R.code] || "").trim() || null,
          video_url: (r[R.video] || "").trim() || null,
          ingredients: [],
        });
      }
      const g = groups.get(key)!;
      if (!g.video_url && r[R.video]?.trim()) g.video_url = r[R.video].trim();
      const ing = (r[R.ingredient] || "").trim();
      if (ing) {
        const item = inv.get(ing.toLowerCase())!;
        const id = item.id;
        const unit = (r[R.unit] || "").trim().toLowerCase() || "g";
        const qty = Number(r[R.qty]);
        const existing = g.ingredients.find(x => x.inventory_id === id);
        if (existing) existing.quantity_per_student += qty;
        else g.ingredients.push({ inventory_id: id, quantity_per_student: qty, unit });
      }
    });
    const list = [...groups.values()];
    const codes = list.map(g => g.recipe_code).filter(Boolean) as string[];
    if (codes.length) {
      const { data, error } = await supabase.from("recipes").select("title, recipe_code").not("recipe_code", "is", null);
      if (error) throw error;
      const used = new Map((data || []).map(d => [String(d.recipe_code).trim().toLowerCase(), d.title]));
      for (const c of codes) {
        const t = used.get(c.toLowerCase());
        if (t) throw new Error(`Recipe code "${c}" is already used by "${t}". Use a unique code.`);
      }
    }
    return list as unknown as Record<string, unknown>[];
  },
  /** Insert recipes, then their ingredient lists — same as the manual Add Recipe form. */
  insertRows: async (payload: Record<string, unknown>[]) => {
    const list = payload as unknown as { title: string; recipe_code: string | null; video_url: string | null; ingredients: { inventory_id: string; quantity_per_student: number; unit: string }[] }[];
    const { data, error } = await supabase
      .from("recipes")
      .insert(list.map(g => ({ title: g.title, recipe_code: g.recipe_code, video_url: g.video_url })) as any)
      .select("id, title");
    if (error) {
      if (error.code === "23505") {
        throw new Error("One of the recipe codes in the file is already used by an existing recipe. Use unique codes.");
      }
      throw error;
    }
    const idByTitle = new Map((data || []).map(d => [d.title.toLowerCase(), d.id]));
    const ingRows = list.flatMap(g =>
      g.ingredients.map(i => ({ recipe_id: idByTitle.get(g.title.toLowerCase())!, ...i }))
    );
    if (ingRows.length) {
      const { error: ingErr } = await supabase.from("recipe_ingredients").insert(ingRows);
      if (ingErr) throw ingErr;
    }
    return data?.length ?? 0;
  },
};

// -------- RECIPE INGREDIENTS --------
export const recipeIngredientsImport = {
  templateColumns: ["recipe_title", "ingredient_name", "quantity_per_student", "unit", "notes"],
  requiredColumns: ["recipe_title", "ingredient_name", "quantity_per_student"],
  buildPayload: async (rows: Record<string, string>[]) => {
    const recipeTitles = [...new Set(rows.map(r => r.recipe_title))];
    const ingredientNames = [...new Set(rows.map(r => r.ingredient_name))];
    const [{ data: recs, error: e1 }, { data: invs, error: e2 }] = await Promise.all([
      supabase.from("recipes").select("id, title").in("title", recipeTitles),
      supabase.from("inventory").select("id, name, unit").in("name", ingredientNames),
    ]);
    if (e1) throw e1; if (e2) throw e2;
    const recMap = new Map((recs || []).map(r => [r.title.toLowerCase(), r.id]));
    const invMap = new Map((invs || []).map(i => [i.name.toLowerCase(), i]));
    return rows.map((r, i) => {
      const rid = recMap.get(r.recipe_title.toLowerCase());
      const inv = invMap.get(r.ingredient_name.toLowerCase());
      if (!rid) throw new Error(`Row ${i + 2}: recipe "${r.recipe_title}" not found`);
      if (!inv) throw new Error(`Row ${i + 2}: ingredient "${r.ingredient_name}" not found`);
      return {
        recipe_id: rid,
        inventory_id: inv.id,
        quantity_per_student: toNum(r.quantity_per_student),
        unit: r.unit || inv.unit,
        notes: r.notes || null,
      };
    });
  },
};

// -------- INVENTORY --------
export const inventoryImport = {
  templateColumns: ["name", "category", "unit", "current_stock", "reorder_level", "cost_per_unit"],
  requiredColumns: ["name", "unit"],
  buildPayload: (rows: Record<string, string>[]) =>
    rows.map(r => ({
      name: r.name,
      category: r.category || null,
      unit: r.unit,
      current_stock: toNum(r.current_stock),
      reorder_level: toNum(r.reorder_level, 10),
      cost_per_unit: r.cost_per_unit ? toNum(r.cost_per_unit) : null,
    })),
};
