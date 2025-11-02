import { db } from '../config/db';
import { Habit, HabitEntry, HabitWithStatus, HabitStatus } from '../types/habit';
import { startOfWeek, endOfWeek, isToday, differenceInDays, format } from 'date-fns';
import { liveQuery } from 'dexie';

export class HabitService {
  // Create a new habit
  async createHabit(habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const newHabit: Omit<Habit, 'id'> = {
      ...habit,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const id = await db.habits.add(newHabit as any);
    return id;
  }

  // Get all habits for a user
  async getUserHabits(userId: string): Promise<Habit[]> {
    return await db.habits
      .where('userId')
      .equals(userId)
      .toArray();
  }

  // Subscribe to habits changes
  subscribeToHabits(userId: string, callback: (habits: Habit[]) => void) {
    const observable = liveQuery(() =>
      db.habits
        .where('userId')
        .equals(userId)
        .toArray()
    );

    const subscription = observable.subscribe({
      next: (habits) => callback(habits),
      error: (error) => console.error('Error in habits subscription:', error)
    });

    // Return unsubscribe function
    return () => subscription.unsubscribe();
  }

  // Add a habit entry
  async addEntry(entry: Omit<HabitEntry, 'id' | 'createdAt'>): Promise<number> {
    const newEntry: Omit<HabitEntry, 'id'> = {
      ...entry,
      createdAt: new Date()
    };
    const id = await db.entries.add(newEntry as any);
    return id;
  }

  // Get entries for a habit within a date range
  async getHabitEntries(habitId: number, startDate: Date, endDate: Date): Promise<HabitEntry[]> {
    return await db.entries
      .where('habitId')
      .equals(habitId)
      .and(entry => entry.date >= startDate && entry.date <= endDate)
      .toArray();
  }

  // Subscribe to entries changes for a date range
  subscribeToWeekEntries(userId: string, startDate: Date, endDate: Date, callback: (entries: HabitEntry[]) => void) {
    const observable = liveQuery(() =>
      db.entries
        .where('userId')
        .equals(userId)
        .and(entry => entry.date >= startDate && entry.date <= endDate)
        .toArray()
    );

    const subscription = observable.subscribe({
      next: (entries) => callback(entries),
      error: (error) => console.error('Error in entries subscription:', error)
    });

    // Return unsubscribe function
    return () => subscription.unsubscribe();
  }

  // Calculate habit status
  calculateHabitStatus(habit: Habit, entries: HabitEntry[], currentDate: Date = new Date()): HabitStatus {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Week starts on Monday
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

    const weekEntries = entries.filter(e =>
      e.date >= weekStart && e.date <= weekEnd
    );

    // Count unique days with entries (not total values)
    // A day counts if there's any entry with value > 0
    const daysWithEntries = new Set(
      weekEntries
        .filter(e => e.value > 0)
        .map(e => format(e.date, 'yyyy-MM-dd'))
    ).size;

    const todayEntry = weekEntries.find(e => isToday(e.date));

    // Check if done today
    if (todayEntry && todayEntry.value >= 1) {
      return 'done';
    }

    // Check if weekly target is met (counting days, not total values)
    if (daysWithEntries >= habit.targetPerWeek) {
      return 'met';
    }

    // Calculate days left and days still needed
    const daysLeft = differenceInDays(weekEnd, currentDate) + 1;
    const daysNeeded = habit.targetPerWeek - daysWithEntries;

    // Check if due today
    if (daysLeft <= daysNeeded && !todayEntry) {
      if (daysLeft === 0) return 'overdue';
      if (daysLeft === 1) return 'today';
      if (daysLeft === 2) return 'tomorrow';
      return 'soon';
    }

    return 'pending';
  }

  // Get habits with status for trailing 7 days
  async getHabitsWithStatus(userId: string): Promise<HabitWithStatus[]> {
    const habits = await this.getUserHabits(userId);
    const currentDate = new Date();
    // Get trailing 7 days (today and previous 6 days)
    const endDate = new Date(currentDate);
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const habitsWithStatus: HabitWithStatus[] = [];

    for (const habit of habits) {
      const entries = await this.getHabitEntries(habit.id, startDate, endDate);
      const status = this.calculateHabitStatus(habit, entries, currentDate);

      // Count unique days with entries (not total values)
      // According to PRD: "Weekly goals count DAYS not total sets"
      const currentWeekCount = new Set(
        entries
          .filter(e => e.value > 0)
          .map(e => format(e.date, 'yyyy-MM-dd'))
      ).size;

      habitsWithStatus.push({
        ...habit,
        status,
        currentWeekCount,
        entries
      });
    }

    return habitsWithStatus;
  }

  // Update entry value
  async updateEntry(entryId: number, value: number): Promise<void> {
    await db.entries.update(entryId, { value });
  }

  // Delete entry
  async deleteEntry(entryId: number): Promise<void> {
    await db.entries.delete(entryId);
  }

  // Delete habit
  async deleteHabit(habitId: number): Promise<void> {
    await db.habits.delete(habitId);
  }

  // Update habit
  async updateHabit(habitId: number, updates: Partial<Habit>): Promise<void> {
    await db.habits.update(habitId, updates);
  }

  // Get entries for a specific habit
  async getEntriesForHabit(habitId: number): Promise<HabitEntry[]> {
    return await db.entries
      .where('habitId')
      .equals(habitId)
      .toArray();
  }

  // Get all habits for a user (alias for getUserHabits)
  async getHabits(userId: string): Promise<Habit[]> {
    return this.getUserHabits(userId);
  }
}
