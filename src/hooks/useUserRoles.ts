import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUserRoles() {
  return useQuery({
    queryKey: ["current-user-roles"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { roles: [] as string[], isSuperAdmin: false, isAdmin: false };
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const roles = (data || []).map((r: { role: string }) => r.role);
      return {
        roles,
        isSuperAdmin: roles.includes("super_admin"),
        isAdmin: roles.includes("admin") || roles.includes("super_admin"),
      };
    },
    staleTime: 60_000,
  });
}
