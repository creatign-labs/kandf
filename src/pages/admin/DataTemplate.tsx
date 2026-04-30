import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Download, FileSpreadsheet, Check, Upload, AlertCircle, Loader2, CheckCircle2, Trash2, RefreshCw, Database, Users, Archive, ShieldAlert } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as XLSX from "xlsx";
import JSZip from "jszip";

interface TemplateSection {
  title: string;
  tableName: string;
  description: string;
  headers: string[];
  /** Subset of `headers` that must contain a non-empty value in every row */
  requiredFields: string[];
  example: string[];
  notes: string[];
}

const templates: TemplateSection[] = [
  {
    title: "Courses",
    tableName: "courses",
    description: "Main course information — matches the 'Add New Course' dialog exactly.",
    headers: ["title", "course_code", "description", "duration", "base_fee", "level", "recipe_titles"],
    requiredFields: ["title", "description", "duration", "base_fee"],
    example: ["Foundation Baking", "FB-101", "Master the essentials of baking with hands-on training", "3 months", "25000", "Beginner", "Classic Chocolate Chip Cookies; Sourdough Bread"],
    notes: [
      "title: Required — unique course name",
      "course_code: Optional — short code like 'FB-101' (auto-uppercased)",
      "duration: Must match the dialog's dropdown — '1 month' through '12 months'",
      "base_fee: Required, positive number only (no currency symbol)",
      "level: Optional — Beginner, Intermediate, or Advanced (defaults to Beginner)",
      "recipe_titles: Optional — semicolon-separated existing recipe titles to attach to this course. Unmatched titles are skipped.",
      "Note: Course image is auto-resolved from the title; materials count is auto-calculated.",
    ],
  },
  {
    title: "Modules",
    tableName: "modules",
    description: "Course modules - create after courses",
    headers: ["course_title", "title", "description", "order_index"],
    requiredFields: ["course_title", "title", "order_index"],
    example: ["Foundation Baking", "Introduction to Baking", "Learn the basics of baking equipment and ingredients", "1"],
    notes: ["course_title: Must match exactly with an existing course title", "order_index: Number starting from 1"],
  },
  {
    title: "Recipes",
    tableName: "recipes",
    description: "Recipe library — matches the 'Add New Recipe' form exactly.",
    headers: ["course_title", "title", "recipe_code", "description", "difficulty", "prep_time", "cook_time", "instructions", "video_url", "ingredients"],
    requiredFields: ["course_title", "title"],
    example: [
      "Foundation Baking",
      "Classic Chocolate Chip Cookies",
      "REC-001",
      "Learn to make perfect cookies every time",
      "Easy",
      "15",
      "12",
      "1. Preheat oven to 180°C|2. Cream butter and sugar|3. Add egg and vanilla|4. Mix in flour|5. Fold in chocolate chips|6. Bake for 12 minutes",
      "https://youtube.com/watch?v=example",
      "All-Purpose Flour:0.2;Butter:0.1;Sugar:0.15;Chocolate Chips:0.1",
    ],
    notes: [
      "course_title: Must match an existing course title",
      "recipe_code: Optional — short code like 'REC-001'",
      "difficulty: Easy, Medium, or Hard",
      "prep_time/cook_time: Minutes (number only)",
      "instructions: Separate steps with pipes (|)",
      "video_url: Optional — YouTube or other video URL",
      "ingredients: Format 'inventory_name:quantity_per_student' separated by semicolons (;). Inventory items must already exist; unmatched names are skipped.",
    ],
  },
  {
    title: "Inventory",
    tableName: "inventory",
    description: "Kitchen inventory items — matches the 'Add Inventory Item' form (cost_per_unit optional, used by procurement)",
    headers: ["name", "category", "unit", "current_stock", "required_stock", "reorder_level", "cost_per_unit"],
    requiredFields: ["name", "category", "unit"],
    example: ["All-Purpose Flour", "Dry Ingredients", "kg", "50", "100", "20", "45"],
    notes: [
      "name, category, unit: Required",
      "category: e.g., Dry Ingredients, Dairy, Chocolate, Equipment",
      "unit: e.g., kg, g, L, ml, pcs",
      "reorder_level: Defaults to 10 if blank (matches form default)",
      "cost_per_unit: Optional — used by purchase orders. Number without currency symbol.",
    ],
  },
  {
    title: "Batches",
    tableName: "batches",
    description: "Course schedule batches — matches the 'Add New Batch' form exactly",
    headers: ["course_title", "batch_name", "start_date", "days", "time_slot", "total_seats"],
    requiredFields: ["course_title", "batch_name", "days", "time_slot"],
    example: ["Foundation Baking", "January 2025 Morning", "2025-01-15", "Mon, Wed, Fri", "9:00 AM - 12:00 PM", "30"],
    notes: [
      "course_title: Must match an existing course title",
      "start_date: Format YYYY-MM-DD",
      "days: Comma-separated, e.g., 'Mon, Wed, Fri'",
      "time_slot: e.g., '9:00 AM - 12:00 PM'",
      "total_seats: Defaults to 30 (matches form default). Available seats = total seats on creation.",
    ],
  },
  {
    title: "Jobs",
    tableName: "jobs",
    description: "Job postings for students. Admin bulk import — sets company directly (vendor portal auto-fills it from vendor profile)",
    headers: ["title", "company", "location", "type", "salary_range", "description", "requirement_1", "requirement_2", "requirement_3", "requirement_4"],
    requiredFields: ["title", "company", "location", "description"],
    example: ["Pastry Chef", "Grand Hotel", "Mumbai", "Full-time", "₹35,000 - ₹45,000/month", "Looking for a skilled pastry chef to join our team", "2+ years experience", "Baking certification", "Team player", "Creative mindset"],
    notes: [
      "type: Full-time, Part-time, or Internship",
      "company: Required for admin imports (vendor portal fills this automatically)",
      "requirement_1-4: Optional. Leave blank columns empty.",
    ],
  },
];

const usersTemplate: TemplateSection = {
  title: "Users",
  tableName: "users",
  description: "Auth users — creates account + assigns role + emails temp password",
  headers: ["email", "first_name", "last_name", "phone", "role"],
  requiredFields: ["email", "first_name", "last_name", "role"],
  example: ["jane@example.com", "Jane", "Doe", "+91 98765 43210", "student"],
  notes: [
    "role: student, chef, admin, super_admin, inventory_manager, or vendor",
    "phone: Optional",
    "A 12-char temp password is auto-generated and emailed via Resend",
  ],
};

const DataTemplate = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<Record<string, { success: number; failed: number }>>({});
  const [clearing, setClearing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [tableCounts, setTableCounts] = useState<Record<string, number> | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [userImporting, setUserImporting] = useState(false);
  const [userResults, setUserResults] = useState<Array<{ email: string; success: boolean; message: string; emailed?: boolean }> | null>(null);
  const [preview, setPreview] = useState<{
    template: TemplateSection;
    rows: Record<string, string>[];
    foundHeaders: string[];
    missingRequired: string[];
    missingOptional: string[];
    extraHeaders: string[];
    rowIssues: { rowNumber: number; missing: string[] }[];
  } | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const userFileRef = useRef<HTMLInputElement | null>(null);

  const fetchTableCounts = async () => {
    setLoadingCounts(true);
    try {
      const tables = ["courses", "modules", "recipes", "inventory", "batches", "jobs"] as const;
      const counts: Record<string, number> = {};
      await Promise.all(
        tables.map(async (table) => {
          const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
          counts[table] = error ? -1 : count ?? 0;
        }),
      );
      setTableCounts(counts);
    } catch {
      toast.error("Failed to fetch record counts");
    } finally {
      setLoadingCounts(false);
    }
  };

  useEffect(() => {
    fetchTableCounts();
  }, []);

  const handleBackup = async () => {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }
      const { data, error } = await supabase.functions.invoke("export-database-snapshot", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Export failed");

      const zip = new JSZip();
      const tables = data.tables as Record<string, { csv: string; rowCount: number; error?: string }>;
      const summary: string[] = ["table,row_count,error"];
      for (const [table, info] of Object.entries(tables)) {
        if (info.csv) zip.file(`${table}.csv`, info.csv);
        summary.push(`${table},${info.rowCount},${info.error || ""}`);
      }
      zip.file("_summary.csv", summary.join("\n"));
      zip.file("_timestamp.txt", data.timestamp);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kandf-backup-${new Date().toISOString().split("T")[0]}-${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded successfully");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to export";
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  };

  const handleClearSampleData = async (dryRun: boolean) => {
    setClearing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }
      const { data, error } = await supabase.functions.invoke("clear-sample-data", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { dryRun },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Clear failed");

      if (dryRun) {
        const tc = data.tableCounts as Record<string, number>;
        const totalRows = Object.values(tc).reduce((a, b) => a + (b > 0 ? b : 0), 0);
        toast.success(`Dry run: would delete ${totalRows} rows + ${data.usersToDelete} users (preserving ${data.preservedDemoUsers} @demo.com users)`, { duration: 8000 });
      } else {
        const tc = data.tableCounts as Record<string, number>;
        const totalDeleted = Object.values(tc).filter((v) => v > 0).reduce((a, b) => a + b, 0);
        toast.success(`Cleared ${totalDeleted} rows + ${data.deletedUsers} users (preserved ${data.preservedDemoUsers} @demo.com)`, { duration: 8000 });
        setImportResults({});
        fetchTableCounts();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to clear data";
      toast.error(msg);
    } finally {
      setClearing(false);
    }
  };

  const handleClearAllData = async () => {
    setClearing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }
      const { data, error } = await supabase.functions.invoke("clear-demo-data", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.success) {
        const totalDeleted = Object.values(data.deletedCounts as Record<string, number>).filter((v): v is number => v > 0).reduce((a, b) => a + b, 0);
        toast.success(`Cleared ${totalDeleted} records across all tables`);
        setImportResults({});
        fetchTableCounts();
      } else {
        toast.error(data?.error || "Failed to clear data");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to clear data";
      toast.error(msg);
    } finally {
      setClearing(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const downloadCSV = (template: TemplateSection) => {
    const csvContent = [template.headers.join(","), template.example.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${template.title.toLowerCase()}_template.csv`;
    link.click();
    toast.success(`Downloaded ${template.title} template`);
  };

  const downloadAllTemplates = () => {
    [...templates, usersTemplate].forEach((template) => {
      setTimeout(() => downloadCSV(template), 100);
    });
  };

  // Parse CSV or XLSX file → rows of {header: value}
  const parseFile = async (file: File): Promise<Record<string, string>[]> => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const buf = await file.arrayBuffer();
    if (ext === "xlsx" || ext === "xls") {
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      return json.map((row) => {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) out[k.toLowerCase().trim()] = String(v ?? "").trim();
        return out;
      });
    }
    // CSV
    const text = new TextDecoder().decode(buf);
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else current += char;
      }
      result.push(current.trim());
      return result;
    };
    const headers = parseLine(lines[0]).map((h) => h.toLowerCase().trim());
    return lines.slice(1).map((line) => {
      const cells = parseLine(line);
      const out: Record<string, string> = {};
      headers.forEach((h, i) => { if (cells[i] !== undefined) out[h] = cells[i]; });
      return out;
    });
  };

  // Step 1: Parse the file and open the preview dialog (no DB writes yet)
  const handleFileSelected = async (template: TemplateSection, file: File) => {
    try {
      const dataRows = await parseFile(file);
      if (dataRows.length === 0) {
        toast.error("File must have at least one data row");
        return;
      }

      // Header analysis based on the first data row's keys (parseFile lowercases & trims them)
      const foundHeaders = Object.keys(dataRows[0] ?? {});
      const expected = template.headers.map((h) => h.toLowerCase());
      const required = template.requiredFields.map((h) => h.toLowerCase());
      const missingRequired = required.filter((h) => !foundHeaders.includes(h));
      const missingOptional = expected.filter((h) => !required.includes(h) && !foundHeaders.includes(h));
      const extraHeaders = foundHeaders.filter((h) => !expected.includes(h));

      // Per-row required-field check (only for required fields that ARE present in the headers —
      // missing required headers are already surfaced separately)
      const presentRequired = required.filter((h) => foundHeaders.includes(h));
      const rowIssues = dataRows
        .map((row, idx) => {
          const missing = presentRequired.filter((h) => !String(row[h] ?? "").trim());
          return { rowNumber: idx + 2, missing }; // +2 = header row + 1-indexed
        })
        .filter((r) => r.missing.length > 0);

      setPreview({
        template,
        rows: dataRows,
        foundHeaders,
        missingRequired,
        missingOptional,
        extraHeaders,
        rowIssues,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to read file");
    }
  };

  // Step 2: User confirms in the preview dialog → actually run the import
  const runImport = async () => {
    if (!preview) return;
    const { template, rows: dataRows } = preview;
    setPreview(null);
    setImporting(template.tableName);
    try {
      let successCount = 0;
      let failedCount = 0;
      for (const rowData of dataRows) {
        try {
          const processed = await processRowData(template, rowData);
          if (!processed) {
            failedCount++;
            continue;
          }
          const { mainRow, sideEffect } = processed;
          const { data: inserted, error } = await supabase
            .from(template.tableName as "courses" | "modules" | "recipes" | "inventory" | "batches" | "jobs")
            .insert(mainRow as never)
            .select()
            .single();
          if (error) {
            console.error("Insert error:", error);
            failedCount++;
            continue;
          }
          if (sideEffect && inserted) {
            try {
              await sideEffect((inserted as { id: string }).id);
            } catch (sideErr) {
              console.error("Side-effect error:", sideErr);
            }
          }
          successCount++;
        } catch (err) {
          console.error("Row error:", err);
          failedCount++;
        }
      }

      setImportResults((prev) => ({ ...prev, [template.tableName]: { success: successCount, failed: failedCount } }));
      if (successCount > 0) toast.success(`Imported ${successCount} ${template.title.toLowerCase()}`);
      if (failedCount > 0) toast.error(`Failed to import ${failedCount} rows`);
      fetchTableCounts();
    } catch (err) {
      console.error(err);
      toast.error("Import failed");
    } finally {
      setImporting(null);
    }
  };

  type ProcessedRow = {
    mainRow: Record<string, unknown>;
    sideEffect?: (insertedId: string) => Promise<void>;
  };

  const processRowData = async (template: TemplateSection, rowData: Record<string, string>): Promise<ProcessedRow | null> => {
    switch (template.tableName) {
      case "courses":
        return {
          mainRow: {
            title: rowData.title,
            course_code: rowData.course_code || null,
            description: rowData.description,
            level: rowData.level,
            duration: rowData.duration,
            base_fee: Number(rowData.base_fee) || 0,
          },
        };
      case "modules": {
        const { data: course } = await supabase.from("courses").select("id").eq("title", rowData.course_title).single();
        if (!course) return null;
        return {
          mainRow: {
            course_id: course.id,
            title: rowData.title,
            description: rowData.description || null,
            order_index: Number(rowData.order_index) || 0,
          },
        };
      }
      case "recipes": {
        const { data: course } = await supabase.from("courses").select("id").eq("title", rowData.course_title).single();
        if (!course) return null;

        // Parse ingredients in 'inventory_name:quantity' format and resolve to inventory ids
        const ingredientPairs = rowData.ingredients
          ? String(rowData.ingredients)
              .split(";")
              .map((entry) => entry.trim())
              .filter(Boolean)
              .map((entry) => {
                const [name, qty] = entry.split(":").map((s) => s?.trim() ?? "");
                return { name, quantity: Number(qty) || 0 };
              })
              .filter((p) => p.name)
          : [];

        let resolvedIngredients: { inventory_id: string; quantity_per_student: number }[] = [];
        if (ingredientPairs.length > 0) {
          const names = ingredientPairs.map((p) => p.name);
          const { data: invItems } = await supabase.from("inventory").select("id, name").in("name", names);
          const byName = new Map((invItems || []).map((i) => [i.name, i.id]));
          resolvedIngredients = ingredientPairs
            .filter((p) => byName.has(p.name))
            .map((p) => ({ inventory_id: byName.get(p.name)!, quantity_per_student: p.quantity }));
        }

        return {
          mainRow: {
            course_id: course.id,
            title: rowData.title,
            recipe_code: rowData.recipe_code || null,
            description: rowData.description || null,
            difficulty: rowData.difficulty || null,
            prep_time: Number(rowData.prep_time) || null,
            cook_time: Number(rowData.cook_time) || null,
            instructions: rowData.instructions ? String(rowData.instructions).replace(/\|/g, "\n") : null,
            video_url: rowData.video_url || null,
          },
          sideEffect: resolvedIngredients.length > 0
            ? async (recipeId: string) => {
                const rows = resolvedIngredients.map((r) => ({
                  recipe_id: recipeId,
                  inventory_id: r.inventory_id,
                  quantity_per_student: r.quantity_per_student,
                }));
                const { error } = await supabase.from("recipe_ingredients").insert(rows);
                if (error) throw error;
              }
            : undefined,
        };
      }
      case "inventory":
        return {
          mainRow: {
            name: rowData.name,
            category: rowData.category,
            unit: rowData.unit,
            current_stock: Number(rowData.current_stock) || 0,
            required_stock: Number(rowData.required_stock) || 0,
            reorder_level: Number(rowData.reorder_level) || 10,
            cost_per_unit: rowData.cost_per_unit ? Number(rowData.cost_per_unit) : null,
          },
        };
      case "batches": {
        const { data: course } = await supabase.from("courses").select("id").eq("title", rowData.course_title).single();
        if (!course) return null;
        const totalSeats = Number(rowData.total_seats) || 30;
        return {
          mainRow: {
            course_id: course.id,
            batch_name: rowData.batch_name,
            start_date: rowData.start_date || null,
            days: rowData.days,
            time_slot: rowData.time_slot,
            total_seats: totalSeats,
            available_seats: totalSeats,
          },
        };
      }
      case "jobs": {
        const requirements = [rowData.requirement_1, rowData.requirement_2, rowData.requirement_3, rowData.requirement_4].filter(Boolean) as string[];
        return {
          mainRow: {
            title: rowData.title,
            company: rowData.company,
            location: rowData.location,
            type: rowData.type || "Full-time",
            salary_range: rowData.salary_range || null,
            description: rowData.description,
            requirements: requirements.length > 0 ? requirements : null,
          },
        };
      }
      default:
        return null;
    }
  };

  const triggerFileInput = (tableName: string) => fileInputRefs.current[tableName]?.click();

  const handleUserUpload = async (file: File, dryRun: boolean) => {
    setUserImporting(true);
    setUserResults(null);
    try {
      const rows = await parseFile(file);
      if (!rows.length) {
        toast.error("File must have at least one user row");
        return;
      }
      const users = rows.map((r) => ({
        email: r.email,
        first_name: r.first_name,
        last_name: r.last_name,
        phone: r.phone || "",
        role: (r.role || "student").toLowerCase(),
      }));

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }
      const { data, error } = await supabase.functions.invoke("import-real-users", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { users, dryRun, sendEmails: !dryRun, loginUrl: `${window.location.origin}/login` },
      });
      if (error) throw error;
      if (data?.success === false) {
        const errs = data.validationErrors || [];
        toast.error(`Validation failed: ${errs.length} errors. Check console.`);
        console.error("User import validation errors:", errs);
        return;
      }
      if (dryRun) {
        toast.success(`Dry run: ${data.total} users valid, ${data.validationErrors?.length || 0} validation issues`);
        if (data.validationErrors?.length) console.warn("Validation issues:", data.validationErrors);
      } else {
        toast.success(`Created ${data.created}/${data.total} users (${data.failed} failed)`, { duration: 8000 });
        setUserResults(data.results);
        fetchTableCounts();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to import users";
      toast.error(msg);
    } finally {
      setUserImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />

      <div className="container px-4 md:px-6 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Data Management Centre</h1>
              <p className="text-sm md:text-base text-muted-foreground">Backup, clear sample data, and import your real CSV/XLSX data</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleBackup} disabled={exporting} className="gap-2">
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                Download Backup
              </Button>
              <Button onClick={downloadAllTemplates} className="gap-2">
                <Download className="h-4 w-4" />
                All Templates
              </Button>
            </div>
          </div>
        </div>

        {/* Migration Toolkit */}
        <Card className="mb-6 p-4 md:p-6 border-amber-500/50 bg-amber-500/5">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            Migration Toolkit (Super Admin)
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Use this section to migrate from sample/seed data to real production data. <strong>Always download a backup first.</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => handleClearSampleData(true)} disabled={clearing} className="gap-2">
              {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Dry Run: Clear Sample
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2" disabled={clearing}>
                  <Trash2 className="h-4 w-4" />
                  Clear Sample Data (keeps @demo.com)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all non-demo data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes ALL reference data (courses, recipes, inventory, batches, jobs, leads, vendors) AND all auth users — except those with <code>@demo.com</code> emails. Demo accounts and their roles are preserved.
                    <br /><br />
                    Always download a backup first. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleClearSampleData(false)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, Clear Now
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="gap-2 text-destructive" disabled={clearing}>
                  <Trash2 className="h-4 w-4" />
                  Nuke ALL data (incl. demo)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear ALL data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This deletes every table including demo seed data. Auth users are NOT touched. Use this only for full reset before re-seeding.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, Nuke Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>

        {/* Verification Summary */}
        <Card className="mb-6 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Database Record Counts
            </h2>
            <Button variant="outline" size="sm" onClick={fetchTableCounts} disabled={loadingCounts} className="gap-2">
              {loadingCounts ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {templates.map((t) => {
              const count = tableCounts?.[t.tableName];
              return (
                <div key={t.tableName} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <span className="text-sm font-medium">{t.title}</span>
                  <Badge variant={count && count > 0 ? "default" : "secondary"}>{loadingCounts ? "..." : count ?? "—"}</Badge>
                </div>
              );
            })}
          </div>
        </Card>

        <Tabs defaultValue="import" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-xl">
            <TabsTrigger value="import" className="gap-2"><Upload className="h-4 w-4" />Import Data</TabsTrigger>
            <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" />Import Users</TabsTrigger>
            <TabsTrigger value="templates" className="gap-2"><FileSpreadsheet className="h-4 w-4" />Templates</TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-6">
            <Card className="p-4 md:p-6 bg-primary/5 border-primary/20">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                How to Import Data
              </h2>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Download the template for the data type you want to import</li>
                <li>Fill in your data in CSV or XLSX format following the template exactly</li>
                <li><strong>Order matters:</strong> Courses → Modules → Recipes/Assessments → Questions → Batches</li>
                <li>Upload your filled file using the import buttons below — both CSV and XLSX are supported</li>
              </ol>
            </Card>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.tableName} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{template.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{template.headers.length} cols</Badge>
                  </div>
                  {importResults[template.tableName] && (
                    <div className="mb-3 p-2 rounded bg-muted/50 text-xs">
                      <div className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /><span>{importResults[template.tableName].success} imported</span></div>
                      {importResults[template.tableName].failed > 0 && (
                        <div className="flex items-center gap-2 mt-1"><AlertCircle className="h-3 w-3 text-destructive" /><span>{importResults[template.tableName].failed} failed</span></div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      ref={(el) => { fileInputRefs.current[template.tableName] = el; }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelected(template, file);
                        e.target.value = "";
                      }}
                    />
                    <Button variant="default" size="sm" className="flex-1 gap-2" onClick={() => triggerFileInput(template.tableName)} disabled={importing === template.tableName}>
                      {importing === template.tableName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Preview & Import
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => downloadCSV(template)} className="gap-2"><Download className="h-4 w-4" /></Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="p-4 md:p-6 bg-primary/5 border-primary/20">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Import Real Users
              </h2>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Download the Users template (columns: <code>email, first_name, last_name, phone, role</code>)</li>
                <li>Valid roles: <code>student</code>, <code>chef</code>, <code>admin</code>, <code>super_admin</code>, <code>inventory_manager</code>, <code>vendor</code></li>
                <li>Run a <strong>dry run first</strong> to validate emails and roles</li>
                <li>On real import: a 12-char temp password is auto-generated for each user and emailed via Resend</li>
                <li>Users can change their password from their profile after first login</li>
              </ol>
            </Card>

            <Card className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-semibold">Upload Users File (CSV/XLSX)</h3>
                  <p className="text-sm text-muted-foreground">Required columns: email, first_name, last_name, role. Phone optional.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => downloadCSV(usersTemplate)} className="gap-2">
                  <Download className="h-4 w-4" /> Download Template
                </Button>
              </div>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                ref={userFileRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const choice = window.confirm("OK = Dry Run (validate only). Cancel = Real Import (creates users + sends emails).");
                  handleUserUpload(file, choice);
                  e.target.value = "";
                }}
              />
              <Button onClick={() => userFileRef.current?.click()} disabled={userImporting} className="gap-2">
                {userImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload Users File
              </Button>

              {userResults && userResults.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Import Results ({userResults.filter(r => r.success).length}/{userResults.length} succeeded)</h4>
                  <div className="max-h-96 overflow-auto border rounded">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="p-2 text-left">Email</th>
                          <th className="p-2 text-left">Status</th>
                          <th className="p-2 text-left">Email Sent</th>
                          <th className="p-2 text-left">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userResults.map((r, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2 font-mono text-xs">{r.email}</td>
                            <td className="p-2">{r.success ? <Badge variant="default">OK</Badge> : <Badge variant="destructive">Fail</Badge>}</td>
                            <td className="p-2">{r.emailed === true ? "✓" : r.emailed === false ? "✗" : "—"}</td>
                            <td className="p-2 text-xs text-muted-foreground">{r.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card className="p-4 md:p-6 bg-primary/5 border-primary/20">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Template Reference
              </h2>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Download each template CSV file or copy the headers</li>
                <li>Open in Excel, Google Sheets, or any spreadsheet application</li>
                <li>Fill in your data following the example row format</li>
                <li><strong>Important:</strong> Create data in this order: Courses → Modules → Recipes/Assessments → Questions → Batches</li>
              </ol>
            </Card>

            <div className="space-y-6">
              {[...templates, usersTemplate].map((template, index) => (
                <Card key={template.title} className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold">{template.title}</h3>
                        <Badge variant="outline" className="text-xs">{template.headers.length} columns</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(template.headers.join(","), index)} className="gap-2">
                        {copiedIndex === index ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        Copy Headers
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => downloadCSV(template)} className="gap-2">
                        <Download className="h-4 w-4" /> Download CSV
                      </Button>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-xs font-medium text-muted-foreground mb-2">COLUMN HEADERS</div>
                    <div className="flex flex-wrap gap-2">
                      {template.headers.map((header) => (
                        <Badge key={header} variant="secondary" className="font-mono text-xs">{header}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-xs font-medium text-muted-foreground mb-2">EXAMPLE ROW</div>
                    <div className="bg-muted/50 rounded-lg p-3 overflow-x-auto">
                      <div className="flex gap-2 min-w-max">
                        {template.example.map((value, i) => (
                          <div key={i} className="flex flex-col">
                            <span className="text-xs text-muted-foreground mb-1">{template.headers[i]}</span>
                            <span className="text-sm font-mono bg-background px-2 py-1 rounded border truncate max-w-[200px]" title={value}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">FORMATTING NOTES</div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {template.notes.map((note, i) => (
                        <li key={i} className="flex items-start gap-2"><span className="text-primary">•</span>{note}</li>
                      ))}
                    </ul>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Pre-import preview dialog */}
      <Dialog open={preview !== null} onOpenChange={(open) => { if (!open) setPreview(null); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Preview: {preview?.template.title} Import
            </DialogTitle>
            <DialogDescription>
              Review the file structure and data below. No data is imported until you confirm.
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4">
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Rows detected</div>
                    <div className="text-2xl font-semibold">{preview.rows.length}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Headers found</div>
                    <div className="text-2xl font-semibold">{preview.foundHeaders.length}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Rows with issues</div>
                    <div className={`text-2xl font-semibold ${preview.rowIssues.length > 0 ? "text-destructive" : "text-green-600"}`}>
                      {preview.rowIssues.length}
                    </div>
                  </Card>
                </div>

                {/* Header validation */}
                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm">Header validation</h3>

                  {preview.missingRequired.length > 0 && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                      <div className="flex items-center gap-2 text-destructive font-medium text-sm mb-2">
                        <AlertCircle className="h-4 w-4" />
                        Missing required columns ({preview.missingRequired.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {preview.missingRequired.map((h) => (
                          <Badge key={h} variant="destructive" className="text-xs">{h}</Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">These columns must be present for the import to succeed.</p>
                    </div>
                  )}

                  {preview.missingOptional.length > 0 && (
                    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium text-sm mb-2">
                        <AlertCircle className="h-4 w-4" />
                        Missing optional columns ({preview.missingOptional.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {preview.missingOptional.map((h) => (
                          <Badge key={h} variant="outline" className="text-xs">{h}</Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">These will be left empty / set to defaults.</p>
                    </div>
                  )}

                  {preview.extraHeaders.length > 0 && (
                    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium text-sm mb-2">
                        <AlertCircle className="h-4 w-4" />
                        Unrecognized columns ({preview.extraHeaders.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {preview.extraHeaders.map((h) => (
                          <Badge key={h} variant="outline" className="text-xs">{h}</Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">These columns will be ignored during import.</p>
                    </div>
                  )}

                  {preview.missingRequired.length === 0 && preview.missingOptional.length === 0 && preview.extraHeaders.length === 0 && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      All headers match the template exactly.
                    </div>
                  )}
                </Card>

                {/* Per-row issues */}
                {preview.rowIssues.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      Rows missing required values ({preview.rowIssues.length})
                    </h3>
                    <div className="text-xs text-muted-foreground mb-2">These rows will fail to import:</div>
                    <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                      {preview.rowIssues.slice(0, 20).map((r) => (
                        <div key={r.rowNumber} className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">Row {r.rowNumber}</Badge>
                          <span className="text-muted-foreground">missing:</span>
                          {r.missing.map((f) => (
                            <Badge key={f} variant="destructive" className="text-xs">{f}</Badge>
                          ))}
                        </div>
                      ))}
                      {preview.rowIssues.length > 20 && (
                        <div className="text-muted-foreground italic">…and {preview.rowIssues.length - 20} more</div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Data preview — first 5 rows */}
                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-2">Data preview (first 5 rows)</h3>
                  <div className="overflow-x-auto">
                    <table className="text-xs w-full">
                      <thead>
                        <tr className="border-b">
                          {preview.foundHeaders.map((h) => {
                            const isRequired = preview.template.requiredFields.map((f) => f.toLowerCase()).includes(h);
                            const isExpected = preview.template.headers.map((f) => f.toLowerCase()).includes(h);
                            return (
                              <th key={h} className="text-left p-2 font-medium whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  {h}
                                  {isRequired && <span className="text-destructive">*</span>}
                                  {!isExpected && <Badge variant="outline" className="text-[10px] h-4 px-1">extra</Badge>}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="border-b">
                            {preview.foundHeaders.map((h) => (
                              <td key={h} className="p-2 align-top max-w-[200px] truncate text-muted-foreground">
                                {row[h] || <span className="italic opacity-50">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {preview.rows.length > 5 && (
                    <div className="text-xs text-muted-foreground mt-2 italic">…and {preview.rows.length - 5} more rows</div>
                  )}
                </Card>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setPreview(null)}>Cancel</Button>
            <Button
              onClick={runImport}
              disabled={!preview || preview.missingRequired.length > 0}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {preview && preview.missingRequired.length > 0
                ? "Fix required columns to import"
                : `Confirm & Import ${preview?.rows.length ?? 0} rows`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataTemplate;
