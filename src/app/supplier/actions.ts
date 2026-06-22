"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { evaluateRuleChecks, type SheetSpec } from "@/lib/verification/supplierSheet";

export type { RuleCheck } from "@/lib/verification/supplierSheet";

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
