import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Appbar, List, Avatar, HelperText, useTheme } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createSettlement } from '../store/groupSlice';
import { AppDispatch, RootState } from '../store';

const SettleUpScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { groupId, groupName } = route.params as any;
    const theme = useTheme();

    const dispatch = useDispatch<AppDispatch>();
    const { currentGroupDetail, loading } = useSelector((state: RootState) => state.groups);

    const [amount, setAmount] = useState('');
    const [selectedPayee, setSelectedPayee] = useState<string | null>(null);
    const [error, setError] = useState('');

    // Filter out self from potential payees (assuming state has current user, but for MVP just show all others)
    // We ideally need the current user ID to filter self out efficiently. 
    // For now, we list all, user picks who to pay.
    const members = currentGroupDetail ? currentGroupDetail.Users : [];

    const handleSettle = async () => {
        if (!amount || !selectedPayee) {
            setError('Please select a payee and enter an amount.');
            return;
        }

        try {
            await dispatch(createSettlement({
                groupId,
                payeeId: selectedPayee,
                amount: parseFloat(amount)
            })).unwrap();
            navigation.goBack();
        } catch (err) {
            setError('Failed to settle up. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            <Appbar.Header>
                <Appbar.BackAction onPress={() => navigation.goBack()} />
                <Appbar.Content title={`Settle Up - ${groupName}`} />
            </Appbar.Header>

            <ScrollView contentContainerStyle={styles.content}>
                <List.Section title="Who are you paying?">
                    {members.map((member: any) => (
                        <List.Item
                            key={member.id}
                            title={member.username}
                            left={props => <Avatar.Text {...props} size={40} label={member.username[0].toUpperCase()} />}
                            right={props => selectedPayee === member.id ? <List.Icon {...props} icon="check" color={theme.colors.primary} /> : null}
                            onPress={() => setSelectedPayee(member.id)}
                            style={[
                                styles.memberItem,
                                selectedPayee === member.id && { backgroundColor: theme.colors.elevation.level2 }
                            ]}
                        />
                    ))}
                </List.Section>

                <TextInput
                    label="Amount"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    mode="outlined"
                    style={styles.input}
                    left={<TextInput.Affix text="$ " />}
                />

                {error ? <HelperText type="error">{error}</HelperText> : null}

                <Button
                    mode="contained"
                    onPress={handleSettle}
                    loading={loading}
                    disabled={loading || !selectedPayee || !amount}
                    style={styles.button}
                    contentStyle={{ height: 50 }}
                >
                    Pay ${amount || '0.00'}
                </Button>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        padding: 16,
    },
    memberItem: {
        borderRadius: 8,
        marginBottom: 4
    },
    input: {
        marginTop: 20,
        marginBottom: 10,
    },
    button: {
        marginTop: 20,
    }
});

export default SettleUpScreen;
