const { Category } = require('../models');

exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.findAll();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.seedCategories = async (req, res) => {
    try {
        const defaults = [
            { name: 'Food', icon: 'food', type: 'expense' },
            { name: 'Transport', icon: 'train-car', type: 'expense' },
            { name: 'Shopping', icon: 'shopping', type: 'expense' },
            { name: 'Entertainment', icon: 'movie', type: 'expense' },
            { name: 'Bills', icon: 'file-document-outline', type: 'expense' },
            { name: 'Others', icon: 'dots-horizontal', type: 'expense' },
        ];

        await Category.bulkCreate(defaults, { ignoreDuplicates: true });
        res.json({ message: 'Seeded' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
