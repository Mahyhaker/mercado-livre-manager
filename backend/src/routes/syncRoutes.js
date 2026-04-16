const express = require('express');
const router = express.Router();
const { reconcileListings } = require('../controllers/syncController');

router.post('/reconcile', reconcileListings);

module.exports = router;