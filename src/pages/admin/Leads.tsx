import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Phone, Mail, Calendar, Loader2, MoreHorizontal, MessageSquare, Trash2, List, LayoutGrid, CreditCard } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { LeadsKanban } from "@/components/admin/LeadsKanban";
import { useNavigate } from "react-router-dom";

const Leads = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select(`
          *,
          courses (title)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ stage })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Lead updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Lead deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "new":
        return "bg-blue-500";
      case "contacted":
        return "bg-purple-500";
      case "qualified":
        return "bg-orange-500";
      case "follow-up":
        return "bg-yellow-500";
      case "converted":
        return "bg-green-500";
      case "lost":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getNextStages = (currentStage: string) => {
    const stageFlow: Record<string, string[]> = {
      new: ["contacted", "lost"],
      contacted: ["qualified", "follow-up", "lost"],
      qualified: ["follow-up", "converted", "lost"],
      "follow-up": ["qualified", "converted", "lost"],
      converted: [],
      lost: ["new"],
    };
    return stageFlow[currentStage] || [];
  };

  const filteredLeads = leads?.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.phone && lead.phone.includes(searchQuery));
    
    const matchesStage = stageFilter === "all" || lead.stage === stageFilter;
    
    return matchesSearch && matchesStage;
  });

  const stageCounts = leads?.reduce((acc, lead) => {
    acc[lead.stage] = (acc[lead.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="min-h-screen bg-background">
      <Header role="admin" userName="Admin" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Lead Management</h1>
          <p className="text-muted-foreground">Track and manage potential students through the enrollment pipeline</p>
        </div>

        {/* Stage Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{stageCounts["new"] || 0}</div>
            <div className="text-sm text-muted-foreground">New</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-500">{stageCounts["contacted"] || 0}</div>
            <div className="text-sm text-muted-foreground">Contacted</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-500">{stageCounts["qualified"] || 0}</div>
            <div className="text-sm text-muted-foreground">Qualified</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">{stageCounts["follow-up"] || 0}</div>
            <div className="text-sm text-muted-foreground">Follow-up</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{stageCounts["converted"] || 0}</div>
            <div className="text-sm text-muted-foreground">Converted</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-red-500">{stageCounts["lost"] || 0}</div>
            <div className="text-sm text-muted-foreground">Lost</div>
          </Card>
        </div>

        {/* Filters and View Toggle */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search leads by name, email, or phone..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Toggle */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "kanban")}>
              <TabsList>
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                  List
                </TabsTrigger>
                <TabsTrigger value="kanban" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Kanban
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : viewMode === "kanban" ? (
          <LeadsKanban 
            leads={filteredLeads || []} 
            onLeadClick={setSelectedLead} 
          />
        ) : (
          <Card className="p-6">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Interested Course</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads?.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </div>
                          {lead.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{lead.courses?.title || "Not specified"}</TableCell>
                      <TableCell>
                        <Badge className={getStageColor(lead.stage)}>
                          {lead.stage.charAt(0).toUpperCase() + lead.stage.slice(1).replace("-", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(lead.created_at), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {getNextStages(lead.stage).length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  Move to
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                          {getNextStages(lead.stage).map((stage) => (
                                  <DropdownMenuItem
                                    key={stage}
                                    onClick={() => updateStageMutation.mutate({ id: lead.id, stage })}
                                  >
                                    {stage.charAt(0).toUpperCase() + stage.slice(1).replace("-", " ")}
                                  </DropdownMenuItem>
                                ))}
                                {lead.stage === "interested" && (
                                  <DropdownMenuItem
                                    onClick={() => navigate(`/admin/lead-payment/${lead.id}`)}
                                  >
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Setup Payment
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedLead(lead)}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {lead.phone && (
                                <DropdownMenuItem asChild>
                                  <a href={`tel:${lead.phone}`}>
                                    <Phone className="h-4 w-4 mr-2" />
                                    Call
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem asChild>
                                <a href={`mailto:${lead.email}`}>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Email
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this lead?")) {
                                    deleteLeadMutation.mutate(lead.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredLeads?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No leads found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </main>

      {/* Lead Details Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lead Details - {selectedLead?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{selectedLead?.email}</p>
            </div>
            {selectedLead?.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{selectedLead?.phone}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Interested In</p>
              <p className="font-medium">{selectedLead?.courses?.title || "Not specified"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Source</p>
              <p className="font-medium capitalize">{selectedLead?.source || "Website"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stage</p>
              <Badge className={getStageColor(selectedLead?.stage || "new")}>
                {selectedLead?.stage?.charAt(0).toUpperCase() + selectedLead?.stage?.slice(1).replace("-", " ")}
              </Badge>
            </div>
            {selectedLead?.message && (
              <div>
                <p className="text-sm text-muted-foreground">Message</p>
                <p className="p-3 bg-muted rounded-lg">{selectedLead?.message}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">
                {selectedLead?.created_at && format(new Date(selectedLead.created_at), "MMMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Leads;
