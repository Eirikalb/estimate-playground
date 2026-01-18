import { NextResponse } from "next/server";
import { loadTestSet, deleteTestSet } from "@/lib/storage";

/**
 * GET /api/test-sets/:name
 * Get a specific test set with full scenarios
 */
export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const testSet = await loadTestSet(params.name);

    if (!testSet) {
      return NextResponse.json(
        { error: "Test set not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(testSet);
  } catch (error) {
    console.error("Error loading test set:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/test-sets/:name
 * Delete a test set
 */
export async function DELETE(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const success = await deleteTestSet(params.name);

    if (!success) {
      return NextResponse.json(
        { error: "Test set not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting test set:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
