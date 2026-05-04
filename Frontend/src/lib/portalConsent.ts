const CONSENT_KEY = "portal_cookie_consent";

export type PortalCookieConsent = "accepted" | "rejected" | null;
export const PORTAL_COOKIE_CONSENT_CHANGED_EVENT = "portal-cookie-consent-changed";

export function getPortalCookieConsent(): PortalCookieConsent {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(CONSENT_KEY);
  if (value === "accepted" || value === "rejected") return value;
  return null;
}

export function setPortalCookieConsent(value: PortalCookieConsent): void {
  if (typeof window === "undefined") return;
  if (!value) {
    localStorage.removeItem(CONSENT_KEY);
  } else {
    localStorage.setItem(CONSENT_KEY, value);
  }
  window.dispatchEvent(
    new CustomEvent(PORTAL_COOKIE_CONSENT_CHANGED_EVENT, {
      detail: { consent: value },
    }),
  );
}

export const PORTAL_COOKIE_BANNER_OPEN_EVENT = "portal-cookie-banner-open";

export function openPortalCookieBanner(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PORTAL_COOKIE_BANNER_OPEN_EVENT));
}
