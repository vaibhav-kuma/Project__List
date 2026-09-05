import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, FAB, useTheme, Avatar, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

// Mock Data
const groups = [
    { id: '1', name: 'Trip to Vegas', memberCount: 4, myBalance: 120.50 }, // Positive = I am owed
    { id: '2', name: 'House Rent', memberCount: 3, myBalance: -450.00 },   // Negative = I owe
    { id: '3', name: 'Office Lunch', memberCount: 5, myBalance: 0 },
];

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchGroups } from '../store/groupSlice';

const GroupListScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const dispatch = useDispatch<AppDispatch>();
    const { groups, loading } = useSelector((state: RootState) => state.groups);

    React.useEffect(() => {
        dispatch(fetchGroups());
    }, [dispatch]);

    const getBalanceColor = (amount) => {
        if (amount > 0) return theme.colors.primary;
        if (amount < 0) return theme.colors.error;
        return theme.colors.secondary;
    };

    const renderItem = ({ item }: { item: any }) => {
        // Mocking balance for list view as our current list API might not return it
        // In real app, we need an endpoint that returns group + myBalance
        const myBalance = 0;

        return (
            <List.Item
                title={item.name}
                description={`Group ID: ${item.id.substring(0, 8)}`}
                left={props => <Avatar.Text {...props} size={40} label={item.name.substring(0, 2).toUpperCase()} />}
                right={() => (
                    <View style={styles.balanceContainer}>
                        <Text variant="bodySmall">Your Balance</Text>
                        {/* Placeholder logic for balance display in list */}
                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>To Check</Text>
                    </View>
                )}
                onPress={() => navigation.navigate('GroupDetail', { groupId: item.id, groupName: item.name })}
                style={styles.item}
            />
        )
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {loading ? <Text style={{ padding: 20 }}>Loading Groups...</Text> :
                <FlatList
                    data={groups}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No groups yet.</Text>}
                />}
            <FAB
                icon="plus"
                label="New Group"
                style={[styles.fab, { backgroundColor: theme.colors.secondary }]}
                onPress={() => console.log('Create Group Pressed')}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        padding: 10,
    },
    item: {
        backgroundColor: 'white',
        marginBottom: 10,
        borderRadius: 8,
        elevation: 2,
        paddingVertical: 8,
    },
    balanceContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        marginRight: 10,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
});

export default GroupListScreen;
