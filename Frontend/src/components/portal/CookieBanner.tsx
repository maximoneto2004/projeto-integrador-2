import { useEffect, useState } from "react";
import {
  getPortalCookieConsent,
  PORTAL_COOKIE_BANNER_OPEN_EVENT,
  PORTAL_COOKIE_CONSENT_CHANGED_EVENT,
  setPortalCookieConsent,
  type PortalCookieConsent,
} from "@/lib/portalConsent";

const GA_TRACKING_ID = "G-ZK8RYXDPWT";

const injectGAScript = () => {
  // Check if script already exists
  if (document.getElementById("ga-script")) return;

  const script = document.createElement("script");
  script.id = "ga-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
  document.head.appendChild(script);

  const inlineScript = document.createElement("script");
  inlineScript.id = "ga-inline-script";
  inlineScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_TRACKING_ID}');
  `;
  document.head.appendChild(inlineScript);
};

const removeGAScript = () => {
  const script = document.getElementById("ga-script");
  if (script) script.remove();

  const inlineScript = document.getElementById("ga-inline-script");
  if (inlineScript) inlineScript.remove();

  window[`ga-disable-${GA_TRACKING_ID}`] = true;
};

export const CookieBanner = ({ hidden = false }: { hidden?: boolean }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const applyConsent = (consent: PortalCookieConsent) => {
      setVisible(consent === null);
      if (consent === "accepted") {
        injectGAScript();
      } else {
        removeGAScript();
      }
    };

    applyConsent(getPortalCookieConsent());

    if (typeof window === "undefined") return;
    const openHandler = () => setVisible(true);
    const consentChangedHandler = (event: Event) => {
      const customEvent = event as CustomEvent<{ consent?: PortalCookieConsent }>;
      applyConsent(customEvent.detail?.consent ?? getPortalCookieConsent());
    };
    window.addEventListener(PORTAL_COOKIE_BANNER_OPEN_EVENT, openHandler);
    window.addEventListener(PORTAL_COOKIE_CONSENT_CHANGED_EVENT, consentChangedHandler);
    return () => {
      window.removeEventListener(PORTAL_COOKIE_BANNER_OPEN_EVENT, openHandler);
      window.removeEventListener(PORTAL_COOKIE_CONSENT_CHANGED_EVENT, consentChangedHandler);
    };
  }, []);

  const handleAccept = () => {
    setPortalCookieConsent("accepted");
    injectGAScript();
    setVisible(false);
  };

  const handleReject = () => {
    setPortalCookieConsent("rejected");
    removeGAScript();
    setVisible(false);
  };

  if (!visible || hidden) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[999] border-t border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-600">
          Usamos cookies essenciais para melhorar sua experiência no portal e manter sua sessão ativa. Ao continuar,
          você concorda com esse uso.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleReject}
            className="h-10 px-6 rounded-none border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition"
          >
            Rejeitar
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="h-10 px-6 rounded-none bg-portal-primary text-white font-semibold hover:opacity-95 transition"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
};
