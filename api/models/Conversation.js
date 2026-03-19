const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    clientId:  { type: String, index: true },   // browser-generated UUID — isolates conversations per client
    title: { type: String, required: true, default: 'New conversation' },
    // Full Claude API message history (for resuming context)
    apiMessages: [mongoose.Schema.Types.Mixed],
    // Simplified messages for UI display
    uiMessages: [
      {
        id: String,
        role: { type: String, enum: ['user', 'assistant'] },
        content: String,
        isError: Boolean,
        timestamp: Date
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);
