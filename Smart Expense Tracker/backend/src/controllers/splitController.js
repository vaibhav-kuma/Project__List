const { Expense, SharedExpense, User, Settlement } = require('../models');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

// Add an expense to a group and calculate splits
exports.addSharedExpense = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { groupId, amount, description, date, splitType, splits } = req.body;
        // splitType: 'EQUAL' | 'EXACT'
        // splits: [ { userId: '...', amount: 10 } ] (if EXACT) or just list of userIds (if EQUAL)

        // 1. Create the Main Expense Record
        const expense = await Expense.create({
            amount,
            description,
            date: date || new Date(),
            groupId,
            userId: req.user.id, // Who paid
        }, { transaction: t });

        // 2. Calculate Shares
        let sharedExpensesData = [];

        if (splitType === 'EQUAL') {
            const userIds = splits; // Expecting array of user IDs
            const splitAmount = parseFloat((amount / userIds.length).toFixed(2));

            // Handle rounding diff on last person? For MVP simplify.
            sharedExpensesData = userIds.map(uid => ({
                expenseId: expense.id,
                userId: uid,
                amountOwed: splitAmount
            }));

        } else if (splitType === 'EXACT') {
            // splits = [{ userId: '1', amount: 50 }, { userId: '2', amount: 30 }]
            sharedExpensesData = splits.map(split => ({
                expenseId: expense.id,
                userId: split.userId,
                amountOwed: split.amount
            }));
        }

        // 3. Create Shared Expense Records
        await SharedExpense.bulkCreate(sharedExpensesData, { transaction: t });

        await t.commit();
        res.status(201).json(expense);

    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get balances for a group (Net amount for each user)
exports.getGroupBalances = async (req, res) => {
    try {
        const { groupId } = req.params;
        const balances = {};

        // 1. Credit for Expenses Paid
        const expenses = await Expense.findAll({
            where: { groupId },
            attributes: ['userId', 'amount']
        });
        expenses.forEach(exp => {
            const uid = exp.userId;
            balances[uid] = (balances[uid] || 0) + parseFloat(exp.amount);
        });

        // 2. Debit for Shares Owed
        const sharedExpenses = await SharedExpense.findAll({
            include: [{ model: Expense, where: { groupId }, attributes: [] }],
            attributes: ['userId', 'amountOwed']
        });
        sharedExpenses.forEach(share => {
            const uid = share.userId;
            balances[uid] = (balances[uid] || 0) - parseFloat(share.amountOwed);
        });

        // 3. Adjust for Settlements
        const settlements = await Settlement.findAll({
            where: { groupId }
        });
        settlements.forEach(settle => {
            // Payer "paid" money, so their balance goes UP (less debt)
            balances[settle.payerId] = (balances[settle.payerId] || 0) + parseFloat(settle.amount);
            // Payee "received" money, so their balance goes DOWN (less claim)
            balances[settle.payeeId] = (balances[settle.payeeId] || 0) - parseFloat(settle.amount);
        });

        // Round to 2 decimals
        for (const uid in balances) {
            balances[uid] = parseFloat(balances[uid].toFixed(2));
        }

        res.json(balances);

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get expenses for a specific group
exports.getGroupExpenses = async (req, res) => {
    try {
        const { groupId } = req.params;
        const expenses = await Expense.findAll({
            where: { groupId },
            include: [
                { model: User, attributes: ['id', 'username'] } // Who paid
            ],
            order: [['date', 'DESC']]
        });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Settle up (Create a settlement record)
exports.createSettlement = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { payeeId, amount } = req.body; // Payer is req.user.id

        const settlement = await Settlement.create({
            groupId,
            payerId: req.user.id,
            payeeId,
            amount,
            status: 'completed' // Auto-complete for MVP
        });

        res.status(201).json(settlement);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
