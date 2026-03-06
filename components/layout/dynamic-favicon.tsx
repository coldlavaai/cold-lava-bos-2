"use client";

import { useEffect } from "react";

// Add a simple version query param to bust browser favicon cache when assets change
const SUN_ICON = "/favicon-sun.svg?v=4";
const CLOUD_ICON = "/favicon-cloud.svg?v=4";

function setFavicon(href: string) {
  if (typeof document === "undefined") return;

  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");

  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }

  // Avoid unnecessary DOM writes
  if (link.href.endsWith(href)) return;

  link.href = href;
}

export function DynamicFavicon() {
  useEffect(() => {
    // Set initial favicon when tab is active
    setFavicon(SUN_ICON);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setFavicon(CLOUD_ICON);
      } else {
        setFavicon(SUN_ICON);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
