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
export const recipesImport = {
  templateColumns: ["title", "recipe_code", "description", "difficulty", "prep_time", "cook_time", "course_title"],
  requiredColumns: ["title"],
  buildPayload: async (rows: Record<string, string>[]) => {
    const titles = [...new Set(rows.map(r => r.course_title).filter(Boolean))];
    let map = new Map<string, string>();
    if (titles.length) {
      const { data, error } = await supabase.from("courses").select("id, title").in("title", titles);
      if (error) throw error;
      map = new Map((data || []).map(c => [c.title.toLowerCase(), c.id]));
    }
    const codes = new Set<string>();
    return rows.map((r, i) => {
      const code = (r.recipe_code || "").trim();
      if (code) {
        if (code.length > 30) throw new Error(`Row ${i + 2}: recipe code "${code}" is longer than 30 characters`);
        if (codes.has(code.toLowerCase())) throw new Error(`Row ${i + 2}: recipe code "${code}" appears twice in the file`);
        codes.add(code.toLowerCase());
      }
      if (r.course_title && !map.get(r.course_title.toLowerCase())) {
        throw new Error(`Row ${i + 2}: course "${r.course_title}" not found`);
      }
      return {
      title: r.title,
      recipe_code: code || null,
      description: r.description || null,
      difficulty: r.difficulty || null,
      prep_time: r.prep_time ? toNum(r.prep_time) : null,
      cook_time: r.cook_time ? toNum(r.cook_time) : null,
      course_id: r.course_title ? map.get(r.course_title.toLowerCase()) ?? null : null,
    };
    });
  },
  /** Insert recipes and link them to their course so they show in the course curriculum. */
  insertRows: async (payload: Record<string, unknown>[]) => {
    const { data, error } = await supabase
      .from("recipes")
      .insert(payload as any)
      .select("id, course_id");
    if (error) {
      if (error.code === "23505") {
        throw new Error("One of the recipe codes in the file is already used by an existing recipe. Use unique codes.");
      }
      throw error;
    }
    const links = (data || [])
      .filter(r => r.course_id)
      .map(r => ({ course_id: r.course_id as string, recipe_id: r.id }));
    if (links.length) {
      const { error: linkErr } = await supabase.from("course_recipes").insert(links);
      if (linkErr) throw linkErr;
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
