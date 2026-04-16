const express = require('express');
const router = express.Router();

const {
  createListing,
  getListings,
  getListingById,
  updateListing,
  syncListing
} = require('../controllers/listingController');

router.post('/', createListing);
router.get('/', getListings);
router.get('/:id', getListingById);
router.put('/:id', updateListing);
router.post('/:id/sync', syncListing);

module.exports = router;