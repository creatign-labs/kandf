import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

type TableName =
  | "courses"
  | "batches"
  | "recipes"
  | "recipe_ingredients"
  | "inventory";

interface ImportButtonProps {
  table: TableName;
  templateColumns: string[];
  requiredColumns?: string[];
  /** Build the insert payload from parsed rows. Return array of records to insert. */
  buildPayload?: (rows: Record<string, string>[]) => Promise<Record<string, unknown>[]> | Record<string, unknown>[];
  invalidateKeys?: string[][];
  label?: string;
  className?: string;
}

function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur = "", row: string[] = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (ch === "\r") { /* skip */ }
      else cur += ch;
    }
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(r => r.some(v => v && v.trim() !== ""))
    .map(r => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = (r[i] ?? "").trim(); });
      return obj;
    });
}

export const ImportButton = ({
  table,
  templateColumns,
  requiredColumns = [],
  buildPayload,
  invalidateKeys = [],
  label = "Import CSV",
  className,
}: ImportButtonProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const downloadTemplate = () => {
    const csv = templateColumns.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${table}_template.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) {
        toast({ title: "Empty file", variant: "destructive" });
        setBusy(false);
        return;
      }

      // Validate required columns
      rows.forEach((raw, i) => {
        for (const req of requiredColumns) {
          if (!raw[req]) throw new Error(`Row ${i + 2}: missing required "${req}"`);
        }
      });

      const payload: Record<string, unknown>[] = buildPayload
        ? await buildPayload(rows)
        : rows;

      if (!payload.length) {
        toast({ title: "Nothing to import" });
        setBusy(false); return;
      }


      // Insert in chunks
      const chunkSize = 100;
      let inserted = 0;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        const { error } = await (supabase.from(table) as any).insert(chunk);
        if (error) throw error;
        inserted += chunk.length;
      }

      toast({ title: "Import complete", description: `${inserted} row(s) added to ${table}` });
      invalidateKeys.forEach(k => qc.invalidateQueries({ queryKey: k }));
      setOpen(false);
      setFile(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Import failed";
      toast({ title: "Import failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className={className}>
        <Upload className="h-4 w-4 mr-1" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import {table.replace(/_/g, " ")} from CSV</DialogTitle>
            <DialogDescription>
              Download the template, fill it out, then upload. Required columns:{" "}
              {requiredColumns.length ? requiredColumns.join(", ") : "none"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Button type="button" variant="secondary" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1" /> Download template
            </Button>
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              Columns: {templateColumns.join(", ")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={handleImport} disabled={!file || busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
