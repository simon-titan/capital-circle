import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", authData.user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    moduleId: string;
    title: string;
    passThreshold: number;
    quizMode?: "single_page" | "multi_page";
    questions: unknown[];
  };

  const { data, error } = await supabase
    .from("quizzes")
    .upsert(
      {
        module_id: body.moduleId,
        title: body.title,
        pass_threshold: body.passThreshold,
        quiz_mode: body.quizMode === "single_page" ? "single_page" : "multi_page",
        questions: body.questions,
      },
      { onConflict: "module_id" },
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, item: data });
}
