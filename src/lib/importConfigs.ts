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


const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// Days are stored the same way the forms save them: Mon, Tue, ...
const canonicalDay = (d: string): string => {
  const k = d.trim().toLowerCase().slice(0, 3);
  return SHORT_DAYS.find(s => s.toLowerCase() === k) ?? d.trim();
};
const parseDays = (v: string) => [...new Set(toList(v).map(canonicalDay))];
const badDays = (days: string[]) => days.filter(d => !SHORT_DAYS.includes(d));

/** Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY (and M/D/YYYY when unambiguous). Returns YYYY-MM-DD or "invalid". */
const parseDate = (v: string): string | null | "invalid" => {
  const s = (v || "").trim();
  if (!s) return null;
  let y: number, m: number, d: number;
  let mt = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (mt) { y = +mt[1]; m = +mt[2]; d = +mt[3]; }
  else if ((mt = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s))) {
    let a = +mt[1], b = +mt[2]; y = +mt[3]; if (y < 100) y += 2000;
    if (b > 12 && a <= 12) { m = a; d = b; } else { d = a; m = b; }
  } else return "invalid";
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return "invalid";
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

/** Accepts "9:00 AM", "9 am", "09:00", "13:30". Returns the form's "9:00 AM" style or null. */
const parseTime = (v: string): string | null => {
  const s = (v || "").trim().toUpperCase();
  const mt = /^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(AM|PM)?$/.exec(s);
  if (!mt) return null;
  let h = +mt[1]; const min = mt[2] ?? "00"; let ap = mt[3];
  if (+min > 59) return null;
  if (!ap) { if (h > 23) return null; ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; }
  else if (h < 1 || h > 12) return null;
  return `${h}:${min} ${ap}`;
};

const isNonNegNum = (v: string) => v.trim() === "" || (Number.isFinite(Number(v)) && Number(v) >= 0);

// -------- COURSES --------
// Columns mirror the "Add Course" form.
const C = {
  title: "Course Title", code: "Course Code", months: "Duration Months", days: "Duration Days",
  fee: "Base Fee", level: "Level", week: "Days of the Week", recipes: "Recipe Codes",
} as const;
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
let recipeCodeCache: Promise<Map<string, string>> | null = null;
const loadRecipeCodes = () => {
  if (!recipeCodeCache) {
    recipeCodeCache = (async () => {
      const { data, error } = await supabase.from("recipes").select("id, recipe_code").not("recipe_code", "is", null);
      if (error) { recipeCodeCache = null; throw error; }
      return new Map((data || []).map(r => [String(r.recipe_code).trim().toLowerCase(), r.id]));
    })();
  }
  return recipeCodeCache;
};
const formatDuration = (months: number, days: number) => {
  const parts: string[] = [];
  if (months > 0) parts.push(`${months} month${months > 1 ? "s" : ""}`);
  if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
  return parts.join(" ");
};

export const coursesImport = {
  templateColumns: [C.title, C.code, C.months, C.days, C.fee, C.level, C.week, C.recipes],
  requiredColumns: [C.title, C.fee, C.level],
  templateSample: [
    ["Diploma in Baking", "DIB", "3", "0", "45000", "Beginner", "Mon, Wed, Fri", "RCP-001, RCP-002"],
    ["Advanced Pastry", "ADP", "1", "15", "30000", "Advanced", "Sat, Sun", ""],
  ],
  templateHint:
    "Duration: months (0-12) and/or days (0-31), at least one above 0. Level: Beginner, Intermediate or Advanced. Days: Mon, Tue, Wed, Thu, Fri, Sat, Sun separated by commas. Recipe Codes (optional): codes of existing recipes, separated by commas.",
  validateRow: async (r: Record<string, string>, i: number, all: Record<string, string>[]) => {
    if (i === 0) recipeCodeCache = null;
    if (r[C.title].length > 100) return "Course title must be 100 characters or less";
    const mo = (r[C.months] || "0").trim(), dy = (r[C.days] || "0").trim();
    if (!/^\d+$/.test(mo) || +mo > 12) return "Duration Months must be a whole number 0-12";
    if (!/^\d+$/.test(dy) || +dy > 31) return "Duration Days must be a whole number 0-31";
    if (+mo === 0 && +dy === 0) return "Duration is required (months or days above 0)";
    const fee = Number(r[C.fee]);
    if (!Number.isFinite(fee) || fee <= 0) return "Base Fee must be a number above 0";
    if (!LEVELS.some(l => l.toLowerCase() === r[C.level].trim().toLowerCase())) return "Level must be Beginner, Intermediate or Advanced";
    const bad = badDays(parseDays(r[C.week]));
    if (bad.length) return `Unknown day(s): ${bad.join(", ")}`;
    const code = (r[C.code] || "").trim().toUpperCase();
    if (code && all.filter(o => (o[C.code] || "").trim().toUpperCase() === code).length > 1) return `Course code "${code}" appears twice in the file`;
    const codes = toList(r[C.recipes]);
    if (codes.length) {
      const map = await loadRecipeCodes();
      const missing = codes.filter(c => !map.has(c.toLowerCase()));
      if (missing.length) return `Recipe code(s) not found: ${missing.join(", ")}`;
    }
    return null;
  },
  buildPayload: async (rows: Record<string, string>[]) => {
    const map = await loadRecipeCodes();
    return rows.map(r => ({
      course: {
        title: r[C.title].trim(),
        course_code: (r[C.code] || "").trim().toUpperCase() || null,
        description: "",
        duration: formatDuration(+(r[C.months] || 0), +(r[C.days] || 0)),
        level: LEVELS.find(l => l.toLowerCase() === r[C.level].trim().toLowerCase())!,
        base_fee: Number(r[C.fee]),
        days_of_week: parseDays(r[C.week]),
      },
      recipe_ids: [...new Set(toList(r[C.recipes]).map(c => map.get(c.toLowerCase())!))],
    }));
  },
  insertRows: async (payload: Record<string, unknown>[]) => {
    const list = payload as unknown as { course: Record<string, unknown>; recipe_ids: string[] }[];
    const { data, error } = await supabase.from("courses").insert(list.map(l => l.course) as any).select("id");
    if (error) {
      if (error.code === "23505") throw new Error("A course code in the file is already used by an existing course. Use unique codes.");
      throw error;
    }
    const links = (data || []).flatMap((c, i) => list[i].recipe_ids.map(rid => ({ course_id: c.id, recipe_id: rid })));
    if (links.length) {
      const { error: e2 } = await supabase.from("course_recipes").insert(links);
      if (e2) throw e2;
    }
    return data?.length ?? 0;
  },
};

// -------- BATCHES --------
// Columns mirror the "Create Batch" form.
const B = {
  course: "Course Title", name: "Batch Name", start: "Start Time", end: "End Time",
  week: "Days of the Week", from: "Batch Start Date", to: "Batch End Date", seats: "Total Seats",
} as const;
let courseCache: Promise<Map<string, { id: string; days: string[]; archived: boolean }>> | null = null;
const loadCourses = () => {
  if (!courseCache) {
    courseCache = (async () => {
      const { data, error } = await supabase.from("courses").select("id, title, days_of_week, is_archived");
      if (error) { courseCache = null; throw error; }
      return new Map((data || []).map((c: any) => [c.title.trim().toLowerCase(), { id: c.id, days: c.days_of_week || [], archived: !!c.is_archived }]));
    })();
  }
  return courseCache;
};

export const batchesImport = {
  templateColumns: [B.course, B.name, B.start, B.end, B.week, B.from, B.to, B.seats],
  requiredColumns: [B.course, B.name, B.start, B.end, B.week, B.seats],
  templateSample: [
    ["Diploma in Baking", "Morning Batch", "10:00 AM", "1:00 PM", "Mon, Wed, Fri", "2026-06-23", "2026-09-23", "20"],
  ],
  templateHint:
    "Course Title must match an existing course. Times like 10:00 AM. Days: Mon-Sun separated by commas, and only days the course runs. Dates as YYYY-MM-DD (or DD/MM/YYYY).",
  validateRow: async (r: Record<string, string>, i: number) => {
    if (i === 0) courseCache = null;
    const course = (await loadCourses()).get(r[B.course].trim().toLowerCase());
    if (!course) return `Course "${r[B.course]}" not found`;
    if (course.archived) return `Course "${r[B.course]}" is archived`;
    if (r[B.name].length > 100) return "Batch name must be 100 characters or less";
    if (!parseTime(r[B.start])) return "Start Time is not a valid time (e.g. 10:00 AM)";
    if (!parseTime(r[B.end])) return "End Time is not a valid time (e.g. 1:00 PM)";
    const days = parseDays(r[B.week]);
    const bad = badDays(days);
    if (bad.length) return `Unknown day(s): ${bad.join(", ")}`;
    if (!days.length) return "Days of the Week is required";
    if (course.days.length) {
      const outside = days.filter(d => !course.days.includes(d));
      if (outside.length) return `Course only runs on ${course.days.join(", ")} (not ${outside.join(", ")})`;
    }
    const from = parseDate(r[B.from]), to = parseDate(r[B.to]);
    if (from === "invalid") return "Batch Start Date is not a valid date";
    if (to === "invalid") return "Batch End Date is not a valid date";
    if (from && to && to < from) return "Batch End Date is before the Start Date";
    const seats = Number(r[B.seats]);
    if (!Number.isInteger(seats) || seats < 1) return "Total Seats must be a whole number above 0";
    return null;
  },
  buildPayload: async (rows: Record<string, string>[]) => {
    const courses = await loadCourses();
    return rows.map(r => {
      const seats = Number(r[B.seats]);
      return {
        course_id: courses.get(r[B.course].trim().toLowerCase())!.id,
        batch_name: r[B.name].trim(),
        time_slot: `${parseTime(r[B.start])} - ${parseTime(r[B.end])}`,
        days_of_week: parseDays(r[B.week]),
        days: null,
        total_seats: seats,
        available_seats: seats,
        start_date: parseDate(r[B.from]) || null,
        end_date: parseDate(r[B.to]) || null,
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
// Columns mirror the "Add Inventory Item" form.
const I = { name: "Item Name", unit: "Unit", stock: "Closing Stock", required: "Required Stock" } as const;
export const inventoryImport = {
  templateColumns: [I.name, I.unit, I.stock, I.required],
  requiredColumns: [I.name, I.unit],
  templateSample: [
    ["Flour", "g", "5000", "10000"],
    ["Milk", "ml", "2000", "4000"],
    ["Eggs", "pieces", "60", "120"],
  ],
  templateHint: "Unit: ml, g or pieces. Closing Stock and Required Stock are numbers (leave empty for 0).",
  validateRow: (r: Record<string, string>, _i: number, all: Record<string, string>[]) => {
    if (r[I.name].length > 100) return "Item name must be 100 characters or less";
    if (!["ml", "g", "pieces"].includes(r[I.unit].trim().toLowerCase())) return "Unit must be ml, g or pieces";
    if (!isNonNegNum(r[I.stock] || "")) return "Closing Stock must be a number 0 or above";
    if (!isNonNegNum(r[I.required] || "")) return "Required Stock must be a number 0 or above";
    const n = r[I.name].trim().toLowerCase();
    if (all.filter(o => (o[I.name] || "").trim().toLowerCase() === n).length > 1) return `"${r[I.name]}" appears twice in the file`;
    return null;
  },
  buildPayload: (rows: Record<string, string>[]) =>
    rows.map(r => ({
      name: r[I.name].trim(),
      unit: r[I.unit].trim().toLowerCase(),
      current_stock: toNum(r[I.stock]),
      required_stock: toNum(r[I.required]),
      reorder_level: 10,
    })),
};
