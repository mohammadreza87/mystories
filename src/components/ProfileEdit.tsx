import { useState, useEffect } from 'react';
import { X, Camera, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/authContext';

interface ProfileEditProps {
  onClose: () => void;
  onSave: () => void;
}

interface UserProfile {
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  is_profile_public: boolean;
}

export function ProfileEdit({ onClose, onSave }: ProfileEditProps) {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isProfilePublic, setIsProfilePublic] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usernameError, setUsernameError] = useState('');

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, display_name, bio, avatar_url, is_profile_public')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setUsername(data.username || '');
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || '');
        setIsProfilePublic(data.is_profile_public ?? true);
      } else {
        setDisplayName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user!.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(data.publicUrl);
    } catch (error) {
      alert('Error uploading avatar');
      console.error('Error:', error);
    } finally {
      setUploading(false);
    }
  };

  const validateUsername = (value: string): boolean => {
    setUsernameError('');

    if (!value) {
      setUsernameError('Username is required');
      return false;
    }

    if (value.length < 3 || value.length > 20) {
      setUsernameError('Username must be 3-20 characters');
      return false;
    }

    if (!/^[a-z0-9_]+$/.test(value)) {
      setUsernameError('Username can only contain lowercase letters, numbers, and underscores');
      return false;
    }

    return true;
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value.toLowerCase());
    validateUsername(value.toLowerCase());
  };

  const handleSave = async () => {
    if (!user) return;

    if (!validateUsername(username)) {
      return;
    }

    try {
      setSaving(true);

      const profileData: UserProfile = {
        username: username,
        display_name: displayName,
        bio: bio,
        avatar_url: avatarUrl,
        is_profile_public: isProfilePublic,
      };

      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', user.id);

        if (error) {
          if (error.code === '23505') {
            setUsernameError('Username is already taken');
            return;
          }
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('profiles')
          .insert({ id: user.id, ...profileData });

        if (error) {
          if (error.code === '23505') {
            setUsernameError('Username is already taken');
            return;
          }
          throw error;
        }
      }

      onSave();
      onClose();
    } catch (error) {
      alert('Error saving profile');
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md">
          <div className="flex justify-center">
            <Loader className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl text-white font-bold">
                    {displayName.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-blue-500 text-white p-3 rounded-full cursor-pointer hover:bg-blue-600 transition-colors shadow-lg"
              >
                {uploading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-sm text-gray-500 mt-2">Click camera to change photo</p>
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                maxLength={20}
                className={`w-full pl-8 pr-4 py-3 border-2 rounded-xl focus:outline-none ${
                  usernameError ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="username"
              />
            </div>
            {usernameError ? (
              <p className="text-xs text-red-500 mt-1">{usernameError}</p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, and underscores only (3-20 chars)</p>
            )}
          </div>

          <div>
            <label htmlFor="display-name" className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              placeholder="Your name"
            />
            <p className="text-xs text-gray-500 mt-1">{displayName.length}/50</p>
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={150}
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
              placeholder="Tell us about yourself..."
            />
            <p className="text-xs text-gray-500 mt-1">{bio.length}/150</p>
          </div>

          <div>
            <label className="flex items-center justify-between p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <div>
                <span className="block text-sm font-medium text-gray-700">Public Profile</span>
                <span className="text-xs text-gray-500">Allow others to see your profile and stories</span>
              </div>
              <input
                type="checkbox"
                checked={isProfilePublic}
                onChange={(e) => setIsProfilePublic(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {saving ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
