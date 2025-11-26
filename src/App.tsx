/**
 * Main application entry point.
 * Uses React Router for navigation and AuthProvider for authentication.
 * Wrapped with ErrorBoundary for error handling and ToastProvider for notifications.
 */

import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './lib/authContext';
import { router } from './routes';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
