import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar as CalendarIcon, Users, ChefHat, Loader2, Send, ChevronDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Generic multi-select with checkbox rows inside a popover.
function MultiSelectCheckbox({
  options,
  values,
  onChange,
  placeholder,
  width = "w-[200px]",
  disabled = false,
  emptyLabel = "No options",
}: {
  options: { id: string; label: string }[];
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  width?: string;
  disabled?: boolean;
  emptyLabel?: string;
}) {
  const toggle = (id: string) => {
    if (values.includes(id)) onChange(values.filter((v) => v !== id));
    else onChange([...values, id]);
  };

  const summary =
    values.length === 0
      ? placeholder
      : values.length <= 2
      ? options
          .filter((o) => values.includes(o.id))
          .map((o) => o.label)
          .join(", ")
      : `${values.length} selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(width, "justify-between font-normal h-9")}
        >
          <span className="truncate text-left">{summary}</span>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0 bg-background border shadow-lg z-50" align="start">
        <ScrollArea className="max-h-[280px]">
          <div className="p-1">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">{emptyLabel}</div>
            ) : (
              options.map((opt) => {
                const checked = values.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer hover:bg-accent"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(opt.id)}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// Returns the recipes that the student has not yet completed (plus any
// currently assigned recipes so they remain visible).
function useVisibleRecipes(studentId: string, currentSelectedIds: string[], allRecipes: { id: string; title: string }[]) {
  const { data: completedRecipeIds = [] } = useQuery({
    queryKey: ["student-completed-recipes", studentId],
    queryFn: async () => {
      const { data: att } = await supabase
        .from("attendance")
        .select("class_date")
        .eq("student_id", studentId)
        .eq("status", "present");
      const dates = (att || []).map((a) => a.class_date);
      if (dates.length === 0) return [] as string[];
      const { data: bks } = await supabase
        .from("bookings")
        .select("recipe_id, booking_date")
        .eq("student_id", studentId)
        .in("booking_date", dates)
        .not("recipe_id", "is", null);
      return [...new Set((bks || []).map((b) => b.recipe_id as string))];
    },
    enabled: !!studentId,
  });

  return allRecipes.filter((r) =>
    currentSelectedIds.includes(r.id) || !completedRecipeIds.includes(r.id)
  );
}

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
        .in('status', ['confirmed', 'cancelled'])
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

  const assignRecipesMutation = useMutation({
    mutationFn: async ({ bookingId, recipeIds }: { bookingId: string; recipeIds: string[] }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ recipe_ids: recipeIds } as any)
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings-with-recipes'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign recipes", description: error.message, variant: "destructive" });
    }
  });

  const assignChefsMutation = useMutation({
    mutationFn: async ({ bookingId, chefIds }: { bookingId: string; chefIds: string[] }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ assigned_chef_ids: chefIds } as any)
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings-with-recipes'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign chefs", description: error.message, variant: "destructive" });
    }
  });

  const assignTablesMutation = useMutation({
    mutationFn: async ({ bookingId, tableNumbers }: { bookingId: string; tableNumbers: string[] }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ table_numbers: tableNumbers } as any)
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings-with-recipes'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign tables", description: error.message, variant: "destructive" });
    }
  });

  // Notify only assigned chefs about their bookings
  const notifyChefs = async () => {
    if (!bookings || bookings.length === 0) {
      toast({ title: "No bookings to notify about", variant: "destructive" });
      return;
    }

    setIsNotifying(true);

    try {
      // Filter bookings that have both a recipe and an assigned chef
      const assignedBookings = bookings.filter(b => b.recipe_id && b.assigned_chef_id);

      if (assignedBookings.length === 0) {
        toast({ title: "No chef assignments found", description: "Assign chefs to bookings before notifying", variant: "destructive" });
        setIsNotifying(false);
        return;
      }

      // Group by assigned chef
      const chefBookings: Record<string, { recipes: Set<string>; studentCount: number }> = {};
      assignedBookings.forEach(b => {
        const chefId = b.assigned_chef_id!;
        if (!chefBookings[chefId]) {
          chefBookings[chefId] = { recipes: new Set(), studentCount: 0 };
        }
        chefBookings[chefId].recipes.add(b.recipes?.title || 'Unknown Recipe');
        chefBookings[chefId].studentCount++;
      });

      const dateStr = format(selectedDate, 'MMMM d, yyyy');

      // Create one notification per assigned chef
      const notifications = Object.entries(chefBookings).map(([chefId, data]) => ({
        user_id: chefId,
        title: `Recipe Assignments for ${dateStr}`,
        message: `You have been assigned: ${Array.from(data.recipes).join(', ')}. Total: ${data.studentCount} student(s).`,
        type: 'info',
        read: false
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;

      toast({ 
        title: "Chefs notified successfully", 
        description: `${notifications.length} chef(s) have been notified about their assignments` 
      });
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
                    <TableHead>Status</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Assigned Recipe</TableHead>
                    <TableHead>Assigned Chef</TableHead>
                    <TableHead>Table No.</TableHead>
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
                      <TableCell>
                        {booking.status === 'cancelled' ? (
                          <Badge variant="destructive">Cancelled by Student</Badge>
                        ) : (
                          <Badge variant="secondary">{booking.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {booking.courses?.title}
                      </TableCell>
                      <TableCell>
                        <BookingRecipeMultiSelect
                          studentId={booking.student_id}
                          recipes={recipes || []}
                          values={(booking as any).recipe_ids || []}
                          disabled={booking.status === 'cancelled'}
                          onChange={(ids) =>
                            assignRecipesMutation.mutate({ bookingId: booking.id, recipeIds: ids })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <MultiSelectCheckbox
                          options={(chefsWithSpecializations || []).map((c: any) => ({
                            id: c.id,
                            label: `${c.first_name} ${c.last_name}`,
                          }))}
                          values={(booking as any).assigned_chef_ids || []}
                          onChange={(ids) =>
                            assignChefsMutation.mutate({ bookingId: booking.id, chefIds: ids })
                          }
                          placeholder="Select chefs"
                          width="w-[200px]"
                          disabled={booking.status === 'cancelled'}
                        />
                      </TableCell>
                      <TableCell>
                        <MultiSelectCheckbox
                          options={Array.from({ length: 25 }, (_, i) => ({
                            id: String(i + 1),
                            label: `Table ${i + 1}`,
                          }))}
                          values={(booking as any).table_numbers || []}
                          onChange={(ids) =>
                            assignTablesMutation.mutate({ bookingId: booking.id, tableNumbers: ids })
                          }
                          placeholder="Tables"
                          width="w-[140px]"
                          disabled={booking.status === 'cancelled'}
                        />
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