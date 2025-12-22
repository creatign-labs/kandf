import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { ChefHat, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const STEPS = [
  { id: 1, title: "Your Goal", description: "What brings you to Knead & Frost?" },
  { id: 2, title: "Duration", description: "How long can you commit?" },
  { id: 3, title: "Interests", description: "What would you like to learn?" },
  { id: 4, title: "Experience", description: "What's your current skill level?" },
];

const GOALS = [
  { value: "hobby", label: "Hobby & Personal Interest", description: "Learn for fun and personal enjoyment" },
  { value: "career", label: "Career Change", description: "Looking to start a career in baking" },
  { value: "business", label: "Start a Business", description: "Planning to open a bakery or home business" },
  { value: "skill_upgrade", label: "Skill Upgrade", description: "Already working in the field, want to improve" },
];

const DURATIONS = [
  { value: "1_month", label: "1 Month", description: "Intensive short-term course" },
  { value: "3_months", label: "3 Months", description: "Comprehensive foundation" },
  { value: "6_months", label: "6 Months", description: "In-depth professional training" },
  { value: "flexible", label: "Flexible", description: "I'm open to any duration" },
];

const RECIPE_INTERESTS = [
  { value: "breads", label: "Artisan Breads" },
  { value: "cakes", label: "Cakes & Decorating" },
  { value: "pastries", label: "Pastries & Croissants" },
  { value: "cookies", label: "Cookies & Biscuits" },
  { value: "desserts", label: "Plated Desserts" },
  { value: "chocolate", label: "Chocolate Work" },
  { value: "vegan", label: "Vegan Baking" },
  { value: "gluten_free", label: "Gluten-Free Options" },
];

const SKILL_LEVELS = [
  { value: "beginner", label: "Complete Beginner", description: "Never baked before or very limited experience" },
  { value: "home_baker", label: "Home Baker", description: "Comfortable with basic recipes at home" },
  { value: "intermediate", label: "Intermediate", description: "Good understanding of techniques, want to refine" },
  { value: "advanced", label: "Advanced", description: "Professional experience, seeking mastery" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    goal: "",
    preferred_duration: "",
    recipe_interests: [] as string[],
    skill_level: "",
  });

  const progress = (currentStep / STEPS.length) * 100;

  const handleInterestToggle = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      recipe_interests: prev.recipe_interests.includes(interest)
        ? prev.recipe_interests.filter((i) => i !== interest)
        : [...prev.recipe_interests, interest],
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!formData.goal;
      case 2:
        return !!formData.preferred_duration;
      case 3:
        return formData.recipe_interests.length > 0;
      case 4:
        return !!formData.skill_level;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please log in", variant: "destructive" });
        navigate("/login");
        return;
      }

      const { error } = await supabase.from("student_onboarding").insert({
        student_id: user.id,
        goal: formData.goal,
        preferred_duration: formData.preferred_duration,
        recipe_interests: formData.recipe_interests,
        skill_level: formData.skill_level,
      });

      if (error) throw error;

      toast({
        title: "Profile Complete!",
        description: "Now let's find the perfect course for you.",
      });
      navigate("/courses?onboarded=true");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="public" />

      <div className="container px-6 py-12 max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {STEPS.length}
            </span>
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{STEPS[currentStep - 1].title}</h1>
          <p className="text-muted-foreground">{STEPS[currentStep - 1].description}</p>
        </div>

        {/* Step Content */}
        <Card className="p-8 border-border/60">
          {currentStep === 1 && (
            <RadioGroup
              value={formData.goal}
              onValueChange={(value) => setFormData({ ...formData, goal: value })}
              className="space-y-4"
            >
              {GOALS.map((goal) => (
                <Label
                  key={goal.value}
                  htmlFor={goal.value}
                  className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.goal === goal.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={goal.value} id={goal.value} className="mt-1" />
                  <div className="ml-3">
                    <div className="font-medium">{goal.label}</div>
                    <div className="text-sm text-muted-foreground">{goal.description}</div>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          )}

          {currentStep === 2 && (
            <RadioGroup
              value={formData.preferred_duration}
              onValueChange={(value) => setFormData({ ...formData, preferred_duration: value })}
              className="space-y-4"
            >
              {DURATIONS.map((duration) => (
                <Label
                  key={duration.value}
                  htmlFor={duration.value}
                  className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.preferred_duration === duration.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={duration.value} id={duration.value} className="mt-1" />
                  <div className="ml-3">
                    <div className="font-medium">{duration.label}</div>
                    <div className="text-sm text-muted-foreground">{duration.description}</div>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          )}

          {currentStep === 3 && (
            <div className="grid grid-cols-2 gap-4">
              {RECIPE_INTERESTS.map((interest) => (
                <Label
                  key={interest.value}
                  htmlFor={interest.value}
                  className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.recipe_interests.includes(interest.value)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    id={interest.value}
                    checked={formData.recipe_interests.includes(interest.value)}
                    onCheckedChange={() => handleInterestToggle(interest.value)}
                  />
                  <span className="ml-3 font-medium">{interest.label}</span>
                </Label>
              ))}
            </div>
          )}

          {currentStep === 4 && (
            <RadioGroup
              value={formData.skill_level}
              onValueChange={(value) => setFormData({ ...formData, skill_level: value })}
              className="space-y-4"
            >
              {SKILL_LEVELS.map((level) => (
                <Label
                  key={level.value}
                  htmlFor={level.value}
                  className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.skill_level === level.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={level.value} id={level.value} className="mt-1" />
                  <div className="ml-3">
                    <div className="font-medium">{level.label}</div>
                    <div className="text-sm text-muted-foreground">{level.description}</div>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            {currentStep < STEPS.length ? (
              <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canProceed() || loading} className="gap-2">
                {loading ? "Saving..." : "Find My Courses"}
                <ChefHat className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
