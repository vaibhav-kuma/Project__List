const { Expense } = require('../models');

exports.getExpenses = async (req, res) => {
    try {
        const expenses = await Expense.findAll({ where: { userId: req.user.id } });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.createExpense = async (req, res) => {
    try {
        const { amount, description, categoryId, date, groupId } = req.body;
        const expense = await Expense.create({
            amount, description, categoryId, date, groupId, userId: req.user.id
        });
        res.status(201).json(expense);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
