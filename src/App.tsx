import { useState, useEffect } from 'react';
import { Bird } from 'lucide-react';
import { StoryLibrary } from './components/StoryLibrary';
import { StoryReader } from './components/StoryReader';
import { StoryDetail } from './components/StoryDetail';
import { Profile } from './components/Profile';
import { PublicProfile } from './components/PublicProfile';
import { StoryCreator } from './components/StoryCreator';
import { Subscription } from './components/Subscription';
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { Auth } from './components/Auth';
import { Quests } from './components/Quests';
import { AuthProvider, useAuth } from './lib/authContext';

function AppContent() {
  const { user, loading } = useAuth();
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [viewingStoryDetail, setViewingStoryDetail] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'profile' | 'profile-view' | 'create' | 'subscription' | 'quests' | 'auth'>('home');
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Handle shared story links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const storyParam = params.get('story');
    if (storyParam) {
      // Some share targets append extra text after the id; extract a clean UUID-looking value
      const uuidMatch = storyParam.match(/[0-9a-fA-F-]{36}/);
      const storyId = uuidMatch ? uuidMatch[0] : storyParam.trim().split(/\s+/)[0];
      setSelectedStoryId(storyId);
      setViewingStoryDetail(true);
      // Clean up the URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleSelectStory = (storyId: string) => {
    setSelectedStoryId(storyId);
    setViewingStoryDetail(true);
  };

  const handleStartStory = () => {
    setViewingStoryDetail(false);
  };

  const handleBackToLibrary = () => {
    setSelectedStoryId(null);
    setViewingStoryDetail(false);
  };

  const handleBackToDetail = () => {
    setViewingStoryDetail(true);
  };

  const handleNavigate = (view: 'home' | 'profile' | 'profile-view' | 'create' | 'subscription' | 'quests' | 'auth') => {
    if (!user && (view === 'create' || view === 'profile' || view === 'subscription' || view === 'quests' || view === 'profile-view')) {
      setAuthMode('login');
      setCurrentView('auth');
      return;
    }
    setCurrentView(view);
    setSelectedStoryId(null);
    setViewingStoryDetail(false);
    if (view !== 'profile-view') {
      setViewProfileUserId(null);
    }
  };

  const handleStoryCreated = (storyId: string) => {
    setSelectedStoryId(storyId);
    setViewingStoryDetail(true);
  };

  const handleViewProfile = (profileUserId: string) => {
    setViewProfileUserId(profileUserId);
    setCurrentView('profile-view');
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
          <span className="font-bold text-lg">MyStories</span>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-full z-50">
        <Sidebar currentView={currentView} onNavigate={handleNavigate} />
      </div>

      <div className="lg:ml-64 pt-14 lg:pt-0 pb-20 lg:pb-0">
        {selectedStoryId && viewingStoryDetail ? (
          <StoryDetail
            storyId={selectedStoryId}
            userId={user?.id || ''}
            onBack={handleBackToLibrary}
            onStartStory={handleStartStory}
          />
        ) : selectedStoryId ? (
          <StoryReader
            storyId={selectedStoryId}
            userId={user?.id || ''}
            onComplete={handleBackToLibrary}
          />
        ) : currentView === 'home' ? (
          <StoryLibrary onSelectStory={handleSelectStory} onViewProfile={handleViewProfile} userId={user?.id || ''} />
        ) : currentView === 'auth' ? (
          <Auth initialMode={authMode} onAuthSuccess={() => setCurrentView('create')} />
        ) : currentView === 'create' ? (
          user ? (
            <StoryCreator userId={user.id} onStoryCreated={handleStoryCreated} />
          ) : (
            <Auth onAuthSuccess={() => setCurrentView('create')} />
          )
        ) : currentView === 'subscription' ? (
          user ? (
            <Subscription userId={user.id} onBack={() => handleNavigate('home')} />
          ) : (
            <Auth onAuthSuccess={() => setCurrentView('subscription')} />
          )
        ) : currentView === 'quests' ? (
          user ? (
            <Quests userId={user.id} onBack={() => handleNavigate('home')} />
          ) : (
            <Auth onAuthSuccess={() => setCurrentView('quests')} />
          )
        ) : currentView === 'profile' ? (
          user ? (
            <Profile userId={user.id} onSelectStory={handleSelectStory} />
          ) : (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center px-4">
              <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md space-y-4 text-center">
                <h2 className="text-2xl font-bold text-gray-800">Sign in to view your profile</h2>
                <p className="text-gray-600 text-sm">Access your stories, progress, and quests.</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setCurrentView('auth');
                    }}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode('signup');
                      setCurrentView('auth');
                    }}
                    className="w-full py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            </div>
          )
        ) : currentView === 'profile-view' ? (
          viewProfileUserId ? (
            <PublicProfile profileUserId={viewProfileUserId} onBack={() => handleNavigate('home')} onSelectStory={handleSelectStory} />
          ) : (
            <StoryLibrary onSelectStory={handleSelectStory} onViewProfile={handleViewProfile} userId={user?.id || ''} />
          )
        ) : (
          <StoryLibrary onSelectStory={handleSelectStory} userId={user?.id || ''} />
        )}
      </div>

      <div className="lg:hidden">
        <BottomNav currentView={currentView} onNavigate={handleNavigate} />
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
