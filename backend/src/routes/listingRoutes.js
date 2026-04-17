const express = require('express');
const router = express.Router();

const {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
  syncListing
} = require('../controllers/listingController');

router.post('/', createListing);
router.get('/', getListings);
router.get('/:id', getListingById);
router.put('/:id', updateListing);
router.delete('/:id', deleteListing);
router.post('/:id/sync', syncListing);

module.exports = router;