import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { ChefHat, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

const signupSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  firstName: z.string().trim().min(1, "First name is required").max(100, "First name too long"),
  lastName: z.string().trim().min(1, "Last name is required").max(100, "Last name too long"),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const onboardingSchema = z.object({
  goal: z.string().min(1, "Please select your goal"),
  preferredDuration: z.string().min(1, "Please select preferred duration"),
  recipeInterests: z.array(z.string()).min(1, "Please select at least one recipe type"),
  skillLevel: z.string().min(1, "Please select your skill level"),
});

const goalOptions = [
  { value: "hobby", label: "Hobby & Personal Interest", description: "Learn baking for fun and personal satisfaction" },
  { value: "career", label: "Career Change", description: "Looking to start a career in baking/pastry" },
  { value: "business", label: "Start a Business", description: "Planning to open a bakery or home business" },
  { value: "skill_upgrade", label: "Skill Enhancement", description: "Already working in food industry, want to upskill" },
];

const durationOptions = [
  { value: "1_month", label: "1 Month", description: "Intensive fast-track learning" },
  { value: "3_months", label: "3 Months", description: "Balanced pace with practice time" },
  { value: "6_months", label: "6 Months", description: "Comprehensive deep learning" },
  { value: "flexible", label: "Flexible", description: "Self-paced learning" },
];

const recipeOptions = [
  { value: "breads", label: "Artisan Breads" },
  { value: "cakes", label: "Cakes & Cupcakes" },
  { value: "pastries", label: "Pastries & Croissants" },
  { value: "cookies", label: "Cookies & Biscuits" },
  { value: "pies", label: "Pies & Tarts" },
  { value: "desserts", label: "Plated Desserts" },
  { value: "chocolate", label: "Chocolate Work" },
  { value: "indian", label: "Indian Sweets" },
];

const skillOptions = [
  { value: "beginner", label: "Beginner", description: "New to baking, learning the basics" },
  { value: "intermediate", label: "Intermediate", description: "Comfortable with basic recipes" },
  { value: "advanced", label: "Advanced", description: "Experienced, looking to master techniques" },
];

const Signup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [onboardingData, setOnboardingData] = useState({
    goal: "",
    preferredDuration: "",
    recipeInterests: [] as string[],
    skillLevel: "",
  });
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleRecipeInterestChange = (value: string, checked: boolean) => {
    setOnboardingData(prev => ({
      ...prev,
      recipeInterests: checked 
        ? [...prev.recipeInterests, value]
        : prev.recipeInterests.filter(v => v !== value)
    }));
  };

  const validateStep1 = () => {
    try {
      signupSchema.parse(formData);
      if (!termsAccepted) {
        toast({
          title: "Terms required",
          description: "Please accept the Terms & Conditions and Privacy Policy.",
          variant: "destructive",
        });
        return false;
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && onboardingData.goal) {
      setStep(3);
    } else if (step === 3 && onboardingData.preferredDuration) {
      setStep(4);
    } else if (step === 4 && onboardingData.recipeInterests.length > 0) {
      setStep(5);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    // Validate onboarding data
    try {
      onboardingSchema.parse(onboardingData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Please complete all questions",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      // Validate signup input
      const validated = signupSchema.parse(formData);

      // Create account
      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: validated.firstName,
            last_name: validated.lastName,
            phone: validated.phone,
          },
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast({
            title: "Account exists",
            description: "An account with this email already exists. Please log in instead.",
            variant: "destructive",
          });
        } else if (error.message.includes("Password should be")) {
          toast({
            title: "Weak password",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Signup failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (data.user) {
        // Save onboarding data
        const { error: onboardingError } = await supabase
          .from('student_onboarding')
          .insert({
            student_id: data.user.id,
            goal: onboardingData.goal,
            preferred_duration: onboardingData.preferredDuration,
            recipe_interests: onboardingData.recipeInterests,
            skill_level: onboardingData.skillLevel,
          });

        if (onboardingError) {
          console.error('Failed to save onboarding data:', onboardingError);
        }

        toast({
          title: "Account created successfully!",
          description: "Welcome to Knead & Frost. Please proceed to select a course.",
        });
        setTimeout(() => navigate("/courses"), 1500);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const progress = (step / 5) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Header role="public" />
      
      <div className="container px-6 py-8 md:py-16">
        <div className="mx-auto max-w-lg">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-primary/10 mb-4">
              <ChefHat className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              {step === 1 ? "Create Account" : "Tell Us About You"}
            </h1>
            <p className="text-muted-foreground">
              {step === 1 
                ? "Start your baking journey with us" 
                : `Step ${step} of 5 - ${
                    step === 2 ? "Your Goal" :
                    step === 3 ? "Preferred Duration" :
                    step === 4 ? "Recipe Interests" :
                    "Skill Level"
                  }`
              }
            </p>
          </div>

          {/* Progress Bar */}
          <Progress value={progress} className="mb-6 h-2" />

          <Card className="p-6 md:p-8 border-border/60">
            {/* Step 1: Account Details */}
            {step === 1 && (
              <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleNextStep(); }}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    At least 8 characters with 1 uppercase letter and 1 number
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
                    I agree to the{" "}
                    <Link to="/terms" className="text-primary hover:underline">
                      Terms & Conditions
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </label>
                </div>

                <Button className="w-full" size="lg" type="submit">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            )}

            {/* Step 2: Goal */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold mb-1">What's your goal?</h3>
                  <p className="text-sm text-muted-foreground">Help us personalize your learning journey</p>
                </div>
                
                <RadioGroup
                  value={onboardingData.goal}
                  onValueChange={(value) => setOnboardingData(prev => ({ ...prev, goal: value }))}
                  className="space-y-3"
                >
                  {goalOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                        onboardingData.goal === option.value 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setOnboardingData(prev => ({ ...prev, goal: option.value }))}
                    >
                      <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor={option.value} className="font-medium cursor-pointer">
                          {option.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={handlePrevStep} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleNextStep} 
                    disabled={!onboardingData.goal}
                    className="flex-1"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Duration */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold mb-1">Preferred course duration?</h3>
                  <p className="text-sm text-muted-foreground">How much time can you dedicate?</p>
                </div>
                
                <RadioGroup
                  value={onboardingData.preferredDuration}
                  onValueChange={(value) => setOnboardingData(prev => ({ ...prev, preferredDuration: value }))}
                  className="space-y-3"
                >
                  {durationOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                        onboardingData.preferredDuration === option.value 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setOnboardingData(prev => ({ ...prev, preferredDuration: option.value }))}
                    >
                      <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor={option.value} className="font-medium cursor-pointer">
                          {option.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={handlePrevStep} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleNextStep} 
                    disabled={!onboardingData.preferredDuration}
                    className="flex-1"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Recipe Interests */}
            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold mb-1">What interests you?</h3>
                  <p className="text-sm text-muted-foreground">Select all recipe types you'd like to learn</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {recipeOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        onboardingData.recipeInterests.includes(option.value)
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleRecipeInterestChange(
                        option.value, 
                        !onboardingData.recipeInterests.includes(option.value)
                      )}
                    >
                      <Checkbox
                        checked={onboardingData.recipeInterests.includes(option.value)}
                        onCheckedChange={(checked) => handleRecipeInterestChange(option.value, checked === true)}
                      />
                      <Label className="font-medium cursor-pointer text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={handlePrevStep} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleNextStep} 
                    disabled={onboardingData.recipeInterests.length === 0}
                    className="flex-1"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Skill Level */}
            {step === 5 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold mb-1">Your current skill level?</h3>
                  <p className="text-sm text-muted-foreground">This helps us recommend the right courses</p>
                </div>
                
                <RadioGroup
                  value={onboardingData.skillLevel}
                  onValueChange={(value) => setOnboardingData(prev => ({ ...prev, skillLevel: value }))}
                  className="space-y-3"
                >
                  {skillOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                        onboardingData.skillLevel === option.value 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setOnboardingData(prev => ({ ...prev, skillLevel: option.value }))}
                    >
                      <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor={option.value} className="font-medium cursor-pointer">
                          {option.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={handlePrevStep} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={!onboardingData.skillLevel || loading}
                    className="flex-1"
                  >
                    {loading ? (
                      "Creating Account..."
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Complete Signup
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 1 && (
              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Log in
                </Link>
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Signup;
