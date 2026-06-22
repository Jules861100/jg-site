"use client";

import { useEffect, useRef } from "react";

export default function LandingClient({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const wowStage = root.querySelector<HTMLElement>("[data-wow-stage]");
    let scrollTicking = false;

    const updateWowStage = () => {
      if (!wowStage) return;
      const distance = Math.max(1, wowStage.offsetHeight * 1.18);
      const progress = Math.min(1, Math.max(0, window.scrollY / distance));
      const spin = -18 + progress * 460;
      const float = Math.sin(progress * Math.PI) * -18;
      const shine = ((spin % 360) + 360) % 360 / 360 * 100;
      wowStage.style.setProperty("--spin", `${spin}deg`);
      wowStage.style.setProperty("--float", `${float}px`);
      wowStage.style.setProperty("--shine", `${shine}`);
      scrollTicking = false;
    };

    const requestWowStageUpdate = () => {
      if (!scrollTicking) {
        window.requestAnimationFrame(updateWowStage);
        scrollTicking = true;
      }
    };

    if (wowStage) {
      updateWowStage();
      window.addEventListener("scroll", requestWowStageUpdate, { passive: true });
      window.addEventListener("resize", requestWowStageUpdate);
    }

    // The mock-up posts to a fake /api/login; route to the real login page instead.
    const forms = root.querySelectorAll<HTMLFormElement>(".mini-login");
    const onSubmit = (event: Event) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      window.location.href = `/login?space=${form.dataset.space === "supplier" ? "supplier" : "brand"}`;
    };
    forms.forEach((form) => form.addEventListener("submit", onSubmit));

    return () => {
      window.removeEventListener("scroll", requestWowStageUpdate);
      window.removeEventListener("resize", requestWowStageUpdate);
      forms.forEach((form) => form.removeEventListener("submit", onSubmit));
    };
  }, []);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
