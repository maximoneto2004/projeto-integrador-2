import { useQuery } from "@tanstack/react-query";
import { painelService } from "@/services/sistema/painelService";
import { useAuth } from "@/contexts/AuthContext";
import { deriveRoleFromGroups } from "@/lib/authHelpers";
import type { PainelChamada } from "@/types/painel";
import type { UserRole } from "@/types/auth";

type Params = { unidadeId?: string; limite?: number };

const queryKey = (params?: Params) => ["painel-ultimas-chamadas", params?.unidadeId || null, params?.limite ?? null] as const;

const ALLOWED_ROLES: UserRole[] = ["admin", "supervisor", "recepcionista"];
const ALLOWED_GROUPS = new Set(["perfil", "supervisor", "recepcionista"]);

export function usePainelChamadas(params?: Params) {
  const { user } = useAuth();
  const userRole = deriveRoleFromGroups(user?.grupos);
  const normalizedGroups = user?.grupos?.map((g) => g.trim().toLowerCase()) ?? [];
  const hasAllowedGroup = normalizedGroups.some((g) => ALLOWED_GROUPS.has(g));
  const shouldFetch = !user || hasAllowedGroup || (!!userRole && ALLOWED_ROLES.includes(userRole));

  return useQuery({
    queryKey: queryKey(params),
    enabled: shouldFetch,
    queryFn: async () => {
      const { data } = await painelService.ultimasChamadas(params);
      if (!data.success) {
        const msg = (data as unknown as { result?: string }).result || "";
        if (msg) {
          console.warn(msg);
        }
        return [] as PainelChamada[];
      }
      const result = Array.isArray(data.result) ? data.result : [];

      return result as PainelChamada[];
    },
    refetchInterval: 9000,
    refetchIntervalInBackground: true,
  });
}
