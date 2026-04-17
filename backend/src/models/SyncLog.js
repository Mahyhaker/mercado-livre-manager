const mongoose = require('mongoose');

const syncLogSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true
    },
    action: {
      type: String,
      enum: ['create_remote', 'update_remote', 'reconcile', 'delete_local', 'create_local', 'update_local'],
      required: true
    },
    status: {
      type: String,
      enum: ['success', 'error', 'warning'],
      required: true
    },
    requestPayload: {
      type: Object,
      default: null
    },
    responsePayload: {
      type: Object,
      default: null
    },
    message: {
      type: String,
      default: ''
    },
    source: {
      type: String,
      enum: ['system', 'mercado_livre', 'local'],
      default: 'system'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SyncLog', syncLogSchema);
