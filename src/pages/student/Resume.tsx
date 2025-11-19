import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

const Resume = () => {
  const [hasResume, setHasResume] = useState(false);

  const handleUpload = () => {
    setHasResume(true);
    toast({
      title: "Resume uploaded successfully!",
      description: "Your resume has been saved to your profile.",
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setHasResume(true);
    toast({
      title: "Resume created successfully!",
      description: "Your resume has been generated and saved.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="student" />
      
      <div className="container px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Resume</h1>
            <p className="text-muted-foreground">
              Build your professional resume or upload an existing one
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <Card className="p-6 border-border/60">
              <div className="text-center">
                <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Upload Resume</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Already have a resume? Upload your PDF file
                </p>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  id="resume-upload"
                  onChange={handleUpload}
                />
                <Button asChild variant="outline" className="w-full">
                  <label htmlFor="resume-upload" className="cursor-pointer">
                    Choose File
                  </label>
                </Button>
              </div>
            </Card>

            <Card className="p-6 border-border/60">
              <div className="text-center">
                <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-4">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Build Resume</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Use our resume builder to create a professional resume
                </p>
                <Button className="w-full">
                  Start Building
                </Button>
              </div>
            </Card>
          </div>

          {hasResume ? (
            <Card className="p-6 border-border/60">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Current Resume</h3>
                    <p className="text-sm text-muted-foreground">Last updated: Today</p>
                  </div>
                </div>
                <Button variant="outline">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>

              <div className="border-2 border-dashed border-border rounded-xl p-8 bg-muted/20">
                <div className="aspect-[8.5/11] bg-white rounded-lg shadow-sm flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Resume Preview</p>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6 border-border/60">
              <h3 className="text-xl font-semibold mb-6">Resume Builder</h3>
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john.doe@example.com" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">Professional Summary</Label>
                  <Textarea
                    id="summary"
                    placeholder="Brief summary of your professional background and goals..."
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="education">Education</Label>
                  <Textarea
                    id="education"
                    placeholder="Your educational background..."
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Work Experience</Label>
                  <Textarea
                    id="experience"
                    placeholder="Your relevant work experience..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skills">Skills</Label>
                  <Textarea
                    id="skills"
                    placeholder="List your key skills..."
                    rows={3}
                    required
                  />
                </div>

                <Button type="submit" size="lg" className="w-full">
                  Create Resume
                </Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Resume;
