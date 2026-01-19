import { NextResponse } from "next/server";
import { loadBenchmarkRun } from "@/lib/storage";
import { generateSummaryCSV, generateDetailedCSV, generateExportFilename } from "@/lib/export";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  const format = searchParams.get("format") || "csv";
  const detailed = searchParams.get("detailed") === "true";

  // Only CSV is supported for now
  if (format !== "csv") {
    return NextResponse.json(
      { error: "Unsupported format. Only 'csv' is supported." },
      { status: 400 }
    );
  }

  const run = await loadBenchmarkRun(id);

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  // Generate CSV content
  const csvContent = detailed ? generateDetailedCSV(run) : generateSummaryCSV(run);
  const filename = generateExportFilename(run, detailed ? "detailed" : "summary");

  // Return CSV with appropriate headers for download
  return new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
