const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Category = sequelize.define('Category', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    icon: {
        type: DataTypes.STRING,
        defaultValue: 'shape',
    },
    type: {
        type: DataTypes.STRING, // 'income', 'expense'
        defaultValue: 'expense'
    }
}, {
    timestamps: false,
});

module.exports = Category;
