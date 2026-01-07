import { NextResponse } from "next/server";
import { listDomains, loadDomainConfig, loadExpertFacts } from "@/lib/storage";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const config = await loadDomainConfig(id);
    const facts = await loadExpertFacts(id);

    if (!config) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    return NextResponse.json({ config, facts });
  }

  const domains = await listDomains();
  return NextResponse.json(domains);
}

