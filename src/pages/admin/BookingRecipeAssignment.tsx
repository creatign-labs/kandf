import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Users, ChefHat, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const BookingRecipeAssignment = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const queryClient = useQueryClient();

  // Fetch bookings for selected date with student and recipe details
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings-with-recipes', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select(`
          *,
          recipes (id, title),
          courses (title)
        `)
        .eq('booking_date', format(selectedDate, 'yyyy-MM-dd'))
        .order('time_slot');

      if (error) throw error;

      // Fetch profile data for each booking
      const bookingsWithProfiles = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', booking.student_id)
            .single();
          
          return { ...booking, profile };
        })
      );

      return bookingsWithProfiles;
    }
  });

  // Fetch all recipes for assignment dropdown
  const { data: recipes } = useQuery({
    queryKey: ['all-recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, title, courses (title)')
        .order('title');

      if (error) throw error;
      return data;
    }
  });

  const assignRecipeMutation = useMutation({
    mutationFn: async ({ bookingId, recipeId }: { bookingId: string; recipeId: string | null }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ recipe_id: recipeId })
        .eq('id', bookingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings-with-recipes'] });
      toast({ title: "Recipe assigned successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to assign recipe",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Group bookings by recipe and time slot for display
  const groupedByRecipe = bookings?.reduce((acc, booking) => {
    const recipeKey = booking.recipe_id || 'unassigned';
    const slotKey = booking.time_slot;
    const key = `${recipeKey}-${slotKey}`;
    
    if (!acc[key]) {
      acc[key] = {
        recipe: booking.recipes,
        timeSlot: booking.time_slot,
        students: [],
      };
    }
    acc[key].students.push({
      id: booking.id,
      name: `${booking.profile?.first_name || ''} ${booking.profile?.last_name || ''}`,
      course: booking.courses?.title,
    });
    return acc;
  }, {} as Record<string, { recipe: any; timeSlot: string; students: any[] }>) || {};

  const groupedBookings = Object.values(groupedByRecipe);

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Recipe Assignment</h1>
          <p className="text-muted-foreground">Assign recipes to student bookings and view grouped students</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Date Selector & Grouped View */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-4">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Select Date
              </h2>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </Card>

            {/* Grouped by Recipe Summary */}
            <Card className="p-4">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Grouped by Recipe
              </h2>
              {groupedBookings.length > 0 ? (
                <div className="space-y-4">
                  {groupedBookings.map((group, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={group.recipe ? "default" : "secondary"}>
                          {group.timeSlot}
                        </Badge>
                        <span className="font-medium text-sm">
                          {group.recipe?.title || "No Recipe Assigned"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{group.students.length} student(s)</span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {group.students.map(s => s.name).join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No bookings for this date
                </p>
              )}
            </Card>
          </div>

          {/* Booking List with Recipe Assignment */}
          <Card className="lg:col-span-2 p-6">
            <h2 className="font-semibold mb-4">Assign Recipes to Bookings</h2>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : bookings && bookings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Time Slot</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Assigned Recipe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        {booking.profile?.first_name} {booking.profile?.last_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{booking.time_slot}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {booking.courses?.title}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={booking.recipe_id || "none"}
                          onValueChange={(value) => 
                            assignRecipeMutation.mutate({
                              bookingId: booking.id,
                              recipeId: value === "none" ? null : value
                            })
                          }
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select recipe" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Recipe</SelectItem>
                            {recipes?.map((recipe) => (
                              <SelectItem key={recipe.id} value={recipe.id}>
                                {recipe.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No bookings</h3>
                <p className="text-muted-foreground">No students have booked slots for this date.</p>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default BookingRecipeAssignment;