import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type OnboardBody = {
  userId: string;
  orgName: string;
  orgKind: "brand" | "supplier";
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Creates an organization and attaches it to an already-authenticated
// user's profile. Runs with service_role because profile/org creation
// happens before the user has any org to be scoped by RLS to.
export async function POST(request: Request) {
  const body = (await request.json()) as OnboardBody;
  const { userId, orgName, orgKind } = body;

  if (!userId || !orgName || (orgKind !== "brand" && orgKind !== "supplier")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: orgName, kind: orgKind, slug: `${slugify(orgName)}-${Date.now()}` })
    .select()
    .single();

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 500 });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: userId, org_id: org.id, role: "owner" });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ org });
}
