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
            <p className="text-muted-foreground">Book new slots and manage your class schedule</p>
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
                    <li>• Slots must be booked at least one day in advance</li>
                    <li>• Cancellations allowed before 11:59 PM the previous day</li>
                    <li>• No-shows will result in the class being marked as consumed</li>
                  </ul>
                </div>
              </div>

              {!enrollment ? (
                <Card className="p-8 text-center border-border/60">
                  <p className="text-muted-foreground">You need an active course enrollment to book slots.</p>
                  <Button asChild className="mt-4">
                    <a href="/courses">Browse Courses</a>
                  </Button>
                </Card>
              ) : (
                <div className="grid lg:grid-cols-2 gap-6">
                  <Card className="p-4 md:p-6 border-border/60">
                    <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                      Select Date
                    </h2>
                    <div className="flex justify-center">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < tomorrow}
                        className="rounded-md border"
                      />
                    </div>
                  </Card>

                  <Card className="p-4 md:p-6 border-border/60">
                    <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Available Slots
                    </h2>
                    
                    {hasExistingBooking ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">You already have a booking for this date.</p>
                      </div>
                    ) : selectedDate ? (
                      <div className="space-y-3">
                        {batches?.map((batch) => {
                          const isFull = batch.available_seats === 0;
                          const isSelected = selectedBatchId === batch.id;

                          return (
                            <button
                              key={batch.id}
                              onClick={() => !isFull && setSelectedBatchId(batch.id)}
                              disabled={isFull}
                              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : isFull
                                  ? "border-border bg-muted/50 cursor-not-allowed opacity-60"
                                  : "border-border hover:border-primary/50 hover:bg-accent/50"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold">{batch.time_slot}</span>
                                <Badge variant={isFull ? "secondary" : "default"}>
                                  {isFull ? "Full" : `${batch.available_seats} seats left`}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="h-4 w-4" />
                                <span>{batch.total_seats - batch.available_seats} / {batch.total_seats} students booked</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {batch.days}
                              </div>
                            </button>
                          );
                        })}
                        {(!batches || batches.length === 0) && (
                          <p className="text-center text-muted-foreground py-8">
                            No available slots for this course
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        Please select a date first
                      </p>
                    )}
                  </Card>
                </div>
              )}

              {selectedDate && selectedBatchId && !hasExistingBooking && (
                <Card className="p-4 md:p-6 border-border/60">
                  <h3 className="font-semibold mb-4">Booking Summary</h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium">{selectedDate.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium">{selectedBatch?.time_slot}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Course</span>
                      <span className="font-medium">{enrollment?.courses?.title}</span>
                    </div>
                  </div>
                  <Button 
                    size="lg" 
                    className="w-full" 
                    onClick={handleBooking}
                    disabled={bookingMutation.isPending}
                  >
                    {bookingMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Booking...</>
                    ) : (
                      'Confirm Booking'
                    )}
                  </Button>
                </Card>
              )}
            </TabsContent>

            {/* Bookings History Tab */}
            <TabsContent value="history" className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold mb-4">Upcoming Classes</h2>
                {upcomingBookings.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingBookings.map((booking) => (
                      <Card key={booking.id} className="p-4 md:p-6 border-border/60">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3">
                              <h3 className="text-lg font-semibold">{booking.courses?.title}</h3>
                              <Badge>Confirmed</Badge>
                            </div>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4" />
                                <span>{new Date(booking.booking_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{booking.time_slot}</span>
                              </div>
                            </div>
                          </div>
                          {canCancel(booking.booking_date) && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => cancelMutation.mutate(booking.id)}
                              disabled={cancelMutation.isPending}
                            >
                              {cancelMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <X className="h-4 w-4 mr-1" />
                                  Cancel
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                        {canCancel(booking.booking_date) && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm text-amber-600 dark:text-amber-400">
                              Cancellation allowed until 11:59 PM on {new Date(new Date(booking.booking_date).setDate(new Date(booking.booking_date).getDate() - 1)).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center border-border/60">
                    <p className="text-muted-foreground">No upcoming bookings</p>
                  </Card>
                )}
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-4">Past Classes</h2>
                {pastBookings.length > 0 ? (
                  <div className="space-y-4">
                    {pastBookings.map((booking) => (
                      <Card key={booking.id} className="p-4 md:p-6 border-border/60 opacity-75">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3">
                              <h3 className="text-lg font-semibold">{booking.courses?.title}</h3>
                              <Badge variant={booking.status === 'cancelled' ? 'destructive' : 'secondary'}>
                                {booking.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                              </Badge>
                            </div>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4" />
                                <span>{new Date(booking.booking_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{booking.time_slot}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center border-border/60">
                    <p className="text-muted-foreground">No past bookings</p>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default MyBookings;