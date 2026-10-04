import { WeeklyPlan, UserSettings } from '../types';

export class CalendarService {
  private static FEED_ID_KEY = 'kids_calendar_feed_id';
  private static LAST_SYNC_KEY = 'kids_calendar_last_sync';

  public static getFeedId(): string {
    let feedId = localStorage.getItem(this.FEED_ID_KEY);
    if (!feedId) {
      const randomStr = Math.random().toString(36).substring(2, 8);
      feedId = `family_${randomStr}`;
      localStorage.setItem(this.FEED_ID_KEY, feedId);
    }
    return feedId;
  }

  public static getLastSyncTime(): string | null {
    return localStorage.getItem(this.LAST_SYNC_KEY);
  }

  public static getCalendarUrls(feedId?: string) {
    const id = feedId || this.getFeedId();
    const host = window.location.host;
    const protocol = window.location.protocol;
    
    const httpFeedUrl = `${protocol}//${host}/api/calendar/${id}.ics`;
    const webcalUrl = `webcal://${host}/api/calendar/${id}.ics`;
    const googleCalUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(httpFeedUrl)}`;
    const parentPageUrl = `${protocol}//${host}/parent/calendar/${id}`;

    return {
      id,
      httpFeedUrl,
      webcalUrl,
      googleCalUrl,
      parentPageUrl
    };
  }

  public static async syncPlan(
    plan: WeeklyPlan | null, 
    kidName: string, 
    settings?: UserSettings
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const feedId = this.getFeedId();
      const timezoneOffset = new Date().getTimezoneOffset();

      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedId,
          kidName: kidName || 'Planova Kid',
          plan: plan || { days: [] },
          settings,
          timezoneOffset
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed with status: ${response.status}`);
      }

      const data = await response.json();
      localStorage.setItem(this.LAST_SYNC_KEY, new Date().toISOString());
      return { success: true };
    } catch (err: any) {
      console.error('[CalendarService] syncPlan error:', err);
      return { success: false, error: err.message || 'Failed to sync calendar' };
    }
  }

  public static async shareLink(kidName: string): Promise<boolean> {
    const urls = this.getCalendarUrls();
    const name = kidName || 'your child';
    const shareData = {
      title: `${name}'s Live Schedule - Planova Kidz`,
      text: `Subscribe to ${name}'s weekly activities and start notifications on your phone without installing an app!`,
      url: urls.parentPageUrl
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return true;
      } catch (err) {
        // User cancelled or share error, fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(urls.parentPageUrl);
      return true;
    } catch (e) {
      return false;
    }
  }
}
