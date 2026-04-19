const express = require('express');
const router = express.Router();
const {
  login,
  callback,
  me,
  logout
} = require('../controllers/authController');

router.get('/login', login);
router.get('/callback', callback);
router.get('/me', me);
router.post('/logout', logout);

module.exports = router;
