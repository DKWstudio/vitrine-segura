"use client";

import { useEffect } from "react";

const visitKey = "vitrine_segura_visit_registered";

export default function VisitTracker() {
  useEffect(() => {
    if (sessionStorage.getItem(visitKey)) {
      return;
    }

    sessionStorage.setItem(visitKey, "1");

    const payload = JSON.stringify({
      path: window.location.pathname,
      referrer: document.referrer || null,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/visits", new Blob([payload], { type: "application/json" }));
      return;
    }

    fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  return null;
}