import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Download, FileSpreadsheet, Check, Upload, AlertCircle, Loader2, CheckCircle2, Trash2, RefreshCw, Database } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface TemplateSection {
  title: string;
  tableName: string;
  description: string;
  headers: string[];
  example: string[];
  notes: string[];
}

const templates: TemplateSection[] = [
  {
    title: "Courses",
    tableName: "courses",
    description: "Main course information - create this first",
    headers: ["title", "description", "level", "duration", "base_fee", "materials_count", "image_url"],
    example: ["Foundation Baking", "Master the essentials of baking with hands-on training", "Beginner", "3 months", "25000", "15", "https://example.com/course1.jpg"],
    notes: [
      "level: Beginner, Intermediate, or Advanced",
      "duration: e.g., '3 months', '6 weeks'",
      "base_fee: Number only (no currency symbol)",
      "image_url: Optional - full URL to course image"
    ]
  },
  {
    title: "Modules",
    tableName: "modules",
    description: "Course modules - create after courses",
    headers: ["course_title", "title", "description", "order_index"],
    example: ["Foundation Baking", "Introduction to Baking", "Learn the basics of baking equipment and ingredients", "1"],
    notes: [
      "course_title: Must match exactly with course title",
      "order_index: Number starting from 1"
    ]
  },
  {
    title: "Recipes",
    tableName: "recipes",
    description: "Recipe library - create after modules",
    headers: ["course_title", "module_title", "title", "description", "difficulty", "prep_time", "cook_time", "ingredients", "instructions", "video_url"],
    example: [
      "Foundation Baking", 
      "Introduction to Baking", 
      "Classic Chocolate Chip Cookies", 
      "Learn to make perfect cookies every time", 
      "Easy", 
      "15", 
      "12", 
      "200g flour;100g butter;150g sugar;100g chocolate chips;1 egg;1 tsp vanilla",
      "1. Preheat oven to 180°C|2. Cream butter and sugar|3. Add egg and vanilla|4. Mix in flour|5. Fold in chocolate chips|6. Bake for 12 minutes",
      "https://youtube.com/watch?v=example"
    ],
    notes: [
      "difficulty: Easy, Medium, or Hard",
      "prep_time/cook_time: Minutes (number only)",
      "ingredients: Separate with semicolons (;)",
      "instructions: Separate steps with pipes (|)",
      "video_url: Optional - YouTube or other video URL"
    ]
  },
  {
    title: "Assessments",
    tableName: "assessments",
    description: "Quiz assessments - create after modules",
    headers: ["course_title", "module_title", "title", "description", "duration_minutes", "passing_score"],
    example: ["Foundation Baking", "Introduction to Baking", "Module 1 Quiz", "Test your knowledge of baking basics", "30", "60"],
    notes: [
      "duration_minutes: Time allowed in minutes",
      "passing_score: Minimum percentage to pass (0-100)"
    ]
  },
  {
    title: "Questions",
    tableName: "questions",
    description: "Quiz questions - create after assessments",
    headers: ["assessment_title", "question_text", "option_1", "option_2", "option_3", "option_4", "correct_answer", "points"],
    example: ["Module 1 Quiz", "What temperature should butter be for creaming?", "Frozen", "Cold from fridge", "Room temperature", "Melted", "Room temperature", "1"],
    notes: [
      "correct_answer: Must match exactly one of the options",
      "points: Points awarded for correct answer"
    ]
  },
  {
    title: "Inventory",
    tableName: "inventory",
    description: "Kitchen inventory items",
    headers: ["name", "category", "unit", "current_stock", "required_stock", "reorder_level", "cost_per_unit"],
    example: ["All-Purpose Flour", "Dry Ingredients", "kg", "50", "100", "20", "45"],
    notes: [
      "category: e.g., Dry Ingredients, Dairy, Chocolate, Equipment",
      "unit: e.g., kg, g, L, ml, pcs",
      "All numbers without currency symbols"
    ]
  },
  {
    title: "Batches",
    tableName: "batches",
    description: "Course schedule batches",
    headers: ["course_title", "batch_name", "start_date", "days", "time_slot", "total_seats"],
    example: ["Foundation Baking", "January 2025 Morning", "2025-01-15", "Mon-Wed-Fri", "9:00 AM - 12:00 PM", "20"],
    notes: [
      "start_date: Format YYYY-MM-DD",
      "days: e.g., 'Mon-Wed-Fri', 'Tue-Thu', 'Sat-Sun'",
      "time_slot: e.g., '9:00 AM - 12:00 PM'"
    ]
  },
  {
    title: "Jobs",
    tableName: "jobs",
    description: "Job postings for students",
    headers: ["title", "company", "location", "type", "salary_range", "description", "requirement_1", "requirement_2", "requirement_3", "requirement_4"],
    example: ["Pastry Chef", "Grand Hotel", "Mumbai", "Full-time", "₹35,000 - ₹45,000/month", "Looking for a skilled pastry chef to join our team", "2+ years experience", "Baking certification", "Team player", "Creative mindset"],
    notes: [
      "type: Full-time, Part-time, or Internship",
      "requirement columns: Leave empty if not needed"
    ]
  }
];

const DataTemplate = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<Record<string, { success: number; failed: number }>>({});
  const [clearing, setClearing] = useState(false);
  const [tableCounts, setTableCounts] = useState<Record<string, number> | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchTableCounts = async () => {
    setLoadingCounts(true);
    try {
      const tables = ['courses', 'modules', 'recipes', 'assessments', 'questions', 'inventory', 'batches', 'jobs'] as const;
      const counts: Record<string, number> = {};
      
      await Promise.all(tables.map(async (table) => {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        counts[table] = error ? -1 : (count ?? 0);
      }));
      
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

  const handleClearDemoData = async () => {
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
        const totalDeleted = Object.values(data.deletedCounts as Record<string, number>)
          .filter((v): v is number => v > 0)
          .reduce((a, b) => a + b, 0);
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
    const csvContent = [
      template.headers.join(","),
      template.example.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${template.title.toLowerCase()}_template.csv`;
    link.click();
    toast.success(`Downloaded ${template.title} template`);
  };

  const downloadAllTemplates = () => {
    templates.forEach(template => {
      setTimeout(() => downloadCSV(template), 100);
    });
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const handleFileUpload = async (template: TemplateSection, file: File) => {
    setImporting(template.tableName);
    
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length < 2) {
        toast.error("CSV file must have at least a header row and one data row");
        setImporting(null);
        return;
      }

      const headers = rows[0].map(h => h.toLowerCase().trim());
      const dataRows = rows.slice(1);
      
      let successCount = 0;
      let failedCount = 0;

      for (const row of dataRows) {
        try {
          const rowData: Record<string, string> = {};
          headers.forEach((header, index) => {
            if (row[index] !== undefined && row[index] !== '') {
              rowData[header] = row[index];
            }
          });

          // Process based on table type
          const processedData = await processRowData(template, rowData);
          
          if (processedData) {
            const { error } = await supabase
              .from(template.tableName as 'courses' | 'modules' | 'recipes' | 'assessments' | 'questions' | 'inventory' | 'batches' | 'jobs')
              .insert(processedData as never);
            
            if (error) {
              console.error(`Error inserting row:`, error);
              failedCount++;
            } else {
              successCount++;
            }
          } else {
            failedCount++;
          }
        } catch (err) {
          console.error('Error processing row:', err);
          failedCount++;
        }
      }

      setImportResults(prev => ({
        ...prev,
        [template.tableName]: { success: successCount, failed: failedCount }
      }));

      if (successCount > 0) {
        toast.success(`Imported ${successCount} ${template.title.toLowerCase()} successfully`);
      }
      if (failedCount > 0) {
        toast.error(`Failed to import ${failedCount} rows`);
      }
    } catch (err) {
      console.error('Error reading file:', err);
      toast.error("Failed to read CSV file");
    } finally {
      setImporting(null);
    }
  };

  const processRowData = async (template: TemplateSection, rowData: Record<string, string>): Promise<Record<string, unknown> | null> => {
    switch (template.tableName) {
      case 'courses':
        return {
          title: rowData.title,
          description: rowData.description,
          level: rowData.level,
          duration: rowData.duration,
          base_fee: Number(rowData.base_fee) || 0,
          materials_count: Number(rowData.materials_count) || 0,
          image_url: rowData.image_url || null
        };

      case 'modules': {
        const { data: course } = await supabase
          .from('courses')
          .select('id')
          .eq('title', rowData.course_title)
          .single();
        
        if (!course) {
          console.error(`Course not found: ${rowData.course_title}`);
          return null;
        }
        
        return {
          course_id: course.id,
          title: rowData.title,
          description: rowData.description || null,
          order_index: Number(rowData.order_index) || 0
        };
      }

      case 'recipes': {
        const { data: course } = await supabase
          .from('courses')
          .select('id')
          .eq('title', rowData.course_title)
          .single();
        
        if (!course) return null;

        let moduleId = null;
        if (rowData.module_title) {
          const { data: module } = await supabase
            .from('modules')
            .select('id')
            .eq('title', rowData.module_title)
            .eq('course_id', course.id)
            .single();
          moduleId = module?.id;
        }

        const ingredients = rowData.ingredients 
          ? String(rowData.ingredients).split(';').map(i => ({ name: i.trim(), quantity: '' }))
          : [];

        return {
          course_id: course.id,
          module_id: moduleId,
          title: rowData.title,
          description: rowData.description || null,
          difficulty: rowData.difficulty || null,
          prep_time: Number(rowData.prep_time) || null,
          cook_time: Number(rowData.cook_time) || null,
          ingredients: ingredients,
          instructions: rowData.instructions ? String(rowData.instructions).replace(/\|/g, '\n') : null,
          video_url: rowData.video_url || null
        };
      }

      case 'assessments': {
        const { data: course } = await supabase
          .from('courses')
          .select('id')
          .eq('title', rowData.course_title)
          .single();
        
        if (!course) return null;

        let moduleId = null;
        if (rowData.module_title) {
          const { data: module } = await supabase
            .from('modules')
            .select('id')
            .eq('title', rowData.module_title)
            .eq('course_id', course.id)
            .single();
          moduleId = module?.id;
        }

        return {
          course_id: course.id,
          module_id: moduleId,
          title: rowData.title,
          description: rowData.description || null,
          duration_minutes: Number(rowData.duration_minutes) || 30,
          passing_score: Number(rowData.passing_score) || 60
        };
      }

      case 'questions': {
        const { data: assessment } = await supabase
          .from('assessments')
          .select('id')
          .eq('title', rowData.assessment_title)
          .single();
        
        if (!assessment) {
          console.error(`Assessment not found: ${rowData.assessment_title}`);
          return null;
        }

        const options = [
          rowData.option_1,
          rowData.option_2,
          rowData.option_3,
          rowData.option_4
        ].filter(Boolean);

        return {
          assessment_id: assessment.id,
          question_text: rowData.question_text,
          options: options,
          correct_answer: rowData.correct_answer,
          points: Number(rowData.points) || 1
        };
      }

      case 'inventory':
        return {
          name: rowData.name,
          category: rowData.category,
          unit: rowData.unit,
          current_stock: Number(rowData.current_stock) || 0,
          required_stock: Number(rowData.required_stock) || 0,
          reorder_level: Number(rowData.reorder_level) || 10,
          cost_per_unit: Number(rowData.cost_per_unit) || null
        };

      case 'batches': {
        const { data: course } = await supabase
          .from('courses')
          .select('id')
          .eq('title', rowData.course_title)
          .single();
        
        if (!course) return null;

        return {
          course_id: course.id,
          batch_name: rowData.batch_name,
          start_date: rowData.start_date || null,
          days: rowData.days,
          time_slot: rowData.time_slot,
          total_seats: Number(rowData.total_seats) || 30,
          available_seats: Number(rowData.total_seats) || 30
        };
      }

      case 'jobs': {
        const requirements = [
          rowData.requirement_1,
          rowData.requirement_2,
          rowData.requirement_3,
          rowData.requirement_4
        ].filter(Boolean) as string[];

        return {
          title: rowData.title,
          company: rowData.company,
          location: rowData.location,
          type: rowData.type || 'Full-time',
          salary_range: rowData.salary_range || null,
          description: rowData.description,
          requirements: requirements.length > 0 ? requirements : null
        };
      }

      default:
        return null;
    }
  };

  const triggerFileInput = (tableName: string) => {
    fileInputRefs.current[tableName]?.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />
      
      <div className="container px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Data Management Centre</h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Download templates, fill with your data, and import directly into the database
              </p>
            </div>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2" disabled={clearing}>
                    {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Clear All Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear All Data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete ALL data from courses, modules, recipes, assessments, questions, inventory, batches, jobs, and all related records (attendance, bookings, enrollments, payments, etc.). 
                      <br /><br />
                      <strong>This action cannot be undone.</strong> Student accounts and staff accounts will NOT be affected.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearDemoData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes, Clear Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={downloadAllTemplates} className="gap-2">
                <Download className="h-4 w-4" />
                Download All Templates
              </Button>
            </div>
          </div>
        </div>

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
                  <Badge variant={count && count > 0 ? "default" : "secondary"}>
                    {loadingCounts ? "..." : (count ?? "—")}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>

        <Tabs defaultValue="import" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="import" className="gap-2">
              <Upload className="h-4 w-4" />
              Import Data
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Templates
            </TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-6">
            {/* Instructions Card */}
            <Card className="p-4 md:p-6 bg-primary/5 border-primary/20">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                How to Import Data
              </h2>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Download the template for the data type you want to import</li>
                <li>Fill in your data following the template format exactly</li>
                <li><strong>Important:</strong> Import in order: Courses → Modules → Recipes/Assessments → Questions</li>
                <li>Upload your filled CSV file using the import buttons below</li>
              </ol>
            </Card>

            {/* Import Cards Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.tableName} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{template.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {template.headers.length} cols
                    </Badge>
                  </div>

                  {importResults[template.tableName] && (
                    <div className="mb-3 p-2 rounded bg-muted/50 text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span>{importResults[template.tableName].success} imported</span>
                      </div>
                      {importResults[template.tableName].failed > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <AlertCircle className="h-3 w-3 text-destructive" />
                          <span>{importResults[template.tableName].failed} failed</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      ref={(el) => { fileInputRefs.current[template.tableName] = el; }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(template, file);
                        e.target.value = '';
                      }}
                    />
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => triggerFileInput(template.tableName)}
                      disabled={importing === template.tableName}
                    >
                      {importing === template.tableName ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Import CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadCSV(template)}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            {/* Instructions Card */}
            <Card className="p-4 md:p-6 bg-primary/5 border-primary/20">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Template Reference
              </h2>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Download each template CSV file or copy the headers</li>
                <li>Open in Excel, Google Sheets, or any spreadsheet application</li>
                <li>Fill in your data following the example row format</li>
                <li><strong>Important:</strong> Create data in this order: Courses → Modules → Recipes/Assessments → Questions</li>
              </ol>
            </Card>

            {/* Template Sections */}
            <div className="space-y-6">
              {templates.map((template, index) => (
                <Card key={template.title} className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold">{template.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {template.headers.length} columns
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(template.headers.join(","), index)}
                        className="gap-2"
                      >
                        {copiedIndex === index ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        Copy Headers
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadCSV(template)}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download CSV
                      </Button>
                    </div>
                  </div>

                  {/* Headers */}
                  <div className="mb-4">
                    <div className="text-xs font-medium text-muted-foreground mb-2">COLUMN HEADERS</div>
                    <div className="flex flex-wrap gap-2">
                      {template.headers.map((header) => (
                        <Badge key={header} variant="secondary" className="font-mono text-xs">
                          {header}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Example Row */}
                  <div className="mb-4">
                    <div className="text-xs font-medium text-muted-foreground mb-2">EXAMPLE ROW</div>
                    <div className="bg-muted/50 rounded-lg p-3 overflow-x-auto">
                      <div className="flex gap-2 min-w-max">
                        {template.example.map((value, i) => (
                          <div key={i} className="flex flex-col">
                            <span className="text-xs text-muted-foreground mb-1">{template.headers[i]}</span>
                            <span className="text-sm font-mono bg-background px-2 py-1 rounded border truncate max-w-[200px]" title={value}>
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">FORMATTING NOTES</div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {template.notes.map((note, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              ))}
            </div>

            {/* Additional Assets Section */}
            <Card className="p-4 md:p-6">
              <h3 className="text-lg font-semibold mb-4">Additional Assets Needed</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border bg-card">
                  <h4 className="font-medium mb-2">Course Images</h4>
                  <p className="text-sm text-muted-foreground">
                    High-quality images for each course (recommended: 800x600px, JPG/PNG)
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <h4 className="font-medium mb-2">Recipe Videos</h4>
                  <p className="text-sm text-muted-foreground">
                    YouTube links or video files for recipe demonstrations
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <h4 className="font-medium mb-2">Academy Branding</h4>
                  <p className="text-sm text-muted-foreground">
                    Logo (SVG/PNG), brand colors, tagline, About Us content
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <h4 className="font-medium mb-2">Contact Information</h4>
                  <p className="text-sm text-muted-foreground">
                    Address, phone numbers, email, social media links
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DataTemplate;
