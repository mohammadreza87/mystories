import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type QuestTask = "read_chapter" | "create_story" | "complete_story";

const TASK_CONFIG: Record<QuestTask, { quest_type: "daily" | "weekly"; target: number; reward: number }> = {
  read_chapter: { quest_type: "daily", target: 2, reward: 10 },
  create_story: { quest_type: "daily", target: 1, reward: 15 },
  complete_story: { quest_type: "weekly", target: 1, reward: 30 },
};

function getPeriod(task: QuestTask) {
  const now = new Date();
  if (TASK_CONFIG[task].quest_type === "weekly") {
    const day = now.getDay(); // 0-6, Sunday = 0
    const start = new Date(now);
    start.setDate(now.getDate() - day + 1); // Monday
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  }
  const start = new Date().toISOString().split("T")[0];
  return { start, end: start };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { task } = await req.json() as { task?: QuestTask };
    if (!task || !(task in TASK_CONFIG)) {
      return new Response(JSON.stringify({ error: "Invalid task" }), {
        status: 400,
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

    const config = TASK_CONFIG[task];
    const { start, end } = getPeriod(task);

    // Upsert quest
    const { data: existing } = await supabase
      .from("user_quests")
      .select("*")
      .eq("user_id", user.id)
      .eq("task", task)
      .eq("period_start", start)
      .maybeSingle();

    let progress = existing?.progress ?? 0;
    let rewarded = existing?.rewarded ?? false;
    progress = Math.min(config.target, progress + 1);
    const status = progress >= config.target ? "completed" : "pending";

    if (existing) {
      const { error: updateError } = await supabase
        .from("user_quests")
        .update({
          progress,
          status,
          updated_at: new Date().toISOString(),
          rewarded: status === "completed" ? existing.rewarded : false,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabase
        .from("user_quests")
        .insert({
          user_id: user.id,
          task,
          quest_type: config.quest_type,
          period_start: start,
          period_end: end,
          progress,
          target: config.target,
          status,
          reward_points: config.reward,
          rewarded: progress >= config.target ? false : false,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }
    }

    // Award points once per completed quest
    if (status === "completed" && !rewarded) {
      await supabase.rpc("increment_points", {
        p_user_id: user.id,
        p_amount: config.reward,
      }).catch(() => null);

      await supabase
        .from("user_quests")
        .update({ rewarded: true })
        .eq("user_id", user.id)
        .eq("task", task)
        .eq("period_start", start);
    }

    // Update streaks for daily tasks
    if (config.quest_type === "daily") {
      const today = new Date().toISOString().split("T")[0];
      const { data: streak } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      let current = streak?.current_streak ?? 0;
      let longest = streak?.longest_streak ?? 0;
      const lastDate = streak?.last_action_date;

      if (lastDate === today) {
        // no change
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        if (lastDate === yesterdayStr) {
          current += 1;
        } else {
          current = 1;
        }
      }
      if (current > longest) longest = current;

      if (streak) {
        const { error: streakUpdateError } = await supabase
          .from("user_streaks")
          .update({
            current_streak: current,
            longest_streak: longest,
            last_action_date: today,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        if (streakUpdateError) {
          console.error("Streak update error:", streakUpdateError);
          throw streakUpdateError;
        }
      } else {
        const { error: streakInsertError } = await supabase
          .from("user_streaks")
          .insert({
            user_id: user.id,
            current_streak: 1,
            longest_streak: 1,
            last_action_date: today,
          });

        if (streakInsertError) {
          console.error("Streak insert error:", streakInsertError);
          throw streakInsertError;
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Quest progress error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update quest";
    return new Response(JSON.stringify({
      error: "Failed to update quest",
      details: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
