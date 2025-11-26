/**
 * OG meta endpoint for story sharing.
 * Returns HTML with OG/Twitter meta tags and no inline scripts/styles to avoid CSP issues.
 * Optionally redirects (302) human user-agents to the story URL.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { CORS_HEADERS } from "../_shared/cors.ts";

const corsHeaders = CORS_HEADERS;

interface StoryRow {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  language: string | null;
  target_audience: string | null;
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const BOT_REGEX = /(bot|facebookexternalhit|twitterbot|slackbot|telegrambot|discordbot|embedly)/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const storyId = url.searchParams.get("storyId");
  const redirect = url.searchParams.get("redirect") || (storyId ? `/story/${storyId}` : "/");

  if (!storyId) {
    return new Response("storyId is required", { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response("Missing Supabase env", { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: story, error } = await supabase
    .from("stories")
    .select("id, title, description, cover_image_url, language, target_audience")
    .eq("id", storyId)
    .maybeSingle<StoryRow>();

  if (error) {
    console.error("OG story fetch error:", error);
  }

  const title = escapeHtml(story?.title || "Next Tale Story");
  const desc = escapeHtml(
    (story?.description || "Read this interactive story on Next Tale.").slice(0, 180)
  );
  const image =
    story?.cover_image_url ||
    `${supabaseUrl}/storage/v1/object/public/defaults/cover.png`;
  const canonical = redirect.startsWith("http") ? redirect : `${url.origin}${redirect}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />

  <meta property="og:type" content="article" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:site_name" content="Next Tale" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${image}" />
  <link rel="canonical" href="${canonical}" />
</head>
<body>
  <p>Preview ready. <a href="${canonical}">Continue to story</a>.</p>
</body>
</html>`;

  const ua = req.headers.get("user-agent") || "";
  const isBot = BOT_REGEX.test(ua);

  // For humans, do a 302 redirect; bots get the OG HTML
  if (!isBot) {
    return new Response(null, {
      status: 302,
      headers: { Location: canonical, ...corsHeaders },
    });
  }

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...corsHeaders,
    },
  });
});
