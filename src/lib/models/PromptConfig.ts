import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExample {
  user: string;
  ai: string;
}

export interface IPromptConfig extends Document {
  systemInstruction: string;
  examples: IExample[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PromptConfigSchema = new Schema<IPromptConfig>(
  {
    systemInstruction: {
      type: String,
      required: true,
    },
    examples: [
      {
        user: String,
        ai: String,
      },
    ],
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const PromptConfig: Model<IPromptConfig> =
  (mongoose.models.PromptConfig as Model<IPromptConfig>) ||
  mongoose.model<IPromptConfig>('PromptConfig', PromptConfigSchema);

export default PromptConfig;
