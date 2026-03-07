import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { DataServiceProvider } from './services';

test('renderiza a tela de autenticação quando não autenticado', async () => {
  render(
    <DataServiceProvider backend="local">
      <AuthProvider>
        <App />
      </AuthProvider>
    </DataServiceProvider>
  );

  expect(await screen.findByText(/Bem-vindo de volta/i)).toBeInTheDocument();
});
