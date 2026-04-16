const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema(
  {
    mlUserId: {
      type: String,
      required: true,
      unique: true
    },
    accessToken: {
      type: String,
      required: true
    },
    refreshToken: {
      type: String,
      required: true
    },
    expiresIn: {
      type: Number,
      default: 0
    },
    tokenType: {
      type: String,
      default: ''
    },
    scope: {
      type: String,
      default: ''
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastRefreshAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Token', tokenSchema);