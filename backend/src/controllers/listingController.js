const Listing = require('../models/Listing');
const Token = require('../models/Token');
const {
  createRemoteItem,
  updateRemoteItem
} = require('../services/mercadoLivreService');

async function getConnectedUserId() {
  const latestToken = await Token.findOne().sort({ updatedAt: -1 });

  if (!latestToken) {
    throw new Error('Nenhuma conta do Mercado Livre está conectada');
  }

  return latestToken.mlUserId;
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

    res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
}

async function getListings(req, res, next) {
  try {
    const { status, search, minPrice, maxPrice } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

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

    let remoteItem;

    if (!listing.mlItemId) {
      remoteItem = await createRemoteItem(connectedMlUserId, listing);
      listing.mlItemId = remoteItem.id;
      listing.mlUserId = connectedMlUserId;
    } else {
      remoteItem = await updateRemoteItem(
        connectedMlUserId,
        listing.mlItemId,
        listing
      );
    }

    listing.syncStatus = 'synced';
    listing.lastSyncedAt = new Date();
    listing.lastMarketplaceStatus =
      remoteItem.status || listing.lastMarketplaceStatus || '';
    listing.status = remoteItem.status || listing.status;
    listing.localVersion += 1;

    await listing.save();

    return res.json({
      message: 'Anúncio sincronizado com Mercado Livre com sucesso',
      listing,
      mercadoLivreResponse: remoteItem
    });
  } catch (error) {
    if (req.params?.id) {
      try {
        const listing = await Listing.findById(req.params.id);
        if (listing) {
          listing.syncStatus = 'error';
          await listing.save();
        }
      } catch (innerError) {
        console.error('Erro ao marcar anúncio como error:', innerError.message);
      }
    }

    next(error);
  }
}

module.exports = {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
  syncListing
};