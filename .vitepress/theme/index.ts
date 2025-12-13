// https://vitepress.dev/guide/custom-theme
import { h } from "vue";
import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import "./style.css";
import KeywordTip from "./components/KeywordTip.vue";
import DeprecatedIcon from "./components/DeprecatedIcon.vue";
import GithubLink from "./components/GithubLink.vue";

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {});
  },
  enhanceApp({ app, router, siteData }) {
    app.component("KeywordTip", KeywordTip);
    app.component("DeprecatedIcon", DeprecatedIcon);
    app.component("GithubLink", GithubLink);
    if (typeof window === "undefined") return;
    let overlay: HTMLDivElement | null = null;
    let overlayImg: HTMLImageElement | null = null;
    const ensureOverlay = () => {
      if (overlay) return;
      overlay = document.createElement("div");
      overlay.className = "img-zoom-overlay";
      overlayImg = document.createElement("img");
      overlayImg.className = "img-zoom-view";
      overlay.appendChild(overlayImg);
      document.body.appendChild(overlay);
      overlay.addEventListener("click", () => {
        overlay && overlay.classList.remove("active");
      });
      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") overlay && overlay.classList.remove("active");
      });
    };
    const attach = () => {
      ensureOverlay();
      const imgs = Array.from(
        document.querySelectorAll<HTMLImageElement>(".VPDoc img, .vp-doc img")
      );
      imgs.forEach((img) => {
        if ((img as any)._zoomBound) return;
        if (img.closest(".VPHero")) return;
        if (img.closest(".no-zoom")) return;
        if (img.hasAttribute("data-no-zoom")) return;
        if (img.classList.contains("no-zoom-img")) return;
        img.classList.add("zoomable-img");
        (img as any)._zoomBound = true;
        img.addEventListener("click", () => {
          if (!overlay || !overlayImg) return;
          overlayImg.src = img.src;
          overlay.classList.add("active");
        });
      });
    };
    router.onAfterRouteChange = () => {
      requestAnimationFrame(attach);
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () =>
        requestAnimationFrame(attach)
      );
    } else {
      requestAnimationFrame(attach);
    }
  },
} satisfies Theme;
