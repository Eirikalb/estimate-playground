import { NextResponse } from "next/server";
import { listDomains } from "@/lib/storage";

/**
 * GET /api/domains
 * List all available domains with metadata
 */
export async function GET() {
  try {
    const domains = await listDomains();
    return NextResponse.json(domains);
  } catch (error) {
    console.error("Error listing domains:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
