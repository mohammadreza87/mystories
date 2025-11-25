/**
 * Main application entry point.
 * Uses React Router for navigation and AuthProvider for authentication.
 */

import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './lib/authContext';
import { router } from './routes';

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
