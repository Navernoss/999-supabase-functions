import { model_ai } from "../constants.ts"
import { openai } from "./client.ts"


export async function createQuestion(
  language_code: string,
) {
  try {
  const systemPrompt = `Пожалуйста, создайте очень сложный вопрос с множественным выбором, связанный со следующими темами JavaScript для теста, а также Правильный ответ и три неправильных ответа, Пояснение к правильному ответу или почему другие варианты неверны. 0-50 символов. Ответ дай в формате JSON. Эти темы следующие:

  * Привет, Мир
  * Комментарии
  * Переменные
  * Типы данных
  * Ошибки
  * Струны
  * Цифры
  * Правда или ложь?
  * Функции
  * Объекты
  * Преобразование и приведение типов
  * Область Действия Блока
  * Параметры по умолчанию
  * Регулярные выражения
  * Конструкция корпуса переключателя
  * Циклы
  * Массивы
  * Отдых и распространение
  * карта, фильтр, уменьшение
  * Деструктурирование
  * Закрытие
  * Функции более высокого порядка
  * Классы
  * Запрет на "это"
  * Цикл событий
  * Обещание
  * Fetch API
  * Асинхронное Ожидание
  * Импорт Экспорт
  
  Формат твоего ответа:
  {"question": "question",
  "a": "first option",
  "b": "second option",
  "c": "third option",
  "correct": "номер правильного ответа. Начинаем с 0. Если a, то 0, b, то 1, если c, то 2",
    "explanation": "Пояснение к правильному ответу или почему другие варианты неверны. 0-50 символов"
  }
  
  Вариантов ответа всегда 3: a,b,c. Ответь на языке ${language_code}.
  `

  const chatCompletion = await openai.chat.completions.create({
    messages: [ {
      role: "system",
      content: systemPrompt,
    }, {
      role: "assistant", 
      content: "Ответ дай в формате JSON, без лишнего форматирования. Не используй markdown"
    }],
    model: model_ai,
    stream: false,
    temperature: 0.1,
  })

  console.log(chatCompletion)

  return chatCompletion.choices[0].message.content;
  } catch (e) {
    throw new Error("Error_createQuestion",e)
  }
}
