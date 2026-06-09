import mongoose from 'mongoose';

const PromptConfigSchema = new mongoose.Schema({
  systemInstruction: {
    type: String,
    required: true,
  },
  examples: [{
    user: String,
    ai: String,
  }],
  active: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

export default mongoose.models.PromptConfig || mongoose.model('PromptConfig', PromptConfigSchema);
