import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Title, HelperText } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../store/authSlice';
import { RootState, AppDispatch } from '../store';
import { useNavigation } from '@react-navigation/native';

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const dispatch = useDispatch<AppDispatch>();
    const { loading, error } = useSelector((state: RootState) => state.auth);
    const navigation = useNavigation();

    const handleLogin = () => {
        dispatch(loginUser({ email, password }));
    };

    return (
        <View style={styles.container}>
            <Title style={styles.title}>Welcome Back</Title>

            <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
            />

            <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry
                style={styles.input}
            />

            {error && <HelperText type="error" visible={true}>{error}</HelperText>}

            <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.button}
                contentStyle={{ height: 50 }}
            >
                Login
            </Button>

            <Button
                mode="text"
                onPress={() => navigation.navigate('Register')}
                style={styles.textButton}
            >
                Don't have an account? Sign Up
            </Button>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
    },
    input: {
        marginBottom: 15,
    },
    button: {
        marginTop: 10,
    },
    textButton: {
        marginTop: 20,
    }
});

export default LoginScreen;
