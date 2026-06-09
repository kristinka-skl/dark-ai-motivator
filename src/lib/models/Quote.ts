import mongoose from 'mongoose';

const QuoteSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  mood: {
    type: String,
    default: 'dark',
  }
}, { timestamps: true });

export default mongoose.models.Quote || mongoose.model('Quote', QuoteSchema);
