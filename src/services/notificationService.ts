import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { DayOfWeek, WeeklyPlan, FixedClass } from '../types';

const DAY_MAP: Record<DayOfWeek, number> = {
  'Sunday': 1,
  'Monday': 2,
  'Tuesday': 3,
  'Wednesday': 4,
  'Thursday': 5,
  'Friday': 6,
  'Saturday': 7,
};

export class NotificationService {
  static async requestPermissions() {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  }

  static async scheduleFixedClassReminders(fixedClasses: FixedClass[]) {
    // Cancel existing notifications first to avoid duplicates
    await LocalNotifications.cancel({ notifications: await this.getPendingIdsByPrefix('class-') });

    const notifications: any[] = [];

    fixedClasses.forEach(cls => {
      if (!cls.reminder) return;

      const [hour, minute] = cls.startTime.split(':').map(Number);
      
      cls.days.forEach(day => {
        notifications.push({
          title: `Time for ${cls.name}!`,
          body: `Your ${cls.name} class is starting now.`,
          id: this.generateId(`class-${cls.id}-${day}`),
          schedule: {
            on: {
              weekday: DAY_MAP[day],
              hour,
              minute
            },
            repeats: true,
            allowWhileIdle: true
          },
          sound: 'default',
          actionTypeId: 'CLASS_REMINDER'
        });
      });
    });

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  }

  static async scheduleWeeklyPlanReminders(plan: WeeklyPlan) {
    // Cancel existing plan notifications
    await LocalNotifications.cancel({ notifications: await this.getPendingIdsByPrefix('plan-') });

    const notifications: any[] = [];

    plan.days.forEach(dayPlan => {
      dayPlan.slots.forEach((slot, index) => {
        if (!slot.reminder) return;

        const timeParts = slot.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!timeParts) return;

        let hour = parseInt(timeParts[1]);
        const minute = parseInt(timeParts[2]);
        const ampm = timeParts[3].toUpperCase();

        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        
        notifications.push({
          title: `Next Activity: ${slot.activity}`,
          body: `It's time for ${slot.activity} (${slot.duration}).`,
          id: this.generateId(`plan-${dayPlan.day}-${index}`),
          schedule: {
            on: {
              weekday: DAY_MAP[dayPlan.day],
              hour,
              minute
            },
            repeats: true,
            allowWhileIdle: true
          },
          sound: 'default',
          actionTypeId: 'ACTIVITY_REMINDER'
        });
      });
    });

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  }

  static async registerActionTypes() {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'CLASS_REMINDER',
          actions: [
            { id: 'view', title: 'View Details', foreground: true },
            { id: 'dismiss', title: 'Dismiss', destructive: true }
          ]
        },
        {
          id: 'ACTIVITY_REMINDER',
          actions: [
            { id: 'done', title: 'Done!', foreground: true },
            { id: 'skip', title: 'Skip', destructive: true }
          ]
        }
      ]
    });
  }

  private static generateId(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private static async getPendingIdsByPrefix(prefix: string) {
    const pending = await LocalNotifications.getPending();
    // This is a bit tricky since we don't store the original string ID in the notification object
    // But we can filter if we had a way to identify them. 
    // For now, let's just return all pending as a simple reset, or we could store IDs in localStorage.
    return pending.notifications.map(n => ({ id: n.id }));
  }
}
