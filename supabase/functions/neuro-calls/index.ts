// Setup type definitions for built-in Supabase Runtime APIs
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import {
	Context,
	GrammyError,
	HttpError,
} from "https://deno.land/x/grammy@v1.8.3/mod.ts";

import { checkSubscription } from "../check-subscription.ts";
import { NEURO_CALLS, delay } from "../_shared/constants.ts";
import { createUser } from "../_shared/nextapi/index.ts";
import {
	botNeuroCalls,
	botUsernameNeuroCalls,
	bugCatcherRequest,
	handleUpdateNeuroCalls,
} from "../_shared/telegram/bots.ts";
import { answerAi } from "../_shared/openai/answerAi.ts"
import {
	checkAndReturnUser,
	checkUsernameCodes,
	getLanguage,
	getUid,
	getUsernameByTelegramId,
	setLanguage,
	setSelectedIzbushka,
	updateUser,
	setModel,
	getModel,
	setMode,
	getMode,
	checkAndUpdate
} from "../_shared/supabase/users.ts";
import {
	getRooms,
	getRoomsCopperPipes,
	getRoomsWater,
	getSelectIzbushkaId,
} from "../_shared/supabase/rooms.ts";
import {
	checkPassportByRoomId,
	getPassportsTasksByUsername,
	setPassport,
} from "../_shared/supabase/passport.ts";
import { PassportUser, RoomNode } from "../_shared/types/index.ts";
import {
	createSpeech,
	createVoiceSyncLabs,
	getAiFeedbackFromSupabase,
	getVoiceId,
  isVoiceId,
} from "../_shared/supabase/ai.ts";
import { createVideo } from "../_shared/heygen/index.ts";
import { getTop10Users } from "../_shared/supabase/progress.ts";
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

const videoUrl = (isRu: boolean) => isRu ? "https://t.me/dao999nft_storage/8" : "https://t.me/dao999nft_storage/10";
const chatIdSubscription = (lang: boolean) => lang ? "-1002228291515" : "-1002213213628"

const startIzbushka = async (ctx: Context) => {
	const lang = await isRu(ctx)
	try {
		if (!ctx.from) throw new Error("User not found");
		// const text = isRu
		//   ? `🏰 Избушка повернулась к тебе передом, а к лесу задом. Нажми кнопку "Izbushka", чтобы начать встречу.`
		//   : `🏰 The hut turned its front to you, and its back to the forest. Tap the "Izbushka" button to start the encounter.`;

		const buttons = [
			{
				text: `${lang ? "Войти в комнату" : "Enter the room"}`,
				web_app: { url: "https://dao999nft.com/show-izbushka" },
			},
		];

		const text = lang
			? `🤝 Начать встречу с тем, кто пригласил вас`
			: `🤝 Start the meeting with the person who invited you`;

		await ctx.reply(
			text,
			{
				reply_markup: {
					inline_keyboard: [buttons],
				},
			},
		);
		return;
	} catch (error) {
		await ctx.reply(lang ? "Сылка недействительна" : "Invalid link")
		throw new Error("startIzbushka", error);
	}
};

const textError = async (ctx: Context) => {
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	return `🔒 ${
		lang
			? "Ох, увы и ах! Проходное слово, которое вы назвали, некорректно."
			: "Oh, my apologies! The passphrase you called was incorrect."
	}`;
};

const welcomeMenu = async (ctx: Context) => {
	console.log("✅welcomeMenu");
	await ctx.replyWithChatAction("upload_video"); // Отправка действия загрузки видео в чате
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	const text = lang
		? `🏰 Добро пожаловать в NeuroCalls, ${ctx.from?.first_name}!\n\nВыберите одну из доступных команд, чтобы начать:\n\n🚀 /start - Начать общение с NeuroCalls\n🌐 /language - Выбрать язык\n🆔 /soul - Наполнить аватара душой\n📳 /mode - Выбрать режим общения с ИИ\n🧠 /model - Добавить модель аватара\n🔊 /text_to_speech - Преобразовать текст в речь\n🔊 /reset_voice - Сбросить голос аватара\n🎤 /voice - Добавить голос аватара\n🛒 /buy - Купить подписку\n🆔 /getchatid - Получить ID чата`
		: `🏰 Welcome to NeuroCalls, ${ctx.from?.first_name}!\n\nChoose one of the available commands to get started:\n\n🚀 /start - Start chatting with NeuroCalls\n🌐 /language - Select language\n🆔 /soul - Fill your avatar's soul\n📳 /mode - Select AI communication mode\n🧠 /model - Add avatar's model\n🔊 /text_to_speech - Convert text to speech\n🔊 /reset_voice - Reset avatar's voice\n🎤 /voice - Add avatar's voice\n🛒 /buy - Buy subscription\n🆔 /getchatid - Get chat ID`;

	await ctx.replyWithVideo(videoUrl(lang), {
		caption: text,
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: `${lang ? "🚀 Мои комнаты" : "🚀 My rooms"}`,
						callback_data: "neurostart",
					},
					{
						text: `${lang ? "🏢 В гостях" : "🏢 On a visit"}`,
						callback_data: "neurobasic",
					},
					{
						text: `${lang ? "💼 Обучение" : "💼 Learning"}`,
						callback_data: "neurooffice",
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
	? `🏰 Добро пожаловать в NeuroCalls, ${ctx.from?.first_name}!\n\nДля того чтобы начать пользоваться ботом, нужно назвать проходное слово.`
	: `🏰 Welcome to NeuroCalls, ${ctx.from?.first_name}!\n\nTo start using the bot, you need to call the passphrase.`;

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
	? `🏰 Вы назвали правильное проходное слово. Добро пожаловать в NeuroCalls, ${ctx.from?.first_name}!\n\nДля того чтобы начать пользоваться ботом, нужно выбрать одну из доступных команд или воспользоваться кнопками ниже.`
	: `🏰 You have named the correct passphrase. Welcome to NeuroCalls, ${ctx.from?.first_name}!\n\n To start using the bot, you need to select one of the available commands or use the buttons below.`

	return intro;
};

const menuButton = async (ctx: Context) => {
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	const menuButton = [
		[
			{
				text: `${lang ? "🚀 НейроСтарт" : "🚀 NeuroStart"}`,
				callback_data: "neurostart",
			},
			{
				text: `${lang ? "🏢 НейроБаза" : "🏢 NeuroBasic"}`,
				callback_data: "neurobasic",
			},
			{
				text: `${lang ? "💼 НейроОфис" : "💼 NeuroOffice"}`,
				callback_data: "neurooffice",
			},
 
		],
	];
	return menuButton;
};

// botNeuroCalls.command("post", async (ctx) => {
// 	await checkAndUpdate(ctx)
// 	if (!ctx.from) throw new Error("User not found");
// 	const lang = await isRu(ctx)
// 	const chatId = "-1002228291515";
// 	const message =
// 		`<b>Ай Кощей 🤖 Персональный нейронный ассистент</b>\n\nРешение для управления встречами и задачами в <b>Telegram</b>,  использует возможности искусственного интеллекта и блокчейн-технологий <b>TON (The Open Network)</b> для создания эффективной и прозрачной системы взаимодействия пользователей. \n\nЭто функция <b>"Бортовой журнал"</b> — первый шаг в создании персонального цифрового аватара. \n\nНаше видение заключается в создании умного помощника, который не только записывает и анализирует встречи, но и активно помогает в управлении задачами, делегировании и планировании не выходя из телеграм.`;
// 	const message_two =
// 		`🌟 Добро пожаловать в мир наших удивительных ботов по обучению искусственному интеллекту, <b>JavaScript, TypeScript, React, Python и Tact! 🤖💡</b>\n\n🔍 Наши боты предлагают уникальную возможность заработать наш токен знаний $IGLA, погружаясь в мир новых технологий и углубляясь в востребованные навыки. 🚀\n\n💼 В отличие от других кликеров, наши боты позволяют пользователям проводить время с пользой, обучаясь навыкам, которые значительно повысят вашу профессиональную ценность на рынке труда.\n\n📚 Не упустите шанс улучшить свои знания и навыки, становясь более востребованным специалистом в сфере IT!\n\nПрисоединяйтесь к нам и начните свое преображение <b>прямо сейчас</b>!`;
// 	const telegram_id = ctx.from?.id;
// 	if (!telegram_id) throw new Error("No telegram id");
// 	const chatMember = await botNeuroCalls.api.getChatMember(chatId, telegram_id);
// 	const isAdmin = chatMember.status === "administrator" ||
// 		chatMember.status === "creator";
// 	if (!isAdmin) {
// 		await ctx.reply(
// 			lang
// 				? "У вас нет прав администратора для выполнения этого действия."
// 				: "You do not have admin rights to perform this action.",
// 		);
// 		return;
// 	}

// 	try {
// 		await botNeuroCalls.api.sendVideo(chatId, videoUrl(lang), {
// 			caption: message,
// 			parse_mode: "HTML",
// 		});
// 		await ctx.reply(
// 			lang
// 				? "Сообщение с видео отправлено в канал."
// 				: "Message with video sent to the channel.",
// 		);
// 	} catch (error) {
// 		console.error("Failed to send message with video to the channel:", error);
// 		await ctx.reply(
// 			lang
// 				? "Не удалось отправить сообщение с видео в канал."
// 				: "Failed to send message with video to the channel.",
// 		);
// 	}
// });

botNeuroCalls.command("avatar", async (ctx) => {
	if (!ctx.from) throw new Error("User not found");
	await checkAndUpdate(ctx)
	await ctx.replyWithChatAction("typing");
	const lang = await isRu(ctx)
	await ctx.reply(
		`${lang ? "Пришли текст" : "Send text"}`,
		{
			reply_markup: {
				force_reply: true,
			},
		},
	);
	return;
});

botNeuroCalls.command("getchatid", async (ctx) => {
	await checkAndUpdate(ctx)
	await ctx.replyWithChatAction("typing");
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	const chat_id = ctx.message?.chat?.id;
	await ctx.reply(lang ? `🆔 Текущий ID чата: ${chat_id}` : `🆔 Current chatID: ${chat_id}`);
	return
});

botNeuroCalls.command("soul", async (ctx) => {
	await checkAndUpdate(ctx)
	await ctx.replyWithChatAction("typing");
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	console.log("soul");
	await ctx.reply(lang ? "Чтобы наполнить вашего аватара душой, нажмите кнопку ниже" : "To fill your avatar's soul, click the button below", {
		reply_markup: {
			inline_keyboard: [[{
				text: lang ? "Создать душу" : "Create soul",
				callback_data: "create_soul",
			}]],
		},
	});
	return;
});

// Обработчик команды "start"
botNeuroCalls.command("start", async (ctx) => {
	await checkAndUpdate(ctx)
	await ctx.replyWithChatAction("typing");
	const lang = await isRu(ctx);

	const params = ctx?.message?.text && ctx?.message?.text.split(" ")[1];

	const message = ctx.update.message;
	const username = message?.from?.username;
	const telegram_id = message?.from?.id.toString();
	const language_code = message?.from?.language_code;
	if (!ctx.from) throw new Error("User not found");
	console.log(await isRu(ctx), "isRu")

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
									await startIzbushka(ctx);
									return;
								}
							} else {
								const { isUserExist, user } = await checkAndReturnUser(
									telegram_id,
								);
								if (isUserExist && user?.inviter) {
									await ctx.replyWithChatAction("typing");
									const { izbushka } = await getSelectIzbushkaId(
										select_izbushka,
									);

									if (
										izbushka && user && first_name &&
										user.telegram_id && izbushka.workspace_id
									) {
										const passport_user: PassportUser = {
											user_id: user.user_id,
											workspace_id: izbushka.workspace_id,
											room_id: izbushka.room_id,
											username,
											first_name,
											last_name,
											chat_id: user.telegram_id,
											type: "room",
											is_owner: false,
											photo_url: user.photo_url || null,
										};

										const isPassportExist = await checkPassportByRoomId(
											user.user_id,
											izbushka.room_id,
											"room",
										);

										if (!isPassportExist) {
											await setPassport(passport_user);
										}

										if (select_izbushka && telegram_id) {
											await setSelectedIzbushka(
												telegram_id,
												select_izbushka,
											);
										}

										await startIzbushka(ctx);
										return;
									} else {
										const textError = `${
											lang
												? "🤔 Ошибка: getSelectIzbushkaId."
												: "🤔 Error: getSelectIzbushkaId."
										}\n${JSON.stringify(izbushka)}`;
										await ctx.reply(
											textError,
										);
										throw new Error(textError);
									}
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
						"neuro_calls_bot (select_izbushka && inviter)",
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
const isSubscription = await checkSubscription(
		ctx,
		ctx.from?.id,
		chatIdSubscription(lang)
	);
	if (!isSubscription) {
		await ctx.reply(lang ? "Вы не подписаны на канал. Чтобы продолжить, нужно подписаться 👁‍🗨" : "You are not subscribed to the channel. To continue, you need to subscribe to the channel 👁‍🗨",
			{
				reply_markup: { inline_keyboard: [
					[{ text: lang ? "👁‍🗨 Подписаться" : "👁‍🗨 Subscribe", url: lang ? "https://t.me/neurocalls_blog" : "https://t.me/neurocalls_en_blog" }],
				] }
				}
			);
			return;
		}
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
					"neuro_calls_bot (select_izbushka && inviter)",
					JSON.stringify(error),
				);
				throw new Error("Error: checkAndReturnUser.");
			}
		}
	}
});

botNeuroCalls.command("buy", async (ctx) => {
	await checkAndUpdate(ctx)
	const lang = await isRu(ctx)
	ctx.reply(lang ? `<b>🚀 НейроСтарт - 432 ⭐️ в месяц</b>
Чат с воспоминаниями, задачами, транскрибацией диалогов + 1 видеозал GPT, 3 часа записи, ассистент гуру искусственного интеллекта.
	
<b>🏢 НейроБаза - Групповая сессия для начинающих - 4754 ⭐️ в месяц</b>
Все в Start + функции искусственного интеллекта, 3-часовой видеозал, 18-часовая запись.
	
<b>💼 НейроОфис - Групповая сессия для продвинутых - цена договорная</b>
Нейро-офис для вашей компании с надежным и дружелюбным магистром, обученным работе с вашими данными.`
	 : `<b>🚀 NeuroStart - 432 ⭐️ per month</b>
Chat with memories + GPT 1 video room, 3 hours rec, AI guru assistant.
	 
<b>🏢 NeuroBasic - Group session for beginners - 4754 ⭐️ per month</b>
Everything in Start + AI functions, 3 hour video room, 18 hour rec.
	 
<b>💼 NeuroOffice - Group session for advanced users - custom per month</b>
Neuro-office for your company with a safe and friendly llm trained on your data.`, {
		reply_markup: {
			inline_keyboard: [[{ text: lang ? "🚀 НейроСтарт" : "🚀 NeuroStart", callback_data: "buy_neurostart" }], [{ text: lang ? "🏢 НейроБаза" : "NeuroBasic", callback_data: "buy_neurobasic" }], [{ text: lang ? "💼 НейроОфис" : "💼 NeuroOffice", callback_data: "buy_neurooffice" }]],
		},
		parse_mode: "HTML",
	})
	return;
});

botNeuroCalls.on("pre_checkout_query", (ctx) => {
	ctx.answerPreCheckoutQuery(true)
	return;
});

botNeuroCalls.on("message:successful_payment", async (ctx) => {
	await checkAndUpdate(ctx)
	const lang = await isRu(ctx)
	console.log("ctx 646(succesful_payment)", ctx)
	const level = ctx.message.successful_payment.invoice_payload
	if (!ctx.from?.username) throw new Error("No username");
	const user_id = await getUid(ctx.from.username)
	if (!user_id) throw new Error("No user_id");
	await sendPaymentInfo(user_id, level)
	const levelForMessage = level === "neurostart" ? lang ? "🚀 НейроСтарт" : "🚀 NeuroStart" : level === "neurobasic" ? lang ? "🏢 НейроБаза" : "🏢 NeuroBasic" : lang ? "💼 НейроОфис" : "💼 NeuroOffice"
	await ctx.reply(lang ? "🤝 Спасибо за покупку!" : "🤝 Thank you for the purchase!");
	const textToPost = lang ? `🪙 @${ctx.from.username} спасибо за покупку уровня ${levelForMessage}!` : `🪙 @${ctx.from.username} thank you for the purchase level ${levelForMessage}!`
	await ctx.api.sendMessage("-1001476314188", textToPost)
	await ctx.api.sendMessage("-1001729610573", textToPost)
	return;
});

botNeuroCalls.command("language", async (ctx) => {
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

botNeuroCalls.command("digital_avatar", async (ctx) => {
	await checkAndUpdate(ctx)
	await ctx.replyWithChatAction("typing");
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)

	await ctx.reply(
		lang ? "Создать цифрового аватара" : "Create digital avatar",
		{
			reply_markup: {
				inline_keyboard: [[{
					text: lang ? "Создать цифрового аватара" : "Create digital avatar",
					callback_data: "create_digital_avatar",
				}]],
			},
		},
	);
	return;
});

botNeuroCalls.command("text_to_speech", async (ctx) => {
	await checkAndUpdate(ctx)
	await ctx.replyWithChatAction("typing");
	const lang = await isRu(ctx)
	if (!ctx.from?.id) throw new Error("No user id");
	const isHaveVoiceId = await isVoiceId(ctx.from?.id.toString())
	console.log(isHaveVoiceId, "isHaveVoiceId")
	if (!isHaveVoiceId) {
		await ctx.reply(lang ? "🔮 Пожалуйста, для использованием /text_to_speech, введите /voice." : "🔮 Please enter /voice to use /text_to_speech.")
		return
	}
	const text = lang
		? "🔮 Пожалуйста, отправьте текст, который вы хотите преобразовать в голосовое сообщение."
		: "🔮 Please send the text you want to convert to a voice message.";

	await ctx.reply(text, {
		reply_markup: {
			force_reply: true,
		},
	});
	return;
});

botNeuroCalls.command("reset_voice", async (ctx) => {
	await checkAndUpdate(ctx)
	await ctx.replyWithChatAction("typing");
	const lang = await isRu(ctx)
	const telegram_id = ctx.from?.id.toString();

	if (!telegram_id) throw new Error("No telegram_id");

	const text = lang
		? "🔮 Голос твоего цифрового аватара был успешно сброшен, и теперь ты можешь создать новый."
		: "🔮 The voice of your digital avatar has been successfully reset, and now you can create a new one.";
	try {
		// Сбрасываем голос цифрового аватара
		await updateUser(telegram_id, { voice_id_synclabs: null });
		await ctx.reply(text)
	} catch (error) {
		await ctx.reply(
			lang
				? "🤔 Ошибка при сбросе голоса цифрового аватара."
				: "🤔 Error resetting digital avatar voice.",
		);
		await bugCatcherRequest(
			"neuro_calls_bot (reset_voice)",
			JSON.stringify(error),
		);
		throw new Error("Error resetting digital avatar voice.");
	}
});

botNeuroCalls.command("voice", async (ctx) => {
	await checkAndUpdate(ctx)
	console.log("voice");
	await ctx.replyWithChatAction("typing");
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	const text = lang
	  ? "🔮 Отправьте боту голосовое сообщение, чтобы создать цифрового аватара, который будет говорить вашим голосом."
	  : "🔮 Please send me a voice message, and I will use it to create a voice avatar that speaks in your own voice.";

	await ctx.reply(text, {
		reply_markup: {
			force_reply: true
		}
	});
	// await ctx.reply(lang ? "Чтобы использовать данную функцию, необходимо приобрести уровень НейроБаза 🏢" : "To use this function, you need to purchase the NeuroBasic level 🏢")
	return
});

botNeuroCalls.command("face", async (ctx) => {
	await checkAndUpdate(ctx)
	console.log("face");
	await ctx.replyWithChatAction("typing");
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	await ctx.reply(lang ? "Чтобы использовать данную функцию, необходимо приобрести уровень НейроБаза 🏢" : "To use this function, you need to purchase the NeuroBasic level 🏢")
	return
})

botNeuroCalls.command("model", async (ctx) => {
	await checkAndUpdate(ctx)
	console.log("model");
	await ctx.replyWithChatAction("typing");
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	// await ctx.reply(lang ? "Чтобы использовать данную функцию, необходимо приобрести уровень НейроБаза 🏢" : "To use this function, you need to purchase the NeuroBasic level 🏢")
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

// botNeuroCalls.command("top", async (ctx) => {
// 	await checkAndUpdate(ctx)
// 	console.log("top");
// 	await ctx.replyWithChatAction("typing");
// 	if (!ctx.from) throw new Error("User not found");
// 	const lang = await isRu(ctx)
// 	const top10Users = await getTop10Users();
// 	console.log(top10Users, "top10Users");
// 	const leaderboardText = top10Users.map((user, index) => {
// 		return `${index + 1}. ${user.username} - ${user.all} $IGLA`;
// 	}).join('\n');

// 	await ctx.reply(lang ? `Топ 10 пользователей:\n${leaderboardText}` : `Top 10 users:\n${leaderboardText}`);
// 	return
// })

botNeuroCalls.command("mode", async (ctx) => {
	await checkAndUpdate(ctx)
	console.log("mode");
	await ctx.replyWithChatAction("typing");
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx);
	await ctx.reply(`${lang ? "📳 Выберите режим общения с ИИ" : "📳 Select AI communication mode"}`, {
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: `🔥 ${lang ? "Чат с воспоминаниями" : "Chat with memories"}`,
						callback_data: "mode_memories",
					},
					 {
						text: `🔥 ${lang ? "Чистый GPT" : "Clean GPT"}`,
						callback_data: "mode_clean",
					},
				],
			],
		},
	});
	return
});

botNeuroCalls.on("message:voice", async (ctx) => {
	await checkAndUpdate(ctx)
	const voice = ctx.msg.voice;
	const lang = await isRu(ctx)
	console.log(voice, "voice");
	const fileId = voice.file_id;
	// Получаем файл голосового сообщения
	const file = await ctx.api.getFile(fileId);
	const filePath = file.file_path;
	const fileUrl = `https://api.telegram.org/file/bot${NEURO_CALLS}/${filePath}`;

	console.log(fileUrl, "fileUrl");
	// Отправляем файл в ElevenLabs для создания нового голоса
	const telegram_id = ctx.from?.id.toString();
	const username = ctx.from?.username;
	if (!username) throw new Error("No username");

	if (ctx.message.reply_to_message) {
		const originalMessageText = ctx.message.reply_to_message?.text
		if (originalMessageText?.includes("🔮 Отправьте боту голосовое сообщение, чтобы создать цифрового аватара, который будет говорить вашим голосом."
		|| "🔮 Please send me a voice message, and I will use it to create a voice avatar that speaks in your own voice.")) {
	const voiceId = await createVoiceSyncLabs({
		fileUrl,
		username
	});
	console.log(voiceId, "voiceId");
	if (voiceId) {
		await ctx.reply(lang ? `👁 Голос аватара успешно создан! Voice ID: ${voiceId}` : `👁 Avatar voice created successfully! Voice ID: ${voiceId}`);
		await updateUser(telegram_id, { voice_id_synclabs: voiceId });
	} else {
		await ctx.reply("Ошибка при создании голоса.");
		}
		}
	}
	return
});

botNeuroCalls.on("message:text", async (ctx: Context) => {
	await checkAndUpdate(ctx)
	if (ctx.message?.text?.startsWith("/")) return;
	await ctx.replyWithChatAction("typing");
	const inviter = ctx?.message?.text;
	const message = ctx.update.message;
	const language_code = message?.from?.language_code;
	const username = message?.from?.username;
	const telegram_id = message?.from?.id.toString();

	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)

	// Check if the message is a reply (if there is a reply_to_message)
	if (ctx?.message?.reply_to_message) {
		// Check if the original message text contains a specific text
		const query = ctx.message.text;
		const originalMessageText = ctx?.message?.reply_to_message?.caption
			? ctx?.message?.reply_to_message?.caption
			: ctx?.message?.reply_to_message?.text;

		if (
			originalMessageText?.includes(
				"🔮 Пожалуйста, отправьте текст, который вы хотите преобразовать в голосовое сообщение.",
			) ||
			originalMessageText?.includes(
				"🔮 Please send the text you want to convert to a voice message.",
			)
		) {
			await ctx.replyWithChatAction("record_voice");
			const telegram_id = ctx.from?.id.toString()
			if (!telegram_id) throw new Error("No telegram_id")
			const voice_id_synclabs = await getVoiceId(telegram_id)
			if (!voice_id_synclabs) {
				await ctx.reply(lang ? "🔮 Вы еще не присвоили голос аватару. Либо дождитесь пока вам придет ответ о том что ваш Voice ID успешно присвоен.	" : "🔮 You haven't assigned a voice to your avatar yet. Or wait for an answer about your Voice ID being successfully assigned.")
				return
			}
			if (!query) throw new Error("No query")
			const speech = await createSpeech(query, voice_id_synclabs)
			console.log(speech, "speech")
			return;
		}
		if (ctx?.message?.reply_to_message) {
			console.log(ctx);
			const originalMessageText = ctx?.message?.reply_to_message?.caption
				? ctx?.message?.reply_to_message?.caption
				: ctx?.message?.reply_to_message?.text;
			if (
				originalMessageText &&
				originalMessageText.includes(lang ? "Пришли текст" : "Send text")
			) {
				const text = ctx?.message?.text || "";

				if (!text && !message?.from?.id) throw new Error("No text or user_id");
				if (!username) throw new Error("No username");
				if (!telegram_id) throw new Error("No telegram_id");

				const { user } = await checkAndReturnUser(
					telegram_id,
				);

				if (!user) throw new Error("User not found");

				await createVideo({
					avatar_id: user?.avatar_id,
					voice_id: user?.voice_id,
					text,
					user_id: user.user_id,
				});
				await ctx.reply(
					`${
						language_code === "ru"
							? "Ожидайте, скоро вам придет видео"
							: "Wait, your video is ready"
					}`,
				);
				return;
			}

			if (
				ctx.from && originalMessageText && originalMessageText.includes(
					lang
						? "Пожалуйста, укажите ваше avatar_id"
						: "Please, specify your avatar_id:",
				)
			) {
				await updateUser(ctx.from.id.toString(), { avatar_id: query });
				await ctx.reply(
					lang
						? "Пожалуйста, укажите ваше voice_id:"
						: "Please, specify your voice_id:",
					{
						reply_markup: { force_reply: true },
					},
				);
				return;
			}

			if (
				ctx.from && originalMessageText && originalMessageText.includes(
					lang
						? "Пожалуйста, укажите ваше voice_id"
						: "Please, specify your voice_id:",
				)
			) {
				await updateUser(ctx.from.id.toString(), { voice_id: query });
				await ctx.reply(
					lang
						? "Ваш Digital Avatar создан!"
						: "Your Digital Avatar is created!",
				);
				return;
			}

			if (
				ctx.from && originalMessageText && originalMessageText.includes(
					lang
						? "Пожалуйста, укажите ваше audio_id"
						: "Please, specify your audio_id:",
				)
			) {
				await updateUser(ctx.from.id.toString(), { audio_id: query });
				await ctx.reply(
					lang
						? "Пожалуйста, укажите ваше avatar_id:"
						: "Please, specify your avatar_id:",
					{
						reply_markup: { force_reply: true },
					},
				);
				return;
			}

			if (
				ctx.from && originalMessageText && originalMessageText.includes(
					lang
						? "Пожалуйста, укажите ваше место работы:"
						: "Please, specify your company name:",
				)
			) {
				await updateUser(ctx.from.id.toString(), { company: query });
				await ctx.reply(
					lang
						? "Пожалуйста, укажите вашу должность:"
						: "Please, specify your designation:",
					{
						reply_markup: { force_reply: true },
					},
				);
				return;
			}

			if (
				ctx.from && originalMessageText && originalMessageText.includes(
					lang
						? "Пожалуйста, укажите вашу должность:"
						: "Please, specify your designation:",
				)
			) {
				await updateUser(ctx.from.id.toString(), { position: query });
				await ctx.reply(
					lang
						? "Пожалуйста, укажите ваши навыки и интересы:"
						: "Please, specify your skills and interests:",
					{
						reply_markup: { force_reply: true },
					},
				);
				return;
			}

			if (
				ctx.from && originalMessageText && originalMessageText.includes(
						lang
						? "Пожалуйста, укажите ваши навыки и интересы:"
						: "Please, specify your skills and interests:",
				)
			) {
				await updateUser(ctx.from.id.toString(), { designation: query });
				await ctx.reply(
					lang
						? "Спасибо за предоставленную информацию!"
						: "Thank you for the provided information!",
				);
				return;
			}
		}

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
		const mode = await getMode(ctx.from.id.toString());
		
		if (mode === "memories") {
			const id_array = await getPassportsTasksByUsername(username);
			if (query && id_array && id_array.length > 0) {
			const { ai_content, tasks } = await getAiFeedbackFromSupabase({
				query,
				id_array,
				username,
				language_code,
			});

			let tasksMessage = `📝 ${lang ? "Задачи:\n" : "Tasks:\n"}`;
			tasks.forEach((task) => {
				tasksMessage += `\n${task.title}\n${task.description}\n`;
			});

			await ctx.reply(`${ai_content}\n\n${tasksMessage}`, {
				parse_mode: "Markdown",
			});
			return;
		} else {
			const textError = `${
				lang
					? "🤔 Ошибка: не удалось загрузить задачи."
					: "🤔 Error: failed to load tasks."
			}`;
			await ctx.reply(textError);
			return;
		}
	} else if (mode === "clean") {
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
}
	return
});

botNeuroCalls.on("callback_query:data", async (ctx) => {
	await checkAndUpdate(ctx)
	await ctx.replyWithChatAction("typing");
	if (!ctx.from) throw new Error("User not found");
	const lang = await isRu(ctx)
	const callbackData = ctx.callbackQuery.data;

	const telegram_id = ctx.callbackQuery.from.id.toString();
	const username = ctx.update && ctx.update.callback_query.from.username;

	await ctx.replyWithChatAction("typing");
	console.log(ctx);

	if (callbackData.startsWith("buy")) {
		if (callbackData.endsWith("neurostart")) {
			await ctx.replyWithInvoice(
				lang ? "🚀 НейроСтарт" : "🚀 NeuroStart",
				lang ? "Чат с воспоминаниями, задачами, транскрибацией диалогов + 1 видеозал GPT, 3 часа записи, ассистент гуру искусственного интеллекта." : "Chat with memories + GPT 1 video room, 3 hours rec, AI guru assistant.",
				"neurostart",
				"", // Оставьте пустым для цифровых товаров
				"XTR", // Используйте валюту Telegram Stars
				[{ label: "Цена", amount: 432 }],
			);
			return
		}
		if (callbackData.endsWith("neurobasic")) {
			await ctx.replyWithInvoice(
				lang ? "🏢 НейроБаза" : "🏢 NeuroBasic",
				lang ? "Все в Start + функции искусственного интеллекта, 3-часовой видеозал, 18-часовая запись." : "Everything in Start + AI functions, 3 hour video room, 18 hour rec.",
				"neurobasic",
				"", // Оставьте пустым для цифровых товаров
				"XTR", // Используйте валюту Telegram Stars
				[{ label: "Цена", amount: 4754 }], // Цена в центах (10.00 Stars)
			);
			return
		}
		if (callbackData.endsWith("neurooffice")) {
      await ctx.reply( lang ? "Чтобы узнать цену и оформить подписку, свяжитесь с @neurocalls 📞" : "To find out the price and subscribe, contact @neurocalls 📞")
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

	
	if (callbackData.startsWith("mode")) {
		const mode = callbackData.split("_")[1]
		await setMode(ctx.from.id.toString(), mode)
		const modeToReply = mode === "clean" ? lang ? "Чистый GPT" : "Clean GPT" : lang ? "Чат с воспоминаниями" : "Chat with memories"
		await ctx.reply(`${lang ? "Ваш режим: " : "Your mode: "}${modeToReply}`);
		return;
	}

	const handleRoomSelection = async (
		ctx: Context,
		rooms: RoomNode[],
		type: string,
	) => {
		try {
			if (rooms && rooms.length > 0) {
				const keyboard = rooms
					.filter((room: RoomNode) => room)
					.map((room: RoomNode) => ({
						text: room.name,
						callback_data: `select_izbushka_${room.id}`,
					}))
					.reduce(
						(
							acc: { text: string; callback_data: string }[][],
							curr: { text: string; callback_data: string },
							index: number,
						) => {
							const row = Math.floor(index / 1);
							acc[row] = acc[row] || [];
							acc[row].push(curr);
							return acc;
						},
						[],
					);

				await ctx.replyWithChatAction("typing");
				if (type === "neurostart") {
					const textStart = `🚀 ${
						lang
							? "Мои комнаты - это личные комнаты, где твои слова пишутся и задачи создаются."
							: "My rooms - private rooms where your words are written and tasks are created."
					}`;
					await ctx.reply(
						textStart,
						{
							reply_markup: { inline_keyboard: keyboard },
						},
					);
					return;
				} else if (type === "neurobasic") {
					const textBasic = `🏢 ${
						lang
							? "В гостях - это комнаты, в которые вас пригласил другой пользователь."
							: "In the guest - rooms where you were invited by another user."
					}`;
					await ctx.reply(
						textBasic,
						{
							reply_markup: { inline_keyboard: keyboard },
						},
					);
					return;
				} else if (type === "neurooffice") {
					const textOffice = `💼 ${
						lang
							? "Обучение - это комнаты, где обучение к мудрости тебя ведет."
							: "Learning - rooms where the training to wisdom guides you."
					}`;
					await ctx.reply(
						textOffice,
						{
							reply_markup: { inline_keyboard: keyboard },
						},
					);
					return;
				}
				return;
			} else {
				const textError = `${
					lang
						? "У вас нет комнат куда вас пригласили"
						: "You don't have any rooms where you were invited"
				}`;
				await ctx.reply(textError);
				return;
			}
		} catch (error) {
			const textError = `${
				lang ? "Ошибка при выборе комнаты" : "Error selecting the room"
			}`;
			await ctx.reply(textError, error);
			throw new Error(textError);
		}
	};

	if (callbackData === "neurostart") {
		const rooms = username && (await getRooms(username));
		rooms && await handleRoomSelection(ctx, rooms, "neurostart");
	} else if (callbackData === "neurobasic") {
		const rooms = username && (await getRoomsWater(username));
		rooms && await handleRoomSelection(ctx, rooms, "neurobasic");
	} else if (callbackData === "neurooffice") {
		const rooms = await getRoomsCopperPipes();
		rooms && await handleRoomSelection(ctx, rooms, "neurooffice");
	}

	if (callbackData === "name_izbushka") {
		try {
			const textQuestion = `${
				lang ? "Как назовем комнату?" : "How do we name the room?"
			}`;
			await ctx.reply(textQuestion, {
				reply_markup: {
					force_reply: true,
				},
			});
			return;
		} catch (error) {
			console.error(error);
			await bugCatcherRequest("neuro_calls_bot (name_izbushka)", error);
			throw new Error("neuro_calls_bot (name_izbushka)");
		}
	}

	if (callbackData === "show_izbushka") {
		const rooms = username && (await getRooms(username));
		// console.log(rooms, "rooms");
		try {
			if (Array.isArray(rooms)) {
				const textSelectRoom = `${lang ? "🏡 Выберите комнату" : "Select the room"}`;
				await ctx.reply(textSelectRoom, {
					reply_markup: {
						inline_keyboard: rooms
							.filter((room: RoomNode) => room)
							.map((room: RoomNode) => ({
								text: room.name,
								callback_data: `select_izbushka_${room.id}`,
							}))
							.reduce(
								(
									acc: { text: string; callback_data: string }[][],
									curr,
									index,
								) => {
									const row = Math.floor(index / 1);
									acc[row] = acc[row] || [];
									acc[row].push(curr);
									return acc;
								},
								[],
							),
					},
				});
			} else {
				const textError = `${
					lang ? "Ошибка: не удалось загрузить комнату." : "Error: failed to load room."
				}`;
				await ctx.reply(textError);
				await bugCatcherRequest("neuro_calls_bot (show_izbushka)", ctx);
				throw new Error("neuro_calls_bot (show_izbushka)");
			}
			return;
		} catch (error) {
			console.error("error show_izbushka", error);
			await bugCatcherRequest("neuro_calls_bot (show_izbushka)", ctx);
			throw new Error("neuro_calls_bot (show_izbushka)");
		}
	}

	if (callbackData.includes("select_izbushka")) {
		try {
			const select_izbushka = callbackData.split("_")[2];

			if (select_izbushka) {
				telegram_id && await setSelectedIzbushka(telegram_id, select_izbushka);
			}
			const textForInvite = `${
				lang
					? '📺 Что ж, путник дорогой, дабы трансляцию начать, нажми кнопку "Spaces" смелее и веселись, ибо все приготовлено к началу твоего путешествия по цифровым просторам!\n\n🌟 Поделись ссылкой, чтобы встретиться в комнате.'
					: 'What, traveler, to start the broadcast, press the "Spaces" button more joyfully and laugh, because all is prepared for the start of your journey through the digital spaces! \n\n🌟 Share the following link with the person you want to meet in the room.'
			}`;
			await ctx.reply(
				textForInvite,
			);
			await delay(500);

			const textInvite = `${
				lang
					? `🏰 **Приглашение в НейроЗвонки** 🏰\n[Нажми на ссылку чтобы присоединиться!](https://t.me/${botUsernameNeuroCalls}?start=${select_izbushka}_${telegram_id})\n\nПосле подключения к боту нажми на кнопку **Spaces**, чтобы войти на видео встречу.\n[Инструкция подключения](https://youtube.com/shorts/YKG-1fdEtAs?si=ojKvK2DfPsZ0mbd5)`
					: `Invitation to the NeuroCalls\n[Press the link to join!](https://t.me/${botUsernameNeuroCalls}?start=${select_izbushka}_${telegram_id})\n\nAfter connecting to the bot, press the **Spaces** button to enter the video meeting.\n[Instruction for connecting](https://youtube.com/shorts/YKG-1fdEtAs?si=ojKvK2DfPsZ0mbd5)`
			}`;

			await ctx.reply(textInvite, { parse_mode: "Markdown" });

			return;
		} catch (error) {
			await bugCatcherRequest("neuro_calls_bot (select_izbushka)", error);
			throw new Error("neuro_calls_bot (select_izbushka)");
		}
	}
return
});

await botNeuroCalls.api.setMyCommands([
	{
		command: "/start",
		description: "🚀 Start chatting with NeuroCalls",
	},
	// {
	//   command: "/avatar",
	//   description: "Create a digital avatar",
	// },
	{
		command: "/language",
		description: "🌐 Select language",
	},
	{
		command: "/soul",
		description: "🆔 Fill your avatar's soul",
	},
	// {
	// 	command: "/face",
	// 	description: "🤓 Add avatar's face",
	// },
	{
		command: "/mode",
		description: "📳 Select AI communication mode",
	},
	{
		command: "/model",
		description: "🧠 Add avatar's model",
	},
	{
		command: "/text_to_speech",
		description: "🔊 Convert text to speech",
	},
	{
		command: "/reset_voice",
		description: "🔊 Reset avatar's voice",
	},
	{
		command: "/voice",
		description: "🎤 Add avatar's voice",
	},
	{
		command: "/buy",
		description: "🛒 Buy subscription",
	},
	// {
	//   command: "/reset_voice",
	//   description: "Reset voice ai-avatar",
	// },
	{
		command: "/getchatid",
		description: "🆔 Get chat ID",
	},
]);

botNeuroCalls.catch((err) => {
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

		return await handleUpdateNeuroCalls(req);
	} catch (err) {
		console.error(err);
	}
});

// const textInvite = `${
//   isRu
//     ? `🏰 **Приглашение в Тридевятое Царство** 🏰\n\n[Нажми на ссылку чтобы присоединиться!](https://t.me/${botUsernameNeuroCalls}?start=${select_izbushka}_${username})\n\nПосле подключения к боту нажми на кнопку **Izbushka**, чтобы войти на видео встречу.`
//     : `Invitation to the **DAO 999 NFT**\n\nPress the link to join!](https://t.me/${botUsernameNeuroCalls}?start=${select_izbushka}_${username})\n\nAfter connecting to the bot, press the **Izbushka** button to enter the video meeting.`
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

// supabase functions deploy neuro-calls --no-verify-jwt
