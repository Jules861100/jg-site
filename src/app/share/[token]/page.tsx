import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function SharedSheetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: sheet, error } = await supabase
    .rpc("get_shared_sheet", { p_token: token })
    .single();

  if (error || !sheet) {
    notFound();
  }

  const s = sheet as { title: string; spec: Record<string, unknown> };
  const { ruleChecks, ...fields } = s.spec ?? {};

  const LABELS: Record<string, string> = {
    componentType: "Type de composant",
    reference: "Reference fournisseur",
    leadTimeStandard: "Delai standard (jours)",
    leadTimeExpress: "Delai express (jours)",
    moq: "MOQ",
    monthlyCapacity: "Capacite mensuelle",
    batVersion: "Version BAT",
    batDate: "Date BAT",
    pumpColor: "Couleur pompe / Pantone",
    casePantone: "Pantone etui",
    constraints: "Contraintes",
    requiredDocuments: "Documents requis",
    unitPrice: "Prix unitaire",
    toolingCost: "Cout tooling",
    incoterm: "Incoterm",
    paymentTerms: "Conditions de paiement",
  };

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        Fiche partagee
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        {s.title}
      </h1>

      <dl className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Object.entries(fields)
          .filter(([, value]) => value)
          .map(([key, value]) => (
            <div key={key} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <dt className="text-xs uppercase tracking-wide text-zinc-500">
                {LABELS[key] ?? key}
              </dt>
              <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{String(value)}</dd>
            </div>
          ))}
      </dl>

      {Array.isArray(ruleChecks) && ruleChecks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Conformite
          </h2>
          <ul className="mt-3 flex flex-col gap-1">
            {(ruleChecks as { label: string; status: "ok" | "warn" | "fail" }[]).map((check) => (
              <li key={check.label} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    check.status === "ok"
                      ? "bg-emerald-500"
                      : check.status === "warn"
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                />
                {check.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
