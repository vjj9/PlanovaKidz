import { LocalNotifications } from '@capacitor/local-notifications';
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
    try {
      const { display } = await LocalNotifications.requestPermissions();
      return display;
    } catch (e) {
      console.warn('LocalNotifications not available', e);
      return 'denied' as const;
    }
  }

  static async checkPermissions() {
    try {
      const { display } = await LocalNotifications.checkPermissions();
      return display;
    } catch (e) {
      console.warn('LocalNotifications not available', e);
      return 'denied' as const;
    }
  }

  static async syncAllNotifications(fixedClasses: FixedClass[], plan: WeeklyPlan | null) {
    try {
      // 1. Cancel ALL existing notifications first to start fresh
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
      }

      const notifications: any[] = [];

      // 2. Schedule Fixed Class Reminders
      fixedClasses.forEach(cls => {
        if (!cls.reminder) return;

        const timeParts = cls.startTime.split(':').map(Number);
        if (timeParts.length !== 2 || isNaN(timeParts[0]) || isNaN(timeParts[1])) return;
        const [hour, minute] = timeParts;
        
        cls.days.forEach(day => {
          const id = this.generateId(`class-${cls.id}-${day}`);
          notifications.push({
            title: `Time for ${cls.name}!`,
            body: `Your ${cls.name} class is starting now.`,
            id,
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

      // 3. Schedule Weekly Plan Reminders
      if (plan) {
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
            
            const id = this.generateId(`plan-${dayPlan.day}-${index}`);
            notifications.push({
              title: `Next Activity: ${slot.activity}`,
              body: `It's time for ${slot.activity} (${slot.duration}).`,
              id,
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
      }

      // 4. Batch schedule everything
      if (notifications.length > 0) {
        console.log(`Planova Kidz: Syncing ${notifications.length} total notifications...`);
        await LocalNotifications.schedule({ notifications });
      }
    } catch (e) {
      console.error('Planova Kidz: Failed to sync notifications', e);
    }
  }

  static async scheduleFixedClassReminders(fixedClasses: FixedClass[]) {
    // Keep for backward compatibility if needed, but prefer syncAllNotifications
    await this.syncAllNotifications(fixedClasses, null);
  }

  static async scheduleWeeklyPlanReminders(plan: WeeklyPlan) {
    // Keep for backward compatibility if needed, but prefer syncAllNotifications
    // Note: This would lose fixed class notifications if called alone, 
    // so we should ideally always call syncAll with both.
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

  private static async getPendingIdsByPrefix(_prefix: string) {
    const pending = await LocalNotifications.getPending();
    // This is a bit tricky since we don't store the original string ID in the notification object
    // But we can filter if we had a way to identify them. 
    // For now, let's just return all pending as a simple reset, or we could store IDs in localStorage.
    return pending.notifications.map(n => ({ id: n.id }));
  }
}
