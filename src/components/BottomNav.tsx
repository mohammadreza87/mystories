import { Home, User, PlusCircle, Crown, Sparkles } from 'lucide-react';

interface BottomNavProps {
  currentView: 'home' | 'profile' | 'create' | 'subscription' | 'quests';
  onNavigate: (view: 'home' | 'profile' | 'create' | 'subscription' | 'quests') => void;
}

export function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        <button
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            currentView === 'home'
              ? 'text-blue-600'
              : 'text-gray-500'
          }`}
        >
          <Home className={`w-6 h-6 ${currentView === 'home' ? 'fill-blue-600' : ''}`} />
          <span className="text-xs mt-1 font-medium">Home</span>
        </button>

        <button
          onClick={() => onNavigate('create')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            currentView === 'create'
              ? 'text-purple-600'
              : 'text-gray-500'
          }`}
        >
          <PlusCircle className={`w-6 h-6 ${currentView === 'create' ? 'fill-purple-600' : ''}`} />
          <span className="text-xs mt-1 font-medium">Create</span>
        </button>

        <button
          onClick={() => onNavigate('subscription')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            currentView === 'subscription'
              ? 'text-yellow-600'
              : 'text-gray-500'
          }`}
        >
          <Crown className={`w-6 h-6 ${currentView === 'subscription' ? 'fill-yellow-600' : ''}`} />
          <span className="text-xs mt-1 font-medium">Pro</span>
        </button>

        <button
          onClick={() => onNavigate('quests')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            currentView === 'quests'
              ? 'text-green-600'
              : 'text-gray-500'
          }`}
        >
          <Sparkles className={`w-6 h-6 ${currentView === 'quests' ? 'fill-green-600' : ''}`} />
          <span className="text-xs mt-1 font-medium">Quests</span>
        </button>

        <button
          onClick={() => onNavigate('profile')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            currentView === 'profile'
              ? 'text-blue-600'
              : 'text-gray-500'
          }`}
        >
          <User className={`w-6 h-6 ${currentView === 'profile' ? 'fill-blue-600' : ''}`} />
          <span className="text-xs mt-1 font-medium">Profile</span>
        </button>
      </div>
    </div>
  );
}
