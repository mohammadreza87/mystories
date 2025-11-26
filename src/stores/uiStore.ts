/**
 * UI store using Zustand.
 * Manages global UI state like modals and loading states.
 *
 * NOTE: For toast notifications, use useToast() from '../components/Toast'
 */

import { create } from 'zustand';

interface UIState {
  // Modal state
  upgradeModalOpen: boolean;
  authModalOpen: boolean;
  authModalMode: 'login' | 'signup';

  // Loading states
  globalLoading: boolean;

  // Actions
  openUpgradeModal: () => void;
  closeUpgradeModal: () => void;
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  setGlobalLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  upgradeModalOpen: false,
  authModalOpen: false,
  authModalMode: 'login',
  globalLoading: false,

  openUpgradeModal: () => set({ upgradeModalOpen: true }),
  closeUpgradeModal: () => set({ upgradeModalOpen: false }),

  openAuthModal: (mode = 'login') => set({ authModalOpen: true, authModalMode: mode }),
  closeAuthModal: () => set({ authModalOpen: false }),

  setGlobalLoading: (loading) => set({ globalLoading: loading }),
}));
