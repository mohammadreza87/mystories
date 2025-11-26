/**
 * Lightweight OG meta endpoint for story sharing.
 * Returns HTML with Open Graph/Twitter meta tags and then redirects to the app route.
 *
 * Query params:
 * - storyId (required)
 * - redirect (optional) default: /story/{id}
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
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const storyId = url.searchParams.get("storyId");
  const redirect = url.searchParams.get("redirect") || `/story/${storyId || ""}`;

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
  const image = story?.cover_image_url || `${supabaseUrl}/storage/v1/object/public/defaults/cover.png`;
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
  <meta http-equiv="refresh" content="0; url=${canonical}" />
  <link rel="canonical" href="${canonical}" />
</head>
<body>
  <p>Redirecting to the story...</p>
  <script>window.location.href = "${canonical}";</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...corsHeaders,
    },
  });
});
