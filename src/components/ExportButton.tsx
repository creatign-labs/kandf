import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  columns?: { key: string; label: string }[];
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export const ExportButton = ({ 
  data, 
  filename, 
  columns, 
  variant = "outline", 
  size = "sm",
  className 
}: ExportButtonProps) => {
  const exportToCSV = () => {
    if (!data || data.length === 0) return;

    const cols = columns || Object.keys(data[0]).map(key => ({ key, label: key }));
    
    const escapeCSV = (val: unknown): string => {
      const str = val === null || val === undefined ? "" : String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = cols.map(c => escapeCSV(c.label)).join(",");
    const rows = data.map(row =>
      cols.map(c => escapeCSV(row[c.key])).join(",")
    );

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={exportToCSV}
      disabled={!data || data.length === 0}
      className={className}
    >
      <Download className="h-4 w-4 mr-1" />
      Export CSV
    </Button>
  );
};
