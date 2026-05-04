import { useLocation, useNavigate } from "react-router-dom";

export const useScrollToAnchor = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleScroll = (e: React.MouseEvent<HTMLElement>, to: string) => {
    if (to === "/") {
      e.preventDefault();

      const scrollToTop = () => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      };

      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(scrollToTop, 300);
      } else {
        scrollToTop();
      }

      return;
    }

    if (to.startsWith("#")) {
      e.preventDefault();
      const id = to.replace("#", "");
      const element = document.getElementById(id);

      const focusElement = (el: HTMLElement) => {
        // Ensure keyboard/screen-reader focus lands on the skip target.
        if (!el.hasAttribute("tabindex")) {
          el.setAttribute("tabindex", "-1");
        }
        el.focus({ preventScroll: true });
      };

      const scrollToElement = (el: HTMLElement, shouldFocus = false) => {
        const headerOffset = 100;
        const elementPosition = el.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });

        if (shouldFocus) {
          window.setTimeout(() => focusElement(el), 250);
        }
      };

      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(() => {
          const el = document.getElementById(id);
          if (el) {
            scrollToElement(el, true);
            window.history.replaceState(null, "", `#${id}`);
          }
        }, 300);
      } else if (element) {
        scrollToElement(element, true);
        window.history.replaceState(null, "", `#${id}`);
      }
    }
  };

  return handleScroll;
};
