export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface FixedClass {
  id: string;
  name: string;
  days: DayOfWeek[];
  startTime: string;
  duration: string; // e.g. "30m", "1h"
  reminder?: boolean;
}

export interface PracticeGoal {
  id: string;
  name: string;
  duration: string;
  frequency: string; // e.g. "Daily", "3x week"
}

export interface Chore {
  id: string;
  name: string;
  duration: string;
  frequency: string; // e.g. "Daily", "Weekly"
}

export interface FreeTime {
  id: string;
  name: string;
  days: DayOfWeek[];
  startTime: string;
  duration: string;
}

export interface UserSettings {
  schoolDayStartTime: string;
  weekendAvailableHours: number;
  schoolDays: DayOfWeek[];
  bedtime: string;
}

export interface PlanSlot {
  time: string;
  activity: string;
  duration: string;
  type?: 'Class' | 'Other';
  reminder?: boolean;
}

export interface DailyPlan {
  day: DayOfWeek;
  slots: PlanSlot[];
}

export interface WeeklyPlan {
  days: DailyPlan[];
  tips: string[];
}
