import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Clock, Users, IndianRupee, Loader2, Trash2, ChefHat, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Courses = () => {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [recipeSearchQuery, setRecipeSearchQuery] = useState("");
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration: "",
    level: "Beginner",
    base_fee: "",
  });

  // Fetch all recipes for selection
  const { data: allRecipes } = useQuery({
    queryKey: ["all-recipes-for-course"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("id, title, difficulty, course_id")
        .order("title");

      if (error) throw error;
      return data;
    },
  });

  // Fetch courses with modules and batches
  const { data: courses, isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .order("created_at");

      if (coursesError) throw coursesError;

      // Fetch related data for each course
      const coursesWithRelations = await Promise.all(
        (coursesData || []).map(async (course) => {
          const [modulesResult, batchesResult, enrollmentsResult, recipesResult] = await Promise.all([
            supabase
              .from("modules")
              .select("*, recipes(*)")
              .eq("course_id", course.id)
              .order("order_index"),
            supabase
              .from("batches")
              .select("*")
              .eq("course_id", course.id),
            supabase
              .from("enrollments")
              .select("id")
              .eq("course_id", course.id)
              .eq("status", "active"),
            supabase
              .from("recipes")
              .select("id, title, difficulty")
              .eq("course_id", course.id),
          ]);

          return {
            ...course,
            modules: modulesResult.data || [],
            batches: batchesResult.data || [],
            recipes: recipesResult.data || [],
            studentCount: enrollmentsResult.data?.length || 0,
          };
        })
      );

      return coursesWithRelations;
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Create the course first
      const { data: newCourse, error } = await supabase.from("courses").insert({
        title: data.title,
        description: data.description,
        duration: data.duration,
        level: data.level,
        base_fee: parseFloat(data.base_fee),
      }).select().single();
      
      if (error) throw error;

      // Update selected recipes to link to this course
      if (selectedRecipeIds.length > 0 && newCourse) {
        const { error: recipeError } = await supabase
          .from("recipes")
          .update({ course_id: newCourse.id })
          .in("id", selectedRecipeIds);
        
        if (recipeError) throw recipeError;
      }

      return newCourse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["all-recipes-for-course"] });
      toast({ title: "Course created successfully" });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("courses")
        .update({
          title: data.title,
          description: data.description,
          duration: data.duration,
          level: data.level,
          base_fee: parseFloat(data.base_fee),
        })
        .eq("id", id);
      if (error) throw error;

      // First, unlink all recipes from this course
      const { error: unlinkError } = await supabase
        .from("recipes")
        .update({ course_id: null })
        .eq("course_id", id);
      
      if (unlinkError) throw unlinkError;

      // Then link the selected recipes
      if (selectedRecipeIds.length > 0) {
        const { error: linkError } = await supabase
          .from("recipes")
          .update({ course_id: id })
          .in("id", selectedRecipeIds);
        
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["all-recipes-for-course"] });
      toast({ title: "Course updated successfully" });
      setEditingCourse(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
  const deleteCourseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Course deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      duration: "",
      level: "Beginner",
      base_fee: "",
    });
    setSelectedRecipeIds([]);
    setRecipeSearchQuery("");
  };

  const handleEdit = (course: any) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description,
      duration: course.duration,
      level: course.level,
      base_fee: course.base_fee.toString(),
    });
    // Pre-select recipes that are linked to this course
    const linkedRecipeIds = course.recipes?.map((r: any) => r.id) || [];
    setSelectedRecipeIds(linkedRecipeIds);
    setRecipeSearchQuery("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCourse) {
      updateCourseMutation.mutate({ id: editingCourse.id, data: formData });
    } else {
      createCourseMutation.mutate(formData);
    }
  };

  // Stats calculation
  const stats = {
    totalCourses: courses?.length || 0,
    totalStudents: courses?.reduce((acc, c) => acc + c.studentCount, 0) || 0,
    activeBatches: courses?.reduce((acc, c) => acc + c.batches.length, 0) || 0,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="admin" userName="Admin" />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  // Filter recipes for selection - exclude recipes already linked to other courses
  const availableRecipes = allRecipes?.filter((recipe) => {
    // Include if: no course_id, or is being edited and belongs to this course, or is already selected
    const isAvailable = !recipe.course_id || 
      (editingCourse && recipe.course_id === editingCourse.id) ||
      selectedRecipeIds.includes(recipe.id);
    
    const matchesSearch = recipe.title.toLowerCase().includes(recipeSearchQuery.toLowerCase());
    return isAvailable && matchesSearch;
  }) || [];

  const toggleRecipe = (recipeId: string) => {
    setSelectedRecipeIds((prev) =>
      prev.includes(recipeId)
        ? prev.filter((id) => id !== recipeId)
        : [...prev, recipeId]
    );
  };

  const CourseForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Course Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="e.g., Basic Baking Fundamentals"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Course description..."
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration">Duration</Label>
          <Input
            id="duration"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            placeholder="e.g., 3 months"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="base_fee">Base Fee (₹)</Label>
          <Input
            id="base_fee"
            type="number"
            value={formData.base_fee}
            onChange={(e) => setFormData({ ...formData, base_fee: e.target.value })}
            placeholder="e.g., 15000"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="level">Level</Label>
        <Select value={formData.level} onValueChange={(v) => setFormData({ ...formData, level: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="Beginner">Beginner</SelectItem>
            <SelectItem value="Intermediate">Intermediate</SelectItem>
            <SelectItem value="Advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Recipe Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <ChefHat className="h-4 w-4" />
          Select Recipes for this Course
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            className="pl-10"
            value={recipeSearchQuery}
            onChange={(e) => setRecipeSearchQuery(e.target.value)}
          />
        </div>
        <ScrollArea className="h-48 rounded-md border p-2">
          {availableRecipes.length > 0 ? (
            <div className="space-y-2">
              {availableRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                  onClick={() => toggleRecipe(recipe.id)}
                >
                  <Checkbox
                    checked={selectedRecipeIds.includes(recipe.id)}
                    onCheckedChange={() => toggleRecipe(recipe.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{recipe.title}</p>
                    {recipe.difficulty && (
                      <Badge variant="outline" className="text-xs">
                        {recipe.difficulty}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <ChefHat className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {recipeSearchQuery ? "No recipes match your search" : "No available recipes"}
              </p>
            </div>
          )}
        </ScrollArea>
        {selectedRecipeIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedRecipeIds.map((id) => {
              const recipe = allRecipes?.find((r) => r.id === id);
              return recipe ? (
                <Badge key={id} variant="secondary" className="gap-1">
                  {recipe.title}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRecipe(id);
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ) : null;
            })}
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={createCourseMutation.isPending || updateCourseMutation.isPending}>
        {createCourseMutation.isPending || updateCourseMutation.isPending ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
        ) : editingCourse ? (
          "Update Course"
        ) : (
          "Create Course"
        )}
      </Button>
    </form>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Course Management</h1>
            <p className="text-muted-foreground">Create and manage course curriculum, modules, and pricing</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={resetForm}>
                <Plus className="h-4 w-4" />
                Add New Course
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
              </DialogHeader>
              <CourseForm />
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-6">
          {courses?.map((course, index) => (
            <Card key={course.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="text-lg px-3 py-1">Course {String.fromCharCode(65 + index)}</Badge>
                    <h2 className="text-2xl font-bold text-foreground">{course.title}</h2>
                  </div>
                  <p className="text-muted-foreground mb-3">{course.description}</p>
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {course.duration}
                    </div>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4" />
                      ₹{course.base_fee.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {course.studentCount} enrolled
                    </div>
                    <Badge variant="outline">{course.level}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Dialog open={editingCourse?.id === course.id} onOpenChange={(open) => !open && setEditingCourse(null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2" onClick={() => handleEdit(course)}>
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Course</DialogTitle>
                      </DialogHeader>
                      <CourseForm />
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this course?")) {
                        deleteCourseMutation.mutate(course.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {course.batches.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Available Batches</h3>
                  <div className="flex flex-wrap gap-2">
                    {course.batches.map((batch: any) => (
                      <Badge key={batch.id} variant="outline">
                        {batch.batch_name} ({batch.time_slot}) - {batch.available_seats}/{batch.total_seats} seats
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Recipes Section */}
              {course.recipes && course.recipes.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <ChefHat className="h-4 w-4 text-primary" />
                    Linked Recipes ({course.recipes.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {course.recipes.map((recipe: any) => (
                      <Badge key={recipe.id} variant="secondary" className="gap-1">
                        {recipe.title}
                        {recipe.difficulty && (
                          <span className="text-xs opacity-70">• {recipe.difficulty}</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {course.modules.length > 0 && (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="modules">
                    <AccordionTrigger className="text-lg font-semibold">
                      Course Modules & Recipes ({course.modules.length} modules)
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-4">
                        {course.modules.map((module: any) => (
                          <div key={module.id} className="border-l-2 border-primary pl-4">
                            <h4 className="font-semibold text-foreground mb-2">{module.title}</h4>
                            {module.description && (
                              <p className="text-sm text-muted-foreground mb-2">{module.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {module.recipes?.map((recipe: any) => (
                                <Badge key={recipe.id} variant="secondary">
                                  {recipe.title}
                                </Badge>
                              ))}
                              {(!module.recipes || module.recipes.length === 0) && (
                                <span className="text-sm text-muted-foreground">No recipes added yet</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              {course.modules.length === 0 && (
                <p className="text-muted-foreground text-sm">No modules added to this course yet.</p>
              )}
            </Card>
          ))}

          {(!courses || courses.length === 0) && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No courses created yet. Click "Add New Course" to get started.</p>
            </Card>
          )}
        </div>

        <Card className="p-6 mt-6">
          <h2 className="text-xl font-bold mb-4">Course Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="text-sm text-muted-foreground">Total Courses</div>
              <div className="text-2xl font-bold">{stats.totalCourses}</div>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <div className="text-sm text-muted-foreground">Total Students</div>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <div className="text-sm text-muted-foreground">Active Batches</div>
              <div className="text-2xl font-bold">{stats.activeBatches}</div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Courses;
