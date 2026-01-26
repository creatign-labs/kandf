import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const jobSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().min(50, "Description must be at least 50 characters").max(5000),
  location: z.string().min(2, "Location is required").max(100),
  type: z.string().min(1, "Job type is required"),
  salary_range: z.string().optional(),
});

const JobForm = () => {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    type: "Full-time",
    salary_range: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: vendorProfile } = useQuery({
    queryKey: ["vendor-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("vendor_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: existingJob, isLoading: loadingJob } = useQuery({
    queryKey: ["job", id],
    enabled: isEditing,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existingJob) {
      setFormData({
        title: existingJob.title,
        description: existingJob.description,
        location: existingJob.location,
        type: existingJob.type,
        salary_range: existingJob.salary_range || "",
      });
    }
  }, [existingJob]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (isEditing) {
        const { error } = await supabase
          .from("jobs")
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("jobs")
          .insert({
            ...data,
            vendor_id: vendorProfile!.id,
            company: vendorProfile!.company_name,
            is_active: true,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-jobs"] });
      toast({
        title: isEditing ? "Job updated successfully" : "Job posted successfully",
        description: isEditing 
          ? "Your changes have been saved" 
          : "Your job is now visible to students",
      });
      navigate("/vendor/jobs");
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving job",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = jobSchema.parse(formData);
      saveMutation.mutate({
        title: validated.title,
        description: validated.description,
        location: validated.location,
        type: validated.type,
        salary_range: validated.salary_range || "",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  if (isEditing && loadingJob) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="vendor" />
      
      <div className="container px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link to="/vendor/jobs">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Jobs
              </Link>
            </Button>
            <h1 className="text-3xl font-bold mb-2">
              {isEditing ? "Edit Job Posting" : "Create New Job Posting"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing 
                ? "Update your job listing details" 
                : "Fill in the details to post a new job opportunity"}
            </p>
          </div>

          <Card className="p-6 border-border/60">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Senior Pastry Chef"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  placeholder="e.g., Mumbai, India"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
                {errors.location && (
                  <p className="text-sm text-destructive">{errors.location}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Job Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type && (
                    <p className="text-sm text-destructive">{errors.type}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary_range">Salary Range (Optional)</Label>
                  <Input
                    id="salary_range"
                    placeholder="e.g., ₹30,000 - ₹50,000/month"
                    value={formData.salary_range}
                    onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Job Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the role, responsibilities, requirements, and benefits..."
                  className="min-h-[200px]"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Minimum 50 characters. Include role details, requirements, and what you offer.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/vendor/jobs")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isEditing ? "Saving..." : "Posting..."}
                    </>
                  ) : (
                    isEditing ? "Save Changes" : "Post Job"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default JobForm;
