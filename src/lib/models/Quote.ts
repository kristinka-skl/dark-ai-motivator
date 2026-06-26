import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuote extends Document {
  text: string;
  mood: string;
  lang: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuoteSchema = new Schema<IQuote>(
  {
    text: {
      type: String,
      required: true,
    },
    mood: {
      type: String,
      default: 'dark',
    },
    lang: {
      type: String,
      required: true,
      enum: ['uk', 'en'],
      default: 'uk',
    },
  },
  { timestamps: true }
);

const Quote: Model<IQuote> =
  (mongoose.models.Quote as Model<IQuote>) ||
  mongoose.model<IQuote>('Quote', QuoteSchema);

export default Quote;
