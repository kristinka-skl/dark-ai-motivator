require('dotenv').config({ path: '.env.local' });
const { GoogleGenAI } = require('@google/genai');

async function testModel() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
  for (const m of models) {
    try {
      const response = await ai.models.generateContent({
          model: m,
          contents: [{ role: 'user', parts: [{ text: "Hello" }] }],
      });
      console.log(`Success with ${m}:`, response.text.substring(0, 20));
    } catch (e) {
      console.error(`Error with ${m}:`, e.message.substring(0, 150));
    }
  }
}
testModel();
