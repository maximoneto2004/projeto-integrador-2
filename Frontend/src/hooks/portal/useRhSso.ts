import { useCallback } from "react";
import {
  buildRhSsoAuthUrl,
  exchangeCodeForToken,
  startRhSsoLogin,
  type RhSsoTokenResponse,
} from "@/services/portal/rhsso";

export function useRhSso() {
  const login = useCallback(() => {
    console.log("[RHSSO] login click");
    const url = buildRhSsoAuthUrl();
    console.log("[RHSSO] login url:", url);
    startRhSsoLogin(url);
  }, []);

  const handleCode = useCallback(async (code: string) => {
    console.log("[RHSSO] received code:", code);
    const data = await exchangeCodeForToken(code);
    console.log("[RHSSO] exchange result:", data);
    return data as RhSsoTokenResponse | null;
  }, []);

  return { login, handleCode };
}
