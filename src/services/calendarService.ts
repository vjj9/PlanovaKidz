import { WeeklyPlan, UserSettings } from '../types';

export const CLOUD_CALENDAR_URL = 
  (import.meta as any).env?.VITE_APP_URL || 
  (import.meta as any).env?.VITE_API_URL || 
  'https://ais-pre-g2mo3svs2kcjms4gxutz36-438492654659.us-east1.run.app';

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parseTime12or24(timeStr: string): { hours: number; minutes: number } {
  if (!timeStr) return { hours: 9, minutes: 0 };
  const clean = timeStr.trim();
  const match12 = clean.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (period === "PM" && h < 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return { hours: h, minutes: m };
  }
  const match24 = clean.match(/(\d+):(\d+)/);
  if (match24) {
    return { hours: parseInt(match24[1], 10), minutes: parseInt(match24[2], 10) };
  }
  return { hours: 9, minutes: 0 };
}

function parseDurationMinutes(durStr: string): number {
  if (!durStr) return 30;
  let mins = 0;
  const hMatch = durStr.match(/(\d+(\.\d+)?)h/);
  const mMatch = durStr.match(/(\d+(\.\d+)?)m/);
  if (hMatch) mins += parseFloat(hMatch[1]) * 60;
  if (mMatch) mins += parseFloat(mMatch[1]);
  return mins > 0 ? Math.round(mins) : 30;
}

function formatICalDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

export class CalendarService {
  private static FEED_ID_KEY = 'kids_calendar_feed_id';
  private static LAST_SYNC_KEY = 'kids_calendar_last_sync';
  private static CUSTOM_HOST_KEY = 'kids_calendar_custom_host';

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

  public static getCustomHost(): string {
    return localStorage.getItem(this.CUSTOM_HOST_KEY) || '';
  }

  public static setCustomHost(host: string): void {
    if (!host || !host.trim()) {
      localStorage.removeItem(this.CUSTOM_HOST_KEY);
    } else {
      localStorage.setItem(this.CUSTOM_HOST_KEY, host.trim());
    }
  }

  public static isPublicServerConfigured(): boolean {
    const customHost = localStorage.getItem(this.CUSTOM_HOST_KEY);
    if (customHost && customHost.trim().startsWith('http')) {
      return true;
    }
    const host = window.location.host;
    const isLocalOrCapacitor = 
      !host || 
      host.includes('localhost') || 
      host.includes('127.0.0.1') || 
      window.location.protocol === 'capacitor:' || 
      window.location.protocol === 'ionic:';
    
    // If not running locally and not on an internal preview URL, it's public
    return !isLocalOrCapacitor && !host.includes('.run.app');
  }

  public static getBaseUrl(): string {
    const customHost = localStorage.getItem(this.CUSTOM_HOST_KEY);
    if (customHost && customHost.trim()) {
      return customHost.trim().replace(/\/$/, '');
    }

    const host = window.location.host;
    const protocol = window.location.protocol;
    const isLocalOrCapacitor = 
      !host || 
      host.includes('localhost') || 
      host.includes('127.0.0.1') || 
      protocol === 'capacitor:' || 
      protocol === 'ionic:';

    if (isLocalOrCapacitor) {
      return CLOUD_CALENDAR_URL.replace(/\/$/, '');
    }

    return `${protocol}//${host}`;
  }

  public static getCalendarUrls(feedId?: string) {
    const id = feedId || this.getFeedId();
    const baseUrl = this.getBaseUrl();
    
    // Parse the host and protocol from the resolved baseUrl
    let host = 'ais-pre-g2mo3svs2kcjms4gxutz36-438492654659.us-east1.run.app';
    let protocol = 'https:';

    try {
      const parsed = new URL(baseUrl);
      host = parsed.host;
      protocol = parsed.protocol;
    } catch {
      // Fallback if URL parsing fails
    }
    
    const httpFeedUrl = `${protocol}//${host}/api/calendar/${id}.ics`;
    const webcalUrl = `webcal://${host}/api/calendar/${id}.ics`;
    const googleCalUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(httpFeedUrl)}`;
    const parentPageUrl = `${protocol}//${host}/parent/calendar/${id}`;

    return {
      id,
      baseUrl,
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
      const baseUrl = this.getBaseUrl();

      const response = await fetch(`${baseUrl}/api/calendar/sync`, {
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

      localStorage.setItem(this.LAST_SYNC_KEY, new Date().toISOString());
      return { success: true };
    } catch (err: any) {
      console.error('[CalendarService] syncPlan error:', err);
      return { success: false, error: err.message || 'Failed to sync calendar' };
    }
  }

  public static generateClientICS(plan: WeeklyPlan | null, kidName: string): string {
    const name = kidName?.trim() || "Planova Kid";
    const calName = `Planova: ${name}'s Schedule`;
    const lines: string[] = [];

    lines.push("BEGIN:VCALENDAR");
    lines.push("VERSION:2.0");
    lines.push("PRODID:-//Planova Kidz//Weekly Family Schedule//EN");
    lines.push("CALSCALE:GREGORIAN");
    lines.push("METHOD:PUBLISH");
    lines.push(`X-WR-CALNAME:${calName}`);
    lines.push("X-WR-CALDESC:Live 7-day activities and start reminders from Planova Kidz");
    lines.push("X-PUBLISHED-TTL:PT1H");
    lines.push("REFRESH-INTERVAL;VALUE=DURATION:PT1H");

    const now = new Date();
    const nowStamp = formatICalDate(now) + "Z";
    const next7Days: { date: Date; dayName: string }[] = [];

    for (let offset = 0; offset < 7; offset++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + offset);
      const dayName = DAYS_OF_WEEK[targetDate.getDay()];
      next7Days.push({ date: targetDate, dayName });
    }

    const daysPlan = plan?.days || [];

    next7Days.forEach(({ date, dayName }) => {
      const matchingDayPlan = daysPlan.find((d: any) => d.day === dayName);
      if (!matchingDayPlan || !matchingDayPlan.slots || matchingDayPlan.slots.length === 0) {
        return;
      }

      matchingDayPlan.slots.forEach((slot: any, slotIdx: number) => {
        const activityName = slot.activity || "Scheduled Activity";
        const isFreeTime = slot.type === "FreeTime" || activityName.toLowerCase().includes("free time");
        if (isFreeTime) return;

        const timeStr = slot.time || "09:00 AM";
        const { hours, minutes } = parseTime12or24(timeStr);
        const durationMins = parseDurationMinutes(slot.duration || "30m");

        const startDate = new Date(date);
        startDate.setHours(hours, minutes, 0, 0);

        const endDate = new Date(startDate.getTime() + durationMins * 60 * 1000);
        const startICal = formatICalDate(startDate);
        const endICal = formatICalDate(endDate);
        const uid = `client-${dayName}-${slotIdx}-${startDate.getFullYear()}${(startDate.getMonth()+1).toString().padStart(2,'0')}${startDate.getDate().toString().padStart(2,'0')}@planovakidz.app`;

        const typeLabel = slot.type ? `[${slot.type}] ` : "";
        const summary = `${name}: ${typeLabel}${activityName}`;
        const description = `Planova Kidz Activity\\nActivity: ${activityName}\\nDuration: ${slot.duration}\\nStart Time: ${timeStr}\\nAssigned to: ${name}`;

        lines.push("BEGIN:VEVENT");
        lines.push(`UID:${uid}`);
        lines.push(`DTSTAMP:${nowStamp}`);
        lines.push(`DTSTART:${startICal}`);
        lines.push(`DTEND:${endICal}`);
        lines.push(`SUMMARY:${summary}`);
        lines.push(`DESCRIPTION:${description}`);
        lines.push("STATUS:CONFIRMED");

        // Native Alert on Lock Screen when activity starts
        lines.push("BEGIN:VALARM");
        lines.push("ACTION:DISPLAY");
        lines.push(`DESCRIPTION:${name} is starting: ${activityName}! ⏰`);
        lines.push("TRIGGER:-PT0M");
        lines.push("END:VALARM");

        lines.push("END:VEVENT");
      });
    });

    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  public static async openOrShareICS(plan: WeeklyPlan | null, kidName: string): Promise<boolean> {
    const icsContent = this.generateClientICS(plan, kidName);
    const filename = `${(kidName || 'planova').toLowerCase().replace(/[^a-z0-9]/g, '-')}-schedule.ics`;

    // 1. Try native Web Share API with File (Supported on iOS 15+, Safari, Capacitor, Android)
    if (typeof navigator !== 'undefined' && navigator.share && typeof File !== 'undefined') {
      try {
        const file = new File([icsContent], filename, { type: 'text/calendar' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${kidName || 'Child'}'s Weekly Schedule`,
            text: `Open this file to add ${kidName || 'your child'}'s 7-day schedule to Apple Calendar or Google Calendar! 📅`
          });
          return true;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return false;
      }
    }

    // 2. Fallback to direct open/download
    this.downloadOrOpenClientICS(plan, kidName);
    return true;
  }

  public static downloadOrOpenClientICS(plan: WeeklyPlan | null, kidName: string) {
    const icsContent = this.generateClientICS(plan, kidName);
    const filename = `${(kidName || 'planova').toLowerCase().replace(/[^a-z0-9]/g, '-')}-schedule.ics`;

    const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    if (isIOS) {
      // In iOS Safari/WebView, data URI directly opens the native Apple Calendar "Add All Events" sheet
      const dataUri = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsContent);
      window.location.href = dataUri;
      return;
    }

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  public static openGoogleCalendarImport(plan: WeeklyPlan | null, kidName: string) {
    // 1. Trigger the download of the .ics file
    this.downloadOrOpenClientICS(plan, kidName);

    // 2. Open Google Calendar's official import page in a new tab
    const importUrl = 'https://calendar.google.com/calendar/u/0/r/settings/export';
    window.open(importUrl, '_blank', 'noopener,noreferrer');
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

