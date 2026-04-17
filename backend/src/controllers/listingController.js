const Listing = require('../models/Listing');
const Token = require('../models/Token');
const SyncLog = require('../models/SyncLog');
const {
  createRemoteItem,
  updateRemoteItem,
  getRemoteItem
} = require('../services/mercadoLivreService');

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
    res.json(listings);
  } catch (error) {
    next(error);
  }
}

async function getListingById(req, res, next) {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Anúncio não encontrado' });
    }

    res.json(listing);
  } catch (error) {
    next(error);
  }
}

async function updateListing(req, res, next) {
  try {
    const {
      title,
      price,
      availableQuantity,
      categoryId,
      pictureUrl,
      attributes
    } = req.body;

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Anúncio não encontrado' });
    }

    const normalizedTitle = title.trim();

    const duplicate = await Listing.findOne({
      _id: { $ne: req.params.id },
      title: normalizedTitle,
      mlUserId: 'local-user'
    });

    if (duplicate) {
      return res.status(409).json({
        message: 'Já existe outro anúncio com esse título'
      });
    }

    listing.title = normalizedTitle;
    listing.price = price;
    listing.availableQuantity = availableQuantity;
    listing.categoryId = categoryId;
    listing.pictureUrl = pictureUrl || '';
    listing.attributes = Array.isArray(attributes) ? attributes : [];
    listing.syncStatus = 'pending';
    listing.localVersion += 1;

    await listing.save();

    await SyncLog.create({
      listingId: listing._id,
      action: 'update_local',
      status: 'success',
      source: 'local',
      requestPayload: req.body,
      responsePayload: listing.toObject(),
      message: 'Anúncio atualizado localmente'
    });

    res.json(listing);
  } catch (error) {
    next(error);
  }
}

async function deleteListing(req, res, next) {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Anúncio não encontrado' });
    }

    await SyncLog.create({
      listingId: listing._id,
      action: 'delete_local',
      status: 'success',
      source: 'local',
      requestPayload: listing.toObject(),
      responsePayload: null,
      message: 'Anúncio excluído localmente'
    });

    await Listing.findByIdAndDelete(req.params.id);

    return res.json({
      message: 'Anúncio excluído com sucesso'
    });
  } catch (error) {
    next(error);
  }
}

async function syncListing(req, res, next) {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Anúncio não encontrado' });
    }

    const connectedMlUserId = await getConnectedUserId();

    let result;
    let action;

    if (!listing.mlItemId) {
      result = await createRemoteItem(connectedMlUserId, listing);
      listing.mlItemId = result.responsePayload.id;
      listing.mlUserId = connectedMlUserId;
      action = 'create_remote';
    } else {
      result = await updateRemoteItem(
        connectedMlUserId,
        listing.mlItemId,
        listing
      );
      action = 'update_remote';
    }

    listing.syncStatus = 'synced';
    listing.lastSyncedAt = new Date();
    listing.lastMarketplaceStatus =
      result.responsePayload.status || listing.lastMarketplaceStatus || '';
    listing.status = result.responsePayload.status || listing.status;
    listing.localVersion += 1;

    await listing.save();

    await SyncLog.create({
      listingId: listing._id,
      action,
      status: 'success',
      source: 'mercado_livre',
      requestPayload: result.requestPayload,
      responsePayload: result.responsePayload,
      message: 'Sincronização com Mercado Livre executada com sucesso'
    });

    return res.json({
      message: 'Anúncio sincronizado com Mercado Livre com sucesso',
      listing,
      mercadoLivreResponse: result.responsePayload
    });
  } catch (error) {
    if (req.params?.id) {
      try {
        const listing = await Listing.findById(req.params.id);

        if (listing) {
          listing.syncStatus = 'error';
          await listing.save();

          await SyncLog.create({
            listingId: listing._id,
            action: listing.mlItemId ? 'update_remote' : 'create_remote',
            status: 'error',
            source: 'mercado_livre',
            requestPayload: null,
            responsePayload: error?.response?.data || null,
            message:
              error?.response?.data?.message ||
              error.message ||
              'Erro ao sincronizar com Mercado Livre'
          });
        }
      } catch (innerError) {
        console.error('Erro ao marcar anúncio como error:', innerError.message);
      }
    }

    next(error);
  }
}

async function reconcileListing(req, res, next) {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Anúncio não encontrado' });
    }

    if (!listing.mlItemId) {
      return res.status(400).json({
        message: 'Este anúncio ainda não foi publicado no Mercado Livre'
      });
    }

    const connectedMlUserId = await getConnectedUserId();
    const remoteItem = await getRemoteItem(connectedMlUserId, listing.mlItemId);
    const differences = buildReconcileResult(listing, remoteItem);

    listing.lastMarketplaceStatus = remoteItem.status || listing.lastMarketplaceStatus;

    if (differences.length > 0) {
      listing.syncStatus = 'conflict';
    } else {
      listing.syncStatus = 'synced';
      listing.lastSyncedAt = new Date();
    }

    await listing.save();

    await SyncLog.create({
      listingId: listing._id,
      action: 'reconcile',
      status: differences.length > 0 ? 'warning' : 'success',
      source: 'mercado_livre',
      requestPayload: { mlItemId: listing.mlItemId },
      responsePayload: {
        remoteItem,
        differences
      },
      message:
        differences.length > 0
          ? 'Reconciliação encontrou divergências'
          : 'Reconciliação sem divergências'
    });

    return res.json({
      message:
        differences.length > 0
          ? 'Reconciliação concluída com divergências'
          : 'Reconciliação concluída sem divergências',
      listing,
      remoteItem,
      differences
    });
  } catch (error) {
    next(error);
  }
}

async function getListingLogs(req, res, next) {
  try {
    const logs = await SyncLog.find({ listingId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(logs);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
  syncListing,
  reconcileListing,
  getListingLogs
};
