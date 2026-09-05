const express = require('express');
const router = express.Router();
const { addSharedExpense, getGroupBalances, getGroupExpenses, createSettlement } = require('../controllers/splitController');
const { createGroup, getGroups, getGroupDetail } = require('../controllers/groupController');
const auth = require('../middleware/auth');

// Group Routes
router.post('/', auth, createGroup);
router.get('/', auth, getGroups);
router.get('/:id', auth, getGroupDetail);

// Splitting / Shared Expense Routes
router.post('/:groupId/expenses', auth, addSharedExpense);
router.get('/:groupId/expenses', auth, getGroupExpenses);
router.get('/:groupId/balances', auth, getGroupBalances);
router.post('/:groupId/settle', auth, createSettlement);

module.exports = router;
