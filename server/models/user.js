const mongoose = require('mongoose');
const webtoken = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    maxlength: 100,
    required: [false, 'Please enter your name']
  },
  email: {
    type: String,
    unique: true,
    required: [false, "Please enter your email"],
    match: [
      /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i,
      "Please enter a valid email",
    ],
  },
  role: {
    type: Number,
    default: 0,
  },
  department: {
    type: String,
  },
  picture: {
    type: String,
  }
}, { timestamps: true });

userSchema.methods.webtokenjwt = function() {
  return webtoken.sign(
    { id: this.id },
    process.env.JWT_SECRET,
    { expiresIn: '1h' } 
  );
};

const User = mongoose.model("User", userSchema);
module.exports = User;
