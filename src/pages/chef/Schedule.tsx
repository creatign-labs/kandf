import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, ChefHat, Users, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Schedule = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const dateRange = viewMode === 'daily'
    ? { from: format(selectedDate, 'yyyy-MM-dd'), to: format(selectedDate, 'yyyy-MM-dd') }
    : { from: format(weekStart, 'yyyy-MM-dd'), to: format(weekEnd, 'yyyy-MM-dd') };

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['chef-schedule', dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, booking_date, time_slot, status, recipe_id,
          recipes(title),
          courses(title)
        `)
        .gte('booking_date', dateRange.from)
        .lte('booking_date', dateRange.to)
        .in('status', ['confirmed', 'attended', 'no_show'])
        .eq('assigned_chef_id', user.id);

      if (error) throw error;

      // Group by date + time_slot + recipe
      const grouped: Record<string, {
        date: string;
        timeSlot: string;
        recipe: string;
        course: string;
        studentCount: number;
        status: string;
      }[]> = {};

      (data || []).forEach(b => {
        const dateKey = b.booking_date;
        if (!grouped[dateKey]) grouped[dateKey] = [];
        
        const existing = grouped[dateKey].find(
          e => e.timeSlot === b.time_slot && e.recipe === (b.recipes?.title || 'No Recipe')
        );
        if (existing) {
          existing.studentCount++;
        } else {
          grouped[dateKey].push({
            date: dateKey,
            timeSlot: b.time_slot,
            recipe: b.recipes?.title || 'No Recipe',
            course: b.courses?.title || '',
            studentCount: 1,
            status: b.status
          });
        }
      });

      return grouped;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header role="chef" />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role="chef" />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Schedule</h1>
            <p className="text-muted-foreground">View your upcoming batches</p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={viewMode} onValueChange={v => setViewMode(v as 'daily' | 'weekly')}>
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
              </TabsList>
            </Tabs>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={date => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {viewMode === 'daily' ? (
          <DayView entries={bookings?.[format(selectedDate, 'yyyy-MM-dd')] || []} date={selectedDate} />
        ) : (
          <div className="space-y-4">
            {weekDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const entries = bookings?.[dateStr] || [];
              return (
                <div key={dateStr}>
                  <h3 className={`font-semibold mb-2 ${isSameDay(day, new Date()) ? 'text-primary' : ''}`}>
                    {format(day, 'EEEE, MMM d')}
                    {isSameDay(day, new Date()) && <Badge className="ml-2">Today</Badge>}
                  </h3>
                  {entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground mb-4">No batches</p>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                      {entries.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot)).map((entry, i) => (
                        <ScheduleCard key={i} entry={entry} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

const DayView = ({ entries, date }: { entries: any[]; date: Date }) => {
  if (entries.length === 0) {
    return (
      <Card className="p-8 text-center">
        <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No batches on {format(date, 'MMMM d, yyyy')}</p>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {entries.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot)).map((entry, i) => (
        <ScheduleCard key={i} entry={entry} />
      ))}
    </div>
  );
};

const ScheduleCard = ({ entry }: { entry: any }) => (
  <Card className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <Clock className="h-4 w-4 text-primary" />
      <Badge variant="outline">{entry.timeSlot}</Badge>
    </div>
    <h4 className="font-semibold mb-1">{entry.recipe}</h4>
    <p className="text-sm text-muted-foreground mb-2">{entry.course}</p>
    <div className="flex items-center gap-1 text-sm">
      <Users className="h-4 w-4 text-muted-foreground" />
      <span>{entry.studentCount} student{entry.studentCount !== 1 ? 's' : ''}</span>
    </div>
  </Card>
);

export default Schedule;
