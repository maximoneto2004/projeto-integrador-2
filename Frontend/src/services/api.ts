import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import type { TokenRefreshRequest, TokenRefreshResponse } from "@/types/api";

const API_URL = import.meta.env.VITE_API_URL;
const AUTH_REFRESH_PATH = "/authentication/token/refresh";
const AUTH_TOKEN_PATH = "/authentication/token/";
const AUTH_LOGOUT_PATH = "/authentication/token/logout";
const AUTH_PATHS = [AUTH_TOKEN_PATH, AUTH_REFRESH_PATH, AUTH_LOGOUT_PATH];

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let accessToken: string | null = null;
let logoutHandler: (() => void) | null = null;
let tokenListener: ((token: string | null) => void) | null = null;

export function setAuthToken(token: string | null) {
  accessToken = token;

  if (token) {
    api.defaults.headers.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.Authorization;
  }

  tokenListener?.(token);
}

export function onLogout(handler: () => void) {
  logoutHandler = handler;
}

export function onTokenChange(listener: (token: string | null) => void) {
  tokenListener = listener;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let pending: Array<{ resolve: (token: string) => void; reject: (error: unknown) => void }> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error.response?.status;
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const originalUrl = original.url;
    const isAuthRequest = typeof originalUrl === "string" && AUTH_PATHS.some((path) => originalUrl.includes(path));

    if (status === 401 && !original._retry && !isAuthRequest) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pending.push({
            resolve: (newToken) => {
              original.headers = {
                ...(original.headers || {}),
                Authorization: `Bearer ${newToken}`,
              };
              resolve(api(original));
            },
            reject,
          });
        });
      }

      isRefreshing = true;
      try {
        const resp = await axios.post<
          TokenRefreshResponse,
          AxiosResponse<TokenRefreshResponse>,
          TokenRefreshRequest
        >(`${API_URL}${AUTH_REFRESH_PATH}`, undefined, { withCredentials: true });

        const newToken = resp.data.access;
        setAuthToken(newToken);
        pending.forEach(({ resolve }) => resolve(newToken));
        pending = [];
        return api(original);
      } catch (err) {
        pending.forEach(({ reject }) => reject(err));
        pending = [];
        setAuthToken(null);
        logoutHandler?.();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
