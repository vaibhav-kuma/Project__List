const express = require('express');
const cors = require('cors');
const { connectDB, sequelize } = require('./src/config/db');
require('./src/models'); // Init models

const authRoutes = require('./src/routes/authRoutes');
const expenseRoutes = require('./src/routes/expenseRoutes');
const groupRoutes = require('./src/routes/groupRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const budgetRoutes = require('./src/routes/budgetRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();
    // Sync Database
    await sequelize.sync();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer();
