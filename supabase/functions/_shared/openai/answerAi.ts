import { openai } from "./client.ts"


export async function answerAi(
  prompt: string,
  language_code: string,
  model: string,
) {
  try {
  const systemPrompt = `Reply to the user on language: ${language_code}`

  const chatCompletion = await openai.chat.completions.create({
    messages: [{
      role: "user",
      content: prompt,
    }, {
      role: "system",
      content: systemPrompt,
    }],
    model,
    stream: false,
    temperature: 0.1,
  })

  console.log(chatCompletion)

  return chatCompletion.choices[0].message.content;
  } catch (e) {
    throw new Error("Error_answerAi",e)
  }
}