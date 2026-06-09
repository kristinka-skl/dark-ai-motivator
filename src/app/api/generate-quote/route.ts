import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import connectToDatabase from '@/lib/db';
import PromptConfig from '@/lib/models/PromptConfig';
import Quote from '@/lib/models/Quote';

export const dynamic = 'force-dynamic';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang') || 'uk';

  try {
    await connectToDatabase();

    let dbConfig = await PromptConfig.findOne({ active: true });

    let systemInstruction = "";
    let examples = [];

    if (!dbConfig) {
      if (lang === 'en') {
        systemInstruction = "You are a brutal but supportive motivator. Your style is metal, rock, dark aesthetics. You speak sharply, frankly, but inspiringly. Use metaphors of fire, steel, darkness, and struggle. Do not be banal. Answer in 1-2 sentences. Speak directly to the user.";
        examples = [
          { user: "Give me motivation", ai: "Forge your character until it becomes harder than steel. The darkness around you is just a background for your inner fire." },
          { user: "It's hard to continue", ai: "Pain is just weakness leaving your body. Stand up and keep going, because the fire won't ignite itself." }
        ];
      } else {
        systemInstruction = "Ти — брутальний, але підтримуючий мотиватор. Твій стиль — метал, рок, темна естетика. Ти говориш різко, відверто, але надихаюче. Використовуй метафори вогню, сталі, темряви та боротьби. Не будь банальним. Відповідай 1-2 реченнями. Звертайся на ти.";
        examples = [
          { user: "Дай мотивацію", ai: "Куй свій характер, поки він не стане твердішим за сталь. Темрява навколо — це лише фон для твого внутрішнього вогню." },
          { user: "Мені складно продовжувати", ai: "Біль — це лише слабкість, яка покидає твоє тіло. Вставай і йди далі, бо вогонь сам себе не розпалить." }
        ];
      }
    } else {
      systemInstruction = dbConfig.systemInstruction;
      examples = dbConfig.examples || [];

      if (lang === 'en') {
        systemInstruction += "\n\nCRITICAL REQUIREMENT: Regardless of the language used in the examples or instructions above, your final response MUST be written ENTIRELY in English.";
      } else {
        systemInstruction += "\n\nCRITICAL REQUIREMENT: Regardless of the language used in the examples or instructions above, your final response MUST be written ENTIRELY in Ukrainian.";
      }
    }

    const contents = [];
    if (examples && examples.length > 0) {
      for (const example of examples) {
        contents.push({ role: 'user', parts: [{ text: example.user }] });
        contents.push({ role: 'model', parts: [{ text: example.ai }] });
      }
    }

    const finalPromptText = lang === 'en'
      ? "Give me a new portion of brutal motivation, do not repeat the previous ones."
      : "Дай нову порцію брутальної мотивації, не повторюй попередні.";

    contents.push({ role: 'user', parts: [{ text: finalPromptText }] });

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.9,
      }
    });

    const generatedText = response.text?.trim();

    if (!generatedText) {
      throw new Error("Отримана порожня відповідь від AI");
    }

    try {
      await Quote.create({ text: generatedText, mood: 'dark', lang: lang });
    } catch (dbError) {
      console.error("Не вдалося зберегти цитату в БД:", dbError);
    }

    return NextResponse.json({ quote: generatedText });
  } catch (error: any) {
    console.error("Помилка генерації (можливо ліміт API):", error?.message || error);

    try {
      await connectToDatabase();
      const query = { lang: lang };
      const count = await Quote.countDocuments(query);

      if (count > 0) {
        const random = Math.floor(Math.random() * count);
        const randomQuote = await Quote.findOne(query).skip(random);
        if (randomQuote) {
          return NextResponse.json({ quote: randomQuote.text, fallback: true });
        }
      }
    } catch (fallbackError) {
      console.error("Помилка БД під час fallback:", fallbackError);
    }

    let timeHintUK = "пізніше";
    let timeHintEN = "later";

    if (error?.message?.includes("PerDay")) {
      timeHintUK = "завтра";
      timeHintEN = "tomorrow";
    } else {
      const retryMatch = error?.message?.match(/retry in ([\d\.]+)s/i);
      if (retryMatch && retryMatch[1]) {
        const secs = Math.ceil(parseFloat(retryMatch[1]));
        if (secs < 60) {
          timeHintUK = `через ${secs} сек`;
          timeHintEN = `in ${secs} sec`;
        } else {
          const mins = Math.ceil(secs / 60);
          timeHintUK = `через ~${mins} хв`;
          timeHintEN = `in ~${mins} min`;
        }
      }
    }

    const errorMsgUK = `Навіть вогню потрібен час, щоб розгорітися знову. Наступна іскра буде доступна ${timeHintUK}.`;
    const errorMsgEN = `Even fire needs time to reignite. The next spark will be available ${timeHintEN}.`;

    const finalErrorMsg = lang === 'en' ? errorMsgEN : errorMsgUK;

    return NextResponse.json({ quote: finalErrorMsg, fallback: true });
  }
}
