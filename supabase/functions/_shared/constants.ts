if (!Deno.env.get("PRODUCTION_URL")) {
  throw new Error("PRODUCTION_URL is not set");
}

if (!Deno.env.get("DEV")) {
  throw new Error("DEV is not set");
}

if (!Deno.env.get("SUPABASE_URL")) {
  throw new Error("SUPABASE_URL is not set");
}

if (!Deno.env.get("FUNCTION_SECRET")) {
  throw new Error("FUNCTION_SECRET is not set");
}

if (!Deno.env.get("HEYGEN_URL")) {
  throw new Error("HEYGEN_URL is not set");
}

if (!Deno.env.get("API_KEY")) {
  throw new Error("API_KEY is not set");
}

if (!Deno.env.get("LOCAL_SUPABASE_URL")) {
  throw new Error("LOCAL_SUPABASE_URL is not set");
}

if (!Deno.env.get("XI_API_KEY")) throw new Error("XI_API_KEY is not defined");

if (!Deno.env.get("SYNC_LABS_API_KEY")) {
  throw new Error("SYNC_LABS_API_KEY is not set");
}

if (!Deno.env.get("TELEGRAM_NEURO_CALLS_TOKEN")) {
  throw new Error("TELEGRAM_NEURO_CALLS_TOKEN is not set");
}

export const DEV = Deno.env.get("DEV") === "true" ? true : false;

export const HEYGEN_URL = Deno.env.get("HEYGEN_URL");
export const API_KEY = Deno.env.get("API_KEY");
export const XI_API_KEY = Deno.env.get("XI_API_KEY");
export const SYNC_LABS_API_KEY = Deno.env.get("SYNC_LABS_API_KEY");

export const AI_KOSHEY = DEV
  ? Deno.env.get("TELEGRAM_BOT_TOKEN_AI_KOSHEY_TEST")
  : Deno.env.get("TELEGRAM_BOT_TOKEN_AI_KOSHEY");
export const NEURO_CALLS = DEV
  ? Deno.env.get("TELEGRAM_BOT_TOKEN_AI_KOSHEY_TEST")
  : Deno.env.get("TELEGRAM_NEURO_CALLS_TOKEN");
// local
export const LOCAL_SUPABASE_URL = Deno.env.get("LOCAL_SUPABASE_URL");
export const LOCAL_SUPABASE_URL_ANON_KEY = Deno.env.get(
  "LOCAL_SUPABASE_URL_ANON_KEY",
);

export const PRODUCTION_URL = Deno.env.get("PRODUCTION_URL");
export const SITE_URL = DEV ? LOCAL_SUPABASE_URL : PRODUCTION_URL;

export const NEXT_PUBLIC_SUPABASE_URL = Deno.env.get(
  "NEXT_PUBLIC_SUPABASE_URL",
);
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = Deno.env.get(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
);

// SUPABASE
export const SUPABASE_URL = DEV
  ? Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")
  : Deno.env.get("SUPABASE_URL");

export const SUPABASE_ANON_KEY = DEV
  ? Deno.env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  : Deno.env.get("SUPABASE_ANON_KEY");

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const FUNCTION_SECRET = Deno.env.get("FUNCTION_SECRET");

export const model_ai = "gpt-4o";
