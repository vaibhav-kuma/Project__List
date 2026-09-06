import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

interface Group {
    id: string;
    name: string;
}

interface GroupState {
    groups: Group[];
    currentGroupDetail: any | null;
    loading: boolean;
    error: string | null;
}

const initialState: GroupState = {
    groups: [],
    currentGroupDetail: null,
    loading: false,
    error: null,
};

export const fetchGroups = createAsyncThunk('groups/fetchAll', async (_, { rejectWithValue }) => {
    try {
        const response = await api.get('/groups');
        return response.data;
    } catch (err: any) {
        return rejectWithValue(err.message);
    }
});

export const fetchGroupDetail = createAsyncThunk('groups/fetchDetail', async (groupId: string, { rejectWithValue }) => {
    try {
        const detail = await api.get(`/groups/${groupId}`);
        const balances = await api.get(`/groups/${groupId}/balances`);
        return { ...detail.data, balances: balances.data };
    } catch (err: any) {
        return rejectWithValue(err.message);
    }
});

export const createGroup = createAsyncThunk('groups/create', async (groupData: any, { rejectWithValue }) => {
    try {
        const response = await api.post('/groups', groupData);
        return response.data;
    } catch (err: any) {
        return rejectWithValue(err.message);
    }
});

export const createSettlement = createAsyncThunk('groups/settle', async (data: { groupId: string, payeeId: string, amount: number }, { rejectWithValue, dispatch }) => {
    try {
        const response = await api.post(`/groups/${data.groupId}/settle`, { payeeId: data.payeeId, amount: data.amount });
        dispatch(fetchGroupDetail(data.groupId)); // Refresh data
        return response.data;
    } catch (err: any) {
        return rejectWithValue(err.message);
    }
});

export const addSharedExpense = createAsyncThunk('groups/addExpense', async (data: any, { rejectWithValue, dispatch }) => {
    try {
        const response = await api.post(`/groups/${data.groupId}/expenses`, data);
        dispatch(fetchGroupDetail(data.groupId)); // Refresh data
        return response.data;
    } catch (err: any) {
        return rejectWithValue(err.message);
    }
});

const groupSlice = createSlice({
    name: 'groups',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchGroups.pending, (state) => { state.loading = true; })
            .addCase(fetchGroups.fulfilled, (state, action) => {
                state.loading = false;
                state.groups = action.payload;
            })
            .addCase(fetchGroupDetail.fulfilled, (state, action) => {
                state.currentGroupDetail = action.payload;
            })
            .addCase(createGroup.fulfilled, (state, action) => {
                state.groups.push(action.payload);
            });
    },
});

export default groupSlice.reducer;
