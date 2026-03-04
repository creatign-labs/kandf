import { Header } from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, History } from "lucide-react";
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
