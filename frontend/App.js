import React from 'react';
import AppNavigator from './AppNavigator';
import { UserProvider } from './UseContext';

export default function App() {
  return (
    <UserProvider>
      <AppNavigator />
    </UserProvider>
  );
}