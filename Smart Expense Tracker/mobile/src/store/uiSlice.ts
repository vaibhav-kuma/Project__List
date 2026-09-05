import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
    snackbarMessage: string | null;
    snackbarVisible: boolean;
    snackbarType: 'info' | 'error' | 'success';
}

const initialState: UiState = {
    snackbarMessage: null,
    snackbarVisible: false,
    snackbarType: 'info',
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        showSnackbar: (state, action: PayloadAction<{ message: string, type?: 'info' | 'error' | 'success' }>) => {
            state.snackbarMessage = action.payload.message;
            state.snackbarType = action.payload.type || 'info';
            state.snackbarVisible = true;
        },
        hideSnackbar: (state) => {
            state.snackbarVisible = false;
            state.snackbarMessage = null;
        }
    },
});

export const { showSnackbar, hideSnackbar } = uiSlice.actions;
export default uiSlice.reducer;
