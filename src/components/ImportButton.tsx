import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  /** Optional per-row validator run during preview. Return null if valid, else an error message. */
  validateRow?: (row: Record<string, string>, index: number, allRows: Record<string, string>[]) => string | null | Promise<string | null>;
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

type RowState = {
  index: number; // 0-based within data rows
  row: Record<string, string>;
  errors: string[];
};

type Stage = "upload" | "preview";

export const ImportButton = ({
  table,
  templateColumns,
  requiredColumns = [],
  buildPayload,
  validateRow,
  invalidateKeys = [],
  label = "Import CSV",
  className,
}: ImportButtonProps) => {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [parsedRows, setParsedRows] = useState<RowState[]>([]);
  const [skipInvalid, setSkipInvalid] = useState(false);
  const qc = useQueryClient();

  const stats = useMemo(() => {
    const total = parsedRows.length;
    const invalid = parsedRows.filter(r => r.errors.length > 0).length;
    return { total, invalid, valid: total - invalid };
  }, [parsedRows]);

  const reset = () => {
    setStage("upload");
    setFile(null);
    setParsedRows([]);
    setSkipInvalid(false);
    setBusy(false);
  };

  const closeDialog = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) reset();
  };

  const downloadTemplate = () => {
    const csv = templateColumns.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${table}_template.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const buildPreview = async () => {
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

      const validated: RowState[] = [];
      for (let i = 0; i < rows.length; i++) {
        const raw = rows[i];
        const errors: string[] = [];
        for (const req of requiredColumns) {
          if (!raw[req] || raw[req].trim() === "") {
            errors.push(`Missing "${req}"`);
          }
        }
        if (validateRow && errors.length === 0) {
          try {
            const msg = await validateRow(raw, i, rows);
            if (msg) errors.push(msg);
          } catch (e) {
            errors.push(e instanceof Error ? e.message : "Validation failed");
          }
        }
        validated.push({ index: i, row: raw, errors });
      }

      setParsedRows(validated);
      setStage("preview");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not parse CSV";
      toast({ title: "Preview failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const confirmImport = async () => {
    if (!parsedRows.length) return;
    const hasInvalid = stats.invalid > 0;
    if (hasInvalid && !skipInvalid) {
      toast({
        title: "Fix errors first",
        description: `${stats.invalid} row(s) have errors. Fix them or check "Skip invalid rows" to proceed.`,
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const validRows = parsedRows.filter(r => r.errors.length === 0).map(r => r.row);
      if (!validRows.length) {
        toast({ title: "Nothing to import", description: "No valid rows found." });
        setBusy(false);
        return;
      }

      const payload: Record<string, unknown>[] = buildPayload
        ? await buildPayload(validRows)
        : validRows;

      if (!payload.length) {
        toast({ title: "Nothing to import" });
        setBusy(false); return;
      }

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
      closeDialog(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Import failed";
      toast({ title: "Import failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const previewColumns = useMemo(() => {
    if (!parsedRows.length) return templateColumns;
    const keys = new Set<string>();
    parsedRows.forEach(r => Object.keys(r.row).forEach(k => keys.add(k)));
    // Preserve template order first, then any extras
    const ordered = templateColumns.filter(c => keys.has(c));
    keys.forEach(k => { if (!ordered.includes(k)) ordered.push(k); });
    return ordered;
  }, [parsedRows, templateColumns]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className={className}>
        <Upload className="h-4 w-4 mr-1" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent className={stage === "preview" ? "max-w-4xl" : undefined}>
          <DialogHeader>
            <DialogTitle>
              {stage === "upload"
                ? `Import ${table.replace(/_/g, " ")} from CSV`
                : `Preview: ${table.replace(/_/g, " ")}`}
            </DialogTitle>
            <DialogDescription>
              {stage === "upload" ? (
                <>Download the template, fill it out, then upload. Required columns:{" "}
                  {requiredColumns.length ? requiredColumns.join(", ") : "none"}.</>
              ) : (
                <>Review parsed rows and fix any errors before committing.</>
              )}
            </DialogDescription>
          </DialogHeader>

          {stage === "upload" && (
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
          )}

          {stage === "preview" && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="gap-1">
                  Total: {stats.total}
                </Badge>
                <Badge className="gap-1 bg-green-600 hover:bg-green-600">
                  <CheckCircle2 className="h-3 w-3" /> Valid: {stats.valid}
                </Badge>
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> Invalid: {stats.invalid}
                </Badge>
              </div>

              <div className="max-h-[420px] overflow-auto border rounded-md">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1.5 w-14">Row</th>
                      <th className="text-left px-2 py-1.5 w-24">Status</th>
                      {previewColumns.map(c => (
                        <th key={c} className="text-left px-2 py-1.5 whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map(rs => {
                      const bad = rs.errors.length > 0;
                      return (
                        <tr key={rs.index} className={bad ? "bg-destructive/5" : ""}>
                          <td className="px-2 py-1.5 align-top text-muted-foreground">{rs.index + 2}</td>
                          <td className="px-2 py-1.5 align-top">
                            {bad ? (
                              <span className="text-destructive flex items-start gap-1" title={rs.errors.join("; ")}>
                                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                <span className="line-clamp-2">{rs.errors.join("; ")}</span>
                              </span>
                            ) : (
                              <span className="text-green-700 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> OK
                              </span>
                            )}
                          </td>
                          {previewColumns.map(c => (
                            <td key={c} className="px-2 py-1.5 align-top max-w-[200px] truncate" title={rs.row[c] ?? ""}>
                              {rs.row[c] ?? ""}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {stats.invalid > 0 && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={skipInvalid}
                    onCheckedChange={(v) => setSkipInvalid(v === true)}
                  />
                  Skip invalid rows and import only the {stats.valid} valid one(s)
                </label>
              )}
            </div>
          )}

          <DialogFooter>
            {stage === "preview" && (
              <Button variant="ghost" onClick={() => { setStage("upload"); setParsedRows([]); }} disabled={busy}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            <Button variant="outline" onClick={() => closeDialog(false)} disabled={busy}>Cancel</Button>
            {stage === "upload" ? (
              <Button onClick={buildPreview} disabled={!file || busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                Preview
              </Button>
            ) : (
              <Button
                onClick={confirmImport}
                disabled={busy || stats.valid === 0 || (stats.invalid > 0 && !skipInvalid)}
              >
                {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                Confirm & Import {stats.valid > 0 ? `(${stats.valid})` : ""}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
