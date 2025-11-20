import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Calendar, BookOpen, IndianRupee, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CourseCard } from "@/components/CourseCard";

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [otherCourses, setOtherCourses] = useState<any[]>([]);

  useEffect(() => {
    loadCourseData();
  }, [id]);

  const loadCourseData = async () => {
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (courseError) throw courseError;

      if (courseData) {
        setCourse(courseData);

        const { data: batchesData, error: batchesError } = await supabase
          .from('batches')
          .select('*')
          .eq('course_id', id)
          .order('start_date', { ascending: true });

        if (batchesError) throw batchesError;
        setBatches(batchesData || []);
      }

      const { data: allCourses, error: allCoursesError } = await supabase
        .from('courses')
        .select('*')
        .neq('id', id)
        .limit(3);

      if (allCoursesError) throw allCoursesError;
      setOtherCourses(allCourses || []);

    } catch (error) {
      console.error('Error loading course:', error);
      toast({
        title: 'Error',
        description: 'Failed to load course details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="public" />
        <div className="container px-6 py-12">
          <p className="text-center">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="public" />
        <div className="container px-6 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Explore Our Courses</h1>
              <p className="text-lg text-muted-foreground">
                The course you're looking for might not be available. Check out our other amazing courses below!
              </p>
            </div>

            {otherCourses.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {otherCourses.map((c) => (
                  <CourseCard
                    key={c.id}
                    id={c.id}
                    title={c.title}
                    description={c.description}
                    image={c.image_url || ''}
                    duration={c.duration}
                    materials={c.materials_count || 0}
                    enrolled={0}
                    level={c.level}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-6">No courses available at the moment.</p>
              </div>
            )}

            <div className="text-center">
              <Link to="/courses">
                <Button size="lg">View All Courses</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const gstAmount = course.base_fee * 0.18;
  const totalFee = course.base_fee + gstAmount;

  return (
    <div className="min-h-screen bg-background">
      <Header role="public" />
      
      <div className="relative h-[400px] bg-gradient-to-br from-primary/10 to-accent/10">
        {course.image_url && (
          <img 
            src={course.image_url} 
            alt={course.title}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="relative container px-6 h-full flex items-end pb-12">
          <div className="max-w-4xl">
            <Badge className="mb-4">{course.level}</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{course.title}</h1>
            <p className="text-xl text-muted-foreground mb-4">{course.description}</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{course.duration}</span>
              </div>
              {course.materials_count && (
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>{course.materials_count} materials</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Course Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    {course.description}
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-4 pt-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <h4 className="font-semibold mb-1">Hands-on Learning</h4>
                        <p className="text-sm text-muted-foreground">Practical sessions with expert guidance</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <h4 className="font-semibold mb-1">Certificate</h4>
                        <p className="text-sm text-muted-foreground">Industry recognized completion certificate</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <h4 className="font-semibold mb-1">Small Batches</h4>
                        <p className="text-sm text-muted-foreground">Personal attention guaranteed</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <h4 className="font-semibold mb-1">Lifetime Access</h4>
                        <p className="text-sm text-muted-foreground">Access to recipes and resources forever</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Available Batches</CardTitle>
                </CardHeader>
                <CardContent>
                  {batches.length === 0 ? (
                    <p className="text-muted-foreground">No batches available at the moment. Check back soon!</p>
                  ) : (
                    <div className="space-y-4">
                      {batches.map((batch) => (
                        <div key={batch.id} className="p-4 border border-border/60 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold">{batch.batch_name}</h4>
                              <p className="text-sm text-muted-foreground">{batch.days}</p>
                            </div>
                            <Badge variant={batch.available_seats > 5 ? "default" : "destructive"}>
                              {batch.available_seats} seats left
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{batch.time_slot}</span>
                            </div>
                            {batch.start_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>Starts {new Date(batch.start_date).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Course Fee</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-lg">
                      <span>Base Fee</span>
                      <span className="font-semibold">₹{course.base_fee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>GST (18%)</span>
                      <span>₹{gstAmount.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-xl font-bold">
                      <span>Total</span>
                      <span className="text-primary">₹{totalFee.toLocaleString()}</span>
                    </div>
                  </div>

                  <Button 
                    size="lg" 
                    className="w-full"
                    onClick={() => navigate(`/enroll/${course.id}`)}
                    disabled={batches.length === 0}
                  >
                    <IndianRupee className="h-4 w-4 mr-2" />
                    {batches.length === 0 ? 'No Batches Available' : 'Enroll Now'}
                  </Button>

                  <div className="text-center pt-2">
                    <Link to="/enquiry" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      Have questions? Contact us
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {otherCourses.length > 0 && (
            <div className="mt-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">Other Courses</h2>
                <p className="text-muted-foreground">Explore more courses that might interest you</p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherCourses.map((c) => (
                  <CourseCard
                    key={c.id}
                    id={c.id}
                    title={c.title}
                    description={c.description}
                    image={c.image_url || ''}
                    duration={c.duration}
                    materials={c.materials_count || 0}
                    enrolled={0}
                    level={c.level}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
