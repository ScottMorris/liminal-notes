import { describe, it, expect } from 'vitest';
import { computeNextFireAt, applyQuietHours } from '../src/planner';
import { Reminder } from '../src/types';

describe('Planner', () => {
  it('schedules a one-shot reminder in the future', () => {
    const reminder: Reminder = {
      id: '1',
      title: 'Test',
      status: 'scheduled',
      createdAt: '',
      updatedAt: '',
      target: { type: 'note', noteId: '1' },
      trigger: {
        type: 'time',
        at: '2023-10-27T12:00:00', // Local
        timezone: 'UTC', // Simplified for test
      }
    };

    const now = '2023-10-27T10:00:00.000Z'; // UTC
    const next = computeNextFireAt(reminder, now);
    expect(next).toBe('2023-10-27T12:00:00.000Z');
  });

  it('does not schedule a one-shot reminder in the past', () => {
    const reminder: Reminder = {
      id: '1',
      title: 'Test',
      status: 'scheduled',
      createdAt: '',
      updatedAt: '',
      target: { type: 'note', noteId: '1' },
      trigger: {
        type: 'time',
        at: '2023-10-27T09:00:00', // Local
        timezone: 'UTC',
      }
    };

    const now = '2023-10-27T10:00:00.000Z'; // UTC
    const next = computeNextFireAt(reminder, now);
    expect(next).toBeUndefined();
  });

  it('schedules next interval for repeating reminder', () => {
    const reminder: Reminder = {
      id: '1',
      title: 'Test',
      status: 'scheduled',
      createdAt: '',
      updatedAt: '',
      target: { type: 'note', noteId: '1' },
      trigger: {
        type: 'time',
        at: '2023-10-27T08:00:00', // Local
        timezone: 'UTC',
        repeat: { kind: 'interval', minutes: 60 }
      }
    };

    // Started at 08:00. Intervals: 09:00, 10:00, 11:00...
    // Now is 10:15. Next should be 11:00.
    const now = '2023-10-27T10:15:00.000Z';
    const next = computeNextFireAt(reminder, now);
    expect(next).toBe('2023-10-27T11:00:00.000Z');
  });
});

describe('Quiet Hours', () => {
    it('shifts time to end of quiet hours if inside', () => {
        const quietHours = {
            enabled: true,
            startLocal: '22:00',
            endLocal: '07:00'
        };
        const tz = 'UTC';
        // 23:00 is inside quiet hours. Should shift to 07:00 next day.
        const fireAt = '2023-10-27T23:00:00.000Z';
        const next = applyQuietHours(fireAt, quietHours, tz);
        expect(next).toBe('2023-10-28T07:00:00.000Z');
    });

    it('does not shift time if outside quiet hours', () => {
        const quietHours = {
            enabled: true,
            startLocal: '22:00',
            endLocal: '07:00'
        };
        const tz = 'UTC';
        const fireAt = '2023-10-27T20:00:00.000Z';
        const next = applyQuietHours(fireAt, quietHours, tz);
        expect(next).toBe('2023-10-27T20:00:00.000Z');
    });
});
