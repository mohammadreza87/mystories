import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ResetPassword } from './components/ResetPassword.tsx';
import { EnvTest } from './components/EnvTest.tsx';
import './index.css';

const root = document.getElementById('root');
const isReset = window.location.pathname.includes('reset-callback');
const isEnvTest = window.location.pathname.includes('env-test');

createRoot(root!).render(
  <StrictMode>
    {isEnvTest ? <EnvTest /> : isReset ? <ResetPassword /> : <App />}
  </StrictMode>
);
