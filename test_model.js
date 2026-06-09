require('dotenv').config({ path: '.env.local' });
const { GoogleGenAI } = require('@google/genai');

async function testModel() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: "Hello" }] }],
    });
    console.log("Success with 2.0-flash:", response.text);
  } catch (e) {
    console.error("Error with 2.0-flash:", e.message);
  }
}
testModel();
