import Dexie, { Table } from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import { Habit, HabitEntry } from '../types/habit';

// Extend Dexie with cloud addon
export class HumaneTrackerDB extends Dexie {
  habits!: Table<Habit, number>;
  entries!: Table<HabitEntry, number>;

  constructor() {
    super('HumaneTrackerDB', { addons: [dexieCloud] });

    // Define schema - using ++id for auto-increment
    this.version(1).stores({
      habits: '++id, userId, name, category, targetPerWeek, createdAt, updatedAt',
      entries: '++id, habitId, userId, date, value, createdAt'
    });
  }
}

// Create database instance
export const db = new HumaneTrackerDB();

// Configure Dexie Cloud (optional - works offline if not configured)
const dexieCloudUrl = process.env.REACT_APP_DEXIE_CLOUD_URL;

if (dexieCloudUrl && dexieCloudUrl !== 'https://your-db.dexie.cloud') {
  // Only configure cloud sync if URL is properly set
  db.cloud.configure({
    databaseUrl: dexieCloudUrl,
    requireAuth: false, // Allow local use without auth for now
    tryUseServiceWorker: true
  });
} else {
  // Disable cloud sync - work in local-only mode
  console.log('Dexie Cloud not configured - running in local-only mode');
}
