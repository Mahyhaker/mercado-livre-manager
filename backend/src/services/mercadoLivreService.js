const axios = require('axios');
const Token = require('../models/Token');

async function getAccessToken(mlUserId) {
  const token = await Token.findOne({ mlUserId });
  if (!token) throw new Error('Token não encontrado');
  return token.accessToken;
}

async function createItem(mlUserId, payload) {
  const accessToken = await getAccessToken(mlUserId);

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

async function updateItem(mlUserId, itemId, payload) {
  const accessToken = await getAccessToken(mlUserId);

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
  createItem,
  updateItem
};