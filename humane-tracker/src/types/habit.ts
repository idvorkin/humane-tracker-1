export interface Habit {
  id: number;
  name: string;
  category: HabitCategory;
  targetPerWeek: number;
  trackingType?: 'binary' | 'sets' | 'hybrid';
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HabitEntry {
  id: number;
  habitId: number;
  userId: string;
  date: Date;
  value: number; // Can be 1 for done, 0.5 for partial, or actual count
  notes?: string;
  createdAt: Date;
}

export type HabitCategory = 'mobility' | 'connection' | 'balance' | 'joy' | 'strength';

export type HabitStatus = 'done' | 'met' | 'today' | 'tomorrow' | 'soon' | 'overdue' | 'pending';

export interface HabitWithStatus extends Habit {
  status: HabitStatus;
  currentWeekCount: number;
  entries: HabitEntry[];
}

export interface WeekData {
  startDate: Date;
  endDate: Date;
  currentDay: Date;
  habits: HabitWithStatus[];
}

export interface CategorySection {
  category: HabitCategory;
  name: string;
  color: string;
  habits: HabitWithStatus[];
  isCollapsed: boolean;
}

export interface SummaryStats {
  dueToday: number;
  overdue: number;
  doneToday: number;
  onTrack: number;
}