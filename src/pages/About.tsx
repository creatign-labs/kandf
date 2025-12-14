import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ChefHat, Award, Users, Heart, Target, Sparkles } from "lucide-react";

const team = [
  { name: "Chef Maria Santos", role: "Head Pastry Chef", years: "15+ years" },
  { name: "Chef James Wilson", role: "Bread & Baking Expert", years: "12+ years" },
  { name: "Chef Priya Sharma", role: "Cake Design Specialist", years: "10+ years" },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header role="public" />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="container relative px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              About <span className="text-primary">Knead & Frost</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              We're a global baking academy dedicated to transforming passionate bakers 
              into skilled professionals through hands-on training and expert guidance.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="container px-6 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="p-8 border-border/60">
            <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-4">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              To provide world-class baking education that empowers students with 
              practical skills, industry knowledge, and the confidence to excel in 
              the culinary world. We believe everyone deserves access to quality 
              culinary education.
            </p>
          </Card>
          
          <Card className="p-8 border-border/60">
            <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
            <p className="text-muted-foreground leading-relaxed">
              To become the leading global platform for baking education, creating 
              a community of skilled bakers who bring joy and artistry to kitchens 
              worldwide. We envision a world where anyone can master the art of baking.
            </p>
          </Card>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gradient-to-b from-primary/5 to-background">
        <div className="container px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Our Core Values</h2>
            <p className="text-muted-foreground">What drives everything we do</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 text-center border-border/60">
              <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-4">
                <ChefHat className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Excellence</h3>
              <p className="text-sm text-muted-foreground">
                We maintain the highest standards in our curriculum, instructors, and facilities
              </p>
            </Card>
            
            <Card className="p-6 text-center border-border/60">
              <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-4">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Passion</h3>
              <p className="text-sm text-muted-foreground">
                Our love for baking is contagious - we inspire creativity in every student
              </p>
            </Card>
            
            <Card className="p-6 text-center border-border/60">
              <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Community</h3>
              <p className="text-sm text-muted-foreground">
                We build lasting connections between students, instructors, and industry partners
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="container px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Meet Our Expert Chefs</h2>
          <p className="text-muted-foreground">Learn from the best in the industry</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {team.map((member, index) => (
            <Card key={index} className="p-6 text-center border-border/60">
              <div className="h-24 w-24 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                <ChefHat className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">{member.name}</h3>
              <p className="text-primary text-sm mb-1">{member.role}</p>
              <p className="text-sm text-muted-foreground">{member.years} experience</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="bg-primary text-primary-foreground">
        <div className="container px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-primary-foreground/80">Students Trained</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">95%</div>
              <div className="text-primary-foreground/80">Placement Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">15+</div>
              <div className="text-primary-foreground/80">Expert Chefs</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-primary-foreground/80">Industry Partners</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container px-6 py-16">
        <Card className="p-12 text-center border-border/60 bg-accent/20">
          <Award className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Ready to Start Your Baking Journey?</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Join our community of passionate bakers and transform your skills with 
            world-class training from industry experts.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link to="/courses">Explore Courses</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
};

export default About;
