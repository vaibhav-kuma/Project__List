const express = require('express');
const router = express.Router();
const { getExpenses, createExpense } = require('../controllers/expenseController');
const auth = require('../middleware/auth');

router.get('/', auth, getExpenses);
router.post('/', auth, createExpense);

module.exports = router;
