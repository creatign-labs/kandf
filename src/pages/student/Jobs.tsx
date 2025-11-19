import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Briefcase, MapPin, Clock, DollarSign, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const jobs = [
  {
    id: 1,
    title: "Junior Pastry Chef",
    company: "The Grand Bakery",
    location: "New York, NY",
    type: "Full-time",
    salary: "$40,000 - $50,000",
    posted: "2 days ago",
    description: "Join our team as a Junior Pastry Chef. Experience with croissants and danish pastries required.",
  },
  {
    id: 2,
    title: "Bakery Assistant",
    company: "Artisan Bread Co.",
    location: "Brooklyn, NY",
    type: "Part-time",
    salary: "$18 - $22/hr",
    posted: "5 days ago",
    description: "Looking for an enthusiastic bakery assistant to help with bread production and customer service.",
  },
  {
    id: 3,
    title: "Cake Decorator",
    company: "Sweet Dreams Bakery",
    location: "Manhattan, NY",
    type: "Full-time",
    salary: "$45,000 - $55,000",
    posted: "1 week ago",
    description: "Experienced cake decorator needed for custom orders. Fondant and buttercream skills essential.",
  },
  {
    id: 4,
    title: "Bread Baker",
    company: "Sourdough & Co.",
    location: "Queens, NY",
    type: "Full-time",
    salary: "$42,000 - $52,000",
    posted: "1 week ago",
    description: "Join our artisan bakery specializing in sourdough bread. Early morning shifts.",
  },
];

const Jobs = () => {
  const handleApply = (jobTitle: string) => {
    toast({
      title: "Application submitted!",
      description: `Your application for ${jobTitle} has been sent to the employer.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="student" />
      
      <div className="container px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Job Opportunities</h1>
            <p className="text-muted-foreground">
              Find your perfect role in the baking industry
            </p>
          </div>

          <Card className="p-4 border-border/60 mb-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search jobs by title, company, or skill..."
                  className="pl-10"
                />
              </div>
              <Button>Search</Button>
            </div>
          </Card>

          <div className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id} className="p-6 border-border/60 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
                    <p className="text-lg text-muted-foreground mb-3">{job.company}</p>
                    
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {job.type}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {job.salary}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {job.posted}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4">
                      {job.description}
                    </p>

                    <div className="flex gap-2">
                      <Badge variant="secondary">Baking</Badge>
                      <Badge variant="secondary">Food Service</Badge>
                      {job.title.includes("Pastry") && (
                        <Badge variant="secondary">Pastry</Badge>
                      )}
                    </div>
                  </div>

                  <Button 
                    onClick={() => handleApply(job.title)}
                    className="ml-4"
                  >
                    Apply Now
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-6 border-border/60 mt-8 bg-accent/20">
            <h3 className="font-semibold mb-2">Job Application Tips</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Make sure your resume is up to date before applying</li>
              <li>• Highlight skills and recipes you've learned in your course</li>
              <li>• Download and share your certificates with potential employers</li>
              <li>• Most positions require completion of at least one module</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Jobs;
