const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema;

const memoSchema = new mongoose.Schema({
  sender: { type: String },
  senderEmail: { type: String },
  title: { type: String },
  content: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  startAt: { type: Date, default: Date.now },
  endAt: { type: Date, default: Date.now },
  recipients: [
    {
      useremail: { type: String },
      username: { type: String },
      read: { type: Boolean, default: false },
      acknowledge: { type: Boolean, default: false },
      googlecalendar:{ type: Boolean, default: false }
    }
  ],
  fileId: { type: ObjectId } // Attribute for file ID
}, { timestamps: true });

const Memo = mongoose.model('Memo', memoSchema);

module.exports = Memo;
