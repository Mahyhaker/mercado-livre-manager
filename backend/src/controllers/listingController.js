const Listing = require('../models/Listing');
const Token = require('../models/Token');
const SyncLog = require('../models/SyncLog');
const {
  createRemoteItem,
  updateRemoteItem,
  getRemoteItem
} = require('../services/mercadoLivreService');
const {
  validateListingBeforeSync
} = require('../services/listingValidationService');

async function getConnectedUserId() {
  const latestToken = await Token.findOne().sort({ updatedAt: -1 });

  if (!latestToken) {
    throw new Error('Nenhuma conta do Mercado Livre está conectada');
  }

  return latestToken.mlUserId;
}

function buildReconcileResult(localListing, remoteItem) {
  const differences = [];

  if (String(localListing.title || '') !== String(remoteItem.title || '')) {
    differences.push({
      field: 'title',
      local: localListing.title,
      remote: remoteItem.title
    });
  }

  if (Number(localListing.price || 0) !== Number(remoteItem.price || 0)) {
    differences.push({
      field: 'price',
      local: localListing.price,
      remote: remoteItem.price
    });
  }

  if (
    Number(localListing.availableQuantity || 0) !==
    Number(remoteItem.available_quantity || 0)
  ) {
    differences.push({
      field: 'availableQuantity',
      local: localListing.availableQuantity,
      remote: remoteItem.available_quantity
    });
  }

  if (String(localListing.status || '') !== String(remoteItem.status || '')) {
    differences.push({
      field: 'status',
      local: localListing.status,
      remote: remoteItem.status
    });
  }

  return differences;
}

async function createListing(req, res, next) {
  try {
    const {
      title,
      price,
      availableQuantity,
      categoryId,
      pictureUrl,
      attributes
    } = req.body;

    const normalizedTitle = title.trim();

    const existing = await Listing.findOne({
      title: normalizedTitle,
      mlUserId: 'local-user'
    });

    if (existing) {
      return res.status(409).json({
        message: 'Já existe um anúncio com esse título'
      });
    }

    const listing = await Listing.create({
      title: normalizedTitle,
      price,
      availableQuantity,
      categoryId,
      pictureUrl,
      attributes: Array.isArray(attributes) ? attributes : [],
      mlUserId: 'local-user',
      syncStatus: 'pending'
    });

    await SyncLog.create({
      listingId: listing._id,
      action: 'create_local',
      status: 'success',
      source: 'local',
      requestPayload: req.body,
      responsePayload: listing.toObject(),
      message: 'Anúncio criado localmente'
    });

    res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
}

async function getListings(req, res, next) {
  try {
    const { status, search, minPrice, maxPrice } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) filter.title = { $regex: search, $options: 'i' };

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const listings = await Listing.find(filter).sort({ createdAt: -1 });
    res.json(list
