const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientEmail: { type: String, required: true },
  recipientName: { type: String },
  senderEmail: { type: String },
  senderName: { type: String },
  type: { type: String, enum: ['Sent', 'New Memo', 'Acknowledge'], required: true },
  memoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Memo' }, // Add this line for memo reference
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
