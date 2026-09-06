import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api, { setAuthToken } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
    id: string;
    username: string;
    email: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
}

const initialState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,
};

// Async Thunks
export const loginUser = createAsyncThunk(
    'auth/login',
    async (credentials: any, { rejectWithValue }) => {
        try {
            const response = await api.post('/auth/login', credentials);
            await AsyncStorage.setItem('token', response.data.token);
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message || 'Login failed');
        }
    }
);

export const registerUser = createAsyncThunk(
    'auth/register',
    async (userData: any, { rejectWithValue }) => {
        try {
            const response = await api.post('/auth/register', userData);
            await AsyncStorage.setItem('token', response.data.token);
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message || 'Registration failed');
        }
    }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
    await AsyncStorage.removeItem('token');
});

export const loadUser = createAsyncThunk('auth/loadUser', async (_, { dispatch }) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
        setAuthToken(token);
        // ideally fetch user profile from API here if needed
        return token;
    }
    return null;
});

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Login
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
                setAuthToken(action.payload.token);
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Logout
            .addCase(logoutUser.fulfilled, (state) => {
                state.user = null;
                state.token = null;
                state.isAuthenticated = false;
                setAuthToken(null);
            })
            // Load User
            .addCase(loadUser.fulfilled, (state, action) => {
                if (action.payload) {
                    state.token = action.payload;
                    state.isAuthenticated = true;
                }
            });
    },
});

export default authSlice.reducer;
