const axios = require('axios');
const Token = require('../models/Token');

async function refreshAccessToken(savedToken) {
  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('client_id', process.env.ML_APP_ID);
  params.append('client_secret', process.env.ML_CLIENT_SECRET);
  params.append('refresh_token', savedToken.refreshToken);

  const response = await axios.post(
    'https://api.mercadolibre.com/oauth/token',
    params.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        accept: 'application/json'
      }
    }
  );

  const tokenData = response.data;

  savedToken.accessToken = tokenData.access_token;
  savedToken.refreshToken = tokenData.refresh_token;
  savedToken.expiresIn = tokenData.expires_in;
  savedToken.tokenType = tokenData.token_type;
  savedToken.scope = tokenData.scope || savedToken.scope;
  savedToken.lastRefreshAt = new Date();

  await savedToken.save();

  return savedToken.accessToken;
}

async function getValidAccessToken(mlUserId) {
  const savedToken = await Token.findOne({ mlUserId });

  if (!savedToken) {
    throw new Error('Token do Mercado Livre não encontrado para este usuário');
  }

  const refreshedAt = savedToken.lastRefreshAt
    ? new Date(savedToken.lastRefreshAt).getTime()
    : 0;

  const expiresInMs = (savedToken.expiresIn || 0) * 1000;
  const now = Date.now();

  const isExpired = !expiresInMs || now >= refreshedAt + expiresInMs - 60_000;

  if (isExpired) {
    return refreshAccessToken(savedToken);
  }

  return savedToken.accessToken;
}

async function createRemoteItem(mlUserId, listing) {
  const accessToken = await getValidAccessToken(mlUserId);

  const payload = {
    title: listing.title,
    category_id: listing.categoryId,
    price: Number(listing.price),
    currency_id: 'BRL',
    available_quantity: Number(listing.availableQuantity),
    buying_mode: 'buy_it_now',
    condition: 'new',
    listing_type_id: 'gold_special',
    pictures: listing.pictureUrl
      ? [{ source: listing.pictureUrl }]
      : []
  };

  const response = await axios.post(
    'https://api.mercadolibre.com/items',
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
}

async function updateRemoteItem(mlUserId, itemId, listing) {
  const accessToken = await getValidAccessToken(mlUserId);

  const payload = {
    title: listing.title,
    price: Number(listing.price),
    available_quantity: Number(listing.availableQuantity)
  };

  const response = await axios.put(
    `https://api.mercadolibre.com/items/${itemId}`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
}

module.exports = {
  getValidAccessToken,
  createRemoteItem,
  updateRemoteItem
};