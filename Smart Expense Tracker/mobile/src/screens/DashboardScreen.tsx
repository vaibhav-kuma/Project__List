import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Text, Card, Button, FAB, ProgressBar, useTheme, List, Avatar } from 'react-native-paper';
import { PieChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchExpenses } from '../store/expenseSlice';

const screenWidth = Dimensions.get('window').width;

// Mock Data
const recentTransactions = [
    { id: 1, title: 'Grocery Shopping', amount: 45.50, date: 'Today', icon: 'cart' },
    { id: 2, title: 'Uber Ride', amount: 12.00, date: 'Yesterday', icon: 'car' },
    { id: 3, title: 'Netflix Subscription', amount: 15.00, date: 'Oct 24', icon: 'movie' },
];

const chartData = [
    { name: 'Food', population: 215, color: '#FF6384', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Transport', population: 85, color: '#36A2EB', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Shopping', population: 120, color: '#FFCE56', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Bills', population: 50, color: '#4BC0C0', legendFontColor: '#7F7F7F', legendFontSize: 12 },
];

const DashboardScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const dispatch = useDispatch<AppDispatch>();
    const { expenses, loading } = useSelector((state: RootState) => state.expenses);

    useEffect(() => {
        dispatch(fetchExpenses());
    }, [dispatch]);

    // Calculate Totals
    const totalSpent = expenses.reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0);
    const budget = 1000; // Harcoded for now
    const progress = Math.min(totalSpent / budget, 1);

    // Chart Data Calculation
    const categoryTotals: any = {};
    expenses.forEach(item => {
        // Mocking category name mapping since we only have IDs in expense slice
        const catName = 'General';
        categoryTotals[catName] = (categoryTotals[catName] || 0) + parseFloat(item.amount.toString());
    });

    const chartData = Object.keys(categoryTotals).map(key => ({
        name: key,
        population: categoryTotals[key],
        color: '#' + Math.floor(Math.random() * 16777215).toString(16), // Random color
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
    }));

    // Fallback chart data if empty
    const displayChartData = chartData.length > 0 ? chartData : [
        { name: 'No Data', population: 100, color: '#e0e0e0', legendFontColor: '#7F7F7F', legendFontSize: 12 }
    ];

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Header Summary */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleMedium" style={{ color: theme.colors.secondary }}>Total Spent This Month</Text>
                        <Text variant="displayMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                            ${totalSpent.toFixed(2)}
                        </Text>

                        <View style={styles.budgetContainer}>
                            <Text variant="bodySmall">Budget: ${budget.toFixed(2)}</Text>
                            <Text variant="bodySmall">{(progress * 100).toFixed(0)}% used</Text>
                        </View>
                        <ProgressBar progress={progress} color={theme.colors.primary} style={styles.progressBar} />
                    </Card.Content>
                </Card>

                {/* Chart Section */}
                <Text variant="titleLarge" style={styles.sectionTitle}>Spending Breakdown</Text>
                <Card style={styles.card}>
                    <PieChart
                        data={displayChartData}
                        width={screenWidth - 60}
                        height={220}
                        chartConfig={{
                            backgroundColor: '#ffffff',
                            backgroundGradientFrom: '#ffffff',
                            backgroundGradientTo: '#ffffff',
                            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        }}
                        accessor={'population'}
                        backgroundColor={'transparent'}
                        paddingLeft={'15'}
                        absolute
                    />
                </Card>

                {/* Recent Transactions */}
                <View style={styles.row}>
                    <Text variant="titleLarge" style={styles.sectionTitle}>Recent Transactions</Text>
                    <Button mode="text" onPress={() => { }}>See All</Button>
                </View>

                {loading ? <Text>Loading...</Text> : expenses.slice(0, 5).map((item) => (
                    <List.Item
                        key={item.id}
                        title={item.description || 'Expense'}
                        description={item.date}
                        left={props => <List.Icon {...props} icon="currency-usd" />}
                        right={() => <Text style={styles.amountText}>-${parseFloat(item.amount.toString()).toFixed(2)}</Text>}
                        style={styles.listItem}
                    />
                ))}

                <View style={{ height: 80 }} />
            </ScrollView>

            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color="white"
                label="Add Expense"
                onPress={() => navigation.navigate('AddExpense')}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    card: {
        marginBottom: 20,
        backgroundColor: 'white',
        elevation: 2,
    },
    budgetContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 5,
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
    },
    sectionTitle: {
        marginBottom: 10,
        fontWeight: 'bold',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    listItem: {
        backgroundColor: 'white',
        marginBottom: 8,
        borderRadius: 8,
        elevation: 1,
    },
    amountText: {
        alignSelf: 'center',
        fontWeight: 'bold',
        marginRight: 10,
        fontSize: 16,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
});

export default DashboardScreen;
