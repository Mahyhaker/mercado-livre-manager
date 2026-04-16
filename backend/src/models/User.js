const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    mlUserId: {
      type: String,
      required: true,
      unique: true
    },
    nickname: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);