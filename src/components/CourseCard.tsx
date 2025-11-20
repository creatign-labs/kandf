import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, Users } from "lucide-react";

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  image: string;
  duration: string;
  materials: number;
  enrolled?: number;
  level: string;
}

export const CourseCard = ({
  id,
  title,
  description,
  image,
  duration,
  materials,
  enrolled,
  level,
}: CourseCardProps) => {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg border-border/60">
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/5 to-accent/5">
        <img src={image} alt={title} className="h-full w-full object-cover" />
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-card/95 backdrop-blur">
            <BookOpen className="h-3 w-3 mr-1" />
            Course
          </Badge>
        </div>
        {materials && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-primary text-primary-foreground">
              {materials} materials
            </Badge>
          </div>
        )}
      </div>
      
      <div className="p-5">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{description}</p>
        
        <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{duration}</span>
          </div>
          {enrolled && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{enrolled} enrolled</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <Badge variant="outline">{level}</Badge>
          <Button size="sm" asChild>
            <Link to={`/courses/${id}`}>View Course</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
};
