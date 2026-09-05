import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Chip, HelperText, useTheme, Appbar, SegmentedButtons } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

const categories = [
    { label: 'Food', value: 'food', icon: 'food' },
    { label: 'Transport', value: 'transport', icon: 'train-car' },
    { label: 'Shopping', value: 'shopping', icon: 'shopping' },
    { label: 'Entertainment', value: 'entertainment', icon: 'movie' },
    { label: 'Bills', value: 'bills', icon: 'file-document-outline' },
    { label: 'Others', value: 'others', icon: 'dots-horizontal' },
];

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { addExpense } from '../store/expenseSlice';
import { addSharedExpense } from '../store/groupSlice';
import { useRoute } from '@react-navigation/native';

const AddExpenseScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const route = useRoute();
    const { groupId, members } = route.params as any || {};

    const dispatch = useDispatch<AppDispatch>();
    const { loading } = useSelector((state: RootState) => state.expenses); // Reuse expense loading for now

    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(categories[0].value);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const handleSave = async () => {
        if (!amount) return;

        try {
            if (groupId && members && members.length > 0) {
                // Shared Expense - Equal Split
                const userIds = members.map((m: any) => m.id);
                await dispatch(addSharedExpense({
                    groupId,
                    amount: parseFloat(amount),
                    description,
                    date,
                    splitType: 'EQUAL',
                    splits: userIds
                })).unwrap();
            } else {
                await dispatch(addExpense({
                    amount: parseFloat(amount),
                    description,
                    category: selectedCategory,
                    date,
                    groupId
                })).unwrap();
            }
            navigation.goBack();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <Appbar.Header>
                <Appbar.BackAction onPress={() => navigation.goBack()} />
                <Appbar.Content title={groupId ? "Add Group Expense" : "Add Personal Expense"} />
            </Appbar.Header>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Amount Input */}
                <TextInput
                    label="Amount"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    style={styles.input}
                    left={<TextInput.Affix text="$ " />}
                    mode="outlined"
                    autoFocus
                />

                {/* Category Selection */}
                <HelperText type="info" visible={true}>
                    Category
                </HelperText>
                <View style={styles.chipContainer}>
                    {categories.map((cat) => (
                        <Chip
                            key={cat.value}
                            selected={selectedCategory === cat.value}
                            onPress={() => setSelectedCategory(cat.value)}
                            style={styles.chip}
                            showSelectedOverlay
                            icon={cat.icon}
                        >
                            {cat.label}
                        </Chip>
                    ))}
                </View>

                {/* Description */}
                <TextInput
                    label="Note / Description"
                    value={description}
                    onChangeText={setDescription}
                    style={styles.input}
                    mode="outlined"
                    multiline
                />

                {/* Date Placeholder - In real app, use date picker modal */}
                <TextInput
                    label="Date"
                    value={date}
                    onChangeText={setDate}
                    style={styles.input}
                    mode="outlined"
                    right={<TextInput.Icon icon="calendar" />}
                />

                <Button
                    icon="camera"
                    mode="outlined"
                    onPress={() => console.log('Scan Receipt')}
                    style={styles.button}
                >
                    Scan Receipt
                </Button>

                <Button
                    mode="contained"
                    onPress={handleSave}
                    loading={loading}
                    disabled={loading}
                    style={[styles.button, styles.saveButton]}
                    contentStyle={{ height: 50 }}
                >
                    Save Expense
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
        padding: 20,
    },
    input: {
        marginBottom: 15,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
    },
    chip: {
        margin: 4,
    },
    button: {
        marginTop: 10,
    },
    saveButton: {
        marginTop: 20,
    }
});

export default AddExpenseScreen;
