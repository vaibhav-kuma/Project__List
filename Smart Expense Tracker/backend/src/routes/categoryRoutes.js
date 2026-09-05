const express = require('express');
const router = express.Router();
const { getCategories, seedCategories } = require('../controllers/categoryController');
const auth = require('../middleware/auth');

router.get('/', auth, getCategories);
router.post('/seed', seedCategories); // Open for dev/setup

module.exports = router;
