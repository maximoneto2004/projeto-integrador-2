import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const isPortalPath = (pathname: string): boolean => !pathname.startsWith("/sistema");

export const PortalVLibrasWidget = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const shouldHideVLibras = !isPortalPath(pathname);
    document.body.classList.toggle("vlibras-hidden-route", shouldHideVLibras);
  }, [pathname]);

  return null;
};

export default PortalVLibrasWidget;
