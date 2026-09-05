const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SharedExpense = sequelize.define('SharedExpense', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    expenseId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Expenses',
            key: 'id'
        }
    },
    userId: { // This is the person who owes the money
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    amountOwed: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    isSettled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    timestamps: true,
});

module.exports = SharedExpense;
