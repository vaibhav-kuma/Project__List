const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Settlement = sequelize.define('Settlement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
  },
  status: {
      type: DataTypes.STRING, // 'pending', 'completed'
      defaultValue: 'pending'
  }
}, {
  timestamps: true,
});

module.exports = Settlement;
