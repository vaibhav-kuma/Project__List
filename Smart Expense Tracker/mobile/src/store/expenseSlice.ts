import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

interface Expense {
    id: string;
    amount: number;
    description: string;
    date: string;
    categoryId: string;
}

interface ExpenseState {
    expenses: Expense[];
    loading: boolean;
    error: string | null;
}

const initialState: ExpenseState = {
    expenses: [],
    loading: false,
    error: null,
};

export const fetchExpenses = createAsyncThunk('expenses/fetch', async (_, { rejectWithValue }) => {
    try {
        const response = await api.get('/expenses');
        return response.data;
    } catch (err: any) {
        return rejectWithValue(err.response?.data?.message || 'Failed to fetch expenses');
    }
});

export const addExpense = createAsyncThunk('expenses/add', async (expenseData: any, { rejectWithValue }) => {
    try {
        const response = await api.post('/expenses', expenseData);
        return response.data;
    } catch (err: any) {
        return rejectWithValue(err.response?.data?.message || 'Failed to add expense');
    }
});

const expenseSlice = createSlice({
    name: 'expenses',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchExpenses.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchExpenses.fulfilled, (state, action) => {
                state.loading = false;
                state.expenses = action.payload;
            })
            .addCase(fetchExpenses.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(addExpense.fulfilled, (state, action) => {
                state.expenses.unshift(action.payload);
            });
    },
});

export default expenseSlice.reducer;
