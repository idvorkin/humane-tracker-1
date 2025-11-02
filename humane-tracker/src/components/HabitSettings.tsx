import React, { useState, useEffect } from 'react';
import { Habit } from '../types/habit';
import { HabitService } from '../services/habitService';
import './HabitSettings.css';

interface HabitSettingsProps {
  userId: string;
  onClose: () => void;
  onUpdate: () => void;
}

const CATEGORIES = [
  { value: 'mobility', label: 'Movement & Mobility', color: '#60a5fa' },
  { value: 'connection', label: 'Connections', color: '#10b981' },
  { value: 'balance', label: 'Inner Balance', color: '#a855f7' },
  { value: 'joy', label: 'Joy & Play', color: '#f472b6' },
  { value: 'strength', label: 'Strength Building', color: '#34d399' }
];

const TRACKING_TYPES = [
  { value: 'binary', label: 'Binary', icon: '✓' },
  { value: 'sets', label: 'Sets', icon: '123' },
  { value: 'hybrid', label: 'Hybrid', icon: '✓/123' }
];

export const HabitSettings: React.FC<HabitSettingsProps> = ({ userId, onClose, onUpdate }) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [changes, setChanges] = useState<Record<number, Partial<Habit>>>({});
  const [deletingHabits, setDeletingHabits] = useState<Set<number>>(new Set());

  const habitService = new HabitService();

  useEffect(() => {
    loadHabits();
  }, [userId]);

  const loadHabits = async () => {
    try {
      setIsLoading(true);
      const userHabits = await habitService.getHabits(userId);
      // Sort by category then by name
      userHabits.sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.name.localeCompare(b.name);
      });
      setHabits(userHabits);
    } catch (err) {
      console.error('Error loading habits:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (habitId: number, field: string, value: any) => {
    setChanges(prev => ({
      ...prev,
      [habitId]: {
        ...prev[habitId],
        [field]: value
      }
    }));
  };

  const getHabitValue = (habit: Habit, field: keyof Habit) => {
    if (changes[habit.id] && field in changes[habit.id]) {
      return changes[habit.id][field as keyof typeof changes[typeof habit.id]];
    }
    return habit[field];
  };

  const handleDeleteToggle = (habitId: number) => {
    setDeletingHabits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(habitId)) {
        newSet.delete(habitId);
      } else {
        newSet.add(habitId);
      }
      return newSet;
    });
  };

  const handleSaveAll = async () => {
    try {
      // Save changes
      for (const [habitIdStr, habitChanges] of Object.entries(changes)) {
        if (Object.keys(habitChanges).length > 0) {
          const habitId = Number(habitIdStr);
          await habitService.updateHabit(habitId, {
            ...habitChanges,
            updatedAt: new Date()
          });
        }
      }

      // Delete marked habits
      const habitsToDelete = Array.from(deletingHabits);
      for (const habitId of habitsToDelete) {
        // Delete all entries for this habit first
        const entries = await habitService.getEntriesForHabit(habitId);
        for (const entry of entries) {
          await habitService.deleteEntry(entry.id);
        }
        // Then delete the habit
        await habitService.deleteHabit(habitId);
      }

      onUpdate();
      onClose();
    } catch (err) {
      console.error('Error saving changes:', err);
    }
  };

  const hasChanges = Object.keys(changes).length > 0 || deletingHabits.size > 0;

  if (isLoading) {
    return (
      <div className="habit-settings-overlay">
        <div className="habit-settings-modal">
          <div className="modal-header">
            <h2>⚙️ Edit Habits</h2>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <div className="loading">Loading habits...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="habit-settings-overlay">
      <div className="habit-settings-modal">
        <div className="modal-header">
          <h2>⚙️ Edit Habits</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="habits-list">
            {habits.map(habit => (
              <div 
                key={habit.id} 
                className={`habit-item ${deletingHabits.has(habit.id) ? 'deleting' : ''}`}
              >
                <div className="habit-row">
                  <div className="habit-name-field">
                    <input
                      type="text"
                      value={getHabitValue(habit, 'name') as string}
                      onChange={(e) => handleFieldChange(habit.id, 'name', e.target.value)}
                      className="habit-name-input"
                      placeholder="Habit name"
                    />
                  </div>

                  <div className="habit-category-field">
                    <select
                      value={getHabitValue(habit, 'category') as string}
                      onChange={(e) => handleFieldChange(habit.id, 'category', e.target.value)}
                      className="category-select"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="habit-type-field">
                    <select
                      value={getHabitValue(habit, 'trackingType') as string || 'hybrid'}
                      onChange={(e) => handleFieldChange(habit.id, 'trackingType', e.target.value)}
                      className="type-select"
                      title="Tracking Type"
                    >
                      {TRACKING_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="habit-target-field">
                    <input
                      type="number"
                      value={getHabitValue(habit, 'targetPerWeek') as number}
                      onChange={(e) => handleFieldChange(habit.id, 'targetPerWeek', 
                        Math.max(1, Math.min(7, parseInt(e.target.value) || 1))
                      )}
                      className="target-input"
                      min="1"
                      max="7"
                      title="Days per week"
                    />
                    <span className="target-label">/wk</span>
                  </div>

                  <button
                    className={`delete-btn ${deletingHabits.has(habit.id) ? 'active' : ''}`}
                    onClick={() => handleDeleteToggle(habit.id)}
                    title={deletingHabits.has(habit.id) ? 'Click to cancel deletion' : 'Mark for deletion'}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {habits.length === 0 && (
            <div className="empty-state">
              <p>No habits yet. Close this window and click "+ Add Habit" to get started!</p>
            </div>
          )}

          {deletingHabits.size > 0 && (
            <div className="deletion-warning">
              ⚠️ {deletingHabits.size} habit{deletingHabits.size > 1 ? 's' : ''} marked for deletion. 
              This will permanently delete all history.
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn-save" 
            onClick={handleSaveAll}
            disabled={!hasChanges}
          >
            {hasChanges ? `Save Changes (${Object.keys(changes).length + deletingHabits.size})` : 'No Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};