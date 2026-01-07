import { NextResponse } from "next/server";
import { listPromptTemplates, loadPromptTemplate, savePromptTemplate } from "@/lib/storage";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (name) {
    const template = await loadPromptTemplate(name);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ name, template });
  }

  const templates = await listPromptTemplates();
  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, template } = body;

    if (!name || !template) {
      return NextResponse.json(
        { error: "Name and template are required" },
        { status: 400 }
      );
    }

    await savePromptTemplate(name, template);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

