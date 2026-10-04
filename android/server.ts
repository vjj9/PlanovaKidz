import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// In-memory + file-backed storage for calendar feeds
interface CalendarData {
  feedId: string;
  kidName: string;
  plan: any;
  settings?: any;
  updatedAt: string;
  timezoneOffset?: number; // minutes from UTC
}

const STORAGE_FILE = path.join(process.cwd(), "calendars_store.json");
const calendarStore = new Map<string, CalendarData>();

// Load initial data from disk if available
try {
  if (fs.existsSync(STORAGE_FILE)) {
    const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
    const parsed: Record<string, CalendarData> = JSON.parse(raw);
    Object.entries(parsed).forEach(([k, v]) => calendarStore.set(k, v));
  }
} catch (e) {
  console.warn("Could not load stored calendars:", e);
}

function saveStoreToDisk() {
  try {
    const obj: Record<string, CalendarData> = {};
    calendarStore.forEach((v, k) => {
      obj[k] = v;
    });
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save calendar store:", e);
  }
}

// Helpers for Date and iCal generation
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

function generateICS(data: CalendarData, hostUrl: string): string {
  const kidName = data.kidName?.trim() || "Planova Kid";
  const calName = `Planova: ${kidName}'s Schedule`;
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
  const todayDayIdx = now.getDay(); // 0 = Sunday

  // Build a map of the next 7 calendar dates
  // Day 0 = today, Day 1 = tomorrow, ..., Day 6 = 6 days from now
  const next7Days: { date: Date; dayName: string }[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + offset);
    const dayName = DAYS_OF_WEEK[targetDate.getDay()];
    next7Days.push({ date: targetDate, dayName });
  }

  const daysPlan = data.plan?.days || [];

  next7Days.forEach(({ date, dayName }) => {
    const matchingDayPlan = daysPlan.find((d: any) => d.day === dayName);
    if (!matchingDayPlan || !matchingDayPlan.slots || matchingDayPlan.slots.length === 0) {
      return;
    }

    matchingDayPlan.slots.forEach((slot: any, slotIdx: number) => {
      // Only include non-free-time or meaningful activities
      const activityName = slot.activity || "Scheduled Activity";
      const isFreeTime = slot.type === "FreeTime" || activityName.toLowerCase().includes("free time");
      if (isFreeTime) return; // Parents generally want notifications for classes, goals, and chores

      const timeStr = slot.time || "09:00 AM";
      const { hours, minutes } = parseTime12or24(timeStr);
      const durationMins = parseDurationMinutes(slot.duration || "30m");

      const startDate = new Date(date);
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = new Date(startDate.getTime() + durationMins * 60 * 1000);

      const startICal = formatICalDate(startDate);
      const endICal = formatICalDate(endDate);
      const uid = `${data.feedId}-${dayName}-${slotIdx}-${startDate.getFullYear()}${(startDate.getMonth()+1).toString().padStart(2,'0')}${startDate.getDate().toString().padStart(2,'0')}@planovakidz.app`;

      const typeLabel = slot.type ? `[${slot.type}] ` : "";
      const summary = `${kidName}: ${typeLabel}${activityName}`;
      const description = `Planova Kidz Activity\\nActivity: ${activityName}\\nDuration: ${slot.duration}\\nStart Time: ${timeStr}\\nAssigned to: ${kidName}`;

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${nowStamp}`);
      lines.push(`DTSTART:${startICal}`);
      lines.push(`DTEND:${endICal}`);
      lines.push(`SUMMARY:${summary}`);
      lines.push(`DESCRIPTION:${description}`);
      lines.push("STATUS:CONFIRMED");

      // Native Lock-Screen Start Notification Alarm
      lines.push("BEGIN:VALARM");
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:${kidName} is starting: ${activityName}! ⏰`);
      lines.push("TRIGGER:-PT0M"); // Alert at start of event
      lines.push("END:VALARM");

      lines.push("END:VEVENT");
    });
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// 1. API: Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", count: calendarStore.size });
});

// 2. API: Sync Calendar from Kid's App
app.post("/api/calendar/sync", (req, res) => {
  try {
    const { feedId, kidName, plan, settings, timezoneOffset } = req.body;
    if (!feedId) {
      return res.status(400).json({ error: "feedId is required" });
    }

    const entry: CalendarData = {
      feedId,
      kidName: kidName || "Planova Kid",
      plan: plan || { days: [] },
      settings,
      updatedAt: new Date().toISOString(),
      timezoneOffset: typeof timezoneOffset === "number" ? timezoneOffset : undefined,
    };

    calendarStore.set(feedId, entry);
    saveStoreToDisk();

    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const httpFeedUrl = `${protocol}://${host}/api/calendar/${feedId}.ics`;
    const webcalFeedUrl = `webcal://${host}/api/calendar/${feedId}.ics`;

    res.json({
      success: true,
      feedId,
      httpFeedUrl,
      webcalFeedUrl,
      updatedAt: entry.updatedAt,
    });
  } catch (error: any) {
    console.error("Error in /api/calendar/sync:", error);
    res.status(500).json({ error: error.message || "Failed to sync calendar" });
  }
});

// 3. API: Get .ics Feed (Direct Subscription for Apple Calendar / Google Calendar)
app.get(["/api/calendar/:feedId.ics", "/api/calendar/:feedId"], (req, res) => {
  const rawId = req.params.feedId || "";
  const feedId = rawId.replace(/\.ics$/i, "");
  const data = calendarStore.get(feedId);

  if (!data) {
    // Return empty placeholder calendar so subscription doesn't throw errors
    const emptyCal = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Planova Kidz//EN",
      "X-WR-CALNAME:Planova Kidz Schedule",
      "BEGIN:VEVENT",
      `UID:placeholder-${Date.now()}@planovakidz.app`,
      `DTSTAMP:${formatICalDate(new Date())}Z`,
      `DTSTART:${formatICalDate(new Date())}`,
      `DTEND:${formatICalDate(new Date(Date.now() + 30 * 60 * 1000))}`,
      "SUMMARY:Waiting for weekly plan sync in Planova Kidz ✨",
      "DESCRIPTION:Open the Planova Kidz app on your child's device to generate and sync the 7-day schedule.",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="planova-schedule.ics"`);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.send(emptyCal);
  }

  const host = req.get("host") || "localhost:3000";
  const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  const icsContent = generateICS(data, `${protocol}://${host}`);

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `inline; filename="${(data.kidName || "planova").toLowerCase().replace(/[^a-z0-9]/g, "-")}-schedule.ics"`);
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("X-Published-TTL", "PT1H");
  return res.send(icsContent);
});

// 4. API: Parent Web Preview & 1-Click Subscribe Landing Page
app.get("/parent/calendar/:feedId", (req, res) => {
  const rawId = req.params.feedId || "";
  const feedId = rawId.replace(/\.ics$/i, "");
  const data = calendarStore.get(feedId);
  const kidName = data?.kidName || "Your Child";

  const host = req.get("host") || "localhost:3000";
  const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  const webcalUrl = `webcal://${host}/api/calendar/${feedId}.ics`;
  const httpUrl = `${protocol}://${host}/api/calendar/${feedId}.ics`;
  const googleCalUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(httpUrl)}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscribe to ${kidName}'s Schedule - Planova Kidz</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-xl space-y-6 text-center">
    <div class="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center text-white text-2xl mx-auto shadow-lg shadow-indigo-100">
      📅
    </div>
    
    <div class="space-y-2">
      <h1 class="text-2xl font-black text-slate-900 tracking-tight">${kidName}'s Live Schedule</h1>
      <p class="text-sm text-slate-500 font-medium leading-relaxed">
        Subscribe directly on your phone to receive automatic start-time alerts on your Lock Screen for classes, practice goals, and chores.
      </p>
    </div>

    <div class="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 text-left flex items-start gap-3 text-xs text-amber-900 font-medium">
      <span class="text-base">🔔</span>
      <span><strong>Live 7-Day Sync:</strong> Whenever a new weekly plan is generated or updated in Planova Kidz, your calendar updates automatically in the background.</span>
    </div>

    <div class="space-y-3 pt-2">
      <a href="${webcalUrl}" class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-sm uppercase tracking-wider py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all">
        <span></span> Subscribe in Apple Calendar
      </a>

      <a href="${googleCalUrl}" target="_blank" rel="noopener noreferrer" class="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black text-sm uppercase tracking-wider py-4 rounded-2xl shadow-md transition-all">
        <span>🗓️</span> Add to Google Calendar
      </a>

      <a href="${httpUrl}" download="${kidName.toLowerCase()}-schedule.ics" class="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs uppercase tracking-wider py-3.5 rounded-2xl transition-all">
        ⬇️ Download Calendar File (.ics)
      </a>
    </div>

    <div class="pt-4 border-t border-slate-100 flex flex-col items-center gap-1 text-[11px] text-slate-400 font-medium">
      <span>Planova Kidz • Family Companion Sync</span>
      <span>No app installation required for parents.</span>
    </div>
  </div>
</body>
</html>
  `;
  res.send(html);
});

// Vite middleware / Static Serving Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Planova Kidz server running on http://localhost:${PORT}`);
  });
}

startServer();
