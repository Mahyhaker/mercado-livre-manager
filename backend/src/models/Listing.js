const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    mlItemId: {
      type: String,
      unique: true,
      sparse: true
    },
    mlUserId: {
      type: String,
      default: 'local-user'
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    categoryId: {
      type: String,
      default: ''
    },
    pictureUrl: {
      type: String,
      default: ''
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      default: 'draft'
    },
    syncStatus: {
      type: String,
      enum: ['pending', 'synced', 'conflict', 'error'],
      default: 'pending'
    },
    localVersion: {
      type: Number,
      default: 0
    },
    lastSyncedAt: {
      type: Date,
      default: null
    },
    lastMarketplaceStatus: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Listing', listingSchema);