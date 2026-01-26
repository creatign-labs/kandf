import { Header } from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, History, AlertCircle } from "lucide-react";
import { RecipeSlotBooking } from "@/components/student/RecipeSlotBooking";
import { MyRecipeBookings } from "@/components/student/MyRecipeBookings";

const MyBookings = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header role="student" />
      
      <div className="container px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">My Bookings</h1>
            <p className="text-muted-foreground">Book recipe sessions and manage your class schedule</p>
          </div>

          <Tabs defaultValue="book" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="book" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Book Slot
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                My Bookings
              </TabsTrigger>
            </TabsList>

            {/* Book Slot Tab */}
            <TabsContent value="book" className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">Booking Rules</p>
                  <ul className="text-amber-800 dark:text-amber-200 space-y-1">
                    <li>• You can only book your next incomplete recipe</li>
                    <li>• Slots must be booked at least one day in advance</li>
                    <li>• Cancellations allowed before 11:59 PM the previous day</li>
                    <li>• No-shows will result in the class being marked as consumed</li>
                  </ul>
                </div>
              </div>

              <RecipeSlotBooking />
            </TabsContent>

            {/* Bookings History Tab */}
            <TabsContent value="history">
              <MyRecipeBookings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default MyBookings;
