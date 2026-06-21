import { createClient } from "@/lib/supabase/server";
import { createSupplierSheet, type RuleCheck } from "./actions";
import { SheetActions } from "./SheetActions";

const FIELD_GROUPS: Array<{
  legend: string;
  fields: Array<{ name: string; label: string; type?: string; required?: boolean }>;
}> = [
  {
    legend: "Composant",
    fields: [
      { name: "componentType", label: "Type de composant", required: true },
      { name: "reference", label: "Reference fournisseur", required: true },
    ],
  },
  {
    legend: "Delais et capacite",
    fields: [
      { name: "leadTimeStandard", label: "Delai standard (jours)" },
      { name: "leadTimeExpress", label: "Delai express (jours)" },
      { name: "moq", label: "MOQ" },
      { name: "monthlyCapacity", label: "Capacite mensuelle" },
    ],
  },
  {
    legend: "BAT et couleur",
    fields: [
      { name: "batVersion", label: "Version BAT" },
      { name: "batDate", label: "Date BAT", type: "date" },
      { name: "pumpColor", label: "Couleur pompe / Pantone" },
      { name: "casePantone", label: "Pantone etui" },
    ],
  },
  {
    legend: "Cout et conditions",
    fields: [
      { name: "unitPrice", label: "Prix unitaire" },
      { name: "toolingCost", label: "Cout tooling" },
      { name: "incoterm", label: "Incoterm" },
      { name: "paymentTerms", label: "Conditions de paiement" },
    ],
  },
];

const STATUS_DOT: Record<RuleCheck["status"], string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  fail: "bg-red-500",
};

export default async function SupplierSpace() {
  const supabase = await createClient();

  const { data: sheets, error } = await supabase
    .from("supplier_sheets")
    .select("id, title, status, spec, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Espace fournisseur
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Vos fiches semi-finies. Publiez puis generez un lien pour les
        partager a vos marques clientes.
      </p>

      {error && (
        <p className="mt-8 text-sm text-red-600">
          Connectez-vous pour voir vos fiches ({error.message}).
        </p>
      )}

      <form
        action={createSupplierSheet}
        className="mt-10 flex flex-col gap-6 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800"
      >
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Nouvelle fiche semi-finie
        </h2>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Titre de la fiche</span>
          <input
            name="title"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        {FIELD_GROUPS.map((group) => (
          <fieldset key={group.legend} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {group.legend}
            </legend>
            {group.fields.map((field) => (
              <label key={field.name} className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">{field.label}</span>
                <input
                  name={field.name}
                  type={field.type ?? "text"}
                  required={field.required}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
            ))}
          </fieldset>
        ))}

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Contraintes</span>
          <textarea
            name="constraints"
            rows={2}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Documents requis
          </span>
          <textarea
            name="requiredDocuments"
            rows={2}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <button
          type="submit"
          className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Enregistrer la fiche
        </button>
      </form>

      <ul className="mt-8 flex flex-col gap-4">
        {sheets?.map((sheet) => {
          const spec = (sheet.spec ?? {}) as { ruleChecks?: RuleCheck[] };
          const ruleChecks = spec.ruleChecks ?? [];
          return (
            <li
              key={sheet.id}
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-950 dark:text-zinc-50">{sheet.title}</p>
                  <p className="text-sm text-zinc-500">{sheet.status}</p>
                </div>
              </div>
              {ruleChecks.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1">
                  {ruleChecks.map((check) => (
                    <li key={check.label} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[check.status]}`} />
                      {check.label}
                    </li>
                  ))}
                </ul>
              )}
              <SheetActions sheetId={sheet.id} status={sheet.status} />
            </li>
          );
        })}
        {sheets?.length === 0 && (
          <p className="text-sm text-zinc-500">Aucune fiche pour le moment.</p>
        )}
      </ul>
    </div>
  );
}
