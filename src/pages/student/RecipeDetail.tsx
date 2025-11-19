import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useParams, Link } from "react-router-dom";
import { Clock, Users, ChefHat, ArrowLeft, Calendar } from "lucide-react";

const recipes: Record<string, any> = {
  "1": {
    name: "Basic White Bread",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=600&fit=crop",
    prepTime: "20 mins",
    cookTime: "35 mins",
    difficulty: "Beginner",
    servings: "1 loaf",
    description: "Learn the fundamentals of bread making with this classic white bread recipe. Perfect for beginners to understand yeast activation, kneading, and proofing.",
    ingredients: [
      { name: "All-purpose flour", amount: "500g", perStudent: true },
      { name: "Active dry yeast", amount: "7g", perStudent: true },
      { name: "Sugar", amount: "30g", perStudent: true },
      { name: "Salt", amount: "10g", perStudent: true },
      { name: "Warm water", amount: "300ml", perStudent: true },
      { name: "Butter", amount: "30g", perStudent: true },
    ],
    steps: [
      "Activate yeast in warm water with sugar for 5-10 minutes until foamy",
      "Mix flour and salt in a large bowl",
      "Add yeast mixture and melted butter to flour",
      "Knead dough for 10 minutes until smooth and elastic",
      "First proof: Let rise in a warm place for 1 hour until doubled",
      "Punch down dough and shape into a loaf",
      "Second proof: Let rise for 30 minutes",
      "Bake at 190°C (375°F) for 35 minutes until golden brown",
    ],
    techniques: [
      "Yeast activation and fermentation",
      "Proper kneading technique",
      "Understanding gluten development",
      "Shaping a traditional loaf",
    ],
  },
  "5": {
    name: "Danish Pastries",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    prepTime: "3 hours",
    cookTime: "25 mins",
    difficulty: "Advanced",
    servings: "12 pastries",
    description: "Master the art of laminated dough with these flaky, buttery Danish pastries. This recipe teaches precise folding techniques and temperature control.",
    ingredients: [
      { name: "Bread flour", amount: "500g", perStudent: true },
      { name: "Butter (for lamination)", amount: "250g", perStudent: true },
      { name: "Milk", amount: "150ml", perStudent: true },
      { name: "Eggs", amount: "2", perStudent: true },
      { name: "Sugar", amount: "50g", perStudent: true },
      { name: "Salt", amount: "10g", perStudent: true },
      { name: "Instant yeast", amount: "10g", perStudent: true },
    ],
    steps: [
      "Prepare dough with flour, yeast, sugar, salt, milk, and eggs",
      "Rest dough in refrigerator for 30 minutes",
      "Prepare butter block by pounding cold butter into a square",
      "Perform first lamination: roll dough and encase butter",
      "First turn: fold into thirds and rest 30 minutes",
      "Second turn: repeat folding process",
      "Third turn: final folding for maximum layers",
      "Rest overnight in refrigerator",
      "Roll out and shape into desired forms",
      "Proof for 1 hour until puffy",
      "Bake at 200°C (400°F) for 20-25 minutes",
    ],
    techniques: [
      "Lamination and folding technique",
      "Temperature control for butter",
      "Shaping various Danish forms",
      "Understanding dough layers",
    ],
  },
};

const RecipeDetail = () => {
  const { id } = useParams();
  const recipe = recipes[id || "1"] || recipes["1"];

  return (
    <div className="min-h-screen bg-background">
      <Header role="student" />
      
      <div className="container px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <Button asChild variant="ghost" className="mb-6">
            <Link to="/student/my-course">
              <ArrowLeft className="h-4 w-4" />
              Back to Course
            </Link>
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4">{recipe.name}</h1>
            <div className="flex flex-wrap gap-4 text-sm">
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                Prep: {recipe.prepTime}
              </Badge>
              <Badge variant="secondary">
                <ChefHat className="h-3 w-3 mr-1" />
                Cook: {recipe.cookTime}
              </Badge>
              <Badge variant="secondary">
                <Users className="h-3 w-3 mr-1" />
                {recipe.servings}
              </Badge>
              <Badge>{recipe.difficulty}</Badge>
            </div>
          </div>

          <img
            src={recipe.image}
            alt={recipe.name}
            className="w-full h-96 object-cover rounded-2xl mb-8"
          />

          <Card className="p-6 border-border/60 mb-6">
            <h2 className="text-xl font-semibold mb-3">About This Recipe</h2>
            <p className="text-muted-foreground leading-relaxed">{recipe.description}</p>
          </Card>

          <Card className="p-6 border-border/60 mb-6">
            <h2 className="text-xl font-semibold mb-4">Ingredients (Per Student)</h2>
            <div className="space-y-2">
              {recipe.ingredients.map((ingredient: any, index: number) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <span>{ingredient.name}</span>
                  <span className="font-medium text-primary">{ingredient.amount}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 border-border/60 mb-6">
            <h2 className="text-xl font-semibold mb-4">Instructions</h2>
            <ol className="space-y-4">
              {recipe.steps.map((step: string, index: number) => (
                <li key={index} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                    {index + 1}
                  </span>
                  <p className="flex-1 pt-1">{step}</p>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="p-6 border-border/60 mb-6">
            <h2 className="text-xl font-semibold mb-4">Techniques You'll Learn</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {recipe.techniques.map((technique: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-primary" />
                  <span>{technique}</span>
                </div>
              ))}
            </div>
          </Card>

          <Button asChild size="lg" className="w-full">
            <Link to="/student/book-slot">
              <Calendar className="h-5 w-5" />
              Book a Slot to Practice This Recipe
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;
