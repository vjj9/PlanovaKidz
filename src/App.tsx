/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, 
  Calendar, 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  Sparkles,
  Clock,
  Moon,
  Sun,
  BookOpen,
  CheckCircle2,
  User,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Loader2,
  Bell,
  BellRing,
  Dumbbell,
  ClipboardList,
  Pencil,
  Wand2,
  LayoutGrid,
  Zap,
  Globe,
  AlertTriangle,
  Play,
  Pause,
  X,
  Palmtree
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type, ThinkingLevel, Modality } from "@google/genai";
import { 
  FixedClass, 
  UserSettings, 
  DayOfWeek, 
  WeeklyPlan,
  DailyPlan,
  PracticeGoal,
  Chore,
  FreeTime
} from './types';
import { NotificationService } from './services/notificationService';
import { LocalNotifications } from '@capacitor/local-notifications';

const DAYS: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DAY_COLORS: Record<DayOfWeek, { bg: string, text: string, border: string, lightBg: string, dot: string, button: string, buttonHover: string }> = {
  Monday: { bg: 'bg-rose-500', text: 'text-rose-600', border: 'border-rose-200', lightBg: 'bg-rose-50', dot: 'bg-rose-600', button: 'bg-rose-100 text-rose-600', buttonHover: 'hover:bg-rose-200' },
  Tuesday: { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-200', lightBg: 'bg-amber-50', dot: 'bg-amber-600', button: 'bg-amber-100 text-amber-600', buttonHover: 'hover:bg-amber-200' },
  Wednesday: { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-200', lightBg: 'bg-emerald-50', dot: 'bg-emerald-600', button: 'bg-emerald-100 text-emerald-600', buttonHover: 'hover:bg-emerald-200' },
  Thursday: { bg: 'bg-sky-500', text: 'text-sky-600', border: 'border-sky-200', lightBg: 'bg-sky-50', dot: 'bg-sky-600', button: 'bg-sky-100 text-sky-600', buttonHover: 'hover:bg-sky-200' },
  Friday: { bg: 'bg-violet-500', text: 'text-violet-600', border: 'border-violet-200', lightBg: 'bg-violet-50', dot: 'bg-violet-600', button: 'bg-violet-100 text-violet-600', buttonHover: 'hover:bg-violet-200' },
  Saturday: { bg: 'bg-fuchsia-500', text: 'text-fuchsia-600', border: 'border-fuchsia-200', lightBg: 'bg-fuchsia-50', dot: 'bg-fuchsia-600', button: 'bg-fuchsia-100 text-fuchsia-600', buttonHover: 'hover:bg-fuchsia-200' },
  Sunday: { bg: 'bg-indigo-500', text: 'text-indigo-600', border: 'border-indigo-200', lightBg: 'bg-indigo-50', dot: 'bg-indigo-600', button: 'bg-indigo-100 text-indigo-600', buttonHover: 'hover:bg-indigo-200' },
};

const TIME_OPTIONS = (() => {
  const options = [];
  for (let h = 8; h < 22; h++) {
    for (let m = 0; m < 60; m += 15) {
      options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return options;
})();

const FIXED_CLASS_TIME_OPTIONS = (() => {
  const options = [];
  for (let h = 8; h < 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return options;
})();

const SUNDAY_REMINDER_TIME_OPTIONS = (() => {
  const options = [];
  for (let h = 8; h < 22; h++) {
    options.push(`${h.toString().padStart(2, '0')}:00`);
  }
  return options;
})();

const FREQUENCY_OPTIONS = ['Weekly', '2x week', '3x week', '4x week', '5x week', '6x week', 'Daily'];
const CHORE_FREQUENCY_OPTIONS = ['Daily', 'Weekly'];
const DURATION_OPTIONS = ['15m', '30m', '45m', '1h', '1h 15m', '1h 30m', '2h', '2h 30m', '3h'];

const ActivityTimer = ({ 
  durationStr, 
  theme, 
  title,
  activeTimer,
  setActiveTimer
}: { 
  durationStr: string; 
  theme?: { bg: string; button: string; buttonHover: string; text?: string; border?: string; lightBg?: string }; 
  title?: string;
  activeTimer: any;
  setActiveTimer: React.Dispatch<React.SetStateAction<any>>;
}) => {
  const isThisActive = activeTimer && activeTimer.title === title;

  // Let's compute duration seconds
  const getSecondsFromStr = (str: string): number => {
    let secs = 0;
    if (!str) return 0;
    const hMatch = str.match(/(\d+(\.\d+)?)h/);
    const mMatch = str.match(/(\d+(\.\d+)?)m/);
    if (hMatch) secs += parseFloat(hMatch[1]) * 3600;
    if (mMatch) secs += parseFloat(mMatch[1]) * 60;
    return secs;
  };

  const currentTotalTime = isThisActive ? activeTimer.totalTime : getSecondsFromStr(durationStr);
  const currentTimeLeft = isThisActive ? activeTimer.timeLeft : currentTotalTime;
  const currentIsActive = isThisActive ? activeTimer.isActive : false;

  const progress = currentTotalTime > 0 ? ((currentTotalTime - currentTimeLeft) / currentTotalTime) * 100 : 0;
  
  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return { mins: m, secs: s.toString().padStart(2, '0') };
  };

  const timerDisplay = formatTime(currentTimeLeft);

  const handleToggle = () => {
    if (isThisActive) {
      setActiveTimer((prev: any) => {
        if (!prev) return null;
        return {
          ...prev,
          isActive: !prev.isActive,
          lastUpdated: Date.now()
        };
      });
    } else {
      // Set this timer as active and start it!
      setActiveTimer({
        title,
        durationStr,
        timeLeft: currentTotalTime,
        totalTime: currentTotalTime,
        isActive: true,
        themeClass: theme,
        lastUpdated: Date.now()
      });
    }
  };

  const handleReset = () => {
    if (isThisActive) {
      setActiveTimer(null);
    }
  };

  return (
    <div className="w-full mt-4 pt-4 border-t border-slate-50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
            {title || 'Timer'}
          </span>
          <div className="flex items-baseline font-mono tracking-tighter">
            <span className="text-2xl font-black text-indigo-600 leading-none">
              {timerDisplay.mins}
            </span>
            <span className="text-sm font-bold text-indigo-400">:{timerDisplay.secs}</span>
            <span className="text-[10px] font-bold text-indigo-400 uppercase ml-2 tracking-normal">MINS</span>
          </div>
        </div>
        <div className="flex gap-2">
          {isThisActive && (
            <button 
              onClick={handleReset}
              className="text-[10px] uppercase font-black px-3 py-2 rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all active:scale-95"
            >
              Reset
            </button>
          )}
          <button 
            onClick={handleToggle} 
            className={`text-xs font-black px-4 py-2 rounded-2xl transition-all shadow-sm active:scale-95 ${
              currentIsActive 
                ? 'bg-amber-100 text-amber-700 shadow-inner' 
                : currentTimeLeft === 0 
                  ? 'bg-emerald-100 text-emerald-700 font-extrabold'
                  : theme ? `${theme.button} ${theme.buttonHover}` : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
            }`}
          >
            {currentTimeLeft === 0 ? 'COMPLETED! ✨' : currentIsActive ? 'PAUSE' : 'START TIMER'}
          </button>
        </div>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
        <motion.div 
          initial={false}
          animate={{ width: `${progress}%` }}
          className={`h-full transition-all duration-1000 ${currentTimeLeft === 0 ? 'bg-emerald-500' : theme ? theme.bg : 'bg-indigo-500'}`} 
        />
      </div>
    </div>
  );
};

const durationToMinutes = (durStr: string): number => {
  if (!durStr) return 0;
  let mins = 0;
  const hMatch = durStr.match(/(\d+(\.\d+)?)h/);
  const mMatch = durStr.match(/(\d+(\.\d+)?)m/);
  if (hMatch) mins += parseFloat(hMatch[1]) * 60;
  if (mMatch) mins += parseFloat(mMatch[1]);
  return mins;
};

const getGoalsAndChoresDuration = (dayPlan: DailyPlan): number => {
  let totalMins = 0;
  dayPlan.slots.forEach(slot => {
    if (slot.type === 'Goal' || slot.type === 'Chore') {
      totalMins += durationToMinutes(slot.duration);
    }
  });
  return totalMins;
};

const getWeekendStartTime24 = (slots: any[]): string => {
  if (!slots || slots.length === 0) return '12:00';
  const timed = slots.filter(s => !s.isFlexible && s.time);
  if (timed.length === 0) return '12:00';
  
  let earliestMins = 720; // 12:00 PM
  timed.forEach(s => {
    const match = s.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      let h = parseInt(match[1]);
      const m = parseInt(match[2]);
      const p = match[3].toUpperCase();
      if (p === 'PM' && h < 12) h += 12;
      if (p === 'AM' && h === 12) h = 0;
      const mins = h * 60 + m;
      if (mins < earliestMins) earliestMins = mins;
    }
  });
  
  const h = Math.floor(earliestMins / 60);
  const m = earliestMins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem('kids_name') || '');
  const [hasStarted, setHasStarted] = useState(() => !!localStorage.getItem('kids_name'));
  const [fixedClasses, setFixedClasses] = useState<FixedClass[]>([]);
  const [practiceGoals, setPracticeGoals] = useState<PracticeGoal[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [freeTimes, setFreeTimes] = useState<FreeTime[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    schoolDayStartTime: '16:00',
    weekendAvailableHours: 4,
    schoolDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    bedtime: '20:30',
    sundaySetupReminder: true,
    sundaySetupReminderTime: '18:00',
    schoolMode: true,
    breakAvailableHours: 6,
  });
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [planSettings, setPlanSettings] = useState<UserSettings | null>(() => {
    const saved = localStorage.getItem('kids_plan_settings');
    return saved ? JSON.parse(saved) : null;
  });
  const [planActivitiesHash, setPlanActivitiesHash] = useState<string>(() => {
    return localStorage.getItem('kids_plan_activities_hash') || '';
  });

  const calculateActivitiesHash = (classes: any[], goals: any[], choresList: any[], ft: any[]) => {
    return JSON.stringify({
      classes: classes.map(c => ({ id: c.id, startTime: c.startTime, duration: c.duration, days: c.days, name: c.name })),
      goals: goals.map(g => ({ id: g.id, duration: g.duration, frequency: g.frequency, name: g.name })),
      chores: choresList.map(c => ({ id: c.id, duration: c.duration, frequency: c.frequency, name: c.name })),
      freeTimes: ft.map(f => ({ id: f.id, startTime: f.startTime, duration: f.duration, days: f.days, name: f.name }))
    });
  };
  const [focusedDayIndex, setFocusedDayIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showStoryButton, setShowStoryButton] = useState(false);
  const [isStoryLoading, setIsStoryLoading] = useState(false);
  const [storyAudio, setStoryAudio] = useState<string | null>(null);
  const [storyText, setStoryText] = useState<string | null>(null);
  const [isStoryPlaying, setIsStoryPlaying] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [hasAcceptedAiConsent, setHasAcceptedAiConsent] = useState(false);
  const [showAiConsentModal, setShowAiConsentModal] = useState(false);
  const [activeTimer, setActiveTimer] = useState<any>(() => {
    const saved = localStorage.getItem('planova_active_timer');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.isActive && parsed.lastUpdated) {
          const elapsedSecs = Math.floor((Date.now() - parsed.lastUpdated) / 1000);
          parsed.timeLeft = Math.max(0, parsed.timeLeft - elapsedSecs);
          if (parsed.timeLeft === 0) {
            parsed.isActive = false;
          }
        }
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [timerSwipedOut, setTimerSwipedOut] = useState(false);

  useEffect(() => {
    if (activeTimer?.title) {
      setTimerSwipedOut(false);
    }
  }, [activeTimer?.title]);

  useEffect(() => {
    if (activeTimer === undefined) return;
    if (activeTimer === null) {
      localStorage.removeItem('planova_active_timer');
    } else {
      localStorage.setItem('planova_active_timer', JSON.stringify({
        ...activeTimer,
        lastUpdated: Date.now()
      }));
    }
  }, [activeTimer]);

  useEffect(() => {
    if (!activeTimer || !activeTimer.isActive) return;
    
    const interval = setInterval(() => {
      setActiveTimer((prev: any) => {
        if (!prev || !prev.isActive) return prev;
        if (prev.timeLeft <= 1) {
          clearInterval(interval);
          return {
            ...prev,
            timeLeft: 0,
            isActive: false,
            lastUpdated: Date.now()
          };
        }
        return {
          ...prev,
          timeLeft: prev.timeLeft - 1,
          lastUpdated: Date.now()
        };
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeTimer?.isActive, activeTimer?.title]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    if (!process.env.GEMINI_API_KEY) {
      logAppError("Gemini API Key is missing!");
      setApiKeyMissing(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch(e) {}
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const generationActive = useRef(false);
  const [loadingMessage, setLoadingMessage] = useState("Consulting the schedule experts...");

  useEffect(() => {
    if (isGenerating) {
      generationActive.current = true;
      setElapsedTime(0);
      setShowStoryButton(false);
      setStoryAudio(null);
      
      const classNames = fixedClasses.map(c => c.name).slice(0, 2).join(' & ');
      const messages = [
        classNames ? `Organizing your ${classNames} classes...` : "Organizing your classes...",
        "Optimizing your free time...",
        "Checking for schedule conflicts...",
        "Finalizing your weekly plan...",
      ];
      let i = 0;
      const interval = setInterval(() => {
        setLoadingMessage(messages[i % messages.length]);
        i++;
      }, 2000);

      const timer = setInterval(() => {
        setElapsedTime(prev => {
          const next = prev + 1;
          return next;
        });
      }, 1000);
      
      // Show story button immediately
      setShowStoryButton(true);

      return () => {
        clearInterval(interval);
        clearInterval(timer);
        generationActive.current = false;
      };
    }
  }, [isGenerating]);

  // Form states
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDays, setNewClassDays] = useState<DayOfWeek[]>(['Sunday']);
  const [newClassTime, setNewClassTime] = useState('16:00');
  const [newClassDuration, setNewClassDuration] = useState('30m');
  const [newClassReminder, setNewClassReminder] = useState(true);

  // Practice Goal form states
  const [showAddPractice, setShowAddPractice] = useState(false);
  const [newPracticeName, setNewPracticeName] = useState('');
  const [newPracticeDuration, setNewPracticeDuration] = useState('30m');
  const [newPracticeFrequency, setNewPracticeFrequency] = useState('Daily');

  // Chore form states
  const [showAddChore, setShowAddChore] = useState(false);
  const [newChoreName, setNewChoreName] = useState('');
  const [newChoreDuration, setNewChoreDuration] = useState('15m');
  const [newChoreFrequency, setNewChoreFrequency] = useState('Daily');

  // Free Time form states
  const [showAddFreeTime, setShowAddFreeTime] = useState(false);
  const [newFreeTimeName, setNewFreeTimeName] = useState('');
  const [newFreeTimeDays, setNewFreeTimeDays] = useState<DayOfWeek[]>(['Sunday']);
  const [newFreeTimeTime, setNewFreeTimeTime] = useState('16:00');
  const [newFreeTimeDuration, setNewFreeTimeDuration] = useState('30m');

  // Editing states
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingPracticeId, setEditingPracticeId] = useState<string | null>(null);
  const [editingChoreId, setEditingChoreId] = useState<string | null>(null);
  const [editingFreeTimeId, setEditingFreeTimeId] = useState<string | null>(null);

  const [appLogs, setAppLogs] = useState<{timestamp: string, message: string}[]>(() => {
    try {
      const saved = localStorage.getItem('app_diagnostic_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const logAppError = (message: string, error?: any) => {
    const errorMsg = error ? (error.message || (typeof error === 'string' ? error : JSON.stringify(error))) : '';
    const entry = {
      timestamp: new Date().toLocaleTimeString(),
      message: `${message}${errorMsg ? ' | ' + errorMsg : ''}`
    };
    
    setAppLogs(prev => {
      const updated = [entry, ...prev].slice(0, 50); // Keep more logs for diagnostics
      localStorage.setItem('app_diagnostic_logs', JSON.stringify(updated));
      return updated;
    });
    console.error(`[Planova Diagnostic] ${entry.message}`, error);
  };

  const [debugTapCount, setDebugTapCount] = useState(0);
  const [showDebug, setShowDebug] = useState(false);

  const [notificationStatus, setNotificationStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [formError, setFormError] = useState<string | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    const initNotifications = async () => {
      const status = await NotificationService.checkPermissions();
      setNotificationStatus(status);
      
      if (status === 'granted') {
        await NotificationService.registerActionTypes();
        
        // Listen for notification actions
        LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
          console.log('Notification action performed:', notification);
          if (notification.actionId === 'done') {
            // Handle "Done!" action
            alert('Great job finishing that activity!');
          }
        });
      }
    };
    initNotifications();

    const savedClasses = localStorage.getItem('kids_fixed_classes');
    const savedPractice = localStorage.getItem('kids_practice_goals');
    const savedChores = localStorage.getItem('kids_chores');
    const savedFreeTimes = localStorage.getItem('kids_free_times');
    const savedSettings = localStorage.getItem('kids_settings');
    const savedPlan = localStorage.getItem('kids_plan');

    if (savedClasses) {
      const parsed = JSON.parse(savedClasses);
      const normalized = parsed.map((c: any) => ({
        ...c,
        days: c.days || (c.day ? [c.day] : []),
        day: undefined
      }));
      // Cleanup duplicates from saved data (merge overlapping days for same class/time)
      const mergedClasses = normalized.reduce((acc: any[], current: any) => {
        const currentName = current.name.trim().toLowerCase();
        const currentTime = current.startTime;
        
        const existing = acc.find(item => 
          item.name.trim().toLowerCase() === currentName && 
          item.startTime === currentTime
        );
        
        if (existing) {
          const allDays = Array.from(new Set([...existing.days, ...current.days]));
          existing.days = allDays;
          // Keep the reminder if either has it
          existing.reminder = existing.reminder || current.reminder;
          return acc;
        }
        return acc.concat([{...current}]);
      }, []);
      setFixedClasses(mergedClasses);
    }
    if (savedPractice) setPracticeGoals(JSON.parse(savedPractice));
    if (savedChores) setChores(JSON.parse(savedChores));
    if (savedFreeTimes) {
      const parsed = JSON.parse(savedFreeTimes);
      // Cleanup duplicates
      const uniqueFreeTimes = parsed.reduce((acc: any[], current: any) => {
        const isDuplicate = acc.find(item => 
          item.name === current.name && 
          item.startTime === current.startTime && 
          JSON.stringify([...item.days].sort()) === JSON.stringify([...current.days].sort())
        );
        if (!isDuplicate) return acc.concat([current]);
        return acc;
      }, []);
      setFreeTimes(uniqueFreeTimes);
    }
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      
      setSettings({
        ...parsed,
        schoolDayStartTime: parsed.schoolDayStartTime || parsed.weekdayStartTime || '16:00',
        weekendAvailableHours: parsed.weekendAvailableHours || 4,
        schoolDays: parsed.schoolDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        bedtime: parsed.bedtime || '20:30',
        sundaySetupReminder: parsed.sundaySetupReminder !== undefined ? parsed.sundaySetupReminder : true,
        sundaySetupReminderTime: parsed.sundaySetupReminderTime || '18:00',
        schoolMode: parsed.schoolMode !== undefined 
          ? parsed.schoolMode 
          : (parsed.summerMode !== undefined ? !parsed.summerMode : true),
        breakAvailableHours: parsed.breakAvailableHours !== undefined 
          ? parsed.breakAvailableHours 
          : (parsed.summerAvailableHours !== undefined ? parsed.summerAvailableHours : 6),
      });
    }
    if (savedPlan) {
      const parsedPlan = JSON.parse(savedPlan);
      // Clean up any hallucinated tasks from stored plan
      const savedSettingsLocal = localStorage.getItem('kids_settings');
      const savedClassesLocal = localStorage.getItem('kids_fixed_classes');
      const savedPracticeLocal = localStorage.getItem('kids_practice_goals');
      const savedChoresLocal = localStorage.getItem('kids_chores');
      const savedFreeTimesLocal = localStorage.getItem('kids_free_times');

      if (parsedPlan.days) {
        const allowed = new Set(["free time ✨"]);
        if (savedClassesLocal) JSON.parse(savedClassesLocal).forEach((c: any) => allowed.add(c.name.toLowerCase()));
        if (savedPracticeLocal) JSON.parse(savedPracticeLocal).forEach((p: any) => allowed.add(p.name.toLowerCase()));
        if (savedChoresLocal) JSON.parse(savedChoresLocal).forEach((c: any) => allowed.add(c.name.toLowerCase()));
        if (savedFreeTimesLocal) JSON.parse(savedFreeTimesLocal).forEach((f: any) => allowed.add(f.name.toLowerCase()));

        parsedPlan.days = parsedPlan.days.map((day: any) => ({
          ...day,
          slots: day.slots.filter((slot: any) => {
            const name = slot.activity.toLowerCase();
            return allowed.has(name) || name.includes("free time");
          })
        }));
      }
      setPlan(parsedPlan);
    }

    const consent = localStorage.getItem('ai_consent_accepted');
    if (consent === 'true') setHasAcceptedAiConsent(true);
  }, []);

  // Save data to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('kids_name', userName);
    localStorage.setItem('kids_fixed_classes', JSON.stringify(fixedClasses));
    localStorage.setItem('kids_practice_goals', JSON.stringify(practiceGoals));
    localStorage.setItem('kids_chores', JSON.stringify(chores));
    localStorage.setItem('kids_free_times', JSON.stringify(freeTimes));
    localStorage.setItem('kids_settings', JSON.stringify(settings));
    if (plan) {
      localStorage.setItem('kids_plan', JSON.stringify(plan));
    }
    if (planSettings) {
      localStorage.setItem('kids_plan_settings', JSON.stringify(planSettings));
    } else {
      localStorage.removeItem('kids_plan_settings');
    }
    if (planActivitiesHash) {
      localStorage.setItem('kids_plan_activities_hash', planActivitiesHash);
    } else {
      localStorage.removeItem('kids_plan_activities_hash');
    }
    
    // Sync all notifications at once to prevent collisions
    NotificationService.syncAllNotifications(fixedClasses, plan, settings);
  }, [userName, fixedClasses, practiceGoals, chores, settings, plan, planSettings, planActivitiesHash]);

  // Stop the story if the user navigates away or starts planning
  useEffect(() => {
    stopStory();
  }, [activeTab, hasStarted]);

  const requestNotificationPermission = async () => {
    try {
      const status = await NotificationService.requestPermissions();
      setNotificationStatus(status);
      
      if (status === 'granted') {
        await NotificationService.registerActionTypes();
        alert('Notifications enabled! You will now receive reminders for your activities.');
      } else if (status === 'denied') {
        alert('Notification permission is denied. Please go to your iPhone Settings > Planova Kidz > Notifications and turn them on manually.');
      }
    } catch (error) {
      logAppError("Notification permission error", error);
      alert('We had some trouble updating your notification settings. Please check your phone settings to make sure notifications are allowed.');
    }
  };

  const testNotification = async () => {
    if (notificationStatus !== 'granted') {
      const status = await NotificationService.requestPermissions();
      setNotificationStatus(status);
      if (status !== 'granted') return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          title: "Test Notification! 🔔",
          body: "If you see this, notifications are working correctly.",
          id: 999,
          schedule: { at: new Date(Date.now() + 5000) }, // 5 seconds from now
          sound: 'default'
        }
      ]
    });
    alert('Test notification scheduled for 5 seconds from now. Please lock your screen or go to the home screen to see it.');
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newClassName || newClassName.trim() === '') {
      setFormError("Please enter a class name! 🎹");
      return;
    }
    if (newClassDays.length === 0) {
      setFormError("Please select at least one day for the class! 📅");
      return;
    }
    if (!newClassTime) {
      setFormError("Please select a start time for the class! ⏰");
      return;
    }
    
    if (editingClassId) {
      console.log('Planova Kidz: Updating existing class...', editingClassId);
      const otherClasses = fixedClasses.filter(c => c.id !== editingClassId);
      const conflictingIndex = otherClasses.findIndex(c => 
        c.name.trim().toLowerCase() === newClassName.trim().toLowerCase() && 
        c.startTime === newClassTime
      );

      if (conflictingIndex !== -1) {
        console.log('Planova Kidz: Update conflicts with existing entry, merging...');
        const updatedClasses = [...otherClasses];
        const existing = updatedClasses[conflictingIndex];
        const mergedDays = Array.from(new Set([...existing.days, ...newClassDays])) as DayOfWeek[];
        
        updatedClasses[conflictingIndex] = {
          ...existing,
          days: mergedDays,
          duration: newClassDuration,
          reminder: newClassReminder || existing.reminder
        };
        setFixedClasses(updatedClasses);
      } else {
        setFixedClasses(fixedClasses.map(c => c.id === editingClassId ? {
          ...c,
          name: newClassName.trim(),
          days: newClassDays,
          startTime: newClassTime,
          duration: newClassDuration,
          reminder: newClassReminder
        } : c));
      }
      setEditingClassId(null);
    } else {
      // AUTO-MERGE LOGIC: If a class with same name and time exists, merge the days
      const existingIndex = fixedClasses.findIndex(c => 
        c.name.trim().toLowerCase() === newClassName.trim().toLowerCase() && 
        c.startTime === newClassTime
      );

      if (existingIndex !== -1) {
        console.log('Planova Kidz: Found existing class, merging days...');
        const updatedClasses = [...fixedClasses];
        const existing = updatedClasses[existingIndex];
        // Union of days
        const mergedDays = Array.from(new Set([...existing.days, ...newClassDays])) as DayOfWeek[];
        
        updatedClasses[existingIndex] = {
          ...existing,
          days: mergedDays,
          duration: newClassDuration,
          reminder: newClassReminder
        };
        setFixedClasses(updatedClasses);
      } else {
        console.log('Planova Kidz: Adding brand new class entry...');
        setFixedClasses([...fixedClasses, { 
          id: `class-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, 
          name: newClassName.trim(), 
          days: newClassDays,
          startTime: newClassTime,
          duration: newClassDuration,
          reminder: newClassReminder
        }]);
      }
    }
    
    setNewClassName('');
    setNewClassDays([]);
    setShowAddClass(false);
    setNewClassReminder(true);
  };

  const handleAddPractice = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!newPracticeName || newPracticeName.trim() === '') {
      setFormError("Please enter a practice goal! ⚽");
      return;
    }
    
    if (editingPracticeId) {
      setPracticeGoals(practiceGoals.map(p => p.id === editingPracticeId ? {
        ...p,
        name: newPracticeName,
        duration: newPracticeDuration,
        frequency: newPracticeFrequency
      } : p));
      setEditingPracticeId(null);
    } else {
      if (practiceGoals.some(p => p.name.toLowerCase() === newPracticeName.toLowerCase())) {
        setFormError("This practice goal already exists!");
        return;
      }
      setPracticeGoals([...practiceGoals, {
        id: crypto.randomUUID(),
        name: newPracticeName,
        duration: newPracticeDuration,
        frequency: newPracticeFrequency
      }]);
    }
    
    setNewPracticeName('');
    setShowAddPractice(false);
  };

  const handleAddChore = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!newChoreName || newChoreName.trim() === '') {
      setFormError("Please enter a chore name! 🧹");
      return;
    }
    
    if (editingChoreId) {
      setChores(chores.map(c => c.id === editingChoreId ? {
        ...c,
        name: newChoreName,
        duration: newChoreDuration,
        frequency: newChoreFrequency
      } : c));
      setEditingChoreId(null);
    } else {
      if (chores.some(c => c.name.toLowerCase() === newChoreName.toLowerCase())) {
        setFormError("This chore already exists!");
        return;
      }
      setChores([...chores, {
        id: crypto.randomUUID(),
        name: newChoreName,
        duration: newChoreDuration,
        frequency: newChoreFrequency
      }]);
    }
    
    setNewChoreName('');
    setShowAddChore(false);
  };

  const startEditClass = (c: FixedClass) => {
    setEditingClassId(c.id);
    setNewClassName(c.name);
    setNewClassDays(c.days);
    setNewClassTime(c.startTime);
    setNewClassDuration(c.duration);
    setNewClassTime(c.startTime);
    setNewClassDuration(c.duration);
    setNewClassReminder(c.reminder);
    setFormError(null);
    setShowAddClass(true);
  };

  const startEditPractice = (p: PracticeGoal) => {
    setEditingPracticeId(p.id);
    setNewPracticeName(p.name);
    setNewPracticeDuration(p.duration);
    setNewPracticeFrequency(p.frequency);
    setFormError(null);
    setShowAddPractice(true);
  };

  const startEditChore = (c: Chore) => {
    setEditingChoreId(c.id);
    setNewChoreName(c.name);
    setNewChoreDuration(c.duration);
    setNewChoreFrequency(c.frequency);
    setFormError(null);
    setShowAddChore(true);
  };

  const handleAddFreeTime = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!newFreeTimeName || newFreeTimeName.trim() === '') {
      setFormError("Please enter a name for your free time! 🎮");
      return;
    }
    if (newFreeTimeDays.length === 0) {
      setFormError("Please select at least one day! 📅");
      return;
    }
    if (!newFreeTimeTime) {
      setFormError("Please select a start time! ⏰");
      return;
    }
    
    if (editingFreeTimeId) {
      setFreeTimes(freeTimes.map(f => f.id === editingFreeTimeId ? {
        ...f,
        name: newFreeTimeName,
        days: newFreeTimeDays,
        startTime: newFreeTimeTime,
        duration: newFreeTimeDuration
      } : f));
      setEditingFreeTimeId(null);
    } else {
      // Prevent duplicates
      const isDuplicate = freeTimes.some(f => 
        f.name.toLowerCase() === newFreeTimeName.toLowerCase() &&
        f.startTime === newFreeTimeTime &&
        JSON.stringify([...f.days].sort()) === JSON.stringify([...newFreeTimeDays].sort())
      );
 
      if (isDuplicate) {
        setFormError("This free time activity already exists for these days!");
        return;
      }

      setFreeTimes([...freeTimes, { 
        id: crypto.randomUUID(), 
        name: newFreeTimeName, 
        days: newFreeTimeDays,
        startTime: newFreeTimeTime,
        duration: newFreeTimeDuration
      }]);
    }
    
    setNewFreeTimeName('');
    setNewFreeTimeDays(['Sunday']);
    setShowAddFreeTime(false);
  };

  const startEditFreeTime = (f: FreeTime) => {
    setEditingFreeTimeId(f.id);
    setNewFreeTimeName(f.name);
    setNewFreeTimeDays(f.days);
    setNewFreeTimeTime(f.startTime);
    setNewFreeTimeDuration(f.duration);
    setShowAddFreeTime(true);
  };

  const format12h = (time24: string) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const callAiWithRetry = async (fn: () => Promise<any>, maxRetries = 3) => {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        return await fn();
      } catch (error: any) {
        const isRetryable = 
          error.message?.includes('503') || 
          error.message?.includes('rate limit') || 
          error.message?.includes('quota') || 
          error.message?.includes('overloaded') || 
          error.message?.includes('DEADLINE_EXCEEDED') ||
          error.message?.includes('500');
          
        if (isRetryable && attempt < maxRetries) {
          attempt++;
          const delay = 2000 * Math.pow(2, attempt - 1); // Exponential backoff: 2s, 4s, 8s
          console.warn(`[Planova AI] Call failed, retrying (${attempt}/${maxRetries}) in ${delay}ms...`, error.message);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw error;
      }
    }
  };

  const generatePlan = async (bypassAiConsent: boolean = false) => {
    if (!hasAcceptedAiConsent && !bypassAiConsent) {
      setShowAiConsentModal(true);
      return;
    }

    const hasData = fixedClasses.length > 0 || practiceGoals.length > 0 || chores.length > 0 || freeTimes.length > 0;
    if (!hasData) {
      alert("enter activities to Plan");
      setFormError && setFormError("enter activities to Plan");
      return;
    }

    setIsGenerating(true);
    setActiveTab('plan');
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("Planova Kidz: Gemini API Key is missing!");
        throw new Error("Gemini API Key is missing. Please ensure it is set in the Secrets panel.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      if (!process.env.GEMINI_API_KEY) {
        logAppError("Gemini API Key is missing for story generation!");
        return;
      }

      const isSchoolMode = settings.schoolMode !== false;
      const breakLimitHours = settings.breakAvailableHours ?? 6;
      const weekendLimitHours = settings.weekendAvailableHours;
      const schoolStartTimeStr = format12h(settings.schoolDayStartTime);
      const bedtimeStr = format12h(settings.bedtime);

      const inputsSection = !isSchoolMode ? `
        - Bedtime: ${bedtimeStr}
        - School Break Weekdays (with Break schedule active): ${settings.schoolDays.join(', ')}
        - Weekday MAX duration for GOALS and CHORES combined: ${breakLimitHours} hours per day.
        - Weekend MAX duration for GOALS and CHORES combined: ${weekendLimitHours} hours per day.
      ` : `
        - Bedtime: ${bedtimeStr}
        - School Days: ${settings.schoolDays.join(', ')}
        - Start time (after school) on school days: ${schoolStartTimeStr}
        - Weekend MAX duration for GOALS and CHORES combined: ${weekendLimitHours} hours per day.
      `;

      const planningRulesSection = !isSchoolMode ? `
        1. STRICT REQUIREMENT: ONLY use activities provided above. DO NOT invent tasks like "Homework" or "Clean Room".
        2. STRICT DURATIONS AND AVAILABLE HOURS LIMITS:
           - On Break Weekdays, the TOTAL scheduled duration of ALL slots combined (Goals + Chores + Classes + Free Time) MUST NOT exceed the Daily limit of ${breakLimitHours} hours per day (unless the sum of user's fixed classes already exceeds this limit).
           - On Weekend Days (Saturday/Sunday), the TOTAL scheduled duration of ALL slots combined (Goals + Chores + Classes + Free Time) MUST NOT exceed the Daily limit of ${weekendLimitHours} hours per day (unless the sum of user's fixed classes already exceeds this limit).
           - DO NOT pad the day's schedule with "Free Time ✨" or stretch it to Bedtime if doing so would cause the day's total scheduled time to exceed the ${breakLimitHours} hour (weekdays) or ${weekendLimitHours} hour (weekends) limit. Bedtime is only the latest possible curfew time, NOT a target to fill.
           - DO NOT stretch, pad, or lengthen the duration of Goals or Chores. If a goal duration is "30m", EVERY scheduled session of it MUST be exactly "30m" and never longer (e.g., do not make it 1h, 2h, 3h, etc.).
           - DO NOT schedule more occurrences or repeat goals/chores beyond their specified frequency. E.g. if frequency is "1x week", schedule it only once.
        3. Break Weekday Scheduling:
           - On active weekdays (${settings.schoolDays.join(', ')}), schedule GOALS, CHORES, CLASSES, and FIXED FREE TIME starting at or after 10:00 AM.
           - Keep the total time scheduled for the day (all slots combined) STRICTLY within ${breakLimitHours} hours. DO NOT add extra Free Time to fill the entire day to Bedtime.
        4. Weekend Scheduling (Saturday/Sunday):
           - Schedule classes at their exact specified times.
           - Schedule GOALS and CHORES at realistic, specific times starting at or after 10:00 AM.
           - Keep the total time scheduled for the day (all slots combined) STRICTLY within ${weekendLimitHours} hours. DO NOT add extra Free Time to fill the entire day to Bedtime.
        5. Distribute goals and chores across the entire week to satisfy both weekday and weekend limits.
        6. Every slot MUST have "isFlexible": false and have a realistic, exact "time" field (no blank times!).
        7. Do NOT start any day before 10:00 AM unless there is an explicit FIXED CLASS or FIXED FREE TIME that has been specified by the user to start earlier. First slot of the day must be at 10:00 AM or after.
      ` : `
        1. STRICT REQUIREMENT: ONLY use activities provided above. DO NOT invent tasks like "Homework" or "Clean Room".
        2. STRICT DURATIONS AND AVAILABLE HOURS LIMITS:
           - On Weekend Days (Saturday/Sunday), the TOTAL scheduled duration of ALL slots combined (Goals + Chores + Classes + Free Time) MUST NOT exceed the Daily limit of ${weekendLimitHours} hours per day (unless the sum of user's fixed classes already exceeds this limit).
           - DO NOT pad the weekend schedule with extra "Free Time ✨" to fill the entire day to Bedtime. Bedtime is only the latest possible curfew, NOT a target to fill. On weekends, the entire scheduled day (the sum of all slots) should be at most ${weekendLimitHours} hours.
           - DO NOT stretch, pad, or lengthen the duration of Goals or Chores. If a goal duration is "30m", EVERY scheduled session of it MUST be exactly "30m" and never longer (e.g., do not make it 1h, 2h, 3h, etc.).
           - DO NOT schedule more occurrences or repeat goals/chores beyond their specified frequency.
        3. ENTIRE WINDOW (ONLY FOR SCHOOL DAYS): You MUST schedule the ENTIRE time from ${schoolStartTimeStr} to Bedtime (${bedtimeStr}) on school days. NO GAPS. Your schedule MUST be continuous. On school days, use "Free Time ✨" (Timed) to fill all gaps.
        4. START TIME (ONLY FOR SCHOOL DAYS): The first activity on a school day MUST start exactly at ${schoolStartTimeStr}. This is non-negotiable.
        5. DURATION CALC (ONLY FOR SCHOOL DAYS): The total duration to account for is exactly ${
          Math.round(((parseFloat(settings.bedtime.split(':')[0]) + parseFloat(settings.bedtime.split(':')[1])/60) - 
          (parseFloat(settings.schoolDayStartTime.split(':')[0]) + parseFloat(settings.schoolDayStartTime.split(':')[1])/60)) * 100) / 100
        } hours. The durations of your scheduled slots for that day MUST add up to this exact total.
        6. SLOT TIMES: For school days, the 'time' field for each slot MUST be calculated based on the start time and preceding durations.
        7. On Weekends (Saturday/Sunday): 
           - Schedule all classes and fixed free times at their exact specified times.
           - Schedule GOALS and CHORES at realistic, specific times starting at or after 10:00 AM.
           - Keep the total time scheduled for the day (all slots combined) STRICTLY within ${weekendLimitHours} hours. Do not pad the day to Bedtime with Free Time beyond the ${weekendLimitHours} hours limit.
           - If there are many weekly goals or chores, distribute them onto school days (weekdays) after school hours to ensure that you STRICTLY stay below ${weekendLimitHours} hours per day on weekends.
        8. Every slot MUST have "isFlexible": false and have a realistic, exact "time" field (no blank times!).
        9. Do NOT start any weekend day before 10:00 AM unless there is an explicit FIXED CLASS or FIXED FREE TIME that has been specified by the user to start earlier.
      `;

      const prompt = `
        Create a weekly schedule for a child.
        
        INPUTS:
        ${inputsSection}
        
        ACTIVITIES TO SCHEDULE:
        - CLASSES (Fixed Time): ${fixedClasses.map(c => `${c.name} on ${c.days.join(', ')} at ${format12h(c.startTime)} (${c.duration})`).join('; ')}
        - FIXED FREE TIME (Scheduled): ${freeTimes.map(f => `${f.name} on ${f.days.join(', ')} at ${format12h(f.startTime)} (${f.duration})`).join('; ')}
        - GOALS (to fit in): ${practiceGoals.map(p => `${p.name} (${p.duration}, ${p.frequency})`).join('; ')}
        - CHORES (to fit in): ${chores.map(c => `${c.name} (${c.duration}, ${c.frequency})`).join('; ')}
        
        PLANNING RULES:
        ${planningRulesSection}
        5. GOAL AND CHORE SPLITTING (IMPORTANT):
           - Kids have short attention spans. If any GOAL or CHORE has a total duration of 1 hour or more per week (e.g., "1h", "1h 15m", "1h 30m", "2h", "3h") and a frequency like "Weekly" or "2x week", "3x week", "4x week" - you MUST NOT schedule it as a single huge block on a single day.
           - Instead, split this weekly duration into smaller, kid-friendly session lengths (e.g., 15m, 20m, 30m, or 45m) and distribute them across multiple different days of the week.
           - For example, "Piano Practice (1h 30m, Weekly / 3x week)" must be split and scheduled as three separate 30-minute sessions or two separate 45-minute sessions on different days of the week.
           - Keep the activity name EXACTLY identical across all occurrences (e.g. "Piano Practice"). DO NOT append part numbers, suffixes (like "Part 1" or "(Split)") or change the spelling, so they map back to user terms perfectly.
           - Ensure the sum of the split session durations over the course of the week equals the original target total duration (e.g., three 30m sessions sum to exactly 1h 30m).
        6. Return ONLY valid JSON.
        
        JSON Schema:
        {
          "days": [{
            "day": "Sunday", 
            "slots": [{
              "time": "4:00 PM", // Omit if isFlexible is true. MUST follow 12h format: H:MM AM/PM.
              "activity": "Name", 
              "duration": "1h", // MUST be format "Xh", "Xm", or "Xh Xm"
              "type": "Class | Chore | Goal | FreeTime", 
              "isFlexible": false, 
              "reminder": boolean
            }]
          }],
          "tips": ["One short tip"]
        }
      `;

      console.log("Planova Kidz: Calling Gemini API...");
      const response = await callAiWithRetry(() => ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            required: ["days", "tips"],
            properties: {
              days: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ["day", "slots"],
                  properties: {
                    day: { type: Type.STRING },
                    slots: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        required: ["activity", "duration", "type", "isFlexible"],
                        properties: {
                          time: { type: Type.STRING },
                          activity: { type: Type.STRING },
                          duration: { type: Type.STRING },
                          type: { type: Type.STRING },
                          isFlexible: { type: Type.BOOLEAN },
                          reminder: { type: Type.BOOLEAN }
                        }
                      }
                    }
                  }
                }
              },
              tips: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            }
          }
        }
      }));

      if (!response.text) {
        throw new Error("Empty response from Gemini API.");
      }

      const result = JSON.parse(response.text);
      
      // Post-process to filter out hallucinated activities and map to exact user terms
      const originalActivities = [
        ...fixedClasses.map(c => ({ original: c.name, lower: c.name.toLowerCase() })),
        ...practiceGoals.map(p => ({ original: p.name, lower: p.name.toLowerCase() })),
        ...chores.map(c => ({ original: c.name, lower: c.name.toLowerCase() })),
        ...freeTimes.map(f => ({ original: f.name, lower: f.name.toLowerCase() }))
      ];

      const cleanStr = (s: string) => s.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').replace(/[^\w\s]/g, '').toLowerCase().trim();

      const mapActivityName = (aiName: string) => {
        if (!aiName) return null;
        const normAi = aiName.toLowerCase().trim();
        if (normAi.includes("free time") || normAi.includes("freetime")) {
          return "Free Time ✨";
        }
        
        // Exact match
        const exactMatch = originalActivities.find(act => act.lower === normAi);
        if (exactMatch) return exactMatch.original;

        // Cleaned exact match
        const cleanAi = cleanStr(aiName);
        if (!cleanAi) return null;

        const cleanExactMatch = originalActivities.find(act => cleanStr(act.lower) === cleanAi);
        if (cleanExactMatch) return cleanExactMatch.original;

        // Substring / word overlap match
        const cleanSubstringMatch = originalActivities.find(act => {
          const cleanAct = cleanStr(act.lower);
          return cleanAct && (cleanAi.includes(cleanAct) || cleanAct.includes(cleanAi));
        });
        if (cleanSubstringMatch) return cleanSubstringMatch.original;

        return null;
      };

      if (result.days) {
        result.days = result.days.map((day: any) => {
          const isSchoolDay = settings.schoolDays.includes(day.day as DayOfWeek) && (settings.schoolMode !== false);
          
          let daySlots = day.slots || [];
          
          // Map to exact user terms & filter out hallucinations (nulls)
          daySlots = daySlots.map((slot: any) => {
            const mappedName = mapActivityName(slot.activity);
            if (mappedName) {
              return { ...slot, activity: mappedName, isFlexible: false };
            }
            return null;
          }).filter(Boolean);

          const parseTime = (t: string) => {
            const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!match) return 0;
            let h = parseInt(match[1]);
            const m = parseInt(match[2]);
            const p = match[3].toUpperCase();
            if (p === 'PM' && h < 12) h += 12;
            if (p === 'AM' && h === 12) h = 0;
            return h * 60 + m;
          };

          let requiredStart24 = '10:00';
          if (isSchoolDay) {
            requiredStart24 = settings.schoolDayStartTime;
          } else {
            const dayName = day.day as DayOfWeek;
            const dayClasses = fixedClasses.filter(c => c.days.includes(dayName));
            const dayFixedFreeTimes = freeTimes.filter(f => f.days.includes(dayName));
            
            let earliestKidMins = 600; // 10:00 AM
            dayClasses.forEach(c => {
              const m = parseTime(format12h(c.startTime));
              if (m < earliestKidMins) earliestKidMins = m;
            });
            dayFixedFreeTimes.forEach(f => {
              const m = parseTime(format12h(f.startTime));
              if (m < earliestKidMins) earliestKidMins = m;
            });
            
            if (earliestKidMins < 600) {
              const h = Math.floor(earliestKidMins / 60);
              const m = earliestKidMins % 60;
              requiredStart24 = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            }
          }

          const timedSlots = daySlots.filter((s: any) => s.time);

          if (timedSlots.length > 0) {
            // Sort by time
            timedSlots.sort((a: any, b: any) => parseTime(a.time) - parseTime(b.time));

            const firstSlotTimeMins = parseTime(timedSlots[0].time);
            const requiredStartMins = parseTime(format12h(requiredStart24));
            
            const currentTotalDur = daySlots.reduce((sum: number, slot: any) => {
              const duration = slot.duration || '0m';
              const hMatch = duration.match(/(\d+)h/);
              const mMatch = duration.match(/(\d+)m/);
              let mins = 0;
              if (hMatch) mins += parseInt(hMatch[1]) * 60;
              if (mMatch) mins += parseInt(mMatch[1]);
              return sum + mins;
            }, 0);

            const breakLimitHours = settings.breakAvailableHours ?? 6;
            const weekendLimitHours = settings.weekendAvailableHours;
            const isWeekdayInBreak = settings.schoolDays.includes(day.day as DayOfWeek) && (settings.schoolMode === false);
            const dailyLimitMins = isSchoolDay
              ? 999999
              : (isWeekdayInBreak ? breakLimitHours * 60 : weekendLimitHours * 60);

            if (firstSlotTimeMins > requiredStartMins) {
              const gapMins = firstSlotTimeMins - requiredStartMins;
              
              if (isSchoolDay || (currentTotalDur + gapMins <= dailyLimitMins)) {
                // If the gap is small (<= 30m) and the first slot is Free Time, just SNAP it to the start
                if (gapMins <= 30 && timedSlots[0].activity.toLowerCase().includes("free time")) {
                  const originalDuration = timedSlots[0].duration;
                  let newDuration = originalDuration;
                  
                  // Add gap to duration
                  const hMatch = originalDuration.match(/(\d+)h/);
                  const mMatch = originalDuration.match(/(\d+)m/);
                  let totalDurMins = 0;
                  if (hMatch) totalDurMins += parseInt(hMatch[1]) * 60;
                  if (mMatch) totalDurMins += parseInt(mMatch[1]);
                  totalDurMins += gapMins;
                  
                  const h = Math.floor(totalDurMins/60);
                  const m = totalDurMins % 60;
                  newDuration = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
                  
                  timedSlots[0].time = format12h(requiredStart24);
                  timedSlots[0].duration = newDuration;
                } else {
                  // Prepend Free Time if gap at start
                  const gapDuration = gapMins >= 60 ? `${Math.floor(gapMins/60)}h${gapMins%60 > 0 ? ` ${gapMins%60}m` : ''}` : `${gapMins}m`;
                  
                  daySlots.unshift({
                    time: format12h(requiredStart24),
                    activity: "Free Time ✨",
                    duration: gapDuration,
                    type: "FreeTime",
                    isFlexible: false,
                    reminder: false
                  });
                }
              }
            } else if (firstSlotTimeMins < requiredStartMins && isSchoolDay) {
              // If AI tries to start BEFORE school availability, snap it to start
              timedSlots[0].time = format12h(requiredStart24);
            }
          } else {
            // No timed slots at all? Fill school day window or available hours limit
            const startMins = parseTime(format12h(requiredStart24));
            let gapMins = 0;
            
            if (isSchoolDay) {
              const endMins = parseTime(format12h(settings.bedtime));
              gapMins = Math.max(0, endMins - startMins);
            } else {
              const breakLimitHours = settings.breakAvailableHours ?? 6;
              const weekendLimitHours = settings.weekendAvailableHours;
              const isWeekdayInBreak = settings.schoolDays.includes(day.day as DayOfWeek) && (settings.schoolMode === false);
              const limitHours = isWeekdayInBreak ? breakLimitHours : weekendLimitHours;
              gapMins = limitHours * 60;
            }
            
            const gapDuration = gapMins >= 60 ? `${Math.floor(gapMins/60)}h${gapMins%60 > 0 ? ` ${gapMins%60}m` : ''}` : `${gapMins}m`;
            
            daySlots.push({
              time: format12h(requiredStart24),
              activity: "Free Time ✨",
              duration: gapDuration.replace(" 0m", ""),
              type: "FreeTime",
              isFlexible: false,
              reminder: false
            });
          }

          // Ensure overall slot list is chronological
          daySlots.sort((a: any, b: any) => parseTime(a.time || "12:00 AM") - parseTime(b.time || "12:00 AM"));

          return { ...day, slots: daySlots };
        });
      }

      // Check if user cancelled while waiting
      if (generationActive.current) {
        setPlan(result);
        setPlanSettings(settings);
        const currentHash = calculateActivitiesHash(fixedClasses, practiceGoals, chores, freeTimes);
        setPlanActivitiesHash(currentHash);
        setFocusedDayIndex(0);
        setActiveTab('plan');
      }
    } catch (error: any) {
      logAppError("generatePlan error", error);
      if (generationActive.current) {
        alert("Oops! Something went wrong while creating your plan. Please try again in a moment.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const stopStory = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.onended = null;
        audioSourceRef.current.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      audioSourceRef.current = null;
    }
    setIsStoryPlaying(false);
  };

  const playPCM = (base64Data: string) => {
    stopStory();

    try {
      setIsStoryPlaying(true);
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const int16Data = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(int16Data.length);
      
      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 32768;
      }
      
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      
      const buffer = audioCtx.createBuffer(1, float32Data.length, 24000);
      buffer.getChannelData(0).set(float32Data);
      
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = 0.95; // Slower, more natural and gentle storytelling pace for kids
      source.connect(audioCtx.destination);
      
      audioSourceRef.current = source;
      
      source.onended = () => {
        setIsStoryPlaying(false);
        audioSourceRef.current = null;
      };
      
      source.start();
    } catch (err) {
      logAppError("Error playing PCM audio", err);
      setIsStoryPlaying(false);
      // No alert here, silent failure for audio is better for kids flow
    }
  };

  const generateStory = async () => {
    if (isStoryPlaying) {
      stopStory();
      return;
    }

    if (!hasAcceptedAiConsent) {
      setShowAiConsentModal(true);
      return;
    }

    if (isStoryLoading) return;
    
    setIsStoryLoading(true);
    setStoryText(null);
    setStoryAudio(null);
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        logAppError("Gemini API Key is missing for story generation!");
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const themes = [
        "a magical clock that can pause time",
        "a friendly dragon who loves baking cookies",
        "a pair of sneakers that can jump to the moon",
        "a tree that grows different kinds of candy",
        "a cat that can talk to birds",
        "a secret door under the bed that leads to a toy kingdom",
        "a cloud that rains lemonade",
        "a squirrel who is a world-class detective",
        "a robot that wants to learn how to dance",
        "a bicycle that can fly through the stars"
      ];
      const randomTheme = themes[Math.floor(Math.random() * themes.length)];

      const textResponse = await callAiWithRetry(() => ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: `Tell a very short, exciting 3-sentence story for a child about ${randomTheme}.`,
      }));
      const text = textResponse.text || "Once upon a time, there was a magical adventure...";
      setStoryText(text);

      const response = await callAiWithRetry(() => ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: `Read this excitedly: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      }));

      const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      const base64Audio = audioPart?.inlineData?.data;
      
      if (base64Audio) {
        setStoryAudio(base64Audio);
        playPCM(base64Audio);
      } else {
        logAppError("No audio data in Gemini response.");
      }
    } catch (error) {
      logAppError("Failed to generate story", error);
    } finally {
      setIsStoryLoading(false);
    }
  };

  const renderAiConsentModal = () => (
    <AnimatePresence>
      {showAiConsentModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl"
          >
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-sm shadow-xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-black text-white">Smart Planning Consent</h3>
            </div>
            
            <div className="p-8 space-y-6 animate-fade-in">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm">What we share</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium font-sans">Activity names, times, and schedule goals. Private personal information is NEVER shared.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm">Who gets it</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium font-sans">Data is securely transmitted directly to Google LLC via the official Gemini API.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm">Your Choice & Control</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium font-sans">Permission can be granted or revoked at any time. We ask your permission before sharing any data.</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowAiConsentModal(false);
                    setShowPrivacy(true);
                  }}
                  className="text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1.5 underline"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Read Privacy Policy & AI Data Security
                </button>
              </div>

              <div className="space-y-3 pt-1">
                <button 
                  onClick={() => {
                    setHasAcceptedAiConsent(true);
                    setShowAiConsentModal(false);
                    localStorage.setItem('ai_consent_accepted', 'true');
                    // Immediately trigger generation since this modal usually appears after clicking "Generate"
                    generatePlan(true);
                  }}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all text-sm uppercase tracking-widest cursor-pointer"
                >
                  I Agree & Continue
                </button>
                <button 
                  onClick={() => setShowAiConsentModal(false)}
                  className="w-full text-slate-400 font-bold py-2 text-xs uppercase tracking-widest hover:text-slate-600 transition-colors cursor-pointer"
                >
                  Not Now
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderPrivacy = () => {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }} 
        animate={{ opacity: 1, x: 0 }} 
        exit={{ opacity: 0, x: -25 }}
        className="space-y-6"
      >
        <header className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => {
              setShowPrivacy(false);
              // If we arrived from AI consent, let's reopen the consent modal when closing the policy
              if (!hasAcceptedAiConsent) {
                setShowAiConsentModal(true);
              }
            }}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all"
          >
            <ChevronLeft className="w-6 h-6 text-slate-400" />
          </button>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Privacy & AI Data</h2>
        </header>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6 text-left font-sans">
          <section className="space-y-4">
            <h3 className="font-black text-indigo-600 text-xs uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              AI Consent & Permission (Guideline 5.1.1 & 5.1.2)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              Your trust and data security are our top priorities. Planova Kidz transmits schedule information to a third-party AI to synthesize and organize your kids' weekly schedule. We never share your data without explicit permission.
            </p>
            <div className="border border-indigo-50 bg-indigo-50/20 p-4 rounded-2xl space-y-3.5">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-indigo-500 block tracking-wider">1. User Permission Constraint</span>
                <p className="text-[11px] text-slate-500 leading-normal font-medium">
                  We collect your explicit permission before any scheduling data is transmitted. You can instantly withdraw consensus or disable the smart AI planning feature at any time directly through the "Me" tab.
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-indigo-500 block tracking-wider">2. Exactly What Data Is Shared</span>
                <p className="text-[11px] text-slate-500 leading-normal font-medium">
                  We ONLY send schedule configurations, specifically: activity names (e.g. "Violin Practice"), chore titles (e.g. "Clean Room"), bedtime/start time configurations, and desired chore frequencies.
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-indigo-500 block tracking-wider">3. Who Is the Data Shared With</span>
                <p className="text-[11px] text-slate-500 leading-normal font-medium">
                  Data is securely transmitted over TLS/SSL encryption directly to <strong className="text-slate-700">Google LLC</strong> via their official <strong className="text-indigo-600">Gemini AI API</strong>.
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-rose-500 block tracking-wider">4. strict Kids Safety (No Identifiers)</span>
                <p className="text-[11px] text-rose-600/90 leading-normal font-medium">
                  We <strong className="text-rose-700">never</strong> share your child's real name, email, age, precise geographical location, or device identifiers. All prompts are completely anonymized before transmission.
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-600 block tracking-wider">5. Google Data Protection Guarantee</span>
                <p className="text-[11px] text-slate-500 leading-normal font-medium">
                  Google LLC provides equivalent or superior protection. Google enterprise API terms ensure that user queries and scheduling data are kept private, never logged or stored permanently, and <strong className="text-emerald-700 font-bold">never used to train Google's machine learning models</strong>.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-4">
            <h3 className="font-black text-rose-500 text-xs uppercase tracking-widest">Local-Only Storage</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              All profile information, chores, goals, and customized plans are persisted strictly on your device using sandboxed on-device local storage. We do not operate any external cloud databases or cloud storage servers that hold your child's data. Everything stays on your phone.
            </p>
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-4">
            <h3 className="font-black text-emerald-500 text-xs uppercase tracking-widest">No Ads & Zero Third-Party Tracker SDKs</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              Planova Kidz is completely free of advertisements and trackers. We have fully removed Sentry and any other analytics SDKs. There is absolute zero hidden tracking, zero third-party telemetry, and zero data gathering scripts within this application. It is a completely private environment.
            </p>
          </section>

          <div className="pt-4 border-t border-slate-100">
            <button 
              onClick={() => {
                setShowPrivacy(false);
                if (!hasAcceptedAiConsent) {
                  setShowAiConsentModal(true);
                }
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
            >
              Back to App
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const checkIfSettingsDirty = () => {
    if (!plan || !planSettings) return false;
    
    const startDiff = settings.schoolDayStartTime !== planSettings.schoolDayStartTime;
    const bedtimeDiff = settings.bedtime !== planSettings.bedtime;
    const hoursDiff = settings.weekendAvailableHours !== planSettings.weekendAvailableHours;
    const schoolModeDiff = settings.schoolMode !== planSettings.schoolMode;
    const breakHoursDiff = settings.breakAvailableHours !== planSettings.breakAvailableHours;
    
    const daysDiff = settings.schoolDays.length !== planSettings.schoolDays.length ||
      !settings.schoolDays.every(d => planSettings.schoolDays.includes(d));

    const currentHash = calculateActivitiesHash(fixedClasses, practiceGoals, chores, freeTimes);
    const activitiesDiff = planActivitiesHash !== currentHash;

    return startDiff || bedtimeDiff || hoursDiff || daysDiff || schoolModeDiff || breakHoursDiff || activitiesDiff;
  };

  const getWeekendLimitViolations = () => {
    if (!plan) return [];
    const violations: { day: DayOfWeek; hours: number; limit: number }[] = [];
    const satPlan = plan.days.find(d => d.day === 'Saturday');
    const sunPlan = plan.days.find(d => d.day === 'Sunday');

    if (satPlan) {
      const satHours = getGoalsAndChoresDuration(satPlan) / 60;
      if (satHours > settings.weekendAvailableHours) {
        violations.push({ day: 'Saturday', hours: Math.round(satHours * 10) / 10, limit: settings.weekendAvailableHours });
      }
    }
    if (sunPlan) {
      const sunHours = getGoalsAndChoresDuration(sunPlan) / 60;
      if (sunHours > settings.weekendAvailableHours) {
        violations.push({ day: 'Sunday', hours: Math.round(sunHours * 10) / 10, limit: settings.weekendAvailableHours });
      }
    }
    return violations;
  };

  const renderHome = () => {
    const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()) as DayOfWeek;
    const todayPlan = plan?.days.find(d => d.day === today);
    const theme = DAY_COLORS[today] || DAY_COLORS.Sunday;

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
        <header className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${theme.bg} rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100`}>
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className={`text-3xl font-black tracking-tight ${theme.text}`}>Hello, {userName}! 👋</h2>
            </div>
            <button 
              onClick={() => {
                setActiveTab('profile');
                setIsEditingProfile(true);
              }}
              className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400"
              title="Edit Profile"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
          <p className="text-slate-500 font-medium">It's {today}. Ready for a great day?</p>
        </header>

        {/* AI Consent Banner if missing */}
        {!hasAcceptedAiConsent && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-indigo-600 p-5 rounded-[28px] shadow-xl shadow-indigo-100 space-y-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-white text-sm">Enable AI Smart Planning</h3>
                <p className="text-indigo-100 text-[11px] leading-relaxed font-medium">We need your permission to securely use AI to build your magical weekly schedule.</p>
              </div>
            </div>
            <button 
              onClick={() => setShowAiConsentModal(true)}
              className="w-full bg-white text-indigo-600 py-3 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-sm"
            >
              Review & Enable AI
            </button>
          </motion.div>
        )}

        {/* Magic Story Section */}
        <section className="bg-gradient-to-br from-indigo-50 to-violet-50 p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm ${isStoryPlaying ? 'animate-bounce' : ''}`}>
              <Sparkles className={`w-6 h-6 text-indigo-500 ${isStoryPlaying ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h3 className="font-black text-indigo-900">Daily Magic Story</h3>
              <p className="text-indigo-600/70 text-xs font-bold uppercase tracking-wider">
                {isStoryPlaying ? "Playing now..." : "New every day!"}
              </p>
            </div>
          </div>

          <AnimatePresence>
            {storyText && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-indigo-100/50"
              >
                <p className="text-sm font-medium text-indigo-900 italic leading-relaxed">
                  "{storyText}"
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={generateStory}
            disabled={isStoryLoading}
            className={`w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all border disabled:opacity-50 ${
              isStoryPlaying 
                ? 'bg-rose-500 text-white border-rose-600' 
                : 'bg-white text-indigo-600 border-indigo-100'
            }`}
          >
            {isStoryLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isStoryPlaying ? (
              <BellRing className="w-4 h-4 animate-ring" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            {isStoryLoading ? "Creating Magic..." : isStoryPlaying ? "Stop Story" : "Listen to a New Story"}
          </button>
        </section>

        {!plan ? (
          <div className="bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-3xl p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Sparkles className="w-8 h-8 text-indigo-500" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-indigo-900">No plan yet!</h3>
              <p className="text-indigo-600/80 text-sm">Add your classes in the Setup tab, then let AI build your perfect week.</p>
            </div>
            <button 
              onClick={() => setActiveTab('setup')}
              className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
            >
              Get Started
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {checkIfSettingsDirty() && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50 border-2 border-dashed border-amber-200 p-4 rounded-3xl flex items-start gap-3 shadow-sm"
              >
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 animate-pulse">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="font-black text-amber-950 text-xs uppercase tracking-wider">Schedule Updated! ⏰</h4>
                  <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                    We noticed your activities or settings were updated. Please enter activities to Plan!
                  </p>
                  <button 
                    onClick={() => generatePlan(true)}
                    className="mt-2 text-[10px] font-black text-white bg-amber-600 hover:bg-amber-700 px-3 py-2 rounded-xl uppercase tracking-widest transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Regenerate Plan
                  </button>
                </div>
              </motion.div>
            )}
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Today's Schedule</h3>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full uppercase tracking-wider">Active</span>
            </div>
            <div className="relative space-y-6">
              {(() => {
                const isSchoolDay = settings.schoolDays.includes(today) && (settings.schoolMode !== false);
                const daySlots = todayPlan?.slots || [];
                const startTime24 = isSchoolDay ? settings.schoolDayStartTime : getWeekendStartTime24(daySlots);
                const timedSlots = daySlots.filter(slot => {
                  if (slot.isFlexible) return false;
                  if (!slot.time) return false;
                  
                  // Convert 12h slot time to 24h for comparison
                  const match = slot.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
                  if (!match) return true;
                  
                  let h = parseInt(match[1]);
                  const m = parseInt(match[2]);
                  const p = match[3].toUpperCase();
                  if (p === 'PM' && h < 12) h += 12;
                  if (p === 'AM' && h === 12) h = 0;
                  const slotTimeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                  
                  return slotTimeStr >= startTime24;
                });

                const flexibleSlots = daySlots.filter(s => s.isFlexible);

                return (
                  <>
                    {/* Timed Section */}
                    <div className="space-y-0">
                      {timedSlots.map((slot, i) => (
                        <div key={i} className="relative pb-6">
                          {i !== timedSlots.length - 1 && (
                            <div className={`absolute left-[45px] top-14 bottom-0 w-0.5 ${theme.lightBg} z-0`} />
                          )}
                          
                          <div className={`bg-white p-4 rounded-2xl border ${theme.border} shadow-sm relative z-10`}>
                            <div className="flex items-center gap-4">
                              <div className="text-center min-w-[60px]">
                                <p className="text-xs font-bold text-slate-400 uppercase">{slot.time}</p>
                                <p className={`text-[10px] font-medium ${theme.text}`}>{slot.duration}</p>
                              </div>
                              <div className={`h-8 w-[2px] ${theme.lightBg} rounded-full`} />
                              <div className="flex-1">
                                <p className="font-bold text-slate-700">{slot.activity}</p>
                              </div>
                              {slot.reminder && <BellRing className="w-4 h-4 text-amber-500" />}
                            </div>
                            <ActivityTimer 
                              durationStr={slot.duration} 
                              theme={theme} 
                              title={slot.activity} 
                              activeTimer={activeTimer}
                              setActiveTimer={setActiveTimer}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Flexible Section */}
                    {flexibleSlots.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-indigo-600 px-2">
                          <LayoutGrid className="w-4 h-4" />
                          <h4 className="text-sm font-black uppercase tracking-widest">Flexible Tasks</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {flexibleSlots.map((slot, i) => (
                            <div key={i} className="bg-gradient-to-br from-white to-indigo-50/30 p-4 rounded-2xl border-2 border-indigo-50 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                              <div className="flex-1">
                                <p className="font-bold text-slate-800 text-sm">{slot.activity}</p>
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{slot.duration} needed</span>
                              </div>
                              <div className={`w-8 h-8 rounded-xl ${theme.lightBg} flex items-center justify-center text-indigo-500`}>
                                <Zap className="w-4 h-4" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const renderSchedule = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-12">
      <header className="space-y-1">
        <h2 className="text-2xl font-black text-rose-600">Your Schedule</h2>
        <p className="text-slate-500 text-sm">When are you available?</p>
      </header>

      {/* Times */}
      <section className="space-y-6">
        {/* School Mode Toggle */}
        <div className="bg-gradient-to-r from-indigo-50 to-rose-50/50 p-6 rounded-3xl border-2 border-indigo-100 shadow-sm space-y-3 transition-all hover:border-indigo-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600 shadow-inner">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-black text-slate-800 text-sm tracking-wide uppercase">School Mode 🏫</h4>
                <p className="text-[11px] font-semibold text-slate-500 leading-tight">
                  {settings.schoolMode !== false 
                    ? "Currently in School Term! Automatically schedules continuous after-school slots." 
                    : "School is out! Relaxed schedule is active for Summer, Winter, Thanksgiving, or Spring breaks."}
                </p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setSettings({ ...settings, schoolMode: settings.schoolMode === false ? true : false })}
              className={`w-12 h-7 rounded-full transition-all relative shrink-0 ${settings.schoolMode !== false ? 'bg-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-200'}`}
            >
              <div 
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${settings.schoolMode !== false ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-rose-600 pt-2">
          <Clock className="w-5 h-5" />
          <h3 className="font-bold text-lg">Availability</h3>
        </div>

        <div className="bg-white p-6 rounded-3xl border-2 border-rose-50 shadow-sm space-y-4 transition-all hover:border-rose-200 hover:shadow-md">
          <label className="text-sm font-black text-rose-400 uppercase flex items-center gap-2 tracking-widest">
            <Calendar className="w-4 h-4" /> {settings.schoolMode === false ? "Week (Break) Days" : "School Days"}
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  if (settings.schoolDays.includes(d)) {
                    setSettings({...settings, schoolDays: settings.schoolDays.filter(day => day !== d)});
                  } else {
                    setSettings({...settings, schoolDays: [...settings.schoolDays, d]});
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  settings.schoolDays.includes(d) 
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-100 scale-105' 
                    : 'bg-white text-rose-400 border-2 border-rose-50 hover:border-rose-200'
                }`}
              >
                {d.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-black text-rose-400 uppercase flex items-center gap-2 tracking-widest">
            <Sun className="w-4 h-4" /> {settings.schoolMode === false ? "Break Day Availability" : "School Day Availability"}
          </label>
          <div className="bg-white p-6 rounded-3xl border-2 border-rose-50 shadow-sm space-y-3 transition-all hover:border-rose-200 hover:shadow-md">
            {settings.schoolMode === false ? (
              <>
                <span className="text-sm font-black text-rose-400 uppercase block tracking-widest">Hours per day (Mon–Fri)</span>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="1" 
                    max="12" 
                    step="0.5"
                    value={settings.breakAvailableHours ?? 6}
                    onChange={(e) => setSettings({ ...settings, breakAvailableHours: parseFloat(e.target.value) })}
                    className="flex-1 accent-rose-500"
                  />
                  <span className="text-2xl font-black text-rose-600 min-w-[60px]">{settings.breakAvailableHours ?? 6}h</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed pt-1 flex items-start gap-1.5 border-t border-rose-50/50 mt-1">
                  <span className="text-rose-400">💡</span>
                  <span>When School Mode is off (Break Mode), the AI planner will limit the combined chores and practice goals on weekdays to {settings.breakAvailableHours ?? 6} hours.</span>
                </p>
              </>
            ) : (
              <>
                <span className="text-sm font-black text-rose-400 uppercase block tracking-widest">Available from (Evening)</span>
                <div className="relative">
                  <select 
                    value={settings.schoolDayStartTime}
                    onChange={(e) => setSettings({ ...settings, schoolDayStartTime: e.target.value })}
                    className="w-full font-black text-2xl bg-transparent focus:outline-none text-rose-600 cursor-pointer appearance-none pr-8"
                  >
                    {TIME_OPTIONS.map(time => (
                      <option key={time} value={time}>{format12h(time)}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-300 pointer-events-none" />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-black text-rose-400 uppercase flex items-center gap-2 tracking-widest">
            <Calendar className="w-4 h-4" /> Weekend Availability
          </label>
          <div className="bg-white p-6 rounded-3xl border-2 border-rose-50 shadow-sm space-y-3 transition-all hover:border-rose-200 hover:shadow-md">
            <span className="text-sm font-black text-rose-400 uppercase block tracking-widest">Hours per day (Sat/Sun)</span>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="1" 
                max="12" 
                step="0.5"
                value={settings.weekendAvailableHours}
                onChange={(e) => setSettings({ ...settings, weekendAvailableHours: parseFloat(e.target.value) })}
                className="flex-1 accent-rose-500"
              />
              <span className="text-2xl font-black text-rose-600 min-w-[60px]">{settings.weekendAvailableHours}h</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed pt-1 flex items-start gap-1.5 border-t border-rose-50/50 mt-1">
              <span className="text-rose-400">💡</span>
              <span>The AI planner will strictly limit the combined chores and practice goals on Saturday and Sunday to {settings.weekendAvailableHours} hours. Excess goals or chores will automatically be shifted to school days.</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-3xl border-2 border-rose-50 shadow-sm space-y-2 transition-all hover:border-rose-200 hover:shadow-md">
            <label className="text-sm font-black text-rose-400 uppercase flex items-center gap-2 tracking-widest">
              <Moon className="w-4 h-4" /> Bedtime
            </label>
            <div className="relative">
              <select 
                value={settings.bedtime}
                onChange={(e) => setSettings({...settings, bedtime: e.target.value})}
                className="w-full font-black text-2xl bg-transparent focus:outline-none text-rose-600 cursor-pointer appearance-none pr-8"
              >
                {TIME_OPTIONS.map(time => (
                  <option key={time} value={time}>{format12h(time)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-300 pointer-events-none" />
            </div>
          </div>
        </div>

      
        <div className="bg-white p-6 rounded-3xl border-2 border-rose-50 shadow-sm space-y-4 transition-all hover:border-rose-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <label className="text-sm font-black text-rose-400 uppercase flex items-center gap-2 tracking-widest">
              <Bell className="w-4 h-4" /> Next Week's Setup Reminder
            </label>
            <button 
              type="button"
              onClick={() => setSettings({ ...settings, sundaySetupReminder: !settings.sundaySetupReminder })}
              className={`w-12 h-7 rounded-full transition-all relative ${settings.sundaySetupReminder ? 'bg-rose-500' : 'bg-slate-200'}`}
            >
              <div 
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${settings.sundaySetupReminder ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>
          
          {settings.sundaySetupReminder && (
            <div className="space-y-3 pt-3 border-t border-rose-50/50">
              <span className="text-xs font-black text-rose-400 uppercase block tracking-widest">Reminder Time</span>
              <div className="relative">
                <select 
                  value={settings.sundaySetupReminderTime}
                  onChange={(e) => setSettings({ ...settings, sundaySetupReminderTime: e.target.value })}
                  className="w-full font-black text-2xl bg-transparent focus:outline-none text-rose-600 cursor-pointer appearance-none pr-8"
                >
                  {SUNDAY_REMINDER_TIME_OPTIONS.map(time => (
                    <option key={time} value={time}>{format12h(time)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-300 pointer-events-none" />
              </div>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                Receive an automatic weekly reminder on Sunday evening to configure and set up your goals, classes, and activities for the week!
              </p>
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );

  const renderSetup = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-12">
      <header className="space-y-1">
        <h2 className="text-2xl font-black text-amber-600">Setup Your Week</h2>
        <p className="text-slate-500 text-sm">Add your activities, then click on Generate Weekly Plan.</p>
      </header>

      {/* Fixed Classes */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600">
            <BookOpen className="w-5 h-5" />
            <h3 className="font-bold">Fixed Classes</h3>
          </div>
          <button 
            onClick={() => {
              if (!showAddClass) {
                // Opening the form - reset to defaults
                setEditingClassId(null);
                setNewClassName('');
                setNewClassDays([]);
                setNewClassTime('16:00');
                setNewClassDuration('30m');
                setNewClassReminder(false);
              }
              setFormError(null);
              setShowAddClass(!showAddClass);
            }} 
            className={`p-2 rounded-xl active:scale-90 transition-all ${showAddClass ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'}`}
          >
            <Plus className={`w-5 h-5 transition-transform ${showAddClass ? 'rotate-45' : ''}`} />
          </button>
        </div>

        <AnimatePresence>
          {showAddClass && (
            <motion.form 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleAddClass}
              className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 space-y-3 overflow-hidden"
            >
              {formError && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[11px] font-bold text-rose-500 bg-rose-50 p-2 rounded-lg border border-rose-100 flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  {formError}
                </motion.p>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-indigo-400 uppercase">Class Name</label>
                <input 
                  autoFocus
                  placeholder="e.g. Piano Class"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full p-2 bg-white rounded-lg border border-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-indigo-400 uppercase">Days</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        if (newClassDays.includes(d)) {
                          setNewClassDays(newClassDays.filter(day => day !== d));
                        } else {
                          setNewClassDays([...newClassDays, d]);
                        }
                      }}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                        newClassDays.includes(d) 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'bg-white text-indigo-400 border border-indigo-100 hover:border-indigo-300'
                      }`}
                    >
                      {d.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase">Start Time</label>
                  <div className="relative">
                    <select 
                      value={newClassTime}
                      onChange={(e) => setNewClassTime(e.target.value)}
                      className="w-full p-2 bg-white rounded-lg border border-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm appearance-none pr-8"
                    >
                      {FIXED_CLASS_TIME_OPTIONS.map(time => (
                        <option key={time} value={time}>{format12h(time)}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase">Duration</label>
                  <div className="relative">
                    <select 
                      value={newClassDuration}
                      onChange={(e) => setNewClassDuration(e.target.value)}
                      className="w-full p-2 bg-white rounded-lg border border-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm appearance-none pr-8"
                    >
                      {DURATION_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <label className="text-[10px] font-bold text-indigo-400 uppercase flex items-center gap-1">
                  <Bell className="w-3 h-3" /> Set Reminder
                </label>
                <button
                  type="button"
                  onClick={() => setNewClassReminder(!newClassReminder)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${newClassReminder ? 'bg-indigo-500' : 'bg-slate-200'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${newClassReminder ? 'left-5' : 'left-1'}`} />
                </button>
              </div>
              <button 
                type="submit" 
                className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 active:bg-indigo-700 transition-all cursor-pointer"
              >
                {editingClassId ? 'Update Class' : (fixedClasses.some(c => c.name.toLowerCase() === newClassName.toLowerCase()) ? 'Change Class' : 'Add Class')}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          {Array.from(new Set(fixedClasses.map(c => c.name))).map(name => (
            <div key={name} className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-indigo-50 pb-2">
                <p className="font-bold text-indigo-700">{name}</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const existing = fixedClasses.find(c => c.name === name);
                      if (existing) {
                        startEditClass(existing);
                      } else {
                        setEditingClassId(null);
                        setNewClassName(name);
                        setNewClassDays([]);
                        setNewClassTime('16:00');
                        setNewClassDuration('30m');
                        setNewClassReminder(false);
                        setShowAddClass(true);
                      }
                    }}
                    className="text-indigo-500 text-[10px] font-bold uppercase hover:underline active:opacity-50"
                  >
                    Change Class
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {fixedClasses.filter(c => c.name === name).map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <div className="flex-1">
                      <p className="text-indigo-500/70 font-medium flex items-center gap-1 flex-wrap">
                        <span className="font-bold text-indigo-600">{c.days.join(', ')}</span>
                        <span>at {format12h(c.startTime)} ({c.duration})</span>
                        {c.reminder && <BellRing className="w-3 h-3 text-amber-500" />}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEditClass(c)} className="text-slate-300 hover:text-indigo-500 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setFixedClasses(fixedClasses.filter(i => i.id !== c.id))} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {fixedClasses.length === 0 && !showAddClass && <p className="text-center py-4 text-slate-400 text-sm italic">No fixed classes added.</p>}
        </div>
      </section>

      {/* Practice Goals */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-600">
            <Dumbbell className="w-5 h-5" />
            <h3 className="font-bold">Practice Goals</h3>
          </div>
          <button 
            onClick={() => {
              if (showAddPractice) {
                setEditingPracticeId(null);
                setNewPracticeName('');
              }
              setFormError(null);
              setShowAddPractice(!showAddPractice);
            }} 
            className={`p-2 rounded-xl active:scale-90 transition-all ${showAddPractice ? 'bg-slate-100 text-slate-400' : 'bg-amber-50 text-amber-600'}`}
          >
            <Plus className={`w-5 h-5 transition-transform ${showAddPractice ? 'rotate-45' : ''}`} />
          </button>
        </div>

        <AnimatePresence>
          {showAddPractice && (
            <motion.form 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleAddPractice}
              className="bg-amber-50 p-4 rounded-2xl border border-amber-100 space-y-3 overflow-hidden"
            >
              {formError && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[11px] font-bold text-rose-500 bg-rose-50 p-2 rounded-lg border border-rose-100 flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  {formError}
                </motion.p>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-amber-400 uppercase">Goal Name</label>
                <input 
                  autoFocus
                  placeholder="e.g. Piano Practice"
                  value={newPracticeName}
                  onChange={(e) => setNewPracticeName(e.target.value)}
                  className="w-full p-2 bg-white rounded-lg border border-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-amber-400 uppercase">Duration</label>
                  <div className="relative">
                    <select 
                      value={newPracticeDuration}
                      onChange={(e) => setNewPracticeDuration(e.target.value)}
                      className="w-full p-2 bg-white rounded-lg border border-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-sm appearance-none pr-8"
                    >
                      {DURATION_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-300 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-amber-400 uppercase">Frequency</label>
                  <div className="relative">
                    <select 
                      value={newPracticeFrequency}
                      onChange={(e) => setNewPracticeFrequency(e.target.value)}
                      className="w-full p-2 bg-white rounded-lg border border-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-sm appearance-none pr-8"
                    >
                      {FREQUENCY_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-300 pointer-events-none" />
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full bg-amber-600 text-white py-2 rounded-lg font-bold text-sm">
                {editingPracticeId ? 'Update Goal' : 'Add Goal'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 gap-2">
          {practiceGoals.map(p => (
            <div key={p.id} className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-sm">{p.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{p.duration} • {p.frequency}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEditPractice(p)} className="text-slate-300 hover:text-amber-500 transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setPracticeGoals(practiceGoals.filter(i => i.id !== p.id))} className="text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {practiceGoals.length === 0 && !showAddPractice && <p className="text-center py-2 text-slate-400 text-xs italic">No practice goals added.</p>}
        </div>
      </section>

      {/* Chores */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-600">
            <ClipboardList className="w-5 h-5" />
            <h3 className="font-bold">Chores</h3>
          </div>
          <button 
            onClick={() => {
              if (showAddChore) {
                setEditingChoreId(null);
                setNewChoreName('');
              }
              setFormError(null);
              setShowAddChore(!showAddChore);
            }} 
            className={`p-2 rounded-xl active:scale-90 transition-all ${showAddChore ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-600'}`}
          >
            <Plus className={`w-5 h-5 transition-transform ${showAddChore ? 'rotate-45' : ''}`} />
          </button>
        </div>

        <AnimatePresence>
          {showAddChore && (
            <motion.form 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleAddChore}
              className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-3 overflow-hidden"
            >
              {formError && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[11px] font-bold text-rose-500 bg-rose-50 p-2 rounded-lg border border-rose-100 flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  {formError}
                </motion.p>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-emerald-400 uppercase">Chore Name</label>
                <input 
                  autoFocus
                  placeholder="e.g. Make Bed"
                  value={newChoreName}
                  onChange={(e) => setNewChoreName(e.target.value)}
                  className="w-full p-2 bg-white rounded-lg border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-400 uppercase">Duration</label>
                  <div className="relative">
                    <select 
                      value={newChoreDuration}
                      onChange={(e) => setNewChoreDuration(e.target.value)}
                      className="w-full p-2 bg-white rounded-lg border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm appearance-none pr-8"
                    >
                      {DURATION_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-300 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-400 uppercase">Frequency</label>
                  <div className="relative">
                    <select 
                      value={newChoreFrequency}
                      onChange={(e) => setNewChoreFrequency(e.target.value)}
                      className="w-full p-2 bg-white rounded-lg border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm appearance-none pr-8"
                    >
                      {CHORE_FREQUENCY_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-300 pointer-events-none" />
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold text-sm">
                {editingChoreId ? 'Update Chore' : 'Add Chore'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 gap-2">
          {chores.map(c => (
            <div key={c.id} className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-sm">{c.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{c.duration} • {c.frequency}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEditChore(c)} className="text-slate-300 hover:text-emerald-500 transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setChores(chores.filter(i => i.id !== c.id))} className="text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {chores.length === 0 && !showAddChore && <p className="text-center py-2 text-slate-400 text-xs italic">No chores added.</p>}
        </div>
        <div className="h-px bg-slate-100 my-6" />
      </section>

      {/* Free Time Blocks */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-violet-600">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-bold">Free Time</h3>
          </div>
          <button 
            onClick={() => {
              if (showAddFreeTime) {
                setEditingFreeTimeId(null);
                setNewFreeTimeName('');
              }
              setFormError(null);
              setShowAddFreeTime(!showAddFreeTime);
            }} 
            className={`p-2 rounded-xl active:scale-90 transition-all ${showAddFreeTime ? 'bg-slate-100 text-slate-400' : 'bg-violet-50 text-violet-600'}`}
          >
            <Plus className={`w-5 h-5 transition-transform ${showAddFreeTime ? 'rotate-45' : ''}`} />
          </button>
        </div>

        <AnimatePresence>
          {showAddFreeTime && (
            <motion.form 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleAddFreeTime}
              className="bg-violet-50 p-4 rounded-2xl border border-violet-100 space-y-3 overflow-hidden"
            >
              {formError && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[11px] font-bold text-rose-500 bg-rose-50 p-2 rounded-lg border border-rose-100 flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  {formError}
                </motion.p>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-violet-400 uppercase">Activity Name</label>
                <input 
                  autoFocus
                  placeholder="e.g. Video Games, Reading"
                  value={newFreeTimeName}
                  onChange={(e) => setNewFreeTimeName(e.target.value)}
                  className="w-full p-2 bg-white rounded-lg border border-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-violet-400 uppercase">Days</label>
                <div className="flex flex-wrap gap-1">
                  {DAYS.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        if (newFreeTimeDays.includes(d)) {
                          setNewFreeTimeDays(newFreeTimeDays.filter(day => day !== d));
                        } else {
                          setNewFreeTimeDays([...newFreeTimeDays, d]);
                        }
                      }}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                        newFreeTimeDays.includes(d) 
                          ? 'bg-violet-600 text-white shadow-sm' 
                          : 'bg-white text-violet-400 border border-violet-100 hover:border-violet-300'
                      }`}
                    >
                      {d.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-violet-400 uppercase">Start Time</label>
                  <div className="relative">
                    <select 
                      value={newFreeTimeTime}
                      onChange={(e) => setNewFreeTimeTime(e.target.value)}
                      className="w-full p-2 bg-white rounded-lg border border-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium text-sm appearance-none pr-8"
                    >
                      {TIME_OPTIONS.map(time => (
                        <option key={time} value={time}>{format12h(time)}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-300 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-violet-400 uppercase">Duration</label>
                  <div className="relative">
                    <select 
                      value={newFreeTimeDuration}
                      onChange={(e) => setNewFreeTimeDuration(e.target.value)}
                      className="w-full p-2 bg-white rounded-lg border border-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium text-sm appearance-none pr-8"
                    >
                      {DURATION_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-300 pointer-events-none" />
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full bg-violet-600 text-white py-2 rounded-lg font-bold text-sm">
                {editingFreeTimeId ? 'Update Free Time' : 'Add Free Time'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          {Array.from(new Set(freeTimes.map(f => f.name))).map(name => (
            <div key={name} className="bg-white p-4 rounded-2xl border border-violet-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-violet-50 pb-2">
                <p className="font-bold text-violet-700">{name}</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setNewFreeTimeName(name);
                      setShowAddFreeTime(true);
                    }}
                    className="text-violet-500 text-[10px] font-bold uppercase hover:underline"
                  >
                    Add Time
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {freeTimes.filter(f => f.name === name).map(f => (
                  <div key={f.id} className="flex items-center justify-between text-xs">
                    <div className="flex-1">
                      <p className="text-violet-500/70 font-medium flex items-center gap-1 flex-wrap">
                        <span className="font-bold text-violet-600">{f.days.join(', ')}</span>
                        <span>at {format12h(f.startTime)} ({f.duration})</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEditFreeTime(f)} className="text-slate-300 hover:text-violet-500 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setFreeTimes(freeTimes.filter(i => i.id !== f.id))} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {freeTimes.length === 0 && !showAddFreeTime && <p className="text-center py-4 text-slate-400 text-sm italic">No free time added.</p>}
        </div>
      </section>

      <div className="text-center py-2">
        <p className="text-slate-500 text-xs font-medium">After adding your activities,</p>
        <p className="text-indigo-600 text-sm font-bold">Click on Generate Weekly Plan below!</p>
      </div>

      {(fixedClasses.length === 0 && practiceGoals.length === 0 && chores.length === 0 && freeTimes.length === 0 || checkIfSettingsDirty()) && (
        <div className="bg-amber-50 border-2 border-dashed border-amber-300 p-4 rounded-3xl flex flex-col items-center justify-center gap-1 text-center my-3 shadow-sm animate-pulse">
          <p className="text-amber-800 font-extrabold text-sm tracking-wide">⚠️ Enter activities to Plan</p>
          {checkIfSettingsDirty() && (fixedClasses.length > 0 || practiceGoals.length > 0 || chores.length > 0 || freeTimes.length > 0) && (
            <p className="text-amber-600/95 text-xs font-medium">Settings or activities updated. Regenerate your plan to apply changes!</p>
          )}
        </div>
      )}

      <button 
        onClick={() => generatePlan(false)}
        disabled={isGenerating}
        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating Magic...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate Weekly Plan
          </>
        )}
      </button>
    </motion.div>
  );

  const toggleReminder = (dayIndex: number, slotIndex: number) => {
    if (!plan) return;
    const newPlan = { ...plan };
    const slot = newPlan.days[dayIndex].slots[slotIndex];
    slot.reminder = !slot.reminder;
    setPlan(newPlan);
  };

  const renderPlan = () => {
    if (isGenerating) {
      return (
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-indigo-600 animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="font-black text-slate-900 text-lg">Generating Your Plan</h3>
            <p className="text-slate-500 text-sm animate-pulse">{loadingMessage}</p>
          </div>

          <AnimatePresence>
            {showStoryButton && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-4"
              >
                <button 
                  onClick={generateStory}
                  disabled={isStoryLoading}
                  className="bg-amber-100 text-amber-700 px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                >
                  {isStoryLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {storyAudio ? "Play Story Again" : "Listen to a Story while you wait!"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={() => setIsGenerating(false)}
            className="text-slate-400 text-xs font-bold uppercase hover:text-rose-500 transition-colors"
          >
            Cancel & Go Back
          </button>
        </div>
      );
    }

    if (!plan) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
            <Calendar className="w-10 h-10 text-slate-300" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">No Plan Yet</h3>
            <p className="text-slate-500 text-sm">Go to Home and click Generate!</p>
          </div>
        </div>
      );
    }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <header className="space-y-1">
        <h2 className="text-2xl font-black text-slate-900">Your Weekly Plan</h2>
        <p className="text-slate-500 text-sm">AI-crafted for a balanced week.</p>
      </header>

      {checkIfSettingsDirty() && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border-2 border-dashed border-amber-200 p-4 rounded-3xl flex items-start gap-3 shadow-sm"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 animate-pulse">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="font-black text-amber-950 text-xs uppercase tracking-wider">Schedule Updated! ⏰</h4>
            <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
              We noticed your activities or settings were updated. Please enter activities to Plan!
            </p>
            <button 
              onClick={() => generatePlan(true)}
              className="mt-2 text-[10px] font-black text-white bg-amber-600 hover:bg-amber-700 px-3 py-2 rounded-xl uppercase tracking-widest transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Regenerate Plan
            </button>
          </div>
        </motion.div>
      )}

      {(() => {
        const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()) as DayOfWeek;
        const dayOrder = DAYS;
        const todayIdx = dayOrder.indexOf(today);
        
        // Rotate DAYS to start with today
        const rotatedDaysOrder = [...dayOrder.slice(todayIdx), ...dayOrder.slice(0, todayIdx)];
        
        // Sort plan.days based on rotatedDaysOrder
        const sortedPlanDays = [...(plan?.days || [])].sort((a, b) => 
          rotatedDaysOrder.indexOf(a.day as DayOfWeek) - rotatedDaysOrder.indexOf(b.day as DayOfWeek)
        );

        const currentDayPlan = sortedPlanDays[focusedDayIndex];
        if (!currentDayPlan) return null;

        const theme = DAY_COLORS[currentDayPlan.day as DayOfWeek] || DAY_COLORS.Sunday;

        return (
          <div className="space-y-6">
            {/* Day Navigation */}
            <div className="flex items-center justify-between bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-sm">
              <button 
                onClick={() => setFocusedDayIndex(prev => (prev > 0 ? prev - 1 : 6))}
                className="p-3 hover:bg-slate-50 rounded-2xl transition-all active:scale-90 text-slate-400 hover:text-indigo-600"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="text-center">
                <h3 className={`font-black ${theme.text} uppercase tracking-widest text-sm flex items-center justify-center gap-2`}>
                  <div className={`w-2 h-2 ${theme.dot} rounded-full shadow-sm`} />
                  {currentDayPlan.day}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                  {focusedDayIndex === 0 ? 'Today' : `Day ${focusedDayIndex + 1} of 7`}
                </p>
              </div>
              <button 
                onClick={() => setFocusedDayIndex(prev => (prev < 6 ? prev + 1 : 0))}
                className="p-3 hover:bg-slate-50 rounded-2xl transition-all active:scale-90 text-slate-400 hover:text-indigo-600"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Day Slots */}
            <motion.div 
              key={currentDayPlan.day}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="space-y-8"
            >
              {(() => {
                const day = currentDayPlan.day as DayOfWeek;
                const isSchoolDay = settings.schoolDays.includes(day) && (settings.schoolMode !== false);
                const timedSlots = currentDayPlan.slots.filter(slot => {
                  if (slot.isFlexible) return false;
                  if (!slot.time) return false;
                  const match = slot.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
                  if (!match) return true;
                  let h = parseInt(match[1]);
                  const m = parseInt(match[2]);
                  const p = match[3].toUpperCase();
                  if (p === 'PM' && h < 12) h += 12;
                  if (p === 'AM' && h === 12) h = 0;
                  const slotTimeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                  
                  const startTime24 = isSchoolDay ? settings.schoolDayStartTime : getWeekendStartTime24(currentDayPlan.slots);
                  return slotTimeStr >= startTime24;
                });

                const flexibleSlots = currentDayPlan.slots.filter(s => s.isFlexible);
                const originalDayIdx = plan?.days.findIndex(d => d.day === currentDayPlan.day) ?? 0;

                const currentDayMins = getGoalsAndChoresDuration(currentDayPlan);
                const currentDayHours = Math.round((currentDayMins / 60) * 10) / 10;
                const isWeekdayInBreak = settings.schoolDays.includes(day) && (settings.schoolMode === false);
                const dailyLimitMins = isWeekdayInBreak 
                  ? (settings.breakAvailableHours ?? 6) * 60 
                  : settings.weekendAvailableHours * 60;
                const activeDayLimitExceeded = (!isSchoolDay) && (currentDayMins > dailyLimitMins);

                return (
                  <>
                    {/* Timed Activities */}
                    <div className="space-y-3">
                      {timedSlots.map((slot, sIdx) => {
                        const originalSlotIdx = currentDayPlan.slots.indexOf(slot);
                        return (
                          <div key={sIdx} className={`bg-white p-4 rounded-2xl border-2 flex items-center gap-4 transition-all shadow-sm ${slot.reminder ? 'border-amber-300 bg-amber-50/30' : theme.border}`}>
                            <div className="flex flex-col items-center justify-center min-w-[50px]">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                {slot.time?.includes(' ') ? slot.time.split(' ')[1] : '--'}
                              </span>
                              <span className="text-sm font-black text-slate-700 leading-none">
                                {slot.time?.includes(' ') ? slot.time.split(' ')[0] : slot.time || '--'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-bold text-sm text-slate-800 truncate">{slot.activity}</p>
                                {slot.type === 'Class' && (
                                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-indigo-200 text-indigo-500 bg-indigo-50">
                                    Class
                                  </span>
                                )}
                              </div>
                              <span className={`text-[9px] font-black ${theme.lightBg} ${theme.text} px-2 py-0.5 rounded-full uppercase`}>{slot.duration}</span>
                            </div>
                            <button 
                              onClick={() => toggleReminder(originalDayIdx, originalSlotIdx)}
                              className={`p-2 rounded-xl transition-all active:scale-90 ${slot.reminder ? 'bg-amber-100 text-amber-600 shadow-inner' : 'bg-slate-50 text-slate-300 hover:bg-slate-100 hover:text-slate-400'}`}
                              title={slot.reminder ? `Reminder set for ${slot.activity}` : `Set reminder for ${slot.activity}`}
                            >
                              {slot.reminder ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Flexible Tasks */}
                    {flexibleSlots.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-600 px-2 font-black uppercase tracking-widest text-xs">
                          <LayoutGrid className="w-4 h-4" />
                          <span>Flexible Tasks</span>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {flexibleSlots.map((slot, sIdx) => {
                            const originalSlotIdx = currentDayPlan.slots.indexOf(slot);
                            return (
                              <div key={sIdx} className="bg-white p-5 rounded-[28px] border-2 border-indigo-50 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                    <Zap className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="font-black text-slate-900 leading-tight">{slot.activity}</p>
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">{slot.duration} Needed</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => toggleReminder(originalDayIdx, originalSlotIdx)}
                                  className={`p-3 rounded-2xl transition-all active:scale-90 ${slot.reminder ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-300 hover:bg-indigo-50 hover:text-indigo-400'}`}
                                >
                                  {slot.reminder ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          </div>
        );
      })()}

      {plan?.tips && (
        <section className="bg-amber-50 rounded-3xl p-6 space-y-3">
          <h3 className="font-bold text-amber-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> AI Tips
          </h3>
          <ul className="space-y-2">
            {plan.tips.map((tip, i) => (
              <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5 shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </section>
      )}
    </motion.div>
    );
  };

  const renderProfile = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
      <div 
        onClick={() => {
          const next = debugTapCount + 1;
          if (next >= 7) {
            setShowDebug(prev => !prev);
            setDebugTapCount(0);
          } else {
            setDebugTapCount(next);
            // reset after 2.5 seconds of inactivity
            const timer = setTimeout(() => setDebugTapCount(0), 2500);
          }
        }}
        className="w-24 h-24 bg-gradient-to-br from-indigo-100 via-violet-100 to-emerald-100 rounded-full flex items-center justify-center shadow-inner active:scale-95 transition-transform"
      >
        <User className="w-12 h-12 text-violet-600" />
      </div>

      {showDebug && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-slate-900 text-slate-100 rounded-3xl p-5 text-[10px] space-y-4 font-mono text-left shadow-2xl border border-slate-700"
        >
          <div className="flex justify-between items-center border-b border-slate-700 pb-2">
            <span className="font-black text-indigo-400 uppercase tracking-widest text-[9px]">Diagnostic Console</span>
            <div className="flex gap-3">
              <button onClick={() => {
                const logsTxt = appLogs.map(l => `[${l.timestamp}] ${l.message}`).join('\n');
                navigator.clipboard.writeText(`Planova Kidz Diagnostic Logs:\n${logsTxt}`);
                alert("Logs copied to clipboard!");
              }} className="text-emerald-400 font-bold">COPY</button>
              <button 
                onClick={() => {
                  setAppLogs([]);
                  localStorage.removeItem('app_diagnostic_logs');
                }}
                className="text-rose-400 font-bold"
              >CLEAR</button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {appLogs.length === 0 ? <p className="text-slate-500 italic">No diagnostic events captured.</p> : 
              appLogs.map((log, i) => (
                <div key={i} className="leading-normal border-b border-slate-800 pb-2">
                  <span className="text-indigo-400 font-bold">[{log.timestamp}]</span><br/>
                  <span className="text-slate-300">{log.message}</span>
                </div>
              ))
            }
          </div>
          <p className="text-[8px] text-slate-500 uppercase tracking-tighter">Diagnostic mode is temporary and will hide on refresh.</p>
        </motion.div>
      )}

      {!isEditingProfile && (
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => setIsEditingProfile(true)}
            className="flex items-center gap-2 bg-violet-50 text-violet-600 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-violet-100 transition-all active:scale-95 shadow-sm border border-violet-100"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Profile
          </button>
          <button 
            type="button"
            onClick={() => setShowPrivacy(true)}
            className="flex items-center gap-2 bg-slate-100 text-slate-500 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 shadow-sm border border-slate-200"
          >
            Privacy & Disclosure
          </button>
        </div>
      )}

      {isEditingProfile ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs space-y-4">
          <div className="bg-white p-4 rounded-2xl border-2 border-indigo-100 shadow-sm space-y-1 text-left">
            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Your Name</label>
            <input 
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full bg-transparent font-black text-slate-700 focus:outline-none text-lg"
              placeholder="Enter your name"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsEditingProfile(false)}
              className="flex-1 bg-emerald-500 text-white font-black py-3 rounded-2xl shadow-lg shadow-emerald-100 active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save
            </button>
            <button 
              onClick={() => setIsEditingProfile(false)}
              className="flex-1 bg-slate-100 text-slate-500 font-black py-3 rounded-2xl active:scale-95 transition-all uppercase tracking-widest text-xs"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="w-full max-w-xs space-y-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="font-black text-2xl bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">{userName || 'Planova Kidz'}</h3>
            <p className="text-slate-400 font-bold tracking-widest text-xs uppercase mt-1">v1.2.0 • ACTIVE SESSION</p>
          </motion.div>

          {/* AI Consent Toggle directly in Me Tab */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasAcceptedAiConsent ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="font-black text-slate-900 text-sm">AI Smart Planning</h4>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${hasAcceptedAiConsent ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {hasAcceptedAiConsent ? 'Enabled ✨' : 'Disabled'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  const newVal = !hasAcceptedAiConsent;
                  setHasAcceptedAiConsent(newVal);
                  localStorage.setItem('ai_consent_accepted', newVal ? 'true' : 'false');
                }}
                className={`w-12 h-7 rounded-full transition-all relative ${hasAcceptedAiConsent ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <motion.div 
                  animate={{ x: hasAcceptedAiConsent ? 20 : 0 }}
                  className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm" 
                />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed text-left">
              Required for automated weekly scheduling and story generation. We never share your real name with external AI services.
            </p>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-center gap-2 text-slate-600">
              <Bell className="w-4 h-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Notifications</p>
            </div>
            <div className="space-y-2">
              {notificationStatus !== 'granted' && (
                <button 
                  type="button"
                  onClick={requestNotificationPermission}
                  className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                >
                  {notificationStatus === 'denied' ? 'Fix in Settings' : 'Enable Notifications'}
                </button>
              )}
              <button 
                type="button"
                onClick={testNotification}
                className="w-full bg-slate-50 text-slate-600 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-100 active:scale-95 transition-all"
              >
                Test Notification
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={async () => {
                const pending = await LocalNotifications.getPending();
                if (pending.notifications.length === 0) {
                  alert("No notifications are currently scheduled.");
                } else {
                  const list = pending.notifications.map(n => {
                    const schedule = n.schedule as any;
                    if (schedule?.on) {
                      const days = ['?', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                      return `${n.title} (${days[schedule.on.weekday]} at ${schedule.on.hour}:${schedule.on.minute.toString().padStart(2, '0')})`;
                    }
                    return `${n.title} (One-time)`;
                  }).join('\n');
                  alert(`Scheduled Notifications (${pending.notifications.length}):\n\n${list}`);
                }
              }}
              className="text-indigo-500 font-bold text-xs uppercase tracking-widest"
            >
              Check Scheduled Reminders
            </button>
            <button 
              onClick={() => {
                if(confirm('Reset all data?')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="text-rose-500 font-bold text-xs uppercase tracking-widest pt-2"
            >
              Reset App Data
            </button>
          </div>

        </div>
      )}
    </div>
  );

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-white to-indigo-50">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="space-y-12 w-full max-w-sm"
        >
          <div className="space-y-4">
            <div className="w-24 h-24 bg-indigo-600 rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200 rotate-12">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Planova Kidz</h1>
            <p className="text-slate-500 font-medium">Let's build your perfect week together!</p>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (userName.trim()) setHasStarted(true);
            }}
            className="space-y-6"
          >
            <div className="space-y-4 text-left">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">What's your name?</label>
                <input 
                  autoFocus
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Type your name here..."
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-lg font-bold focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                />
              </div>
            </div>
            <div className="space-y-3">
              <button 
                type="submit"
                disabled={!userName.trim()}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all"
              >
                Start Planning
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <AnimatePresence>
                {storyText && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-amber-100 shadow-sm"
                  >
                    <p className="text-sm font-medium text-amber-900 italic leading-relaxed">
                      "{storyText}"
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                type="button"
                onClick={generateStory}
                disabled={isStoryLoading}
                className={`w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all border disabled:opacity-50 ${
                  isStoryPlaying 
                    ? 'bg-rose-500 text-white border-rose-600' 
                    : 'bg-amber-50 text-amber-700 border-amber-100'
                }`}
              >
                {isStoryLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isStoryPlaying ? (
                  <BellRing className="w-4 h-4 animate-ring" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isStoryLoading ? "Creating Magic..." : isStoryPlaying ? "Stop Story" : "Listen to a New Story!"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 pt-[env(safe-area-inset-top)]">
      {renderAiConsentModal()}
      <div className="h-6 bg-white w-full sticky top-0 z-50 md:hidden" />

      <main className="pb-24 pt-4 px-6 max-w-md mx-auto">
        <AnimatePresence>
          {apiKeyMissing && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="bg-rose-500 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center mb-4 shadow-lg shadow-rose-100"
            >
              ⚠️ Gemini API Key is missing! <br/> AI features will not work.
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {showPrivacy ? renderPrivacy() : (
            <>
              {activeTab === 'home' && renderHome()}
              {activeTab === 'schedule' && renderSchedule()}
              {activeTab === 'setup' && renderSetup()}
              {activeTab === 'plan' && renderPlan()}
              {activeTab === 'profile' && renderProfile()}
            </>
          )}
        </AnimatePresence>
      </main>

      {/* Sleek Floating Restore Badge when Swiped Out */}
      <AnimatePresence>
        {activeTimer && timerSwipedOut && (
          <div className="fixed top-4 left-0 right-0 z-50 px-6 max-w-md mx-auto pointer-events-none">
            <motion.button
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              onClick={() => setTimerSwipedOut(false)}
              className="pointer-events-auto mx-auto flex items-center gap-2 px-4 py-2 bg-indigo-950 text-indigo-200 hover:text-white rounded-full font-black text-xs shadow-lg border border-indigo-900 active:scale-95 transition-all cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>{activeTimer.title}</span>
              <span className="text-white font-mono bg-indigo-900 px-1.5 py-0.5 rounded-lg text-[10px] ml-1">
                {Math.floor(activeTimer.timeLeft / 60)}:{(activeTimer.timeLeft % 60).toString().padStart(2, '0')}
              </span>
              <span className="opacity-60 text-[9px] ml-1 uppercase">Tap to pull down 🔽</span>
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Active Timer Widget */}
      <AnimatePresence>
        {activeTimer && activeTab !== 'home' && !timerSwipedOut && (
          <div className="fixed bottom-24 left-0 right-0 z-40 px-6 max-w-md mx-auto pointer-events-none">
            <motion.div 
              drag
              dragMomentum={false}
              dragElastic={0.11}
              dragConstraints={{ left: -160, right: 160, top: -600, bottom: 30 }}
              onDrag={(event, info) => {
                if (info.point.y < 90) {
                  setTimerSwipedOut(true);
                }
              }}
              whileDrag={{ scale: 1.02, shadow: "0 25px 50px -12px rgb(0 0 0 / 0.5)" }}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -400, scale: 0.9, transition: { duration: 0.25 } }}
              className="bg-indigo-950 text-white p-3.5 rounded-3xl flex flex-col gap-2 shadow-2xl border border-indigo-950 pointer-events-auto cursor-grab active:cursor-grabbing select-none"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-900 flex items-center justify-center text-indigo-300 shadow-inner shrink-0 pointer-events-none">
                    <Clock className={`w-4 h-4 ${activeTimer.isActive ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
                  </div>
                  <div className="flex flex-col min-w-0 pointer-events-none">
                    <span className="text-[8px] font-black uppercase text-indigo-300 tracking-widest leading-none mb-0.5 flex items-center gap-1">
                      <span>Active Task</span>
                      <span className="opacity-65">• Swipe up to hide 🖐️</span>
                    </span>
                    <span className="text-[11px] font-black truncate leading-tight">{activeTimer.title}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="font-mono text-xs font-black text-indigo-100 flex items-baseline pointer-events-none">
                    <span>{Math.floor(activeTimer.timeLeft / 60)}</span>
                    <span className="text-indigo-400 font-bold">:</span>
                    <span className="text-indigo-300">{(activeTimer.timeLeft % 60).toString().padStart(2, '0')}</span>
                  </div>

                  <div className="flex gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTimer((prev: any) => {
                          if (!prev) return null;
                          return { ...prev, isActive: !prev.isActive, lastUpdated: Date.now() };
                        });
                      }}
                      className={`p-1.5 rounded-xl text-xs font-black cursor-pointer pointer-events-auto transition-all active:scale-90 ${
                        activeTimer.isActive 
                          ? 'bg-amber-100 text-amber-800' 
                          : activeTimer.timeLeft === 0 
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-white text-indigo-950'
                      }`}
                    >
                      {activeTimer.timeLeft === 0 ? '✨' : activeTimer.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTimer(null);
                      }}
                      className="p-1.5 rounded-xl bg-indigo-900 text-indigo-300 hover:text-white cursor-pointer pointer-events-auto transition-all active:scale-90"
                      title="Close"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              
              {activeTimer.totalTime > 0 && (
                <div className="w-full h-1 bg-indigo-950 rounded-full overflow-hidden pointer-events-none">
                  <div 
                    className="h-full bg-indigo-400 transition-all duration-1000"
                    style={{ width: `${((activeTimer.totalTime - activeTimer.timeLeft) / activeTimer.totalTime) * 100}%` }}
                  />
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 px-8 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex items-center justify-between z-50 max-w-md mx-auto rounded-t-[32px] shadow-2xl shadow-slate-200">
        {[
          { id: 'home', icon: Home, label: 'Home', color: 'text-indigo-600', dot: 'bg-indigo-600' },
          { id: 'schedule', icon: Clock, label: 'Schedule', color: 'text-rose-600', dot: 'bg-rose-600' },
          { id: 'setup', icon: SettingsIcon, label: 'Setup', color: 'text-amber-600', dot: 'bg-amber-600' },
          { id: 'plan', icon: Calendar, label: 'Plan', color: 'text-emerald-600', dot: 'bg-emerald-600' },
          { id: 'profile', icon: User, label: 'Me', color: 'text-violet-600', dot: 'bg-violet-600' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              setShowPrivacy(false);
            }}
            className={`flex flex-col items-center gap-1 transition-all relative ${
              activeTab === item.id ? item.color : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <item.icon className={`w-6 h-6 ${activeTab === item.id ? 'scale-110' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
            {activeTab === item.id && (
              <motion.div 
                layoutId="activeTabDot"
                className={`absolute -bottom-2 w-1 h-1 ${item.dot} rounded-full`}
              />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

