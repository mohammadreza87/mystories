/**
 * Application routing configuration using React Router v7.
 * Centralizes all route definitions for better maintainability.
 */

import { createBrowserRouter, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuth } from '../lib/authContext';

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
  </div>
);

// Lazy loaded components for code splitting
const StoryLibrary = lazy(() =>
  import('../components/StoryLibrary').then((m) => ({ default: m.StoryLibrary }))
);
const StoryDetail = lazy(() =>
  import('../components/StoryDetail').then((m) => ({ default: m.StoryDetail }))
);
const StoryReader = lazy(() =>
  import('../components/StoryReader').then((m) => ({ default: m.StoryReader }))
);
const StoryCreator = lazy(() =>
  import('../components/StoryCreator').then((m) => ({ default: m.StoryCreator }))
);
const Profile = lazy(() =>
  import('../components/Profile').then((m) => ({ default: m.Profile }))
);
const PublicProfile = lazy(() =>
  import('../components/PublicProfile').then((m) => ({ default: m.PublicProfile }))
);
const Subscription = lazy(() =>
  import('../components/Subscription').then((m) => ({ default: m.Subscription }))
);
const Quests = lazy(() =>
  import('../components/Quests').then((m) => ({ default: m.Quests }))
);
const Auth = lazy(() =>
  import('../components/Auth').then((m) => ({ default: m.Auth }))
);
const ComicCreator = lazy(() =>
  import('../components/ComicCreator').then((m) => ({ default: m.ComicCreator }))
);

/**
 * Route path constants for type-safe navigation.
 */
export const ROUTES = {
  HOME: '/',
  STORY_DETAIL: '/story/:storyId',
  STORY_READ: '/story/:storyId/read',
  CREATE: '/create',
  CREATE_COMIC: '/create/comic',
  PROFILE: '/profile',
  USER_PROFILE: '/user/:userId',
  SUBSCRIPTION: '/subscription',
  QUESTS: '/quests',
  AUTH: '/auth',
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
} as const;

/**
 * Helper to build routes with parameters.
 */
export const buildRoute = {
  storyDetail: (storyId: string) => `/story/${storyId}`,
  storyRead: (storyId: string) => `/story/${storyId}/read`,
  userProfile: (userId: string) => `/user/${userId}`,
};

// Wrapper components to bridge React Router params to component props

function StoryLibraryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Suspense fallback={<PageLoader />}>
      <StoryLibrary
        userId={user?.id || ''}
        onSelectStory={(storyId) => navigate(buildRoute.storyDetail(storyId))}
        onViewProfile={(userId) => navigate(buildRoute.userProfile(userId))}
      />
    </Suspense>
  );
}

function StoryDetailPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!storyId) return <Navigate to="/" replace />;

  return (
    <Suspense fallback={<PageLoader />}>
      <StoryDetail
        storyId={storyId}
        userId={user?.id || ''}
        onBack={() => navigate('/')}
        onStartStory={() => navigate(buildRoute.storyRead(storyId))}
      />
    </Suspense>
  );
}

function StoryReaderPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!storyId) return <Navigate to="/" replace />;

  return (
    <Suspense fallback={<PageLoader />}>
      <StoryReader
        storyId={storyId}
        userId={user?.id || ''}
        onComplete={() => navigate('/')}
      />
    </Suspense>
  );
}

function StoryCreatorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/auth/login" state={{ from: '/create' }} replace />;

  return (
    <Suspense fallback={<PageLoader />}>
      <StoryCreator
        userId={user.id}
        onStoryCreated={(storyId) => navigate(buildRoute.storyDetail(storyId))}
      />
    </Suspense>
  );
}

function ComicCreatorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/auth/login" state={{ from: '/create/comic' }} replace />;

  return (
    <Suspense fallback={<PageLoader />}>
      <ComicCreator
        userId={user.id}
        onStoryCreated={(storyId) => navigate(buildRoute.storyRead(storyId))}
      />
    </Suspense>
  );
}

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md space-y-4 text-center">
          <h2 className="text-2xl font-bold text-gray-800">Sign in to view your profile</h2>
          <p className="text-gray-600 text-sm">Access your stories, progress, and quests.</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/auth/login', { state: { from: '/profile' } })}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/auth/signup', { state: { from: '/profile' } })}
              className="w-full py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Profile
        userId={user.id}
        onSelectStory={(storyId) => navigate(buildRoute.storyDetail(storyId))}
      />
    </Suspense>
  );
}

function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  if (!userId) return <Navigate to="/" replace />;

  return (
    <Suspense fallback={<PageLoader />}>
      <PublicProfile
        profileUserId={userId}
        onBack={() => navigate('/')}
        onSelectStory={(storyId) => navigate(buildRoute.storyDetail(storyId))}
      />
    </Suspense>
  );
}

function SubscriptionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/auth/login" state={{ from: '/subscription' }} replace />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Subscription
        userId={user.id}
        onBack={() => navigate('/')}
      />
    </Suspense>
  );
}

function QuestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/auth/login" state={{ from: '/quests' }} replace />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Quests
        userId={user.id}
        onBack={() => navigate('/')}
      />
    </Suspense>
  );
}

function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSignup = location.pathname === '/auth/signup';
  const from = (location.state as { from?: string })?.from || '/';

  return (
    <Suspense fallback={<PageLoader />}>
      <Auth
        initialMode={isSignup ? 'signup' : 'login'}
        onAuthSuccess={() => navigate(from, { replace: true })}
      />
    </Suspense>
  );
}

/**
 * Application router configuration.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <StoryLibraryPage />,
      },
      {
        path: 'story/:storyId',
        element: <StoryDetailPage />,
      },
      {
        path: 'story/:storyId/read',
        element: <StoryReaderPage />,
      },
      {
        path: 'create',
        element: <StoryCreatorPage />,
      },
      {
        path: 'create/comic',
        element: <ComicCreatorPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'user/:userId',
        element: <PublicProfilePage />,
      },
      {
        path: 'subscription',
        element: <SubscriptionPage />,
      },
      {
        path: 'quests',
        element: <QuestsPage />,
      },
      {
        path: 'auth',
        children: [
          {
            index: true,
            element: <Navigate to="/auth/login" replace />,
          },
          {
            path: 'login',
            element: <AuthPage />,
          },
          {
            path: 'signup',
            element: <AuthPage />,
          },
        ],
      },
    ],
  },
  {
    // Catch-all redirect to home
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
