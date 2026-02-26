/**
 * App Entry Point
 */

import React from 'react';
import { AuthProvider } from './hooks';
import { AppNavigator } from './navigation';

export default function App() {
    return (
        <AuthProvider>
            <AppNavigator />
        </AuthProvider>
    );
}
