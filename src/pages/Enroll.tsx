import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Enroll = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [selectedBatch, setSelectedBatch] = useState("");
  const [user, setUser] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to enroll',
          variant: 'destructive'
        });
        navigate('/login');
        return;
      }
      setUser(user);

      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      
      if (courseError || !courseData) {
        console.error('Course not found:', courseError);
        toast({
          title: 'Error',
          description: 'Course not found',
          variant: 'destructive'
        });
        navigate('/courses');
        return;
      }

      setCourse(courseData);

      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select('*')
        .eq('course_id', courseId)
        .gt('available_seats', 0);

      if (batchesError) {
        console.error('Error loading batches:', batchesError);
      } else {
        setBatches(batchesData || []);
      }
      
      setLoading(false);
    };

    loadData();
  }, [navigate, courseId, toast]);

  const handleProceed = async () => {
    if (!selectedBatch) {
      toast({
        title: 'Batch required',
        description: 'Please select a batch',
        variant: 'destructive'
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }

    const batch = batches.find(b => b.id === selectedBatch);
    
    navigate("/payment", {
      state: {
        courseId: course.id,
        batchId: batch?.id,
        course: course.title,
        batch: batch?.batch_name,
        fee: course.base_fee,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="public" />
        <div className="container px-6 py-12">
          <p className="text-center">Loading...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="public" />
        <div className="container px-6 py-12">
          <p className="text-center">Course not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="public" />
      
      <div className="container px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Enroll in {course.title}</h1>
            <p className="text-muted-foreground">Select your preferred batch and complete enrollment</p>
          </div>

          <div className="grid gap-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Course Details</h2>
              <div className="space-y-3">
                <p className="text-lg"><span className="font-semibold">Course:</span> {course.title}</p>
                <p className="text-lg"><span className="font-semibold">Duration:</span> {course.duration}</p>
                <p className="text-lg"><span className="font-semibold">Fee:</span> ₹{course.base_fee.toLocaleString()}</p>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Select Batch</h2>
              {batches.length === 0 ? (
                <p className="text-muted-foreground">No batches available for this course</p>
              ) : (
                <RadioGroup value={selectedBatch} onValueChange={setSelectedBatch}>
                  <div className="space-y-4">
                    {batches.map((batch) => (
                      <div key={batch.id} className="flex items-center space-x-2 p-4 border border-border/60 rounded-lg hover:border-primary transition-colors">
                        <RadioGroupItem value={batch.id} id={batch.id} />
                        <Label htmlFor={batch.id} className="flex-1 cursor-pointer">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold">{batch.batch_name}</p>
                              <p className="text-sm text-muted-foreground">{batch.days}</p>
                              <p className="text-sm text-muted-foreground">{batch.time_slot}</p>
                            </div>
                            <span className="text-sm text-muted-foreground">{batch.available_seats} seats available</span>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Enrollment Summary</h2>
              <div className="space-y-3 text-lg">
                <div className="flex justify-between">
                  <span>Base Fee:</span>
                  <span>₹{course.base_fee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (18%):</span>
                  <span>₹{(course.base_fee * 0.18).toLocaleString()}</span>
                </div>
                <div className="border-t border-border/60 pt-3 flex justify-between font-bold text-xl">
                  <span>Total Amount:</span>
                  <span className="text-primary">₹{(course.base_fee * 1.18).toLocaleString()}</span>
                </div>
              </div>
            </Card>

            <Button 
              size="lg" 
              className="w-full" 
              onClick={handleProceed}
              disabled={!selectedBatch || batches.length === 0}
            >
              Proceed to Payment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Enroll;
