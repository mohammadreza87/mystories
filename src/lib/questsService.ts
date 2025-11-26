import { supabase } from './supabase';

export type QuestTask = 'read_chapter' | 'create_story' | 'complete_story';

export interface Quest {
  id: string;
  task: QuestTask;
  quest_type: 'daily' | 'weekly';
  period_start: string;
  period_end: string;
  progress: number;
  target: number;
  status: 'pending' | 'completed';
  reward_points: number;
  rewarded: boolean;
}

export interface Streak {
  current_streak: number;
  longest_streak: number;
  last_action_date: string | null;
}

export async function getQuests() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const day = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - day + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const { data: quests } = await supabase
    .from('user_quests')
    .select('*')
    .eq('user_id', session.user.id)
    .gte('period_end', today)
    .order('created_at', { ascending: false });

  const { data: streak } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('points')
    .eq('id', session.user.id)
    .single();

  const allQuests: Quest[] = quests || [];

  const dailyTasks: QuestTask[] = ['read_chapter', 'create_story'];
  const weeklyTasks: QuestTask[] = ['complete_story'];

  for (const task of dailyTasks) {
    const exists = allQuests.find(q => q.task === task && q.period_start === today);
    if (!exists) {
      const config = TASK_CONFIG[task];
      allQuests.push({
        id: `placeholder-${task}`,
        task,
        quest_type: config.quest_type,
        period_start: today,
        period_end: today,
        progress: 0,
        target: config.target,
        status: 'pending',
        reward_points: config.reward,
        rewarded: false,
      });
    }
  }

  for (const task of weeklyTasks) {
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const exists = allQuests.find(q => q.task === task && q.period_start === weekStartStr);
    if (!exists) {
      const config = TASK_CONFIG[task];
      allQuests.push({
        id: `placeholder-${task}`,
        task,
        quest_type: config.quest_type,
        period_start: weekStartStr,
        period_end: weekEnd.toISOString().split('T')[0],
        progress: 0,
        target: config.target,
        status: 'pending',
        reward_points: config.reward,
        rewarded: false,
      });
    }
  }

  return {
    today,
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0],
    quests: allQuests,
    streak: streak || { current_streak: 0, longest_streak: 0, last_action_date: null },
    points: profile?.points || 0,
  };
}

const TASK_CONFIG: Record<QuestTask, { quest_type: 'daily' | 'weekly'; target: number; reward: number }> = {
  read_chapter: { quest_type: 'daily', target: 2, reward: 10 },
  create_story: { quest_type: 'daily', target: 1, reward: 15 },
  complete_story: { quest_type: 'weekly', target: 1, reward: 30 },
};

function getPeriod(task: QuestTask) {
  const now = new Date();
  const config = TASK_CONFIG[task];

  if (config.quest_type === 'weekly') {
    const day = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - day + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }

  const start = new Date().toISOString().split('T')[0];
  return { start, end: start };
}

export async function progressQuest(task: QuestTask) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error('Not authenticated for quest progress');
    return;
  }

  try {
    const config = TASK_CONFIG[task];
    const { start, end } = getPeriod(task);

    const { data: existing } = await supabase
      .from('user_quests')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('task', task)
      .eq('period_start', start)
      .maybeSingle();

    let progress = (existing?.progress ?? 0) + 1;
    progress = Math.min(config.target, progress);
    const status = progress >= config.target ? 'completed' : 'pending';

    if (existing) {
      await supabase
        .from('user_quests')
        .update({
          progress,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('user_quests')
        .insert({
          user_id: session.user.id,
          task,
          quest_type: config.quest_type,
          period_start: start,
          period_end: end,
          progress,
          target: config.target,
          status,
          reward_points: config.reward,
          rewarded: false,
        });
    }

    if (status === 'completed' && !existing?.rewarded) {
      await supabase.rpc('increment_points', {
        p_user_id: session.user.id,
        p_amount: config.reward,
      });

      await supabase
        .from('user_quests')
        .update({ rewarded: true })
        .eq('user_id', session.user.id)
        .eq('task', task)
        .eq('period_start', start);
    }

    if (config.quest_type === 'daily') {
      const today = new Date().toISOString().split('T')[0];
      const { data: streak } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      let current = streak?.current_streak ?? 0;
      let longest = streak?.longest_streak ?? 0;
      const lastDate = streak?.last_action_date;

      if (lastDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastDate === yesterdayStr) {
          current += 1;
        } else {
          current = 1;
        }

        if (current > longest) longest = current;

        if (streak) {
          await supabase
            .from('user_streaks')
            .update({
              current_streak: current,
              longest_streak: longest,
              last_action_date: today,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', session.user.id);
        } else {
          await supabase
            .from('user_streaks')
            .insert({
              user_id: session.user.id,
              current_streak: 1,
              longest_streak: 1,
              last_action_date: today,
            });
        }
      }
    }
  } catch (error) {
    console.error('Failed to progress quest:', error);
  }
}
