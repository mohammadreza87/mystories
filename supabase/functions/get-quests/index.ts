import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const day = now.getDay(); // 0-6
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - day + 1); // Monday start
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    // Fetch quests
    const { data: quests } = await supabase
      .from("user_quests")
      .select("*")
      .eq("user_id", user.id)
      .gte("period_start", weekStartStr)
      .lte("period_end", weekEndStr);

    // Fetch streak
    const { data: streak } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Points
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("points")
      .eq("id", user.id)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        today,
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        quests: quests || [],
        streak: streak || { current_streak: 0, longest_streak: 0, last_action_date: null },
        points: profile?.points || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Failed to fetch quests" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
