import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { store } from './src/store';
import { theme } from './src/theme';
import AppNavigator from './src/navigation';

const App = () => {
    return (
        <ReduxProvider store={store}>
            <PaperProvider theme={theme}>
                <SafeAreaProvider>
                    <NavigationContainer>
                        <AppNavigator />
                    </NavigationContainer>
                </SafeAreaProvider>
            </PaperProvider>
        </ReduxProvider>
    );
};

export default App;
