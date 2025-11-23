import { useState } from 'react';
import { Home, User, Menu, X, Bird, PlusCircle, Crown, Sparkles } from 'lucide-react';

interface SidebarProps {
  currentView: 'home' | 'profile' | 'create' | 'subscription' | 'quests';
  onNavigate: (view: 'home' | 'profile' | 'create' | 'subscription' | 'quests') => void;
}

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleNavigate = (view: 'home' | 'profile' | 'create' | 'subscription') => {
    onNavigate(view);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={toggleSidebar}
        className="fixed top-5 left-5 z-[100] p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-110 active:scale-95"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Menu className="w-6 h-6 text-white" />
        )}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-white shadow-2xl z-[90] transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } w-64`}
      >
        <div className="flex flex-col h-full">
          <div className="pt-20 px-6 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                <Bird className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">MyStories</h2>
                <p className="text-xs text-gray-500">YA Interactive Adventures</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleNavigate('home')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    currentView === 'home'
                      ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Home className={`w-5 h-5 ${currentView === 'home' ? 'fill-blue-600' : ''}`} />
                  <span>Home</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigate('create')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    currentView === 'create'
                      ? 'bg-purple-50 text-purple-600 font-semibold shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <PlusCircle className={`w-5 h-5 ${currentView === 'create' ? 'fill-purple-600' : ''}`} />
                  <span>Create Story</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigate('subscription')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    currentView === 'subscription'
                      ? 'bg-yellow-50 text-yellow-600 font-semibold shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Crown className={`w-5 h-5 ${currentView === 'subscription' ? 'fill-yellow-600' : ''}`} />
                  <span>Upgrade to Pro</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigate('quests')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    currentView === 'quests'
                      ? 'bg-green-50 text-green-600 font-semibold shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Sparkles className={`w-5 h-5 ${currentView === 'quests' ? 'fill-green-600' : ''}`} />
                  <span>Quests</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigate('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    currentView === 'profile'
                      ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <User className={`w-5 h-5 ${currentView === 'profile' ? 'fill-blue-600' : ''}`} />
                  <span>Profile</span>
                </button>
              </li>
            </ul>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Choose your own adventure
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
