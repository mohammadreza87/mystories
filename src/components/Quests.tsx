import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Flame, Sparkles, CheckCircle2, Clock, PlusCircle, BookOpen } from 'lucide-react';
import { getQuests, Quest } from '../lib/questsService';

interface Quest {
  id: string;
  title: string;
  type: 'daily' | 'weekly';
  description: string;
  reward: number;
  progress: number;
  target: number;
}

interface QuestsProps {
  userId: string;
  onBack: () => void;
}

export function Quests({ onBack }: QuestsProps) {
  const [loading, setLoading] = useState(true);
  const [questsData, setQuestsData] = useState<Quest[]>([]);
  const [streak, setStreak] = useState<{ current_streak: number; longest_streak: number }>({
    current_streak: 0,
    longest_streak: 0
  });
  const [points, setPoints] = useState(0);

  const questMeta = useMemo(() => ({
    read_chapter: {
      title: 'Read 2 Chapters',
      description: 'Read any two chapters today.',
      reward: 10,
      quest_type: 'daily' as const,
      target: 2,
    },
    create_story: {
      title: 'Create a Story',
      description: 'Generate a new story today.',
      reward: 15,
      quest_type: 'daily' as const,
      target: 1,
    },
    complete_story: {
      title: 'Finish a Story',
      description: 'Reach an ending in any story this week.',
      reward: 30,
      quest_type: 'weekly' as const,
      target: 1,
    },
  }), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { quests, streak, points } = await getQuests();
        if (!mounted) return;
        setQuestsData(quests);
        setStreak({ current_streak: streak.current_streak || 0, longest_streak: streak.longest_streak || 0 });
        setPoints(points || 0);
      } catch (error) {
        console.error('Failed to load quests', error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const displayQuests: (Quest & { title: string; description: string; reward_points: number; quest_type: 'daily' | 'weekly'; target: number })[] = questsData.length
    ? questsData.map((q) => ({
        ...q,
        title: questMeta[q.task]?.title || q.task,
        description: questMeta[q.task]?.description || '',
        reward_points: q.reward_points || questMeta[q.task]?.reward || 0,
        quest_type: q.quest_type,
        target: q.target || questMeta[q.task]?.target || 1,
      }))
    : Object.entries(questMeta).map(([task, meta]) => ({
        id: `placeholder-${task}`,
        task: task as Quest['task'],
        quest_type: meta.quest_type,
        period_start: '',
        period_end: '',
        progress: 0,
        target: meta.target,
        status: 'pending' as const,
        reward_points: meta.reward,
        rewarded: false,
        title: meta.title,
        description: meta.description,
      }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 pb-20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-700">
          <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-sm font-semibold">Loading quests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>

        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6 flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-amber-600 font-semibold">
              <Flame className="w-5 h-5" />
              <span>Streaks</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{streak.current_streak} days</div>
            <p className="text-sm text-gray-600">Longest streak: {streak.longest_streak} days</p>
          </div>
          <div className="flex gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold">
              🔥
            </div>
            <div className="w-20 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold">
              ⭐ {points}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Daily Quests</h2>
          </div>
          {displayQuests.filter(q => q.quest_type === 'daily').map((quest) => {
            const isDone = (quest.progress || 0) >= quest.target;
            const pct = Math.min(100, ((quest.progress || 0) / quest.target) * 100);
            return (
              <div
                key={quest.id}
                className="p-4 rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-blue-50 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {quest.task === 'read_chapter' ? (
                      <BookOpen className="w-5 h-5 text-blue-600 mt-1" />
                    ) : (
                      <PlusCircle className="w-5 h-5 text-blue-600 mt-1" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{quest.title}</p>
                      <p className="text-xs text-gray-600">{quest.description}</p>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-green-600">+{quest.reward_points} pts</div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>{quest.progress}/{quest.target}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                {isDone && (
                  <div className="mt-3 text-right text-xs font-semibold text-green-600">
                    Completed
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-white rounded-3xl shadow-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Weekly Quest</h2>
          </div>
          {displayQuests.filter(q => q.quest_type === 'weekly').map((quest) => {
            const isDone = (quest.progress || 0) >= quest.target;
            const pct = Math.min(100, ((quest.progress || 0) / quest.target) * 100);
            return (
              <div
                key={quest.id}
                className="p-4 rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-purple-50 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-600 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{quest.title}</p>
                      <p className="text-xs text-gray-600">{quest.description}</p>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-green-600">+{quest.reward_points} pts</div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>{quest.progress}/{quest.target}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                {isDone && (
                  <div className="mt-3 text-right text-xs font-semibold text-green-600">
                    Completed
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
