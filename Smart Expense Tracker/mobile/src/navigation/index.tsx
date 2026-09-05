import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { loadUser } from '../store/authSlice';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import GroupListScreen from '../screens/GroupListScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import SettleUpScreen from '../screens/SettleUpScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
    const theme = useTheme();
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ color, size }) => {
                    let iconName = 'circle';
                    if (route.name === 'DashboardTab') iconName = 'view-dashboard';
                    else if (route.name === 'GroupsTab') iconName = 'account-group';
                    return <Icon name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: 'gray',
            })}
        >
            <Tab.Screen name="DashboardTab" component={DashboardScreen} options={{ title: 'Home' }} />
            <Tab.Screen name="GroupsTab" component={GroupListScreen} options={{ title: 'Groups' }} />
        </Tab.Navigator>
    );
};

const AppNavigator = () => {
    const dispatch = useDispatch();
    const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
        dispatch(loadUser() as any);
    }, [dispatch]);

    if (loading) {
        return <View><Text>Loading...</Text></View>;
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isAuthenticated ? (
                <>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                </>
            ) : (
                <>
                    <Stack.Screen name="Main" component={TabNavigator} />
                    <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
                    <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
                    <Stack.Screen name="SettleUp" component={SettleUpScreen} />
                </>
            )}
        </Stack.Navigator>
    );
};

export default AppNavigator;
