import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Title, HelperText } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../store/authSlice';
import { RootState, AppDispatch } from '../store';
import { useNavigation } from '@react-navigation/native';

const RegisterScreen = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const dispatch = useDispatch<AppDispatch>();
    const { loading, error } = useSelector((state: RootState) => state.auth);
    const navigation = useNavigation();

    const handleRegister = () => {
        dispatch(registerUser({ username, email, password }));
    };

    return (
        <View style={styles.container}>
            <Title style={styles.title}>Create Account</Title>

            <TextInput
                label="Username"
                value={username}
                onChangeText={setUsername}
                mode="outlined"
                style={styles.input}
            />

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
                onPress={handleRegister}
                loading={loading}
                disabled={loading}
                style={styles.button}
                contentStyle={{ height: 50 }}
            >
                Sign Up
            </Button>

            <Button
                mode="text"
                onPress={() => navigation.navigate('Login')}
                style={styles.textButton}
            >
                Already have an account? Login
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

export default RegisterScreen;
