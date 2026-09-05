import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import expenseReducer from './expenseSlice';
import groupReducer from './groupSlice';
import categoryReducer from './categorySlice';
import budgetReducer from './budgetSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        expenses: expenseReducer,
        groups: groupReducer,
        categories: categoryReducer,
        budget: budgetReducer,
        ui: uiReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
