const { Budget } = require('../models');
const { Op } = require('sequelize');

exports.getBudget = async (req, res) => {
    try {
        const { month, year } = req.query;
        // Default to current date if not provided
        const d = new Date();
        const m = month ? parseInt(month) : d.getMonth() + 1;
        const y = year ? parseInt(year) : d.getFullYear();

        const budget = await Budget.findOne({
            where: {
                userId: req.user.id,
                month: m,
                year: y
            }
        });

        res.json(budget || { amount: 0, month: m, year: y });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.setBudget = async (req, res) => {
    try {
        const { amount, month, year } = req.body;

        let budget = await Budget.findOne({
            where: {
                userId: req.user.id,
                month,
                year
            }
        });

        if (budget) {
            budget.amount = amount;
            await budget.save();
        } else {
            budget = await Budget.create({
                userId: req.user.id,
                amount,
                month,
                year
            });
        }

        res.json(budget);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
