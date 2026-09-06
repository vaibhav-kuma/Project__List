import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

interface Budget {
    id?: string;
    amount: number;
    month: number;
    year: number;
}

interface BudgetState {
    currentBudget: Budget | null;
    loading: boolean;
    error: string | null;
}

const initialState: BudgetState = {
    currentBudget: null,
    loading: false,
    error: null,
};

export const fetchBudget = createAsyncThunk('budget/fetch', async (params: { month?: number, year?: number } | undefined, { rejectWithValue }) => {
    try {
        const p = params || {};
        const response = await api.get('/budgets', { params: p });
        return response.data;
    } catch (err: any) {
        return rejectWithValue(err.message);
    }
});

export const setBudget = createAsyncThunk('budget/set', async (data: { amount: number, month: number, year: number }, { rejectWithValue }) => {
    try {
        const response = await api.post('/budgets', data);
        return response.data;
    } catch (err: any) {
        return rejectWithValue(err.message);
    }
});

const budgetSlice = createSlice({
    name: 'budget',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchBudget.pending, (state) => { state.loading = true; })
            .addCase(fetchBudget.fulfilled, (state, action) => {
                state.loading = false;
                state.currentBudget = action.payload;
            })
            .addCase(setBudget.fulfilled, (state, action) => {
                state.currentBudget = action.payload;
            });
    },
});

export default budgetSlice.reducer;
