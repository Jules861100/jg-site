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
