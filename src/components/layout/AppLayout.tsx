/**
 * Main application layout with navigation.
 * Uses React Router for navigation.
 */

import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bird } from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { Sidebar } from '../Sidebar';
import { BottomNav } from '../BottomNav';

type NavView = 'home' | 'profile' | 'create' | 'subscription' | 'quests';

/**
 * Map route paths to nav view names.
 */
function getViewFromPath(pathname: string): NavView {
  if (pathname.startsWith('/create')) return 'create';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/subscription')) return 'subscription';
  if (pathname.startsWith('/quests')) return 'quests';
  return 'home';
}

/**
 * Map nav view names to route paths.
 */
function getPathFromView(view: NavView): string {
  switch (view) {
    case 'create':
      return '/create';
    case 'profile':
      return '/profile';
    case 'subscription':
      return '/subscription';
    case 'quests':
      return '/quests';
    default:
      return '/';
  }
}

export function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const currentView = getViewFromPath(location.pathname);

  const handleNavigate = (view: NavView) => {
    // Check if authentication is required
    const authRequiredViews: NavView[] = ['create', 'profile', 'subscription', 'quests'];

    if (!user && authRequiredViews.includes(view)) {
      navigate('/auth/login', { state: { from: getPathFromView(view) } });
      return;
    }

    navigate(getPathFromView(view));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 flex items-center justify-center z-40 shadow-lg">
        <div className="flex items-center gap-2">
          <Bird className="w-6 h-6" />
          <span className="font-bold text-lg">Next Tale</span>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-full z-50">
        <Sidebar currentView={currentView} onNavigate={handleNavigate} />
      </div>

      {/* Main Content */}
      <div className="lg:ml-64 pt-14 lg:pt-0 pb-20 lg:pb-0">
        <Outlet />
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden">
        <BottomNav currentView={currentView} onNavigate={handleNavigate} />
      </div>
    </div>
  );
}
