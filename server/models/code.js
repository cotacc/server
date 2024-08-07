const mongoose = require('mongoose');

const codeSchema = new mongoose.Schema({
  code:{type:String,required:true},
  role:{type:Number,required:true},
  recipient:{type:String,required:true},
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const code = mongoose.model('Code', codeSchema);

module.exports = code;
