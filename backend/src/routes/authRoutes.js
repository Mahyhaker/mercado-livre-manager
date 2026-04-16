const express = require('express');
const router = express.Router();
const { login, callback, me } = require('../controllers/authController');

router.get('/login', login);
router.get('/callback', callback);
router.get('/me', me);

module.exports = router;