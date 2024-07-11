import {
  model_ai,
  SUPABASE_URL,
  SYNC_LABS_API_KEY,
  // XI_API_KEY,
} from "../constants.ts";
import { openai } from "../openai/client.ts";
import GPT3Tokenizer from "https://esm.sh/gpt3-tokenizer@1.1.5";
import {
  createVoiceT,
  getAiFeedbackT,
  getAiSupabaseFeedbackT,
  SpeakResponse,
} from "../types/index.ts";
import { supabase, supabaseInvoke } from "./index.ts";

export const tokenizer = new GPT3Tokenizer({ type: "gpt3" });

export const model = new Supabase.ai.Session("gte-small");

interface EmbeddingResponse {
  embeddings: string;
}

export const embeddingResponse = async (
  input: string,
): Promise<unknown> => {
  try {
    const response = await model.run(input, {
      mean_pool: true,
      normalize: true,
    });

    if (!response) {
      throw new Error("Invalid response from model.run");
    }
    return response;
  } catch (error) {
    throw new Error(`Error embedding response: ${error}`);
  }
};

type getCompletionT = {
  prompt: string;
  assistantPrompt: string;
  systemPrompt: string;
};
export const getCompletion = async (
  { prompt, assistantPrompt, systemPrompt }: getCompletionT,
) => {
  try {
    const response = await openai.chat.completions.create({
      model: model_ai,
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: assistantPrompt },
        { role: "system", content: systemPrompt },
      ],
      temperature: 0.6,
    });

    const ai_content = response.choices[0].message.content;
    console.log(ai_content, "ai_content");
    // if (ai_content === "[]") {
    //   if (!ai_content) throw new Error("ai_content is null");
    // }

    return {
      id: response.id,
      ai_content,
      error: null,
    };
  } catch (error) {
    console.error("Error getting completion:", error);
    throw error;
  }
};

export async function getAiFeedback(
  { query, endpoint, token }: getAiFeedbackT,
) {
  const response = await fetch(
    endpoint,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({ question: query }),
    },
  );
  console.log(response, "response");
  const result = await response.json();
  return result.text;
}

interface Task {
  id: number;
  user_id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export async function getAiFeedbackFromSupabase(
  {
    query,
    id_array,
    username,
    language_code,
  }: getAiSupabaseFeedbackT,
): Promise<{ ai_content: string; tasks: Task[]; data: any }> {
  try {
    const { data } = await supabase.functions.invoke("ask-data", {
      body: JSON.stringify({
        query,
        id_array,
        username,
        language_code,
      }),
    });

    return {
      ai_content: data.ai_content,
      tasks: data.tasks,
      data,
    };
  } catch (error) {
    throw new Error(`Error receiving AI response: ${error}`);
  }
}

export const matchEmbeddingIds = async (
  id_array: number[],
  embeddingUser: unknown,
) => {
  try {
    if (!supabaseInvoke) throw new Error("supabaseInvoke is null");
    const { data, error } = await supabaseInvoke
      .rpc("query_embeddings_tasks_with_ids", {
        id_array,
        embedding_vector: JSON.stringify(embeddingUser),
        match_threshold: 0.4,
      })
      .select("*")
      .limit(4);

    if (error) {
      throw new Error(
        `Error matching matchEmbeddingIds: ${error}`,
      );
    }
    return data;
  } catch (error) {
    throw new Error(
      `Error matching embedding ask data: ${JSON.stringify(error)}`,
    );
  }
};

export const matchEmbedding = async (
  rpc_function_name: string,
  embedding: unknown,
  search_username: string,
) => {
  try {
    if (!supabaseInvoke) throw new Error("supabaseInvoke is null");
    const { data, error } = await supabaseInvoke
      .rpc(rpc_function_name, {
        embedding_vector: JSON.stringify(embedding),
        match_threshold: 0.4,
        match_count: 9,
        search_username,
      })
      .select("*")
      .limit(9);

    if (error) {
      throw new Error(
        `Error matching matchEmbedding: ${JSON.stringify(error)}`,
      );
    }

    return data;
  } catch (error) {
    throw new Error(`Error matching embedding: ${error}`);
  }
};

// export async function createVoice(
//   { file, username }: createVoiceT,
// ): Promise<string | null> {
//   const url = "https://api.elevenlabs.io/v1/voices/add";
//   const formData = new FormData();
//   formData.append("files", file, "voice.ogg");
//   formData.append("name", `voice tg_id: ${username}`);
//   formData.append("description", `Voice created from Telegram voice message`);

//   try {
//     const response = await fetch(url, {
//       method: "POST",
//       headers: {
//         "xi-api-key": XI_API_KEY as string,
//       },
//       body: formData,
//     });

//     if (response.ok) {
//       const result = await response.json();
//       return result.voice_id;
//     } else {
//       console.error(`Error: ${response.status} ${response.statusText}`);
//       return null;
//     }
//   } catch (error) {
//     console.error(error);
//     return null;
//   }
// }

export async function createVoiceSyncLabs(
  { fileUrl, username }: createVoiceT,
): Promise<string | null> {
  const url = "https://api.synclabs.so/voices/create";
  const body = JSON.stringify({
    name: username,
    description: `Voice created from Telegram voice message`,
    inputSamples: [fileUrl],
    webhookUrl: `${SUPABASE_URL}/functions/v1/synclabs-video`,
  });
  console.log(body, "body");
  console.log(SYNC_LABS_API_KEY, "SYNC_LABS_API_KEY");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": SYNC_LABS_API_KEY as string,
        "Content-Type": "application/json",
      },
      body,
    });

    if (response.ok) {
      const result = await response.json();
      console.log(result, "result");
      return result.id;
    } else {
      console.error(`Error: ${response.status} ${response.statusText}`);
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function isVoiceId(telegram_id: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegram_id)
    .single();

  if (error || !data) return false;
  return true;
}

export async function getUserByVoiceId(voiceId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("voice_id_synclabs", voiceId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  return data;
};

export async function createSpeech(text: string, voiceId: string): Promise<SpeakResponse> {
  const url = "https://api.synclabs.so/speak";
  const body = JSON.stringify({
    transcript: text,
    voiceId: voiceId,
    webhookUrl: `${SUPABASE_URL}/functions/v1/synclabs-audio`,
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SYNC_LABS_API_KEY as string,
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Error creating speech: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error creating speech:', error);
    throw new Error('Failed to create speech');
  }
}

// export const deleteVoice = async (voiceId: string) => {
//   const XI_API_KEY = Deno.env.get("XI_API_KEY");

//   const response = await fetch(
//     `https://api.elevenlabs.io/v1/voices/${voiceId}`,
//     {
//       method: "DELETE",
//       headers: {
//         "xi-api-key": XI_API_KEY as string,
//       },
//     },
//   );

//   if (!response.ok) {
//     throw new Error(`Failed to delete voice: ${response.statusText}`);
//   }

//   return await response.json();
// };

export async function getVoiceId(telegram_id: string) {
  const { data, error } = await supabase
    .from("users")
    .select("voice_id_synclabs")
    .eq("telegram_id", telegram_id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch voice_id_synclabs: ${error.message}`);
  }

  return data.voice_id_synclabs;
};

// export const createVoiceMessage = async (
//   text: string,
//   voiceId: string,
//   botToken: string,
//   chatId: string,
// ) => {
//   console.log(text, "text createVoiceMessage");
//   console.log(voiceId, "voiceId createVoiceMessage");

//   const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
//   const options = {
//     method: "POST",
//     headers: {
//       'Content-Type': 'application/json',
//       'xi-api-key': XI_API_KEY as string,
//     },
//     body: JSON.stringify({
//       text,
//       voice_settings: {
//         stability: 0.5,
//         similarity_boost: 0.5,
//       },
//     }),
//   };

//   try {
//     const response = await fetch(url, options);
//     console.log("response createVoiceMessage", response);

//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(`Failed to fetch audio: ${response.statusText} - ${errorText}`);
//     }

//     const arrayBuffer = await response.arrayBuffer();
//     const buffer = new Uint8Array(arrayBuffer);

//     const formData = new FormData();
//     formData.append("chat_id", chatId);
//     formData.append(
//       "audio",
//       new Blob([buffer], { type: "audio/mpeg" }),
//       "voice_message.mp3",
//     );

//     const telegramResponse = await fetch(
//       `https://api.telegram.org/bot${botToken}/sendAudio`,
//       {
//         method: "POST",
//         body: formData,
//       },
//     );

//     if (!telegramResponse.ok) {
//       const errorText = await telegramResponse.text();
//       throw new Error(
//         `Failed to send audio message: ${telegramResponse.statusText} - ${errorText}`,
//       );
//     }

//     const telegramData = await telegramResponse.json();
//     console.log("telegramData", telegramData);

//     return telegramData;
//   } catch (err) {
//     console.error(err);
//     throw err;
//   }
// };
