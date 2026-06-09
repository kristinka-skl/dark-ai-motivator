require('dotenv').config({ path: '.env.local' });
const { GoogleGenAI } = require('@google/genai');

async function checkModels() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const models = await ai.models.list();
    for await (const model of models) {
        if (model.name.includes("flash")) {
            console.log(`Model: ${model.name}`);
        }
    }
  } catch (e) {
    console.error(e);
  }
}
checkModels();
