import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Search, Users, ChefHat, GraduationCap, Shield, X } from "lucide-react";

interface RecipientSelectorProps {
  students: any[];
  chefs: any[];
  admins: any[];
  selectedSegments: string[];
  selectedIndividuals: string[];
  onSegmentChange: (segments: string[]) => void;
  onIndividualChange: (individuals: string[]) => void;
}

const segments = [
  { id: "all_students", label: "All Students", icon: GraduationCap, color: "bg-blue-500" },
  { id: "all_chefs", label: "All Chefs", icon: ChefHat, color: "bg-orange-500" },
  { id: "all_admins", label: "All Admins", icon: Shield, color: "bg-purple-500" },
];

export const RecipientSelector = ({
  students,
  chefs,
  admins,
  selectedSegments,
  selectedIndividuals,
  onSegmentChange,
  onIndividualChange,
}: RecipientSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const toggleSegment = (segmentId: string) => {
    if (selectedSegments.includes(segmentId)) {
      onSegmentChange(selectedSegments.filter((s) => s !== segmentId));
    } else {
      onSegmentChange([...selectedSegments, segmentId]);
    }
  };

  const toggleIndividual = (userId: string) => {
    if (selectedIndividuals.includes(userId)) {
      onIndividualChange(selectedIndividuals.filter((id) => id !== userId));
    } else {
      onIndividualChange([...selectedIndividuals, userId]);
    }
  };

  const allUsers = useMemo(() => {
    const users: { user_id: string; name: string; role: string; icon: typeof Users }[] = [];
    
    students?.forEach((s) => {
      if (s.profiles) {
        users.push({
          user_id: s.user_id,
          name: `${s.profiles.first_name} ${s.profiles.last_name}`,
          role: "Student",
          icon: GraduationCap,
        });
      }
    });
    
    chefs?.forEach((c) => {
      if (c.profiles) {
        users.push({
          user_id: c.user_id,
          name: `${c.profiles.first_name} ${c.profiles.last_name}`,
          role: "Chef",
          icon: ChefHat,
        });
      }
    });
    
    admins?.forEach((a) => {
      if (a.profiles) {
        users.push({
          user_id: a.user_id,
          name: `${a.profiles.first_name} ${a.profiles.last_name}`,
          role: "Admin",
          icon: Shield,
        });
      }
    });
    
    return users;
  }, [students, chefs, admins]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return allUsers;
    const query = searchQuery.toLowerCase();
    return allUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query)
    );
  }, [allUsers, searchQuery]);

  const getSelectedCount = () => {
    let count = 0;
    if (selectedSegments.includes("all_students")) count += students?.length || 0;
    if (selectedSegments.includes("all_chefs")) count += chefs?.length || 0;
    if (selectedSegments.includes("all_admins")) count += admins?.length || 0;
    
    // Add individual selections that aren't already covered by segments
    selectedIndividuals.forEach((id) => {
      const isStudent = students?.some((s) => s.user_id === id);
      const isChef = chefs?.some((c) => c.user_id === id);
      const isAdmin = admins?.some((a) => a.user_id === id);
      
      if (isStudent && selectedSegments.includes("all_students")) return;
      if (isChef && selectedSegments.includes("all_chefs")) return;
      if (isAdmin && selectedSegments.includes("all_admins")) return;
      
      count += 1;
    });
    
    return count;
  };

  const clearAll = () => {
    onSegmentChange([]);
    onIndividualChange([]);
  };

  const isIndividualDisabled = (userId: string) => {
    const isStudent = students?.some((s) => s.user_id === userId);
    const isChef = chefs?.some((c) => c.user_id === userId);
    const isAdmin = admins?.some((a) => a.user_id === userId);
    
    if (isStudent && selectedSegments.includes("all_students")) return true;
    if (isChef && selectedSegments.includes("all_chefs")) return true;
    if (isAdmin && selectedSegments.includes("all_admins")) return true;
    
    return false;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Recipients</Label>
        {(selectedSegments.length > 0 || selectedIndividuals.length > 0) && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-auto py-1 px-2 text-xs">
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Selected Count Badge */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <Users className="h-3 w-3" />
          {getSelectedCount()} recipient(s) selected
        </Badge>
      </div>

      {/* Segment Selection */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Quick Select Segments</Label>
        <div className="flex flex-wrap gap-2">
          {segments.map((segment) => {
            const Icon = segment.icon;
            const isSelected = selectedSegments.includes(segment.id);
            return (
              <Button
                key={segment.id}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSegment(segment.id)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {segment.label}
                {isSelected && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {segment.id === "all_students"
                      ? students?.length || 0
                      : segment.id === "all_chefs"
                      ? chefs?.length || 0
                      : admins?.length || 0}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Individual Selection */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Or Select Individuals</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <ScrollArea className="h-[200px] rounded-md border p-2">
          {filteredUsers.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((user) => {
                const Icon = user.icon;
                const isDisabled = isIndividualDisabled(user.user_id);
                const isChecked = selectedIndividuals.includes(user.user_id) || isDisabled;
                
                return (
                  <div
                    key={user.user_id}
                    className={`flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 ${
                      isDisabled ? "opacity-50" : ""
                    }`}
                  >
                    <Checkbox
                      id={user.user_id}
                      checked={isChecked}
                      disabled={isDisabled}
                      onCheckedChange={() => toggleIndividual(user.user_id)}
                    />
                    <label
                      htmlFor={user.user_id}
                      className="flex items-center gap-2 flex-1 cursor-pointer text-sm"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{user.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {user.role}
                      </Badge>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Selected Individuals Pills */}
      {selectedIndividuals.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedIndividuals.map((id) => {
            const user = allUsers.find((u) => u.user_id === id);
            if (!user || isIndividualDisabled(id)) return null;
            return (
              <Badge key={id} variant="secondary" className="gap-1 pr-1">
                {user.name}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => toggleIndividual(id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};
