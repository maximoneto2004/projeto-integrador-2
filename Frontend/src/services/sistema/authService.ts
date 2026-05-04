import type { AxiosResponse } from "axios";
import { api } from "@/services/api";
import type {
  PasswordResetConfirmRequest,
  PasswordResetConfirmResponse,
  PasswordResetRequest,
  PasswordResetResponse,
  TokenRefreshResponse,
  TokenRequest,
  TokenResponse,
} from "@/types/api";

const AUTH_TOKEN_PATH = "/authentication/token/";
const AUTH_REFRESH_PATH = "/authentication/token/refresh";
const AUTH_LOGOUT_PATH = "/authentication/token/logout";
const AUTH_PASSWORD_RESET_PATH = "/authentication/password-reset/";
const AUTH_PASSWORD_RESET_CONFIRM_PATH = "/authentication/password-reset/confirm/";

export const authService = {
  login(credentials: TokenRequest): Promise<AxiosResponse<TokenResponse>> {
    return api.post<TokenResponse>(AUTH_TOKEN_PATH, credentials);
  },

  refresh(): Promise<AxiosResponse<TokenRefreshResponse>> {

    return api.post<TokenRefreshResponse>(AUTH_REFRESH_PATH, undefined, { withCredentials: true });
  },

  logout(): Promise<AxiosResponse> {
    return api.post(AUTH_LOGOUT_PATH, {}, { withCredentials: true });
  },

  passwordReset(payload: PasswordResetRequest): Promise<AxiosResponse<PasswordResetResponse>> {
    return api.post<PasswordResetResponse>(AUTH_PASSWORD_RESET_PATH, payload);
  },

  passwordResetConfirm(payload: PasswordResetConfirmRequest): Promise<AxiosResponse<PasswordResetConfirmResponse>> {
    return api.post<PasswordResetConfirmResponse>(AUTH_PASSWORD_RESET_CONFIRM_PATH, payload);
  },
};
