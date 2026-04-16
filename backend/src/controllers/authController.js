const axios = require('axios');
const User = require('../models/User');
const Token = require('../models/Token');

async function login(req, res, next) {
  try {
    const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${process.env.ML_APP_ID}&redirect_uri=${encodeURIComponent(process.env.ML_REDIRECT_URI)}`;
    return res.redirect(authUrl);
  } catch (error) {
    next(error);
  }
}

async function callback(req, res, next) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ message: 'Código de autorização não recebido' });
    }

    const tokenResponse = await axios.post(
      'https://api.mercadolibre.com/oauth/token',
      {
        grant_type: 'authorization_code',
        client_id: process.env.ML_APP_ID,
        client_secret: process.env.ML_CLIENT_SECRET,
        code,
        redirect_uri: process.env.ML_REDIRECT_URI
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const tokenData = tokenResponse.data;

    const meResponse = await axios.get('https://api.mercadolibre.com/users/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });

    const mlUser = meResponse.data;

    const user = await User.findOneAndUpdate(
      { mlUserId: String(mlUser.id) },
      {
        mlUserId: String(mlUser.id),
        nickname: mlUser.nickname || '',
        email: mlUser.email || ''
      },
      {
        upsert: true,
        new: true
      }
    );

    await Token.findOneAndUpdate(
      { mlUserId: String(mlUser.id) },
      {
        mlUserId: String(mlUser.id),
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        tokenType: tokenData.token_type,
        scope: tokenData.scope || '',
        userId: user._id,
        lastRefreshAt: new Date()
      },
      {
        upsert: true,
        new: true
      }
    );

    return res.redirect(`${process.env.FRONTEND_URL}?connected=true`);
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const token = await Token.findOne().sort({ updatedAt: -1 }).populate('userId');

    if (!token || !token.userId) {
      return res.json({
        connected: false,
        user: null
      });
    }

    return res.json({
      connected: true,
      user: {
        id: token.userId._id,
        mlUserId: token.userId.mlUserId,
        nickname: token.userId.nickname,
        email: token.userId.email
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  callback,
  me
};