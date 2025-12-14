import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, FileSpreadsheet, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface TemplateSection {
  title: string;
  description: string;
  headers: string[];
  example: string[];
  notes: string[];
}

const templates: TemplateSection[] = [
  {
    title: "Courses",
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

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />
      
      <div className="container px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Data Templates</h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Download and fill these templates with your academy's real data
              </p>
            </div>
            <Button onClick={downloadAllTemplates} className="gap-2">
              <Download className="h-4 w-4" />
              Download All Templates
            </Button>
          </div>
        </div>

        {/* Instructions Card */}
        <Card className="p-4 md:p-6 mb-6 bg-primary/5 border-primary/20">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            How to Use These Templates
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Download each template CSV file or copy the headers</li>
            <li>Open in Excel, Google Sheets, or any spreadsheet application</li>
            <li>Fill in your data following the example row format</li>
            <li><strong>Important:</strong> Create data in this order: Courses → Modules → Recipes/Assessments → Questions</li>
            <li>Send completed spreadsheets to your developer for database import</li>
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
        <Card className="p-4 md:p-6 mt-6">
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
      </div>
    </div>
  );
};

export default DataTemplate;