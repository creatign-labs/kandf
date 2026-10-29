import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  columns?: { key: string; label: string }[];
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

/** Turn snake_case keys into readable headers: student_code -> Student Code */
const humanize = (key: string) =>
  key
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const ExportButton = ({
  data,
  filename,
  columns,
  variant = "outline",
  size = "sm",
  className
}: ExportButtonProps) => {
  const exportToExcel = () => {
    if (!data || data.length === 0) return;

    const cols = columns || Object.keys(data[0]).map(key => ({ key, label: humanize(key) }));

    const header = cols.map(c => c.label);
    const rows = data.map(row =>
      cols.map(c => {
        const val = row[c.key];
        return val === null || val === undefined ? "" : val;
      })
    );

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws["!cols"] = header.map((h, i) => ({
      wch: Math.max(
        String(h).length,
        ...rows.map(r => String(r[i] ?? "").length)
      ) + 2,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Export");
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={exportToExcel}
      disabled={!data || data.length === 0}
      className={className}
    >
      <Download className="h-4 w-4 mr-1" />
      Export Excel
    </Button>
  );
};
