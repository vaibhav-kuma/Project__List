import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Avatar, Button, List, Divider, useTheme, Appbar } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchGroupDetail } from '../store/groupSlice';

const GroupDetailScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const route = useRoute();
    const { groupId, groupName } = route.params as any;

    const dispatch = useDispatch<AppDispatch>();
    const { currentGroupDetail } = useSelector((state: RootState) => state.groups);

    React.useEffect(() => {
        if (groupId) {
            dispatch(fetchGroupDetail(groupId));
        }
    }, [groupId, dispatch]);

    const members = currentGroupDetail ? currentGroupDetail.Users : [];
    const balances = currentGroupDetail ? currentGroupDetail.balances : {};

    const getBalanceText = (userId: string) => {
        const bal = parseFloat(balances[userId] || 0);
        if (bal > 0) return { text: `gets back $${bal.toFixed(2)}`, color: theme.colors.primary };
        if (bal < 0) return { text: `owes $${Math.abs(bal).toFixed(2)}`, color: theme.colors.error };
        return { text: 'settled', color: theme.colors.secondary };
    };

    return (
        <View style={styles.container}>
            <Appbar.Header>
                <Appbar.BackAction onPress={() => navigation.goBack()} />
                <Appbar.Content title={groupName} />
                <Appbar.Action icon="refresh" onPress={() => dispatch(fetchGroupDetail(groupId))} />
            </Appbar.Header>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Balances Overview */}
                <Card style={styles.card}>
                    <Card.Title title="Group Members" />
                    <Card.Content>
                        {!currentGroupDetail ? <Text>Loading...</Text> : members.map((member: any) => {
                            const { text, color } = getBalanceText(member.id);
                            return (
                                <View key={member.id} style={styles.memberRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Avatar.Text size={32} label={member.username[0].toUpperCase()} style={{ marginRight: 10 }} />
                                        <Text variant="bodyLarge">{member.username}</Text>
                                    </View>
                                    <Text style={{ color, fontWeight: 'bold' }}>{text}</Text>
                                </View>
                            )
                        })}
                    </Card.Content>
                    <Card.Actions>
                        <Button onPress={() => navigation.navigate('SettleUp' as never, { groupId, groupName } as never)}>Settle Up</Button>
                    </Card.Actions>
                </Card>

                <Text variant="titleMedium" style={styles.sectionTitle}>Shared Expenses</Text>

                {currentGroupDetail?.expenses?.map((expense: any) => (
                    <List.Item
                        key={expense.id}
                        title={expense.description || 'Expense'}
                        description={`${expense.User?.username} paid $${expense.amount} • ${expense.date}`}
                        left={props => <List.Icon {...props} icon="receipt" />}
                        style={styles.expenseItem}
                    />
                ))}
                {!currentGroupDetail?.expenses?.length && <Text style={{ fontStyle: 'italic', color: 'gray' }}>No shared expenses yet.</Text>}

            </ScrollView>

            <Button
                mode="contained"
                icon="plus"
                style={styles.addButton}
                onPress={() => navigation.navigate('AddExpense' as never, { groupId, groupName, members } as never)}
            >
                Add Expense
            </Button>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 16,
        paddingBottom: 80,
    },
    card: {
        marginBottom: 20,
        backgroundColor: 'white',
    },
    memberRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        marginBottom: 10,
        fontWeight: 'bold',
    },
    expenseItem: {
        backgroundColor: 'white',
        marginBottom: 5,
        borderRadius: 5,
    },
    addButton: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
    }
});

export default GroupDetailScreen;
