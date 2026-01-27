import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Download, Loader2, Lock, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const RESUME_ADDON_PRICE = 399;

const Resume = () => {
  const [showBuilder, setShowBuilder] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    summary: '',
    education: '',
    experience: '',
    skills: ''
  });
  const queryClient = useQueryClient();

  // Check if resume addon is purchased
  const { data: addonPurchase, isLoading: addonLoading } = useQuery({
    queryKey: ['resume-addon-purchase'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('addon_purchases')
        .select('*')
        .eq('student_id', user.id)
        .eq('addon_type', 'resume_builder')
        .eq('status', 'paid')
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  const { data: resume, isLoading: resumeLoading } = useQuery({
    queryKey: ['my-resume'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('student_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!addonPurchase
  });

  const handlePayment = async () => {
    // Check if Razorpay is loaded
    if (!(window as any).Razorpay) {
      toast({
        title: "Payment gateway not loaded",
        description: "Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-resume-addon-order');
      
      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to create order');
      }

      if (!data || !data.orderId) {
        throw new Error(data?.error || 'Failed to create payment order');
      }

      const options = {
        key: data.keyId,
        amount: data.amount * 100,
        currency: data.currency,
        name: 'Knead & Frost',
        description: 'Resume Builder Add-on',
        order_id: data.orderId,
        handler: async (response: any) => {
          try {
            const { error: verifyError } = await supabase.functions.invoke('verify-resume-addon-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }
            });

            if (verifyError) throw verifyError;

            toast({
              title: "Payment successful!",
              description: "Resume Builder is now unlocked. Start building your professional resume!",
            });
            queryClient.invalidateQueries({ queryKey: ['resume-addon-purchase'] });
          } catch (err: any) {
            toast({
              title: "Payment verification failed",
              description: err.message,
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: '',
          email: '',
        },
        theme: {
          color: '#7c3aed',
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      console.error('Payment error:', err);
      toast({
        title: "Payment failed",
        description: err.message || 'Something went wrong. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const filePath = `${user.id}/${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      const { error: upsertError } = await supabase
        .from('resumes')
        .upsert({
          student_id: user.id,
          resume_url: publicUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'student_id' });

      if (upsertError) throw upsertError;
    },
    onSuccess: () => {
      toast({
        title: "Resume uploaded successfully!",
        description: "Your resume has been saved to your profile.",
      });
      queryClient.invalidateQueries({ queryKey: ['my-resume'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('resumes')
        .upsert({
          student_id: user.id,
          ...formData,
          updated_at: new Date().toISOString()
        }, { onConflict: 'student_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Resume created successfully!",
        description: "Your resume has been generated and saved.",
      });
      setShowBuilder(false);
      queryClient.invalidateQueries({ queryKey: ['my-resume'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const handleStartBuilding = () => {
    if (resume) {
      setFormData({
        first_name: resume.first_name || '',
        last_name: resume.last_name || '',
        email: resume.email || '',
        phone: resume.phone || '',
        summary: resume.summary || '',
        education: resume.education || '',
        experience: resume.experience || '',
        skills: resume.skills || ''
      });
    }
    setShowBuilder(true);
  };

  const isLoading = addonLoading || resumeLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="student" />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  const isPurchased = !!addonPurchase;
  const hasResume = resume?.resume_url || resume?.first_name;

  // Payment gate UI
  if (!isPurchased) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="student" />
        
        <div className="container px-6 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 text-center border-border/60">
              <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-6">
                <Lock className="h-10 w-10 text-primary" />
              </div>
              
              <h1 className="text-2xl font-bold mb-2">Resume Builder</h1>
              <p className="text-muted-foreground mb-6">
                Unlock the professional resume builder to create a standout resume for your culinary career.
              </p>

              <Card className="p-6 mb-6 bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Premium Add-on</span>
                </div>
                
                <div className="text-4xl font-bold text-primary mb-2">
                  ₹{RESUME_ADDON_PRICE}
                </div>
                <p className="text-sm text-muted-foreground mb-4">One-time payment</p>
                
                <ul className="text-left space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-primary" />
                    Professional resume builder
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Upload className="h-4 w-4 text-primary" />
                    Upload existing resume
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Download className="h-4 w-4 text-primary" />
                    Download & share with employers
                  </li>
                </ul>

                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={handlePayment}
                  disabled={isProcessingPayment}
                >
                  {isProcessingPayment ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                  ) : (
                    <>Unlock for ₹{RESUME_ADDON_PRICE}</>
                  )}
                </Button>
              </Card>

              <p className="text-xs text-muted-foreground">
                Secure payment powered by Razorpay
              </p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

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
                <Button asChild variant="outline" className="w-full" disabled={uploadMutation.isPending}>
                  <label htmlFor="resume-upload" className="cursor-pointer">
                    {uploadMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
                    ) : (
                      'Choose File'
                    )}
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
                <Button className="w-full" onClick={handleStartBuilding}>
                  {hasResume && !resume?.resume_url ? 'Edit Resume' : 'Start Building'}
                </Button>
              </div>
            </Card>
          </div>

          {hasResume && !showBuilder ? (
            <Card className="p-6 border-border/60">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Current Resume</h3>
                    <p className="text-sm text-muted-foreground">
                      Last updated: {resume?.updated_at ? new Date(resume.updated_at).toLocaleDateString() : 'Today'}
                    </p>
                  </div>
                </div>
                {resume?.resume_url && (
                  <Button variant="outline" asChild>
                    <a href={resume.resume_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                )}
              </div>

              {resume?.first_name && !resume?.resume_url && (
                <div className="border rounded-xl p-6 bg-muted/20">
                  <h4 className="text-xl font-bold mb-1">{resume.first_name} {resume.last_name}</h4>
                  <p className="text-muted-foreground mb-4">{resume.email} • {resume.phone}</p>
                  
                  {resume.summary && (
                    <div className="mb-4">
                      <h5 className="font-semibold mb-1">Summary</h5>
                      <p className="text-sm text-muted-foreground">{resume.summary}</p>
                    </div>
                  )}
                  
                  {resume.education && (
                    <div className="mb-4">
                      <h5 className="font-semibold mb-1">Education</h5>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{resume.education}</p>
                    </div>
                  )}
                  
                  {resume.experience && (
                    <div className="mb-4">
                      <h5 className="font-semibold mb-1">Experience</h5>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{resume.experience}</p>
                    </div>
                  )}
                  
                  {resume.skills && (
                    <div>
                      <h5 className="font-semibold mb-1">Skills</h5>
                      <p className="text-sm text-muted-foreground">{resume.skills}</p>
                    </div>
                  )}
                </div>
              )}

              {resume?.resume_url && (
                <div className="border-2 border-dashed border-border rounded-xl p-8 bg-muted/20">
                  <div className="aspect-[8.5/11] bg-background rounded-lg shadow-sm flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">PDF Resume</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ) : showBuilder ? (
            <Card className="p-6 border-border/60">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Resume Builder</h3>
                <Button variant="ghost" onClick={() => setShowBuilder(false)}>Cancel</Button>
              </div>
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      placeholder="John" 
                      required 
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      placeholder="Doe" 
                      required 
                      value={formData.last_name}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="john.doe@example.com" 
                    required 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    placeholder="+1 (555) 000-0000" 
                    required 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">Professional Summary</Label>
                  <Textarea
                    id="summary"
                    placeholder="Brief summary of your professional background and goals..."
                    rows={4}
                    required
                    value={formData.summary}
                    onChange={(e) => setFormData({...formData, summary: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="education">Education</Label>
                  <Textarea
                    id="education"
                    placeholder="Your educational background..."
                    rows={3}
                    required
                    value={formData.education}
                    onChange={(e) => setFormData({...formData, education: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Work Experience</Label>
                  <Textarea
                    id="experience"
                    placeholder="Your relevant work experience..."
                    rows={4}
                    value={formData.experience}
                    onChange={(e) => setFormData({...formData, experience: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skills">Skills</Label>
                  <Textarea
                    id="skills"
                    placeholder="List your key skills..."
                    rows={3}
                    required
                    value={formData.skills}
                    onChange={(e) => setFormData({...formData, skills: e.target.value})}
                  />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    'Save Resume'
                  )}
                </Button>
              </form>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Resume;