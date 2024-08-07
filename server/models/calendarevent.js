const mongoose = require('mongoose');

const calendareventSchema = new mongoose.Schema({
  useremail: { type: String, required: true },
  title: { type: String },
  description: { type: String, },
  startDateTime: { type: Date },
  endDateTime: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const calendarevent = mongoose.model('CalendarEvent', calendareventSchema);

module.exports = calendarevent;
