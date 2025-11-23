# 🎮 Gamification Implementation Examples

## Example 1: Reading Streak Component

Here's how you would implement the reading streak feature:

### Database Migration
```sql
-- Add to a new migration file: add_gamification_features.sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS reading_streak_current INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS reading_streak_best INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_reading_date DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS streak_freeze_tokens INTEGER DEFAULT 2;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_stories_completed INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS experience_points INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS user_level INTEGER DEFAULT 1;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS story_points INTEGER DEFAULT 0;

-- Create achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(100) NOT NULL,
  achievement_name VARCHAR(255) NOT NULL,
  achievement_description TEXT,
  achievement_icon VARCHAR(50),
  earned_at TIMESTAMP DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  max_progress INTEGER DEFAULT 1,
  level INTEGER DEFAULT 1,
  UNIQUE(user_id, achievement_id)
);

-- Add indexes
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_earned_at ON user_achievements(earned_at DESC);
```

### React Component: StreakDisplay.tsx
```tsx
import React, { useEffect, useState } from 'react';
import { Flame, Snowflake, TrendingUp, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StreakData {
  current_streak: number;
  best_streak: number;
  last_reading_date: string | null;
  freeze_tokens: number;
}

export function StreakDisplay({ userId }: { userId: string }) {
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    loadStreakData();
  }, [userId]);

  const loadStreakData = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('reading_streak_current, reading_streak_best, last_reading_date, streak_freeze_tokens')
      .eq('id', userId)
      .single();

    if (data) {
      setStreakData({
        current_streak: data.reading_streak_current || 0,
        best_streak: data.reading_streak_best || 0,
        last_reading_date: data.last_reading_date,
        freeze_tokens: data.streak_freeze_tokens || 2
      });

      // Check if streak was just extended
      const today = new Date().toISOString().split('T')[0];
      if (data.last_reading_date === today && data.reading_streak_current > 0) {
        setShowAnimation(true);
        setTimeout(() => setShowAnimation(false), 2000);
      }
    }
  };

  const getStreakColor = (streak: number) => {
    if (streak === 0) return 'text-gray-400';
    if (streak < 7) return 'text-orange-500';
    if (streak < 30) return 'text-red-500';
    if (streak < 100) return 'text-purple-500';
    return 'text-blue-500';
  };

  const getStreakEmoji = (streak: number) => {
    if (streak >= 100) return '💎';
    if (streak >= 30) return '⭐';
    if (streak >= 7) return '🔥';
    return '✨';
  };

  if (!streakData) return null;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4">
      {/* Current Streak */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`relative ${showAnimation ? 'animate-bounce' : ''}`}>
            <Flame
              className={`w-10 h-10 ${getStreakColor(streakData.current_streak)}`}
              fill={streakData.current_streak > 0 ? 'currentColor' : 'none'}
            />
            {streakData.current_streak > 0 && (
              <span className="absolute -top-1 -right-1 text-2xl">
                {getStreakEmoji(streakData.current_streak)}
              </span>
            )}
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">
              {streakData.current_streak}
            </p>
            <p className="text-xs text-gray-600">Day Streak</p>
          </div>
        </div>

        {/* Freeze Tokens */}
        <div className="flex items-center space-x-1">
          {[...Array(streakData.freeze_tokens)].map((_, i) => (
            <Snowflake
              key={i}
              className="w-5 h-5 text-blue-400"
              fill="currentColor"
            />
          ))}
          <span className="text-xs text-gray-600 ml-1">
            Freezes
          </span>
        </div>
      </div>

      {/* Best Streak */}
      {streakData.best_streak > 0 && (
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-600">Best Streak:</span>
          </div>
          <span className="text-sm font-bold text-gray-800">
            {streakData.best_streak} days
          </span>
        </div>
      )}

      {/* Milestone Celebration */}
      {showAnimation && streakData.current_streak % 7 === 0 && (
        <div className="mt-3 p-3 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl">
          <p className="text-sm font-bold text-orange-800 text-center">
            🎉 {streakData.current_streak} Day Milestone! 🎉
          </p>
        </div>
      )}
    </div>
  );
}
```

### Points & Rewards System Component
```tsx
import React, { useState, useEffect } from 'react';
import { Coins, Gift, Star, TrendingUp } from 'lucide-react';

interface PointsData {
  story_points: number;
  level: number;
  next_level_xp: number;
  current_xp: number;
}

export function PointsDisplay({ userId }: { userId: string }) {
  const [points, setPoints] = useState<PointsData | null>(null);
  const [showEarned, setShowEarned] = useState<number | null>(null);

  // Function to award points with animation
  const awardPoints = async (amount: number, reason: string) => {
    setShowEarned(amount);

    // Update database
    await supabase
      .from('user_profiles')
      .update({
        story_points: (points?.story_points || 0) + amount,
        experience_points: (points?.current_xp || 0) + amount
      })
      .eq('id', userId);

    // Show animation
    setTimeout(() => setShowEarned(null), 2000);

    // Check for level up
    checkLevelUp();
  };

  const checkLevelUp = () => {
    if (points && points.current_xp >= points.next_level_xp) {
      // Level up celebration!
      showLevelUpModal();
    }
  };

  const getLevelTitle = (level: number) => {
    const titles = [
      "Story Seedling 🌱",
      "Page Turner 📖",
      "Chapter Champion 🏅",
      "Plot Master 🎯",
      "Narrative Ninja 🥷",
      "Epic Explorer 🗺️",
      "Legend Weaver 🕸️",
      "Myth Maker 🔮",
      "Saga Sage 🧙",
      "Story Sovereign 👑"
    ];
    return titles[Math.floor((level - 1) / 10)] || titles[titles.length - 1];
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-4">
      {/* Points Display */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Coins className="w-6 h-6 text-yellow-500" />
          <span className="text-2xl font-bold text-gray-800">
            {points?.story_points || 0}
          </span>
          <span className="text-sm text-gray-600">SP</span>
        </div>

        {/* Points Animation */}
        {showEarned && (
          <div className="animate-float-up text-green-500 font-bold">
            +{showEarned}
          </div>
        )}
      </div>

      {/* Level Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Level {points?.level || 1}
          </span>
          <span className="text-xs text-gray-600">
            {getLevelTitle(points?.level || 1)}
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
            style={{
              width: `${((points?.current_xp || 0) / (points?.next_level_xp || 100)) * 100}%`
            }}
          />
        </div>

        <p className="text-xs text-gray-600 text-right">
          {points?.current_xp || 0} / {points?.next_level_xp || 100} XP
        </p>
      </div>
    </div>
  );
}
```

### Achievement System Example
```tsx
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  maxProgress: number;
  earned: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export function AchievementCard({ achievement }: { achievement: Achievement }) {
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-400 to-orange-500';
      case 'epic': return 'from-purple-400 to-pink-500';
      case 'rare': return 'from-blue-400 to-cyan-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  return (
    <div className={`
      relative p-4 rounded-xl shadow-lg
      ${achievement.earned ? 'bg-gradient-to-br ' + getRarityColor(achievement.rarity) : 'bg-gray-100'}
      ${achievement.earned ? 'animate-shine' : 'opacity-75'}
      transform transition-all hover:scale-105
    `}>
      {/* Icon */}
      <div className="text-4xl text-center mb-2">
        {achievement.icon}
      </div>

      {/* Name */}
      <h3 className={`font-bold text-sm text-center ${achievement.earned ? 'text-white' : 'text-gray-700'}`}>
        {achievement.name}
      </h3>

      {/* Description */}
      <p className={`text-xs text-center mt-1 ${achievement.earned ? 'text-white/90' : 'text-gray-600'}`}>
        {achievement.description}
      </p>

      {/* Progress Bar */}
      {!achievement.earned && (
        <div className="mt-3">
          <div className="w-full bg-gray-300 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full"
              style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 text-center mt-1">
            {achievement.progress} / {achievement.maxProgress}
          </p>
        </div>
      )}

      {/* Earned Badge */}
      {achievement.earned && (
        <div className="absolute -top-2 -right-2 bg-white rounded-full p-1">
          <Star className="w-5 h-5 text-yellow-500" fill="currentColor" />
        </div>
      )}
    </div>
  );
}
```

### Daily Challenge Component
```tsx
interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  reward: number;
  completed: boolean;
  expiresAt: Date;
}

export function DailyChallengeCard() {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    // Update countdown timer
    const interval = setInterval(() => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);

      const diff = midnight.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`${hours}h ${minutes}m`);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">Daily Challenges</h3>
        <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded-full">
          Resets in {timeLeft}
        </span>
      </div>

      <div className="space-y-2">
        {challenges.map(challenge => (
          <div
            key={challenge.id}
            className={`
              p-3 rounded-lg border-2 transition-all
              ${challenge.completed
                ? 'bg-green-100 border-green-300'
                : 'bg-white border-gray-200 hover:border-green-300'}
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className={`font-medium text-sm ${challenge.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                  {challenge.title}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {challenge.description}
                </p>
              </div>

              <div className="flex items-center space-x-2 ml-3">
                <div className="flex items-center space-x-1">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-bold text-gray-800">
                    +{challenge.reward}
                  </span>
                </div>

                {challenge.completed && (
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Completion Bonus */}
      {challenges.every(c => c.completed) && (
        <div className="mt-3 p-3 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl">
          <p className="text-sm font-bold text-orange-800 text-center">
            🎉 All challenges complete! Bonus +100 SP earned! 🎉
          </p>
        </div>
      )}
    </div>
  );
}
```

## Example 2: Leaderboard Implementation

### Simple Weekly Leaderboard
```tsx
interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string;
  score: number;
  trend: 'up' | 'down' | 'same';
}

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);

  const getMedal = (rank: number) => {
    switch(rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Weekly Readers
      </h2>

      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.user_id}
            className={`
              flex items-center justify-between p-3 rounded-lg
              ${entry.user_id === currentUserId ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50'}
            `}
          >
            {/* Rank & User */}
            <div className="flex items-center space-x-3">
              <span className="text-lg font-bold text-gray-700 w-8">
                {getMedal(entry.rank) || `#${entry.rank}`}
              </span>

              <img
                src={entry.avatar_url || '/default-avatar.png'}
                className="w-8 h-8 rounded-full"
              />

              <span className="font-medium text-gray-800">
                {entry.display_name}
              </span>
            </div>

            {/* Score & Trend */}
            <div className="flex items-center space-x-2">
              <span className="font-bold text-gray-800">
                {entry.score}
              </span>
              {entry.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
              {entry.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
            </div>
          </div>
        ))}
      </div>

      {/* User's Rank if not in top 10 */}
      {userRank && userRank > 10 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span className="font-medium text-gray-800">Your Rank</span>
            <span className="font-bold text-blue-600">#{userRank}</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

## CSS Animations to Add

```css
/* Add to your global CSS */
@keyframes shine {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

.animate-shine {
  background-size: 200% auto;
  animation: shine 3s linear infinite;
}

@keyframes float-up {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(-50px);
    opacity: 0;
  }
}

.animate-float-up {
  animation: float-up 1s ease-out;
}

@keyframes celebration {
  0%, 100% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.1) rotate(5deg); }
  75% { transform: scale(1.1) rotate(-5deg); }
}

.animate-celebration {
  animation: celebration 0.5s ease-in-out;
}

/* Confetti animation for big achievements */
@keyframes confetti-fall {
  0% {
    transform: translateY(-100vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

.confetti {
  position: fixed;
  width: 10px;
  height: 10px;
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4);
  animation: confetti-fall 3s ease-in-out;
}
```

## Edge Function for Points & Achievements

```typescript
// supabase/functions/award-achievement/index.ts
import { createClient } from '@supabase/supabase-js';

interface AchievementCheck {
  id: string;
  name: string;
  description: string;
  icon: string;
  checkFunction: (stats: UserStats) => boolean;
  maxProgress: number;
  points: number;
}

const achievements: AchievementCheck[] = [
  {
    id: 'first_story',
    name: 'First Steps',
    description: 'Complete your first story',
    icon: '👶',
    checkFunction: (stats) => stats.stories_completed >= 1,
    maxProgress: 1,
    points: 50
  },
  {
    id: 'bookworm_bronze',
    name: 'Bookworm Bronze',
    description: 'Read 5 stories',
    icon: '📚',
    checkFunction: (stats) => stats.stories_completed >= 5,
    maxProgress: 5,
    points: 100
  },
  {
    id: 'week_streak',
    name: 'Week Warrior',
    description: 'Maintain a 7-day reading streak',
    icon: '🔥',
    checkFunction: (stats) => stats.current_streak >= 7,
    maxProgress: 7,
    points: 200
  },
  // Add more achievements...
];

export async function checkAndAwardAchievements(userId: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get user stats
  const { data: userStats } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!userStats) return;

  // Get existing achievements
  const { data: existingAchievements } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);

  const earnedIds = existingAchievements?.map(a => a.achievement_id) || [];

  // Check each achievement
  const newAchievements = [];
  let totalPointsEarned = 0;

  for (const achievement of achievements) {
    if (!earnedIds.includes(achievement.id) && achievement.checkFunction(userStats)) {
      // Award achievement!
      newAchievements.push({
        user_id: userId,
        achievement_id: achievement.id,
        achievement_name: achievement.name,
        achievement_description: achievement.description,
        achievement_icon: achievement.icon,
        progress: achievement.maxProgress,
        max_progress: achievement.maxProgress
      });

      totalPointsEarned += achievement.points;
    }
  }

  // Insert new achievements
  if (newAchievements.length > 0) {
    await supabase
      .from('user_achievements')
      .insert(newAchievements);

    // Award points
    await supabase
      .from('user_profiles')
      .update({
        story_points: userStats.story_points + totalPointsEarned
      })
      .eq('id', userId);

    return newAchievements;
  }

  return [];
}
```

These examples show practical implementations you can add to your app. Start with the streak system and points, then gradually add more features!