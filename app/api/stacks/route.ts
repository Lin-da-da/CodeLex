import { NextResponse } from "next/server";
import { getStacks } from "@/lib/wordData";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getStacks());
}
