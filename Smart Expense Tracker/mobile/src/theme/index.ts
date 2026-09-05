import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: '#6200EE',
        secondary: '#03DAC6',
        error: '#B00020',
        background: '#F5F5F5',
        surface: '#FFFFFF',
        text: '#000000',
    },
    roundness: 8,
};
