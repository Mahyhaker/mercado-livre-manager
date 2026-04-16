const mongoose = require('mongoose');

const syncLogSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
  action: String,
  requestPayload: Object,
  responsePayload: Object,
  status: String,
  errorMessage: String
}, { timestamps: true });

module.exports = mongoose.model('SyncLog', syncLogSchema);