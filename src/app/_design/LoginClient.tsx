"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const copy = {
  brand: {
    username: "",
    kicker: "Espace marque",
    title: "Connectez-vous au cockpit marque.",
    text: "Pilotez les projets, assemblez les fiches fournisseur, verifiez les delais et gardez la derniere version validee du produit fini.",
    button: "Entrer cote marque",
    image: "/assets/product-violet",
    signals: ["Passport produit", "Derniere version validee", "Delais", "Risque visible avant PO", "Securite", "Acces marque dedie"],
    metrics: ["OTIF", "100%", "BAT", "V5", "Launch", "-64 j"],
  },
  supplier: {
    username: "",
    kicker: "Espace fournisseur",
    title: "Connectez-vous au portail fournisseur.",
    text: "Renseignez delais, cahier des charges, numero de TVA, contraintes d'ouverture, couts et devis partageables.",
    button: "Entrer cote fournisseur",
    image: "/assets/product-vial-light",
    signals: ["Fiche semi-finie", "Partageable par lien", "Production", "Delai standard et express", "Couts", "Devis pret a transmettre"],
    metrics: ["MOQ", "10k", "Stock", "24k", "Express", "14 j"],
  },
};

export default function LoginClient({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const params = useSearchParams();
  const router = useRouter();
  const space = params.get("space") === "supplier" ? "supplier" : "brand";

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const active = copy[space];
    const set = (selector: string, value: string) => {
      const el = root.querySelector(selector);
      if (el) el.textContent = value;
    };

    set("#spaceKicker", active.kicker);
    set("#loginTitle", active.title);
    set("#loginCopy", active.text);
    set("#loginButton", active.button);
    set("#signalOneLabel", active.signals[0]);
    set("#signalOne", active.signals[1]);
    set("#signalTwoLabel", active.signals[2]);
    set("#signalTwo", active.signals[3]);
    set("#signalThreeLabel", active.signals[4]);
    set("#signalThree", active.signals[5]);
    set("#metricOneLabel", active.metrics[0]);
    set("#metricOne", active.metrics[1]);
    set("#metricTwoLabel", active.metrics[2]);
    set("#metricTwo", active.metrics[3]);
    set("#metricThreeLabel", active.metrics[4]);
    set("#metricThree", active.metrics[5]);

    const productImage = root.querySelector<HTMLImageElement>("#productImage");
    if (productImage) productImage.src = active.image;

    root.querySelector("#brandSwitch")?.classList.toggle("active", space === "brand");
    root.querySelector("#supplierSwitch")?.classList.toggle("active", space === "supplier");

    const form = root.querySelector<HTMLFormElement>("#loginForm");
    const errorBox = root.querySelector<HTMLElement>("#error");
    const button = root.querySelector<HTMLButtonElement>("#loginButton");

    const onSubmit = async (event: Event) => {
      event.preventDefault();
      if (!form || !errorBox || !button) return;
      errorBox.textContent = "";
      button.disabled = true;
      button.textContent = "Connexion...";

      const formData = new FormData(form);
      const email = String(formData.get("username") ?? "");
      const password = String(formData.get("password") ?? "");

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (!error) {
        router.push(space === "supplier" ? "/supplier" : "/brand");
        return;
      }

      button.disabled = false;
      button.textContent = active.button;
      errorBox.textContent = "Identifiant ou mot de passe incorrect.";
    };

    form?.addEventListener("submit", onSubmit);
    return () => form?.removeEventListener("submit", onSubmit);
  }, [space, router]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
