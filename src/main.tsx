import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ResetPassword } from './components/ResetPassword.tsx';
import './index.css';

const root = document.getElementById('root');
const isReset = window.location.pathname.includes('reset-callback');

createRoot(root!).render(
  <StrictMode>
    {isReset ? <ResetPassword /> : <App />}
  </StrictMode>
);
