"use server";
set -e
mkdir -p src/app/supplier "src/app/share/[token]"

cat > src/app/supplier/actions.ts <<'PUSHEOF1'
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SheetSpec = {
  componentType: string;
  reference: string;
  leadTimeStandard: string;
  leadTimeExpress: string;
  moq: string;
  monthlyCapacity: string;
  batVersion: string;
  batDate: string;
  pumpColor: string;
  casePantone: string;
  constraints: string;
  requiredDocuments: string;
  unitPrice: string;
  toolingCost: string;
  incoterm: string;
  paymentTerms: string;
};

export type RuleCheck = { label: string; status: "ok" | "warn" | "fail" };

export function evaluateRuleChecks(spec: SheetSpec): RuleCheck[] {
  return [
    {
      label: "Delais standard et express renseignes",
      status: spec.leadTimeStandard && spec.leadTimeExpress ? "ok" : "warn",
    },
    {
      label: "MOQ et capacite mensuelle renseignes",
      status: spec.moq && spec.monthlyCapacity ? "ok" : "warn",
    },
    {
      label: "BAT versionne et date",
      status: spec.batVersion && spec.batDate ? "ok" : "fail",
    },
    {
      label: "Prix unitaire et cout tooling renseignes",
      status: spec.unitPrice && spec.toolingCost ? "ok" : "fail",
    },
    {
      label: "Incoterm et conditions de paiement renseignes",
      status: spec.incoterm && spec.paymentTerms ? "ok" : "warn",
    },
  ];
}

async function getOrgId() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", auth.user.id)
    .single();

  if (!profile) throw new Error("Aucune organisation associee a ce compte.");
  return { supabase, orgId: profile.org_id as string };
}

export async function createSupplierSheet(formData: FormData) {
  const { supabase, orgId } = await getOrgId();

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id")
    .eq("claimed_org_id", orgId)
    .maybeSingle();

  if (!supplier) {
    throw new Error("Aucun fournisseur reclame pour cette organisation.");
  }

  const spec: SheetSpec = {
    componentType: String(formData.get("componentType") ?? ""),
    reference: String(formData.get("reference") ?? ""),
    leadTimeStandard: String(formData.get("leadTimeStandard") ?? ""),
    leadTimeExpress: String(formData.get("leadTimeExpress") ?? ""),
    moq: String(formData.get("moq") ?? ""),
    monthlyCapacity: String(formData.get("monthlyCapacity") ?? ""),
    batVersion: String(formData.get("batVersion") ?? ""),
    batDate: String(formData.get("batDate") ?? ""),
    pumpColor: String(formData.get("pumpColor") ?? ""),
    casePantone: String(formData.get("casePantone") ?? ""),
    constraints: String(formData.get("constraints") ?? ""),
    requiredDocuments: String(formData.get("requiredDocuments") ?? ""),
    unitPrice: String(formData.get("unitPrice") ?? ""),
    toolingCost: String(formData.get("toolingCost") ?? ""),
    incoterm: String(formData.get("incoterm") ?? ""),
    paymentTerms: String(formData.get("paymentTerms") ?? ""),
  };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Le titre de la fiche est requis.");

  const ruleChecks = evaluateRuleChecks(spec);

  const { error } = await supabase.from("supplier_sheets").insert({
    org_id: orgId,
    supplier_id: supplier.id,
    title,
    spec: { ...spec, ruleChecks },
  });

  if (error) throw new Error(error.message);

  revalidatePath("/supplier");
}

export async function publishSupplierSheet(sheetId: string) {
  const { supabase, orgId } = await getOrgId();

  const { error } = await supabase
    .from("supplier_sheets")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", sheetId)
    .eq("org_id", orgId);

  if (error) throw new Error(error.message);

  revalidatePath("/supplier");
}

export async function createShareLink(sheetId: string) {
  const { supabase, orgId } = await getOrgId();

  const { data: sheet } = await supabase
    .from("supplier_sheets")
    .select("id, org_id, status")
    .eq("id", sheetId)
    .eq("org_id", orgId)
    .single();

  if (!sheet) throw new Error("Fiche introuvable.");
  if (sheet.status !== "published") {
    throw new Error("Publiez la fiche avant de generer un lien de partage.");
  }

  const { data: share, error } = await supabase
    .from("supplier_sheet_shares")
    .insert({ sheet_id: sheetId, target_org_id: null })
    .select("token")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/supplier");
  return share.token as string;
}
