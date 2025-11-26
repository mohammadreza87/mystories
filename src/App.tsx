/**
 * Main application entry point.
 * Uses React Router for navigation and AuthProvider for authentication.
 * Wrapped with ErrorBoundary for error handling, ToastProvider for notifications,
 * QueryClientProvider for data caching, and HelmetProvider for SEO.
 */

import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './lib/authContext';
import { queryClient } from './lib/queryClient';
import { router } from './routes';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
          </ToastProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
