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
import { Calendar as CalendarIcon, Users, ChefHat, Loader2, Bell, Send } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const BookingRecipeAssignment = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isNotifying, setIsNotifying] = useState(false);
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

      // Fetch profile data for each booking (student and assigned chef)
      const bookingsWithProfiles = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', booking.student_id)
            .single();
          
          let assignedChef = null;
          if (booking.assigned_chef_id) {
            const { data: chefProfile } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', booking.assigned_chef_id)
              .single();
            assignedChef = chefProfile;
          }
          
          return { ...booking, profile, assignedChef };
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

  // Fetch all chefs with their specializations
  const { data: chefsWithSpecializations } = useQuery({
    queryKey: ['chefs-specializations'],
    queryFn: async () => {
      // Get all chef user_ids
      const { data: chefRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'chef');

      if (rolesError) throw rolesError;

      // Get profiles and specializations for each chef
      const chefs = await Promise.all(
        (chefRoles || []).map(async (role) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .eq('id', role.user_id)
            .single();

          const { data: specializations } = await supabase
            .from('chef_specializations')
            .select('recipe_id, recipes (id, title)')
            .eq('chef_id', role.user_id);

          return {
            ...profile,
            specializations: specializations || []
          };
        })
      );

      return chefs.filter(c => c.id);
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

  const assignChefMutation = useMutation({
    mutationFn: async ({ bookingId, chefId }: { bookingId: string; chefId: string | null }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ assigned_chef_id: chefId })
        .eq('id', bookingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings-with-recipes'] });
      toast({ title: "Chef assigned successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to assign chef",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Notify chefs about assigned recipes
  const notifyChefs = async () => {
    if (!bookings || bookings.length === 0) {
      toast({ title: "No bookings to notify about", variant: "destructive" });
      return;
    }

    setIsNotifying(true);

    try {
      // Get unique assigned recipes for the date
      const assignedRecipes = [...new Set(
        bookings
          .filter(b => b.recipe_id)
          .map(b => b.recipe_id)
      )];

      if (assignedRecipes.length === 0) {
        toast({ title: "No recipes assigned yet", description: "Assign recipes before notifying chefs", variant: "destructive" });
        setIsNotifying(false);
        return;
      }

      // Find chefs who specialize in these recipes
      const chefsToNotify = new Set<string>();
      const chefRecipeMap: Record<string, string[]> = {};

      if (chefsWithSpecializations) {
        for (const chef of chefsWithSpecializations) {
          if (!chef.id) continue;
          
          const matchingRecipes = chef.specializations
            .filter((s: any) => assignedRecipes.includes(s.recipe_id))
            .map((s: any) => s.recipes?.title || 'Unknown Recipe');

          if (matchingRecipes.length > 0) {
            chefsToNotify.add(chef.id);
            chefRecipeMap[chef.id] = matchingRecipes;
          }
        }
      }

      // If no specialized chefs found, notify all chefs
      if (chefsToNotify.size === 0 && chefsWithSpecializations) {
        chefsWithSpecializations.forEach(chef => {
          if (chef.id) chefsToNotify.add(chef.id);
        });
      }

      // Group bookings by recipe for the notification message
      const recipeGroups = bookings
        .filter(b => b.recipe_id)
        .reduce((acc, booking) => {
          const recipeTitle = booking.recipes?.title || 'Unknown Recipe';
          if (!acc[recipeTitle]) {
            acc[recipeTitle] = { count: 0, timeSlots: new Set<string>() };
          }
          acc[recipeTitle].count++;
          acc[recipeTitle].timeSlots.add(booking.time_slot);
          return acc;
        }, {} as Record<string, { count: number; timeSlots: Set<string> }>);

      const dateStr = format(selectedDate, 'MMMM d, yyyy');
      
      // Create notifications for each chef
      const notifications = Array.from(chefsToNotify).map(chefId => {
        const chefRecipes = chefRecipeMap[chefId];
        const message = chefRecipes && chefRecipes.length > 0
          ? `You have been assigned: ${chefRecipes.join(', ')}. ${Object.entries(recipeGroups).map(([recipe, data]) => `${recipe}: ${data.count} student(s)`).join('; ')}`
          : `Recipe assignments for ${dateStr}: ${Object.entries(recipeGroups).map(([recipe, data]) => `${recipe}: ${data.count} student(s)`).join('; ')}`;

        return {
          user_id: chefId,
          title: `Recipe Assignments for ${dateStr}`,
          message: message,
          type: 'info',
          read: false
        };
      });

      if (notifications.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .insert(notifications);

        if (error) throw error;

        toast({ 
          title: "Chefs notified successfully", 
          description: `${notifications.length} chef(s) have been notified about the recipe assignments` 
        });
      } else {
        toast({ title: "No chefs to notify", variant: "destructive" });
      }
    } catch (error: any) {
      toast({
        title: "Failed to notify chefs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsNotifying(false);
    }
  };

  // Group bookings by recipe and time slot for display
  const groupedByRecipe = bookings?.reduce((acc, booking) => {
    const recipeKey = booking.recipe_id || 'unassigned';
    const slotKey = booking.time_slot;
    const key = `${recipeKey}-${slotKey}`;
    
    if (!acc[key]) {
      acc[key] = {
        recipe: booking.recipes,
        recipeId: booking.recipe_id,
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
  }, {} as Record<string, { recipe: any; recipeId: string | null; timeSlot: string; students: any[] }>) || {};

  const groupedBookings = Object.values(groupedByRecipe);

  // Find chef(s) for a given recipe
  const getChefsForRecipe = (recipeId: string | null) => {
    if (!recipeId || !chefsWithSpecializations) return [];
    return chefsWithSpecializations.filter(chef => 
      chef.specializations.some((s: any) => s.recipe_id === recipeId)
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Recipe Assignment</h1>
            <p className="text-muted-foreground">Assign recipes to student bookings and notify chefs</p>
          </div>
          <Button 
            onClick={notifyChefs} 
            disabled={isNotifying || !bookings || bookings.length === 0}
            className="gap-2"
          >
            {isNotifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Notify Chefs
          </Button>
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

            {/* Chef Specializations */}
            <Card className="p-4">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Chef Specializations
              </h2>
              {chefsWithSpecializations && chefsWithSpecializations.length > 0 ? (
                <div className="space-y-3">
                  {chefsWithSpecializations.map((chef) => (
                    <div key={chef.id} className="p-3 border rounded-lg">
                      <div className="font-medium text-sm mb-1">
                        {chef.first_name} {chef.last_name}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {chef.specializations.length > 0 ? (
                          chef.specializations.map((s: any) => (
                            <Badge key={s.recipe_id} variant="secondary" className="text-xs">
                              {s.recipes?.title}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No specializations</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No chef specializations found
                </p>
              )}
            </Card>

            {/* Grouped by Recipe Summary */}
            <Card className="p-4">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Grouped by Recipe
              </h2>
              {groupedBookings.length > 0 ? (
                <div className="space-y-4">
                  {groupedBookings.map((group, index) => {
                    const assignedChefs = getChefsForRecipe(group.recipeId);
                    return (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={group.recipe ? "default" : "secondary"}>
                            {group.timeSlot}
                          </Badge>
                          <span className="font-medium text-sm">
                            {group.recipe?.title || "No Recipe Assigned"}
                          </span>
                        </div>
                        {assignedChefs.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-primary mb-1">
                            <ChefHat className="h-3 w-3" />
                            {assignedChefs.map(c => `${c.first_name}`).join(', ')}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{group.students.length} student(s)</span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {group.students.map(s => s.name).join(", ")}
                        </div>
                      </div>
                    );
                  })}
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
                    <TableHead>Assigned Chef</TableHead>
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
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select recipe" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-lg z-50">
                            <SelectItem value="none">No Recipe</SelectItem>
                            {recipes?.map((recipe) => (
                              <SelectItem key={recipe.id} value={recipe.id}>
                                {recipe.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={booking.assigned_chef_id || "none"}
                          onValueChange={(value) => 
                            assignChefMutation.mutate({
                              bookingId: booking.id,
                              chefId: value === "none" ? null : value
                            })
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select chef" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-lg z-50">
                            <SelectItem value="none">No Chef</SelectItem>
                            {chefsWithSpecializations?.map((chef) => (
                              <SelectItem key={chef.id} value={chef.id}>
                                {chef.first_name} {chef.last_name}
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