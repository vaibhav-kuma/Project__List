const User = require('./User');
const Expense = require('./Expense');
const Group = require('./Group');
const GroupMember = require('./GroupMember');
const SharedExpense = require('./SharedExpense');
const Settlement = require('./Settlement');

const Category = require('./Category');
const Budget = require('./Budget');

// User <-> Expense
User.hasMany(Expense, { foreignKey: 'userId' });
Expense.belongsTo(User, { foreignKey: 'userId' });

// User <-> Group (Many-to-Many through GroupMember)
User.belongsToMany(Group, { through: GroupMember, foreignKey: 'userId' });
Group.belongsToMany(User, { through: GroupMember, foreignKey: 'groupId' });

// Group <-> Expense
Group.hasMany(Expense, { foreignKey: 'groupId' });
Expense.belongsTo(Group, { foreignKey: 'groupId' });

// Expense <-> SharedExpense (One-to-Many)
Expense.hasMany(SharedExpense, { foreignKey: 'expenseId' });
SharedExpense.belongsTo(Expense, { foreignKey: 'expenseId' });

// User <-> SharedExpense (This user owes this share)
User.hasMany(SharedExpense, { foreignKey: 'userId' });
SharedExpense.belongsTo(User, { foreignKey: 'userId' });

// Settlements
Settlement.belongsTo(Group, { foreignKey: 'groupId' });
Settlement.belongsTo(User, { as: 'Payer', foreignKey: 'payerId' });
Settlement.belongsTo(User, { as: 'Payee', foreignKey: 'payeeId' });

// User <-> Budget
User.hasMany(Budget, { foreignKey: 'userId' });
Budget.belongsTo(User, { foreignKey: 'userId' });

// Category (Static or User specific? Let's make it static/global for now, or per user)
// For MVP, just simple categories.

module.exports = { User, Expense, Group, GroupMember, SharedExpense, Settlement, Category, Budget };
