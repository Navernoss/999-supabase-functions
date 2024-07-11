// Setup type definitions for built-in Supabase Runtime APIs
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import {
	Context,
	GrammyError,
	HttpError,
} from "https://deno.land/x/grammy@v1.8.3/mod.ts";

import { checkSubscription } from "../check-subscription.ts";
import { createUser } from "../_shared/nextapi/index.ts";
import {
	AiKosheyContext,
	botAiKoshey,
	bugCatcherRequest,
	handleUpdateAiKoshey,
} from "../_shared/telegram/bots.ts";
import { createQuestion } from "../_shared/openai/createQuestion.ts";
import { answerAi } from "../_shared/openai/answerAi.ts"
import {
	checkAndReturnUser,
	checkUsernameCodes,
	getLanguage,
	getUid,
	getUsernameByTelegramId,
	setLanguage,
	setModel,
	getModel,
	checkAndUpdate
} from "../_shared/supabase/users.ts";
import {
	getBiggest,
	getCorrects,
	getLastCallback,
	getQuestion,
	updateProgress,
	updateResult,
	getTop10Users
} from "../_shared/supabase/progress.ts";
import { pathIncrement } from "../path-increment.ts";
import { sendPaymentInfo } from "../_shared/supabase/payments.ts";

export type CreateUserT = {
	id: number;
	username: string;
	first_name: string;
	last_name: string;
	is_bot: boolean;
	language_code: string;
	chat_id: number;
	inviter: string;
	invitation_codes?: string;
	telegram_id: number;
	select_izbushka: string;
};
const isRu = async (ctx: Context) => {
	if (!ctx.from) throw new Error("User not found");
	const language = await getLanguage(ctx.from?.id.toString());
	if (!language) return ctx.from.language_code === "ru"
	return language === "ru";
}

const videoUrl = (isRu: boolean) => isRu ? "https://t.me/dao999nft_storage/5" : "https://t.me/dao999nft_storage/6";

const textError = async (ctx: Context) => {
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	return `🔒 ${
		lang
			? "Ох, увы и ах! Словечко, что до меня дошло, чарам тайным не отвечает. Прошу, дай знать иное, что ключом является верным, чтоб путь твой в царство дивное открыть сумели без замедления.\n\nЛибо вы можете попробовать пройти наш курс по нейросетям, использовав команду /neuro, и заработать наш токен $IGLA."
			: "Oh, my apologies! The word that came to me, the secret does not answer. Please, tell me another word that is the key to the right path, so that the path of your life is a strange and open way to the kingdom.\n\nOr you can try to pass our course on the neural networks, using the command /neuro, and earn our token $IGLA."
	}`;
};

const welcomeMenu = async (ctx: Context) => {
	console.log("✅welcomeMenu");
	await ctx.replyWithChatAction("upload_video"); // Отправка действия загрузки видео в чате
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	const text = lang
		? `🏰 Избушка повернулась к тебе передом, а к лесу задом. Налево пойдешь - огнем согреешься, прямо пойдешь - в водичке омолодишься, а направо пойдешь - в медную трубу попадешь.`
		: `🏰 The hut turned its front to you, and its back to the forest. If you go to the left you will be warmed by the fire, you will go straight ahead in the water and you will rejuvenate, and to the right you will go into a copper pipe.`;

	await ctx.replyWithVideo(videoUrl(lang), {
		caption: text,
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: `🔥 ${lang ? "Огонь" : "Fire"}`,
						callback_data: "fire",
					},
					{
						text: `💧 ${lang ? "Вода" : "Water"}`,
						callback_data: "water",
					},
					{
						text: `🎺 ${lang ? "Медные трубы" : "Copper pipes"}`,
						callback_data: "copper_pipes",
					},
				],
			],
		},
	});

	return;
};

const welcomeMessage = async (ctx: Context) => {
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	const text = lang
		? `🏰 Добро пожаловать в Тридевятое Царство, ${ctx?.update?.message?.from?.first_name}! \nВсемогущая Баба Яга, владычица тайн и чародейница, пред врата неведомого мира тебя привечает.\nЧтоб изба к тебе передком обернулась, а не задом стояла, не забудь прошептать кабы словечко-проходное.`
		: `🏰 Welcome, ${ctx?.update?.message?.from?.first_name}! \nThe all-powerful Babya Yaga, the ruler of secrets and charms, is preparing to confront you with the gates of the unknown world.\nTo save you from the front and not the back, remember to speak the word-a-word.`;

	await ctx.replyWithVideo(videoUrl(lang), {
		caption: text,
		reply_markup: {
			force_reply: true,
		},
	});
	return;
};

const intro = async (ctx: Context) => {
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	const intro = lang
		? `🏰 Избушка повернулась к тебе передом, а к лесу задом. На лево пойдешь огнем согреешься, прямо пойдешь в водичке омолодишься, а на право пойдешь в медную трубу попадешь.`
		: `🏰 The hut turned its front to you, and its back to the forest. If you go to the left you will be warmed by the fire, you will go straight ahead in the water and you will rejuvenate, and to the right you will go into a copper pipe.
`;
	return intro;
};

const menuButton = async (ctx: Context) => {
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	const menuButton = [
		[
			{
				text: `🔥 ${lang ? "Огонь" : "Fire"}`,
				callback_data: "fire",
			},
			{
				text: `💧 ${lang ? "Вода" : "Water"}`,
				callback_data: "water",
			},
			{
				text: `🎺 ${lang ? "Медные трубы" : "Copper pipes"}`,
				callback_data: "copper_pipes",
			},
 
		],
	];
	return menuButton;
};

botAiKoshey.command("neuro", async (ctx) => {
	console.log("neuro");
	await checkAndUpdate(ctx)
	await ctx.replyWithChatAction("typing");
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
		try {
			const questionContext = {
				lesson_number: 1,
				subtopic: 1,
			};

			const questions = await getQuestion({
				ctx: questionContext,
				language: "automation",
			});
			if (questions.length > 0) {
				const {
					topic: ruTopic,
					image_lesson_url,
					topic_en: enTopic,
					url
				} = questions[0];

				const user_id = await getUid(ctx.from?.username || "");
				if (!user_id) {
					ctx.reply(lang ? "Вы не зарегестрированы." : "You are not registered.");
					return;
				}
				const topic = lang ? ruTopic : enTopic;
				const allAnswers = await getCorrects({
					user_id: user_id.toString(),
					language: "all",
				});
				// Формируем сообщение
				const messageText =
					`${topic}\n\n<i><u>${lang ? "Теперь мы предлагаем вам закрепить полученные знания." : "Now we are offering you to reinforce the acquired knowledge."}</u></i>\n\n<b>${lang ? "Total: " : "Total: "}${allAnswers} $IGLA</b>`;

				// Формируем кнопки
				const inlineKeyboard = [
					[{
						text: lang ? "Перейти к вопросу" : "Go to the question",
						callback_data: `automation_01_01`,
					}],
				];

				if (url && lang) {
					console.log(url, "url");
					await ctx.replyWithVideoNote(url);
				}
				if (image_lesson_url) {
					// Отправляем сообщение
					await ctx.replyWithPhoto(image_lesson_url || "", {
						caption: messageText,
						parse_mode: "HTML",
						reply_markup: { inline_keyboard: inlineKeyboard },
					});
					return;
				} else {
					await ctx.reply(messageText, {
						parse_mode: "HTML",
						reply_markup: { inline_keyboard: inlineKeyboard },
					});
					return;
				}
			} else {
				await ctx.reply(lang ? "Вопросы не найдены." : "No questions found.");
			}
		} catch (error) {
			console.error(error);
		}
});

botAiKoshey.command("javascript", async (ctx) => {
	console.log("javascript");
	await checkAndUpdate(ctx)
	const theme = ctx.message?.text.substring(1)
	await ctx.replyWithChatAction("typing");
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	if (!theme) {
		await ctx.reply(lang ? "Тема не найдена." : "Theme not found.");
		return;
	}
		try {
			const questionContext = {
				lesson_number: 1,
				subtopic: 1,
			};

			const questions = await getQuestion({
				ctx: questionContext,
				language: theme,
			});
			if (questions.length > 0) {
				const {
					topic: ruTopic,
					image_lesson_url,
					topic_en: enTopic,
					url
				} = questions[0];

				const user_id = await getUid(ctx.from?.username || "");
				if (!user_id) {
					ctx.reply(lang ? "Вы не зарегестрированы." : "You are not registered.");
					return;
				}
				const topic = lang ? ruTopic : enTopic;
				const allAnswers = await getCorrects({
					user_id: user_id.toString(),
					language: "all",
				});
				// Формируем сообщение
				const messageText =
					`${topic}\n\n<i><u>${lang ? "Теперь мы предлагаем вам закрепить полученные знания." : "Now we are offering you to reinforce the acquired knowledge."}</u></i>\n\n<b>${lang ? "Total: " : "Total: "}${allAnswers} $IGLA</b>`;

				// Формируем кнопки
				const inlineKeyboard = [
					[{
						text: lang ? "Перейти к вопросу" : "Go to the question",
						callback_data: `${theme}_01_01`,
					}],
				];

				if (url && lang) {
					console.log(url, "url");
					await ctx.replyWithVideoNote(url);
				}
				if (image_lesson_url) {
					// Отправляем сообщение
					await ctx.replyWithPhoto(image_lesson_url || "", {
						caption: messageText,
						parse_mode: "HTML",
						reply_markup: { inline_keyboard: inlineKeyboard },
					});
					return;
				} else {
					await ctx.reply(messageText, {
						parse_mode: "HTML",
						reply_markup: { inline_keyboard: inlineKeyboard },
					});
					return;
				}
			} else {
				await ctx.reply(lang ? "Вопросы не найдены." : "No questions found.");
			}
		} catch (error) {
			console.error(error);
		}
});

botAiKoshey.command("typescript", async (ctx) => {
	console.log("typescript");
	await checkAndUpdate(ctx)
	const theme = ctx.message?.text.substring(1)
	await ctx.replyWithChatAction("typing");
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	if (!theme) {
		await ctx.reply(lang ? "Тема не найдена." : "Theme not found.");
		return;
	}
		try {
			const questionContext = {
				lesson_number: 1,
				subtopic: 1,
			};

			const questions = await getQuestion({
				ctx: questionContext,
				language: theme,
			});
			if (questions.length > 0) {
				const {
					topic: ruTopic,
					image_lesson_url,
					topic_en: enTopic,
					url
				} = questions[0];

				const user_id = await getUid(ctx.from?.username || "");
				if (!user_id) {
					ctx.reply(lang ? "Вы не зарегестрированы." : "You are not registered.");
					return;
				}
				const topic = lang ? ruTopic : enTopic;
				const allAnswers = await getCorrects({
					user_id: user_id.toString(),
					language: "all",
				});
				// Формируем сообщение
				const messageText =
					`${topic}\n\n<i><u>${lang ? "Теперь мы предлагаем вам закрепить полученные знания." : "Now we are offering you to reinforce the acquired knowledge."}</u></i>\n\n<b>${lang ? "Total: " : "Total: "}${allAnswers} $IGLA</b>`;

				// Формируем кнопки
				const inlineKeyboard = [
					[{
						text: lang ? "Перейти к вопросу" : "Go to the question",
						callback_data: `${theme}_01_01`,
					}],
				];

				if (url && lang) {
					console.log(url, "url");
					await ctx.replyWithVideoNote(url);
				}
				if (image_lesson_url) {
					// Отправляем сообщение
					await ctx.replyWithPhoto(image_lesson_url || "", {
						caption: messageText,
						parse_mode: "HTML",
						reply_markup: { inline_keyboard: inlineKeyboard },
					});
					return;
				} else {
					await ctx.reply(messageText, {
						parse_mode: "HTML",
						reply_markup: { inline_keyboard: inlineKeyboard },
					});
					return;
				}
			} else {
				await ctx.reply(lang ? "Вопросы не найдены." : "No questions found.");
			}
		} catch (error) {
			console.error(error);
		}
});

botAiKoshey.command("reactnative", async (ctx) => {
	console.log("reactnative");
	await checkAndUpdate(ctx)
	const theme = ctx.message?.text.substring(1)
	await ctx.replyWithChatAction("typing");
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	if (!theme) {
		await ctx.reply(lang ? "Тема не найдена." : "Theme not found.");
		return;
	}
		try {
			const questionContext = {
				lesson_number: 1,
				subtopic: 1,
			};

			const questions = await getQuestion({
				ctx: questionContext,
				language: theme,
			});
			if (questions.length > 0) {
				const {
					topic: ruTopic,
					image_lesson_url,
					topic_en: enTopic,
					url
				} = questions[0];

				const user_id = await getUid(ctx.from?.username || "");
				if (!user_id) {
					ctx.reply(lang ? "Вы не зарегестрированы." : "You are not registered.");
					return;
				}
				const topic = lang ? ruTopic : enTopic;
				const allAnswers = await getCorrects({
					user_id: user_id.toString(),
					language: "all",
				});
				// Формируем сообщение
				const messageText =
					`${topic}\n\n<i><u>${lang ? "Теперь мы предлагаем вам закрепить полученные знания." : "Now we are offering you to reinforce the acquired knowledge."}</u></i>\n\n<b>${lang ? "Total: " : "Total: "}${allAnswers} $IGLA</b>`;

				// Формируем кнопки
				const inlineKeyboard = [
					[{
						text: lang ? "Перейти к вопросу" : "Go to the question",
						callback_data: `${theme}_01_01`,
					}],
				];

				if (url && lang) {
					console.log(url, "url");
					await ctx.replyWithVideoNote(url);
				}
				if (image_lesson_url) {
					// Отправляем сообщение
					await ctx.replyWithPhoto(image_lesson_url || "", {
						caption: messageText,
						parse_mode: "HTML",
						reply_markup: { inline_keyboard: inlineKeyboard },
					});
					return;
				} else {
					await ctx.reply(messageText, {
						parse_mode: "HTML",
						reply_markup: { inline_keyboard: inlineKeyboard },
					});
					return;
				}
			} else {
				await ctx.reply(lang ? "Вопросы не найдены." : "No questions found.");
			}
		} catch (error) {
			console.error(error);
		}
});

botAiKoshey.command("python", async (ctx) => {
	console.log("python");
	await checkAndUpdate(ctx)
	const theme = ctx.message?.text.substring(1)
	await ctx.replyWithChatAction("typing");
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	if (!theme) {
		await ctx.reply(lang ? "Тема не найдена." : "Theme not found.");
		return;
	}
		try {
			const questionContext = {
				lesson_number: 1,
				subtopic: 1,
			};

			const questions = await getQuestion({
				ctx: questionContext,
				language: theme,
			});
			if (questions.length > 0) {
				const {
					topic: ruTopic,
					image_lesson_url,
					topic_en: enTopic,
					url
				} = questions[0];

				const user_id = await getUid(ctx.from?.username || "");
				if (!user_id) {
					ctx.reply(lang ? "Вы не зарегестрированы." : "You are not registered.");
					return;
				}
				const topic = lang ? ruTopic : enTopic;
				const allAnswers = await getCorrects({
					user_id: user_id.toString(),
					language: "all",
				});
				// Формируем сообщение
				const messageText =
					`${topic}\n\n<i><u>${lang ? "Теперь мы предлагаем вам закрепить полученные знания." : "Now we are offering you to reinforce the acquired knowledge."}</u></i>\n\n<b>${lang ? "Total: " : "Total: "}${allAnswers} $IGLA</b>`;

				// Формируем кнопки
				const inlineKeyboard = [
					[{
						text: lang ? "Перейти к вопросу" : "Go to the question",
						callback_data: `${theme}_01_01`,
					}],
				];

				if (url && lang) {
					console.log(url, "url");
					await ctx.replyWithVideoNote(url);
				}
				if (image_lesson_url) {
					// Отправляем сообщение
					await ctx.replyWithPhoto(image_lesson_url || "", {
						caption: messageText,
						parse_mode: "HTML",
						reply_markup: { inline_keyboard: inlineKeyboard },
					});
					return;
				} else {
					await ctx.reply(messageText, {
						parse_mode: "HTML",
						reply_markup: { inline_keyboard: inlineKeyboard },
					});
					return;
				}
			} else {
				await ctx.reply(lang ? "Вопросы не найдены." : "No questions found.");
			}
		} catch (error) {
			console.error(error);
		}
});

botAiKoshey.command("post", async (ctx) => {
	await checkAndUpdate(ctx)
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	const chatId = "-1002228291515";
	const message =
		`<b>Ай Кощей 🤖 Персональный нейронный ассистент</b>\n\nРешение для управления встречами и задачами в <b>Telegram</b>,  использует возможности искусственного интеллекта и блокчейн-технологий <b>TON (The Open Network)</b> для создания эффективной и прозрачной системы взаимодействия пользователей. \n\nЭто функция <b>"Бортовой журнал"</b> — первый шаг в создании персонального цифрового аватара. \n\nНаше видение заключается в создании умного помощника, который не только записывает и анализирует встречи, но и активно помогает в управлении задачами, делегировании и планировании не выходя из телеграм.`;
	const message_two =
		`🌟 Добро пожаловать в мир наших удивительных ботов по обучению искусственному интеллекту, <b>JavaScript, TypeScript, React, Python и Tact! 🤖💡</b>\n\n🔍 Наши боты предлагают уникальную возможность заработать наш токен знаний $IGLA, погружаясь в мир новых технологий и углубляясь в востребованные навыки. 🚀\n\n💼 В отличие от других кликеров, наши боты позволяют пользователям проводить время с пользой, обучаясь навыкам, которые значительно повысят вашу профессиональную ценность на рынке труда.\n\n📚 Не упустите шанс улучшить свои знания и навыки, становясь более востребованным специалистом в сфере IT!\n\nПрисоединяйтесь к нам и начните свое преображение <b>прямо сейчас</b>!`;
	const telegram_id = ctx.from?.id;
	if (!telegram_id) throw new Error("No telegram id");
	const chatMember = await botAiKoshey.api.getChatMember(chatId, telegram_id);
	const isAdmin = chatMember.status === "administrator" ||
		chatMember.status === "creator";
	if (!isAdmin) {
		await ctx.reply(
			lang
				? "У вас нет прав администратора для выполнения этого действия."
				: "You do not have admin rights to perform this action.",
		);
		return;
	}

	try {
		await botAiKoshey.api.sendVideo(chatId, videoUrl(lang), {
			caption: message,
			parse_mode: "HTML",
		});
		await botAiKoshey.api.sendMessage(chatId, message_two, {
			parse_mode: "HTML",
			reply_markup: {
				inline_keyboard: [[
					// { text: "Automatization", url: "https://t.me/bot1" },
					{ text: "TypeScript", url: "https://t.me/typescript_dev_bot" },
					{ text: "Python", url: "https://t.me/python_ai_dev_bot" },
				], [{ text: "React", url: "https://t.me/react_native_dev_bot" }, {
					text: "JavaScript",
					url: "https://t.me/javascriptcamp_bot",
				} // { text: "Tact", url: "https://t.me/bot6" },
				], [
					{
						text: "Ai Koshey",
						url: "https://t.me/ai_koshey_bot",
					},
				]],
			},
		});
		await ctx.reply(
			lang
				? "Сообщение с видео отправлено в канал."
				: "Message with video sent to the channel.",
		);
	} catch (error) {
		console.error("Failed to send message with video to the channel:", error);
		await ctx.reply(
			lang
				? "Не удалось отправить сообщение с видео в канал."
				: "Failed to send message with video to the channel.",
		);
	}
});

botAiKoshey.command("getchatid", async (ctx) => {
	await checkAndUpdate(ctx)
	await ctx.replyWithChatAction("typing");
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	const chat_id = ctx.message?.chat?.id;
	await ctx.reply(lang ? `🆔 Текущий ID чата: ${chat_id}` : `🆔 Current chatID: ${chat_id}`);
	return
});

// Обработчик команды "start"
botAiKoshey.command("start", async (ctx: AiKosheyContext) => {
	await checkAndUpdate(ctx)
	await ctx.replyWithChatAction("typing");
	console.log(ctx.from?.language_code, "ctx.from.language_code")

	const params = ctx?.message?.text && ctx?.message?.text.split(" ")[1];

	const message = ctx.update.message;
	const username = message?.from?.username;
	const telegram_id = message?.from?.id.toString();
	const language_code = message?.from?.language_code;
	if (!ctx.from) throw new Error("User not found");
	console.log(await isRu(ctx), "isRu")
	const lang = await isRu(ctx)

	const chatIdSubscription = lang ? "-1002228291515" : "-1002015840738"
	const isSubscription = await checkSubscription(
		ctx,
		ctx.from?.id,
		chatIdSubscription
	);
	if (!isSubscription) {
		await ctx.reply(lang ? "Вы не подписаны на канал. Чтобы продолжить тест, нужно подписаться 👁‍🗨" : "You are not subscribed to the channel. To continue the test, you need to subscribe to the channel 👁‍🗨",
			{
				reply_markup: { inline_keyboard: [
					[{ text: lang ? "👁‍🗨 Подписаться" : "👁‍🗨 Subscribe", url: lang ? "https://t.me/ai_koshey999nft" : "https://t.me/ai_koshey_en" }],
				] }
				}
			);
			return;
		}

	if(!ctx.from.username) {
		await ctx.reply(lang ? "🔍 Для использования бота, необходимо иметь username" : "🔍 To use the bot, you must have a username")
		return
	}

	if (params) {
		const underscoreIndex = params.indexOf("_"); // Search for the index of the first '_'

		if (underscoreIndex !== -1) {
			const select_izbushka = params.substring(0, underscoreIndex); // Extract the part before '_'
			const inviter = await getUsernameByTelegramId(params.substring(underscoreIndex + 1));
			if (!inviter) {
				await ctx.reply(lang ? "Сылка недействительна" : "Invalid link")
				return
			}

			// Check if the selected hut and inviter exist
			if (select_izbushka && inviter) {
				try {
					// Check if the inviter exists
					const { isInviterExist, inviter_user_id, invitation_codes } =
						await checkUsernameCodes(inviter);

					console.log(isInviterExist, "373 isInviterExist")
					if (isInviterExist && invitation_codes) {
						const first_name = message?.from?.first_name;
						const last_name = message?.from?.last_name || "";

						if (username && telegram_id) {
							await ctx.replyWithChatAction("typing");
							// Check if the user exists and create it if it doesn't
							const { isUserExist, user } = await checkAndReturnUser(
								telegram_id,
							);
							console.log(isUserExist, "384 isUserExist")

							if (isUserExist === false || !user?.inviter) {
								console.log(387)
								if (
									first_name && username &&
									message?.from?.id && !user?.inviter &&
										message?.from?.language_code && message?.chat?.id
									) {
										console.log("392")
										const userObj: CreateUserT = {
										id: message?.from?.id,
										username,
										first_name,
										last_name,
										is_bot: message?.from?.is_bot,
										language_code: message?.from?.language_code,
										chat_id: message?.chat?.id,
										inviter: inviter_user_id,
										invitation_codes,
										telegram_id: message?.from?.id,
										select_izbushka,
									};
									await ctx.replyWithChatAction("typing");
									const user = await createUser(userObj);
									console.log(user, "user 407")
									console.log("356 sendMenu");
									await welcomeMenu(ctx);
									return;
								}
							} else {
								const { isUserExist, user } = await checkAndReturnUser(
									telegram_id,
								);
								if (isUserExist && user?.inviter) {
									await ctx.replyWithChatAction("typing");
									await welcomeMenu(ctx);
									return;
								}
							}
						}
					}
				} catch (error) {
					const textError = `${
						lang
							? "🤔 Что-то пошло не так, попробуйте ещё раз."
							: "🤔 Something went wrong, try again."
					}\n${JSON.stringify(error)}`;
					await ctx.reply(textError);
					await bugCatcherRequest(
						"neuro-coder",
						JSON.stringify(error),
					);
					return;
				}
			} else {
				if (username && telegram_id) {
					// Check if the user exists and send the corresponding message
					const { isUserExist, user } = await checkAndReturnUser(telegram_id);
					console.log(user, "user");
					if (isUserExist && user?.inviter) {
						console.log("440 sendMenu");
						language_code && await welcomeMenu(ctx);
					} else {
						language_code && await welcomeMessage(ctx);
					}
					return;
				} else {
					const textError = `${
						lang
							? "🤔 Ошибка: Username not found."
							: "🤔 Error: Username not found."
					}`;
					await ctx.reply(textError);
					throw new Error(textError);
				}
			}
		}
	} else {
		if (username && telegram_id) {
			try {
				const { isUserExist, user } = await checkAndReturnUser(
					telegram_id,
				);

				if (isUserExist && user?.inviter) {
					console.log("465 sendMenu ", user.inviter);
					language_code && await welcomeMenu(ctx);
				} else {
					language_code && await welcomeMessage(ctx);
				}
				return;
			} catch (error) {
				await ctx.reply(
					`${
						lang
							? "🤔 Ошибка: checkAndReturnUser."
							: "🤔 Error: checkAndReturnUser."
					}\n${error}`,
				);
				await bugCatcherRequest(
					"ai_koshey_bot (select_izbushka && inviter)",
					JSON.stringify(error),
				);
				throw new Error("Error: checkAndReturnUser.");
			}
		}
	}
});

botAiKoshey.command("buy", async (ctx) => {
	await checkAndUpdate(ctx)
	const lang = await isRu(ctx)
	ctx.reply(lang ? `<b>Огонь 🔥 - НейроСтарт - 432 ⭐️ в месяц</b>
Чат с воспоминаниями + GPT-4o: Бот запоминает контекст и улучшает взаимодействие.
Самостоятельное обучение: Курсы по нейросетям, JavaScript, TypeScript, React & React Native, Python.
ИИ гуру ассистент: Доступ к виртуальному помощнику с использованием ИИ.
Поддержка в чате: Помощь и ответы на вопросы в режиме реального времени.
	
<b>Вода 💧 - НейроБазис - Групповая сессия для начинающих - 4754 ⭐️ в месяц</b>
Все, что в тарифе "Базовый Онлайн".
Дополнительные ИИ функции: Включает в себя Чат GPT, Llama3, Mistral, HeyGen, Midjourney, Eleven Labs.
4 групповые онлайн встречи с преподавателем: Еженедельные занятия, где можно задать вопросы и получить практические советы.
	
<b>Медные трубы 🎺 - НейроПродвинутый - Групповая сессия для продвинутых - 47 975 ⭐️ в месяц</b>
Все, что в тарифе "Базовый Онлайн".
12 групповых онлайн встреч с преподавателем: Интенсивное обучение с глубоким погружением в разработку телеграм ИИ ботов.`
	 : `<b>Fire 🔥 - NeuroStart - 432 ⭐️ per month</b>
Chat with memories + GPT-4o: The bot remembers the context and improves interaction.
Self-paced learning: Courses on neural networks, JavaScript, TypeScript, React & React Native, Python.
AI guru assistant: Access to a virtual assistant using AI.
Chat support: Help and answers to questions in real-time.
	 
<b>Water 💧 - NeuroBasic - Group session for beginners - 4754 ⭐️ per month</b>
Everything in the "Basic Online" plan.
Additional AI features: Includes Chat GPT, Llama3, Mistral, HeyGen, Midjourney, Eleven Labs.
4 group online sessions with an instructor: Weekly classes where you can ask questions and get practical advice.
	 
<b>Copper Pipes 🎺 - NeuroAdvanced - Group session for advanced users - 47,975 ⭐️ per month</b>
Everything in the "Basic Online" plan.
12 group online sessions with an instructor: Intensive training with deep immersion in the development of Telegram AI bots.`, {
		reply_markup: {
			inline_keyboard: [[{ text: lang ? "🔥 Огонь" : "🔥 Fire", callback_data: "buy_fire" }], [{ text: lang ? "🌊 Вода" : "🌊 Water", callback_data: "buy_water" }], [{ text: lang ? "🎺 Медные трубы" : "🎺 Copper pipes", callback_data: "buy_copper_pipes" }]],
		},
		parse_mode: "HTML",
	})
	return;
});

botAiKoshey.on("pre_checkout_query", (ctx) => {
	ctx.answerPreCheckoutQuery(true)
	return;
});

botAiKoshey.on("message:successful_payment", async (ctx) => {
	await checkAndUpdate(ctx)
	const lang = await isRu(ctx)
	console.log("ctx 646(succesful_payment)", ctx)
	const level = ctx.message.successful_payment.invoice_payload
	if (!ctx.from?.username) throw new Error("No username");
	const user_id = await getUid(ctx.from.username)
	if (!user_id) throw new Error("No user_id");
	await sendPaymentInfo(user_id, level)
	const levelForMessage = level === "fire" ? lang ? "🔥 Огонь" : "🔥 Fire" : level === "water" ? lang ? "💧 Вода" : "💧 Water" : lang ? "🎺 Медные трубы" : "🎺 Copper pipes"
	await ctx.reply(lang ? "🤝 Спасибо за покупку!" : "🤝 Thank you for the purchase!");
	const textToPost = lang ? `🪙 В казну тридевятого царства прибыло\n\n @${ctx.from.username} спасибо за покупку уровня ${levelForMessage}, добрый человек!` : `🪙 @${ctx.from.username} thank you for the purchase level ${levelForMessage}!`
	await ctx.api.sendMessage("-1001476314188", textToPost)
	await ctx.api.sendMessage("-1001729610573", textToPost)
	return;
});

botAiKoshey.command("language", async (ctx) => {
	await checkAndUpdate(ctx)
	await ctx.replyWithChatAction("typing");
	if (!ctx.from) throw new Error("User not found");
	const { user } = await checkAndReturnUser(ctx.from?.id.toString());
	const lang = await isRu(ctx)
	user && ctx.reply(lang ? "🌏 Выберите язык" : "🌏 Select language", {
		reply_markup: {
			inline_keyboard: [
				[{ text: lang ? "🇷🇺 Русский" : "🇷🇺 Russian", callback_data: "select_russian" }],
				[{ text: lang ? "🇬🇧 English" : "🇬🇧 English", callback_data: "select_english" }],
			],
		},
	})
});

botAiKoshey.command("model", async (ctx) => {
	await checkAndUpdate(ctx)
	console.log("model");
	await ctx.replyWithChatAction("typing");
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	// await ctx.reply(lang ? "Чтобы использовать данную функцию, необходимо приобрести уровень water 🌊" : "To use this function, you need to purchase the water level 🌊")
	await ctx.reply(lang ? "🧠 Выберите модель ИИ" : "🧠Select Model Ai", {
		reply_markup: {
			inline_keyboard: [
				[{ text: "GPT-4", callback_data: "model_gpt-4" }, { text: "GPT-4o", callback_data: "model_gpt-4o" }, { text: "GPT-4-turbo", callback_data: "model_gpt-4-turbo"}],
				[{ text: "GPT-3.5-turbo", callback_data: "model_gpt-3.5-turbo"}],
			],
		},
	})
	return
})

botAiKoshey.command("top", async (ctx) => {
	await checkAndUpdate(ctx)
	console.log("top");
	await ctx.replyWithChatAction("typing");
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	const top10Users = await getTop10Users();
	console.log(top10Users, "top10Users");
	const leaderboardText = top10Users.map((user, index) => {
		return `${index + 1}. ${user.username} - ${user.all} $IGLA`;
	}).join('\n');

	await ctx.reply(lang ? `Топ 10 пользователей:\n${leaderboardText}` : `Top 10 users:\n${leaderboardText}`);
	return
})

botAiKoshey.on("message:text", async (ctx: Context) => {
	await checkAndUpdate(ctx)
	if (ctx.message?.text?.startsWith("/")) return;
	await ctx.replyWithChatAction("typing");
	const inviter = ctx?.message?.text;
	const message = ctx.update.message;
	const language_code = message?.from?.language_code;

	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)

	// Check if the message is a reply (if there is a reply_to_message)
	if (ctx?.message?.reply_to_message) {
		// Check if the original message text contains a specific text
		const originalMessageText = ctx?.message?.reply_to_message?.caption
			? ctx?.message?.reply_to_message?.caption
			: ctx?.message?.reply_to_message?.text;

		console.log(originalMessageText, "originalMessageText");
		if (
			originalMessageText || originalMessageText &&
				(originalMessageText.includes("🏰 Добро пожаловать") ||
					originalMessageText.includes("🏰 Welcome") ||
					originalMessageText.includes("🔒 Oh, my apologies!") ||
					originalMessageText.includes("🔒 Ох, увы и ах!"))
		) {
			try {
				const { isInviterExist, inviter_user_id } = await checkUsernameCodes(
					inviter as string,
				);

				if (isInviterExist) {
					console.log(message, "message");
					const user = {
						id: message?.from?.id,
						username: message?.from?.username,
						first_name: message?.from?.first_name,
						last_name: message?.from?.last_name,
						is_bot: message?.from?.is_bot,
						language_code,
						chat_id: message?.chat?.id,
						inviter: inviter_user_id,
						invitation_codes: "",
						telegram_id: message?.from?.id,
					};
					console.log(user, "user");
					const newUser = await createUser(user);
					await ctx.replyWithChatAction("typing");

					if (newUser) {
						await ctx.replyWithVideo(videoUrl(lang), {
							caption: await intro(ctx),
							reply_markup: {
								inline_keyboard: await menuButton(ctx),
							},
						});
					}
					return;
				} else {
					await ctx.reply(await textError(ctx), {
						reply_markup: {
							force_reply: true,
						},
					});
					return;
				}
			} catch (error) {
				console.error(error);
			}
		} else {
			console.log("else!!!");
			return;
		}
	} else {
		await ctx.replyWithChatAction("typing");
		if (ctx.message?.text?.startsWith("/")) return;
		const query = ctx?.message?.text;

		const {isUserExist} = await checkAndReturnUser(ctx.from.id.toString())
		if (!isUserExist) {
			await ctx.reply(await textError(ctx), {
				reply_markup: {
					force_reply: true,
				},
			});
			return;
		}
		
		const username = ctx?.update?.message?.from?.username;

		if (!username || !language_code) return;
		  
		const model = await getModel(ctx.from.id.toString())
		console.log(model, "model");

		if (!model) throw new Error("Model not found")
		if (!query) throw new Error("Query not found")

		const language = lang ? "ru" : "en"
		if (!language) throw new Error("Language not found")
		const answer = await answerAi(query, language, model)
		if (!answer) throw new Error("Answer not found")

		await ctx.reply(answer, {parse_mode: "Markdown"})
	
}
	return
});

botAiKoshey.on("callback_query:data", async (ctx) => {
	await checkAndUpdate(ctx)
	await ctx.replyWithChatAction("typing");
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	const callbackData = ctx.callbackQuery.data;

	const telegram_id = ctx.callbackQuery.from.id.toString();

	await ctx.replyWithChatAction("typing");
	console.log(ctx);
	const isHaveAnswer = callbackData.split("_").length === 4;

	if (callbackData.startsWith("buy")) {
		if (callbackData.endsWith("fire")) {
			await ctx.replyWithInvoice(
				lang ? "🔥 Огонь" : "🔥 Fire",
				lang ? "Вы получите подписку уровня 'Огонь'" : "You will receive a subscription to the 'Fire' level",
				"fire",
				"", // Оставьте пустым для цифровых товаров
				"XTR", // Используйте валюту Telegram Stars
				[{ label: "Цена", amount: 432 }],
			);
			return
		}
		if (callbackData.endsWith("water")) {
			await ctx.replyWithInvoice(
				lang ? "🌊 Вода" : "🌊 Water",
				lang ? "Вы получите подписку уровня 'Вода'" : "You will receive a subscription to the 'Water' level",
				"water",
				"", // Оставьте пустым для цифровых товаров
				"XTR", // Используйте валюту Telegram Stars
				[{ label: "Цена", amount: 4754 }], // Цена в центах (10.00 Stars)
			);
			return
		}
		if (callbackData.endsWith("copper_pipes")) {
			await ctx.replyWithInvoice(
				lang ? "🎺 Медные трубы" : "🎺 Copper pipes",
				lang ? "Вы получите подписку уровня 'Медные трубы'" : "You will receive a subscription to the 'Copper pipes' level",
				"copper_pipes",
				"", // Оставьте пустым для цифровых товаров
				"XTR", // Используйте валюту Telegram Stars
				[{ label: "Цена", amount: 47975 }], // Цена в центах (10.00 Stars)
			);
			return
		}
	}
	if (callbackData === "select_russian") {
		await setLanguage(ctx.from?.id.toString(), "ru");
		await ctx.reply("🇷🇺 Выбран русский");
	}
	if (callbackData === "select_english") {
		await setLanguage(ctx.from?.id.toString(), "en");
		await ctx.reply("🇬🇧 English selected");
	}

	if (
		callbackData.startsWith("start_test") ||
		callbackData.startsWith("automation") ||
		callbackData.startsWith("javascript") ||
		callbackData.startsWith("python") ||
		callbackData.startsWith("typescript") ||
		callbackData.startsWith("reactnative")
	) {
		if (callbackData === "start_test") {
			try {
				const theme = callbackData.split("_")[1]
				console.log(`start_test`)
				const questionContext = {
					lesson_number: 1,
					subtopic: 1,
				};

				const questions = await getQuestion({
					ctx: questionContext,
					language: theme,
				});
				if (questions.length > 0) {
					const {
						topic: ruTopic,
						image_lesson_url,
						topic_en: enTopic,
					} = questions[0];

					const user_id = await getUid(ctx.callbackQuery.from.username || "");
					if (!user_id) {
						await ctx.reply("Пользователь не найден.");
						return;
					}
					const topic = lang ? ruTopic : enTopic;
					const allAnswers = await getCorrects({
						user_id: user_id.toString(),
						language: "all",
					});
					// Формируем сообщение
					const messageText =
						`${topic}\n\n<i><u>${lang ? "Теперь мы предлагаем вам закрепить полученные знания." : "Now we are offering you to reinforce the acquired knowledge."}</u></i>\n\n<b>${lang ? "Total: " : "Total: "}${allAnswers} $IGLA</b>`;

					// Формируем кнопки
					const inlineKeyboard = [
						[{
							text: lang ? "Перейти к вопросу" : "Go to the question",
							callback_data: `${theme}_01_01`,
						}],
					];

					if (image_lesson_url) {
						// Отправляем сообщение
						await ctx.replyWithPhoto(image_lesson_url || "", {
							caption: messageText,
							parse_mode: "HTML",
							reply_markup: { inline_keyboard: inlineKeyboard },
						});
						return;
					} else {
						await ctx.reply(messageText, {
							parse_mode: "HTML",
							reply_markup: { inline_keyboard: inlineKeyboard },
						});
						return;
					}
				} else {
					await ctx.reply(lang ? "Вопросы не найдены." : "No questions found.");
				}
			} catch (error) {
				console.error(error);
			}
		}

		if (!isHaveAnswer) {
			try {
				const [language, lesson, subtopic] = callbackData.split("_");
				let questions;
				if (!isNaN(Number(lesson)) && !isNaN(Number(subtopic))) {
					// Значения корректны, вызываем функцию.
					const getQuestionContext = {
						lesson_number: Number(lesson),
						subtopic: Number(subtopic),
					};
					questions = await getQuestion({
						ctx: getQuestionContext,
						language,
					});
				} else {
					// Одно из значений некорректно, обрабатываем ошибку.
					console.error(
						"Одно из значений некорректно(96):",
						lesson,
						subtopic,
						callbackData,
					);
					await ctx.reply(
						lang
							? "Одно из значений некорректно. Пожалуйста, проверьте данные."
							: "One of the values is incorrect. Please check the data.",
					);
					return;
				}
				const {
					question: ruQuestion,
					variant_0: ruVariant_0,
					variant_1: ruVariant_1,
					variant_2: ruVariant_2,
					question_en: enQuestion,
					variant_0_en: enVariant_0,
					variant_1_en: enVariant_1,
					variant_2_en: enVariant_2,
					id,
					image_lesson_url,
				} = questions[0];

				const question = lang ? ruQuestion : enQuestion;
				const variant_0 = lang ? ruVariant_0 : enVariant_0;
				const variant_1 = lang ? ruVariant_1 : enVariant_1;
				const variant_2 = lang ? ruVariant_2 : enVariant_2;

				const user_id = await getUid(ctx.callbackQuery.from.username || "");
				if (!user_id) {
					await ctx.reply("Пользователь не найден.");
					return;
				}
				console.log(user_id);
				const allAnswers = await getCorrects({
					user_id: user_id.toString(),
					language: "all",
				});
				// Формируем сообщение
				const messageText =
					`<b>№${id}</b>\n\n${question}\n\n<b> Total: ${allAnswers} $IGLA</b>`;

				// Формируем кнопки
				const inlineKeyboard = [
					[{
						text: variant_0 || "Variant 1",
						callback_data: `${callbackData}_0`,
					}],
					[{
						text: variant_1 || "Variant 2",
						callback_data: `${callbackData}_1`,
					}],
					[{
						text: variant_2 || (lang ? "Не знаю" : "I don't know"),
						callback_data: `${callbackData}_2`,
					}],
				];

				if (image_lesson_url) {
					// Отправляем сообщение
					await ctx.editMessageCaption({
						reply_markup: { inline_keyboard: inlineKeyboard },
						caption: messageText,
						parse_mode: "HTML",
					});
				} else {
					await ctx.editMessageText(messageText, {
						reply_markup: { inline_keyboard: inlineKeyboard },
						parse_mode: "HTML",
					});
				}
			} catch (error) {
				console.error(error);
			}
		}

		if (isHaveAnswer) {
			try {
				if (ctx.callbackQuery.from.id) {
					console.log("editMessageReplyMarkup")
					await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }); 
				}
				const [language, lesson_number, subtopic, answer] = callbackData.split(
					"_",
				);
				const questionContext = {
					lesson_number: Number(lesson_number),
					subtopic: Number(subtopic),
				};

				const questions = await getQuestion({ ctx: questionContext, language });
				if (questions.length > 0) {
					const {
						correct_option_id,
					} = questions[0];
					const user_id = await getUid(ctx.callbackQuery.from.username || "");
					if (!user_id) {
						await ctx.reply(lang ? "Пользователь не найден." : "User not found.");
						return;
					}

					const path = `${language}_${lesson_number}_${subtopic}`;
					console.log(path, "path for getBiggest");
					const biggestSubtopic = await getBiggest({
						lesson_number: Number(lesson_number),
						language,
					});

					let isTrueAnswer = null;
					if (Number(correct_option_id) === Number(answer)) {
						isTrueAnswer = true;
						await ctx.reply("✅");
					} else {
						isTrueAnswer = false;
						await ctx.reply("❌");
					}
					await updateProgress({
						user_id: user_id.toString(),
						isTrue: isTrueAnswer,
						language,
					});
					console.log(biggestSubtopic, `biggestSubtopic`);
					console.log(subtopic, `subtopic`);
					const newPath = await pathIncrement({
						path,
						isSubtopic: Number(biggestSubtopic) === Number(subtopic)
							? false
							: true,
					});
					const correctAnswers = await getCorrects({
						user_id: user_id.toString(),
						language,
					});
					const allAnswers = await getCorrects({
						user_id: user_id.toString(),
						language: "all",
					});

					const lastCallbackId = await getLastCallback(language);
					console.log(lastCallbackId);
					if (lastCallbackId) {
						if (questions[0].id === lastCallbackId) {
							const correctProcent = (correctAnswers / lastCallbackId) * 100;
							if (correctProcent >= 80) {
								await updateResult({
									user_id: user_id.toString(),
									language,
									value: true,
								});
								await ctx.reply(
									lang
										? `<b>🥳 Поздравляем, вы прошли основной тест! Далее вы сможете пройти дополнительные тесты от искуственного интеллекта.</b>\n\n Total: ${allAnswers} $IGLA`
										: `<b>🥳 Congratulations, you passed the main test! Then you can pass the additional tests from the artificial intelligence.</b>\n\n Total: ${allAnswers} $IGLA`,
									{ parse_mode: "HTML" },
								);
							} else {
								await updateResult({
									user_id: user_id.toString(),
									language,
									value: false,
								});
								await ctx.reply(
									lang
										? `<b>🥲 Вы не прошли основной тест, но это не помешает вам развиваться! </b>\n\n Total: ${allAnswers} $IGLA`
										: `<b>🥲 You didn't pass the main test, but that won't stop you from developing!</b>\n\n Total: ${allAnswers} $IGLA`,
									{ parse_mode: "HTML" },
								);
							}
						}
						console.log(newPath, `newPath ai koshey`);
						const [newLanguage, newLesson, newSubtopic] = newPath.split("_");
						const getQuestionContext = {
							lesson_number: Number(newLesson),
							subtopic: Number(newSubtopic),
						};
						const newQuestions = await getQuestion({
							ctx: getQuestionContext,
							language,
						});
						console.log(newQuestions, `newQuestions ai koshey for`);
						console.log(getQuestionContext, `getQuestionContext`);
						const { topic: ruTopic, image_lesson_url, topic_en: enTopic, url } =
							newQuestions[0];
						const topic = lang ? ruTopic : enTopic;
						// Формируем сообщение
						const messageText =
							`${topic}\n\n<i><u>${lang ? "Теперь мы предлагаем вам закрепить полученные знания." : "Now we are offering you to reinforce the acquired knowledge."}</u></i>\n\n<b>${lang ? "Total: " : "Total: "}${allAnswers} $IGLA</b>`;

						// Формируем кнопки
						const inlineKeyboard = [
							[{
								text: lang ? "Перейти к вопросу" : "Go to the question",
								callback_data: newPath,
							}],
						];
						if (url && lang) {
							console.log(url, "url");
							await ctx.replyWithVideoNote(url);
						}
						if (image_lesson_url) {
							// Отправляем сообщение
							await ctx.replyWithPhoto(image_lesson_url, {
								caption: messageText,
								parse_mode: "HTML",
								reply_markup: { inline_keyboard: inlineKeyboard },
							});
							return;
						} else {
							await ctx.reply(messageText, {
								parse_mode: "HTML",
								reply_markup: { inline_keyboard: inlineKeyboard },
							});
							return;
						}
					} else {
						await ctx.reply(lang ? "Вопросы не найдены." : "No questions found.");
					}
				} else {
					console.error("Invalid callback(289)");
					return;
				}
			} catch (error) {
				console.error(error);
			}
		}
	}
	if (callbackData.startsWith("create_soul")) {
		if (ctx.callbackQuery.from.id) {
			console.log("editMessageReplyMarkup")
			await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }); 
		}
		await ctx.reply(
			lang
				? "Пожалуйста, укажите ваше место работы:"
				: "Please, specify your company name:",
			{ reply_markup: { force_reply: true } },
		);
		return;
	}

	if (callbackData.startsWith("create_digital_avatar")) {
		if (ctx.callbackQuery.from.id) {
			console.log("editMessageReplyMarkup")
			await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }); 
		}
		await ctx.reply(
			lang
				? "Пожалуйста, укажите ваше video_id:"
				: "Please, specify your video_id:",
			{ reply_markup: { force_reply: true } },
		);
		return;
	}

	if (callbackData.startsWith("model_")) {
		const model = callbackData.split("_")[1];
		console.log(model, "model");
		await setModel(telegram_id, model);
		await ctx.reply(lang ? `🔋 Вы выбрали модель ${model}` : `🔋 You selected the model ${model}`);
		return;
	}

return
});

await botAiKoshey.api.setMyCommands([
	{
		command: "/start",
		description: "🚀 Start chatting with Ai Koshey",
	},
	{
		command: "/neuro",
		description: "🧠 Start the neuro course",
	},
	{
		command: "/language",
		description: "🌐 Select language",
	},
	{
		command: "/model",
		description: "🧠 Add avatar's model",
	},
	{
		command: "/top",
		description: "🏆 Top 10 users",
	},
	{
		command: "/buy",
		description: "🛒 Buy subscription",
	},
	{
		command: "/javascript",
		description: "💻 Learn JavaScript",
	},
	{
		command: "/typescript",
		description: "💻 Learn TypeScript",
	},
	{
		command: "/reactnative",
		description: "📱 Learn React Native",
	},
	{
		command: "/python",
		description: "🐍 Learn Python",
	},
	{
		command: "/getchatid",
		description: "🆔 Get chat ID",
	},
]);

botAiKoshey.catch((err) => {
	const ctx = err.ctx;
	console.error(`Error while handling update ${ctx.update.update_id}:`);
	const e = err.error;
	if (e instanceof GrammyError) {
		console.error("Error in request:", e.description);
	} else if (e instanceof HttpError) {
		console.error("Could not contact Telegram:", e);
		throw e;
	} else {
		console.error("Unknown error:", e);
		throw e;
	}
});

Deno.serve(async (req) => {
	try {
		const url = new URL(req.url);
		if (url.searchParams.get("secret") !== Deno.env.get("FUNCTION_SECRET")) {
			return new Response("not allowed", { status: 405 });
		}

		return await handleUpdateAiKoshey(req);
	} catch (err) {
		console.error(err);
	}
});

// const textInvite = `${
//   isRu
//     ? `🏰 **Приглашение в Тридевятое Царство** 🏰\n\n[Нажми на ссылку чтобы присоединиться!](https://t.me/${botUsername}?start=${select_izbushka}_${username})\n\nПосле подключения к боту нажми на кнопку **Izbushka**, чтобы войти на видео встречу.`
//     : `Invitation to the **DAO 999 NFT**\n\nPress the link to join!](https://t.me/${botUsername}?start=${select_izbushka}_${username})\n\nAfter connecting to the bot, press the **Izbushka** button to enter the video meeting.`
// }`;
// const buttons = [
//   {
//     text: `${
//       isRu
//         ? "Видео инструкция подключения"
//         : "Video instruction for connecting"
//     }`,
//     web_app: {
//       url: `https://youtube.com/shorts/YKG-1fdEtAs?si=ojKvK2DfPsZ0mbd5`,
//     },
//   },
// ];

// supabase functions deploy ai-koshey --no-verify-jwt
