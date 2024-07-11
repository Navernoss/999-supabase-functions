// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { corsHeaders, headers } from "../_shared/handleCORS.ts";
import { getUserByVoiceId } from "../_shared/supabase/ai.ts";
import { getVideoWithChatId, setVideoUrl } from "../_shared/supabase/videos.ts";
import { botAiKoshey } from "../_shared/telegram/bots.ts";

// Setup type definitions for built-in Supabase Runtime APIs
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

Deno.serve(async (req) => {
  console.log("Hello from synclabs-video", req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, ...headers } });
  }

  const data = await req.json();
  console.log(data, "data");

  if (data?.result?.audioUrl) {
    const audioUrl = data?.result?.audioUrl;
    console.log(audioUrl, "audioUrl");
    const audio_id = data?.result?.id;
    console.log(audio_id, "audio_id");
    const voice_id = data?.result?.voiceId;
    console.log(voice_id, "voice_id");
    const user = await getUserByVoiceId(voice_id);
    console.log(user, "user");
    const chat_id = user?.chat_id;
    // const chat_id = "1006101665"
    console.log(chat_id, "chat_id");
    try {
      await botAiKoshey.api.sendVoice(chat_id, audioUrl);
    } catch (error) {
      console.error("Error sending video:", error);
      await botAiKoshey.api.sendMessage(
        chat_id,
        "Error sending video",
      );
    }
    return new Response(
      JSON.stringify(data),
      { headers: { "Content-Type": "application/json" } },
    );
  } else {
    return new Response(
      JSON.stringify(data),
      { headers: { "Content-Type": "application/json" } },
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'https://629018ab323a.ngrok.app/functions/v1/synclabs-video' \
    --header 'Authorization: Bearer ' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

// supabase functions deploy synclabs-audio --no-verify-jwt