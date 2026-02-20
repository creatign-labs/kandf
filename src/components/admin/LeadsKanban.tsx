import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, Mail, Calendar, GripVertical, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  stage: string;
  created_at: string;
  courses?: { title: string } | null;
}

interface LeadsKanbanProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

const STAGES = [
  { id: "new", label: "New", color: "bg-blue-500" },
  { id: "contacted", label: "Contacted", color: "bg-purple-500" },
  { id: "interested", label: "Interested", color: "bg-orange-500" },
  { id: "follow-up", label: "Follow Up", color: "bg-yellow-500" },
  { id: "converted", label: "Converted", color: "bg-green-500" },
  { id: "lost", label: "Lost", color: "bg-red-500" },
];

export const LeadsKanban = ({ leads, onLeadClick }: LeadsKanbanProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

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
      toast({ title: "Lead moved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    setDragOverStage(null);

    if (draggedLead && draggedLead.stage !== newStage) {
      updateStageMutation.mutate({ id: draggedLead.id, stage: newStage });
    }
    setDraggedLead(null);
  };

  const getLeadsByStage = (stageId: string) => {
    return leads.filter((lead) => lead.stage === stageId);
  };

  return (
    <div className="grid grid-cols-6 gap-4 h-[calc(100vh-300px)] min-h-[500px]">
      {STAGES.map((stage) => {
        const stageLeads = getLeadsByStage(stage.id);
        const isDropTarget = dragOverStage === stage.id && draggedLead?.stage !== stage.id;

        return (
          <div
            key={stage.id}
            className={`flex flex-col rounded-lg border bg-muted/30 transition-colors ${
              isDropTarget ? "border-primary bg-primary/5" : "border-border"
            }`}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                <span className="font-semibold text-sm">{stage.label}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {stageLeads.length}
              </Badge>
            </div>

            {/* Cards Container */}
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2">
                {stageLeads.map((lead) => (
                  <Card
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onLeadClick(lead)}
                    className={`p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
                      draggedLead?.id === lead.id ? "opacity-50 scale-95" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{lead.name}</p>
                        {lead.courses?.title && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {lead.courses.title}
                          </p>
                        )}
                        <div className="flex flex-col gap-1 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                          {lead.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              <span>{lead.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>{format(new Date(lead.created_at), "MMM d")}</span>
                          </div>
                        </div>
                        {(lead.stage === "contacted" || lead.stage === "interested") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/lead-payment/${lead.id}`);
                            }}
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            Setup Payment
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}

                {stageLeads.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No leads
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
};
