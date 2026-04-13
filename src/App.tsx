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
  Wand2
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

const FREQUENCY_OPTIONS = ['Weekly', '2x week', '3x week', '4x week', '5x week', '6x week', 'Daily'];
const CHORE_FREQUENCY_OPTIONS = ['Daily', 'Weekly'];
const DURATION_OPTIONS = ['15m', '30m', '45m', '1h', '1h 15m', '1h 30m', '2h', '2h 30m', '3h'];

const ActivityTimer = ({ durationStr, theme, title }: { durationStr: string, theme?: { bg: string, button: string, buttonHover: string }, title?: string }) => {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    let secs = 0;
    if (!durationStr) return;
    if (durationStr.includes('h')) secs = parseInt(durationStr) * 3600;
    else if (durationStr.includes('m')) secs = parseInt(durationStr) * 60;
    setTotalTime(secs);
    setTimeLeft(secs);
  }, [durationStr]);

  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="w-full mt-4 pt-4 border-t border-slate-50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
            {title || 'Timer'}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-indigo-600 font-mono leading-none">
              {mins}:{secs.toString().padStart(2, '0')}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Remaining</span>
          </div>
        </div>
        <button 
          onClick={() => setIsActive(!isActive)} 
          className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors ${
            isActive 
              ? 'bg-amber-100 text-amber-700' 
              : timeLeft === 0 
                ? 'bg-emerald-100 text-emerald-700'
                : theme ? `${theme.button} ${theme.buttonHover}` : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
          }`}
        >
          {timeLeft === 0 ? 'Done!' : isActive ? 'Pause' : 'Start'}
        </button>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${timeLeft === 0 ? 'bg-emerald-500' : theme ? theme.bg : 'bg-indigo-500'}`} 
          style={{ width: `${progress}%` }} 
        />
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
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
  });
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [focusedDayIndex, setFocusedDayIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showStoryButton, setShowStoryButton] = useState(false);
  const [isStoryLoading, setIsStoryLoading] = useState(false);
  const [storyAudio, setStoryAudio] = useState<string | null>(null);
  const [storyText, setStoryText] = useState<string | null>(null);
  const [isStoryPlaying, setIsStoryPlaying] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    console.log("Planova Kidz: App initialized");
    console.log("Planova Kidz: Platform:", (window as any).Capacitor?.getPlatform() || 'web');
    if (!process.env.GEMINI_API_KEY) {
      console.warn("Planova Kidz: GEMINI_API_KEY is missing in this build!");
      setApiKeyMissing(true);
    } else {
      console.log("Planova Kidz: GEMINI_API_KEY is present.");
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

  useEffect(() => {
    if (plan) {
      setFocusedDayIndex(0);
    }
  }, [plan]);

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
  const [newClassReminder, setNewClassReminder] = useState(false);

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

  // Load data from localStorage on mount
  useEffect(() => {
    const savedClasses = localStorage.getItem('kids_fixed_classes');
    const savedPractice = localStorage.getItem('kids_practice_goals');
    const savedChores = localStorage.getItem('kids_chores');
    const savedFreeTimes = localStorage.getItem('kids_free_times');
    const savedSettings = localStorage.getItem('kids_settings');
    const savedPlan = localStorage.getItem('kids_plan');

    if (savedClasses) {
      const parsed = JSON.parse(savedClasses);
      setFixedClasses(parsed.map((c: any) => ({
        ...c,
        days: c.days || (c.day ? [c.day] : []),
        day: undefined
      })));
    }
    if (savedPractice) setPracticeGoals(JSON.parse(savedPractice));
    if (savedChores) setChores(JSON.parse(savedChores));
    if (savedFreeTimes) setFreeTimes(JSON.parse(savedFreeTimes));
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      
      setSettings({
        ...parsed,
        schoolDayStartTime: parsed.schoolDayStartTime || parsed.weekdayStartTime || '16:00',
        weekendAvailableHours: parsed.weekendAvailableHours || 4,
        schoolDays: parsed.schoolDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        bedtime: parsed.bedtime || '20:30'
      });
    }
    if (savedPlan) setPlan(JSON.parse(savedPlan));
  }, []);

  // Save data to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('kids_name', userName);
    localStorage.setItem('kids_fixed_classes', JSON.stringify(fixedClasses));
    localStorage.setItem('kids_practice_goals', JSON.stringify(practiceGoals));
    localStorage.setItem('kids_chores', JSON.stringify(chores));
    localStorage.setItem('kids_free_times', JSON.stringify(freeTimes));
    localStorage.setItem('kids_settings', JSON.stringify(settings));
    if (plan) localStorage.setItem('kids_plan', JSON.stringify(plan));
  }, [userName, fixedClasses, practiceGoals, chores, settings, plan]);

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName || newClassDays.length === 0) return;
    
    if (editingClassId) {
      setFixedClasses(fixedClasses.map(c => c.id === editingClassId ? {
        ...c,
        name: newClassName,
        days: newClassDays,
        startTime: newClassTime,
        duration: newClassDuration,
        reminder: newClassReminder
      } : c));
      setEditingClassId(null);
    } else {
      setFixedClasses([...fixedClasses, { 
        id: crypto.randomUUID(), 
        name: newClassName, 
        days: newClassDays,
        startTime: newClassTime,
        duration: newClassDuration,
        reminder: newClassReminder
      }]);
    }
    
    setNewClassName('');
    setNewClassDays(['Sunday']);
    setShowAddClass(false);
    setNewClassReminder(false);
  };

  const handleAddPractice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPracticeName) return;
    
    if (editingPracticeId) {
      setPracticeGoals(practiceGoals.map(p => p.id === editingPracticeId ? {
        ...p,
        name: newPracticeName,
        duration: newPracticeDuration,
        frequency: newPracticeFrequency
      } : p));
      setEditingPracticeId(null);
    } else {
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
    if (!newChoreName) return;
    
    if (editingChoreId) {
      setChores(chores.map(c => c.id === editingChoreId ? {
        ...c,
        name: newChoreName,
        duration: newChoreDuration,
        frequency: newChoreFrequency
      } : c));
      setEditingChoreId(null);
    } else {
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
    setNewClassReminder(c.reminder);
    setShowAddClass(true);
  };

  const startEditPractice = (p: PracticeGoal) => {
    setEditingPracticeId(p.id);
    setNewPracticeName(p.name);
    setNewPracticeDuration(p.duration);
    setNewPracticeFrequency(p.frequency);
    setShowAddPractice(true);
  };

  const startEditChore = (c: Chore) => {
    setEditingChoreId(c.id);
    setNewChoreName(c.name);
    setNewChoreDuration(c.duration);
    setNewChoreFrequency(c.frequency);
    setShowAddChore(true);
  };

  const handleAddFreeTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFreeTimeName || newFreeTimeDays.length === 0) return;
    
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

  const generatePlan = async () => {
    setIsGenerating(true);
    setActiveTab('plan');
    console.log("Planova Kidz: Generating plan with inputs:", { fixedClasses, settings, practiceGoals, chores, freeTimes });
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("Planova Kidz: Gemini API Key is missing!");
        throw new Error("Gemini API Key is missing. Please ensure it is set in the Secrets panel.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        Create a concise weekly schedule for a child named ${userName || 'Kid'}.
        
        INPUTS:
        - Bedtime: ${format12h(settings.bedtime)}
        - School Days: ${settings.schoolDays.join(', ')}
        - CLASSES: ${fixedClasses.map(c => `${c.name} on ${c.days.join(', ')} at ${format12h(c.startTime)} (${c.duration}) [Reminder: ${c.reminder ? 'Yes' : 'No'}]`).join('; ')}
        - FREE TIME: ${freeTimes.map(f => `${f.name} on ${f.days.join(', ')} at ${format12h(f.startTime)} (${f.duration})`).join('; ')}
        - GOALS: ${practiceGoals.map(p => `${p.name} (${p.duration}, ${p.frequency})`).join('; ')}
        - CHORES: ${chores.map(c => `${c.name} (${c.duration}, ${c.frequency})`).join('; ')}
        
        RULES:
        1. Start Sunday, end Saturday.
        2. Include ALL CLASSES and FREE TIME at their specific times.
        3. Fit GOALS and CHORES into remaining time before ${format12h(settings.bedtime)}.
        4. Fill gaps with "Nothing For Today !". Group consecutive gaps into one block.
        5. Return ONLY valid JSON.
        
        JSON Schema:
        {
          "days": [{"day": "Sunday", "slots": [{"time": "4:00 PM", "activity": "Name", "duration": "1h", "type": "Class | Other", "reminder": true}]}],
          "tips": ["One short helpful tip"]
        }
      `;

      console.log("Planova Kidz: Calling Gemini API...");
      const response = await ai.models.generateContent({
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
                        required: ["time", "activity", "duration", "type"],
                        properties: {
                          time: { type: Type.STRING },
                          activity: { type: Type.STRING },
                          duration: { type: Type.STRING },
                          type: { type: Type.STRING },
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
      });

      console.log("Planova Kidz: Gemini API Response received.");
      if (!response.text) {
        console.error("Planova Kidz: Empty response from Gemini API.");
        throw new Error("Empty response from Gemini API.");
      }

      const result = JSON.parse(response.text);
      console.log("Planova Kidz: Parsed result:", result);
      
      // Check if user cancelled while waiting
      if (generationActive.current) {
        console.log("Plan generated successfully:", result);
        setPlan(result);
        setActiveTab('plan');
      } else {
        console.log("Generation finished but was cancelled by user.");
      }
    } catch (error: any) {
      if (generationActive.current) {
        console.error("Failed to generate plan:", error);
        alert(`Oops! Something went wrong: ${error.message || "Unknown error"}`);
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
      source.playbackRate.value = 1.15; // Speed up playback by 15%
      source.connect(audioCtx.destination);
      
      audioSourceRef.current = source;
      
      source.onended = () => {
        setIsStoryPlaying(false);
        audioSourceRef.current = null;
      };
      
      source.start();
    } catch (err) {
      console.error("Error playing PCM audio:", err);
      setIsStoryPlaying(false);
    }
  };

  const generateStory = async () => {
    if (isStoryPlaying) {
      stopStory();
      return;
    }

    if (isStoryLoading) return;
    
    setIsStoryLoading(true);
    setStoryText(null);
    setStoryAudio(null);
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("Planova Kidz: Gemini API Key is missing for story generation!");
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

      console.log("Planova Kidz: Generating story text for theme:", randomTheme);
      const textResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: `Tell a very short, exciting 3-sentence story for a child about ${randomTheme}.`,
      });
      const text = textResponse.text || "Once upon a time, there was a magical adventure...";
      console.log("Planova Kidz: Story text generated:", text);
      setStoryText(text);

      console.log("Planova Kidz: Generating story audio...");
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Read this excitedly: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      const base64Audio = audioPart?.inlineData?.data;
      
      if (base64Audio) {
        console.log("Planova Kidz: Story audio generated successfully.");
        setStoryAudio(base64Audio);
        playPCM(base64Audio);
      } else {
        console.error("Planova Kidz: No audio data in Gemini response.");
      }
    } catch (error) {
      console.error("Planova Kidz: Failed to generate story:", error);
    } finally {
      setIsStoryLoading(false);
    }
  };

  const renderHome = () => {
    const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()) as DayOfWeek;
    const todayPlan = plan?.days.find(d => d.day === today);
    const theme = DAY_COLORS[today] || DAY_COLORS.Sunday;

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
        <header className="space-y-1">
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
          <p className="text-slate-500 font-medium">It's {today}. Here's your full day plan.</p>
        </header>

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
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Today's Schedule</h3>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full uppercase tracking-wider">Active</span>
            </div>
            <div className="relative space-y-0">
              {todayPlan?.slots.map((slot, i) => (
                <div key={i} className="relative pb-6">
                  {/* Visual timeline line between activities */}
                  {i !== todayPlan.slots.length - 1 && (
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
                    
                    <ActivityTimer durationStr={slot.duration} theme={theme} title={slot.activity} />
                  </div>
                </div>
              ))}
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
        <div className="flex items-center gap-2 text-rose-600">
          <Clock className="w-5 h-5" />
          <h3 className="font-bold text-lg">Availability</h3>
        </div>
        
        <div className="space-y-4">
          <label className="text-xs font-black text-rose-400 uppercase flex items-center gap-2 tracking-widest">
            <Sun className="w-4 h-4" /> School Day Availability
          </label>
          <div className="bg-white p-6 rounded-3xl border-2 border-rose-50 shadow-sm space-y-3 transition-all hover:border-rose-200 hover:shadow-md">
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
          <label className="text-sm font-black text-rose-400 uppercase flex items-center gap-2 tracking-widest">
            <Calendar className="w-4 h-4" /> School Days
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
              if (showAddClass) {
                setEditingClassId(null);
                setNewClassName('');
                setNewClassDays(['Sunday']);
                setNewClassReminder(false);
              }
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
              <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm">
                {editingClassId ? 'Update Class' : 'Add Class'}
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
                      setNewClassName(name);
                      setShowAddClass(true);
                    }}
                    className="text-indigo-500 text-[10px] font-bold uppercase hover:underline"
                  >
                    Add Time
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

        <div className="h-px bg-slate-100 my-6" />
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
      </section>

      <div className="text-center py-2">
        <p className="text-slate-500 text-xs font-medium">After adding your activities,</p>
        <p className="text-indigo-600 text-sm font-bold">Click on Generate Weekly Plan below!</p>
      </div>

      <button 
        onClick={generatePlan}
        disabled={isGenerating || (fixedClasses.length === 0 && practiceGoals.length === 0 && chores.length === 0 && freeTimes.length === 0)}
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

      {/* Weekly Summary Section */}
      <div className="grid grid-cols-1 gap-3">
        {(() => {
          const items = Array.from(new Set(
            plan?.days.flatMap(d => d.slots)
              .filter(s => s.type === 'Class')
              .map(s => s.activity)
          ));
          
          if (items.length === 0) return null;

          return (
            <div className="bg-indigo-50 border-indigo-100 text-indigo-700 p-3 rounded-xl border text-xs space-y-1">
              <p className="font-black uppercase tracking-wider opacity-60 text-[10px]">Your Classes</p>
              <ul className="space-y-0.5">
                {items.map((item, i) => (
                  <li key={i} className="font-bold truncate">• {item}</li>
                ))}
              </ul>
            </div>
          );
        })()}
      </div>

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
              className="space-y-3"
            >
              {currentDayPlan.slots.map((slot, sIdx) => {
                // Find original index for toggleReminder
                const originalDayIdx = plan?.days.findIndex(d => d.day === currentDayPlan.day) ?? 0;
                
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
                      onClick={() => toggleReminder(originalDayIdx, sIdx)}
                      className={`p-2 rounded-xl transition-all active:scale-90 ${slot.reminder ? 'bg-amber-100 text-amber-600 shadow-inner' : 'bg-slate-50 text-slate-300 hover:bg-slate-100 hover:text-slate-400'}`}
                      title={slot.reminder ? `Reminder set for ${slot.activity}` : `Set reminder for ${slot.activity}`}
                    >
                      {slot.reminder ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
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
          {activeTab === 'home' && renderHome()}
          {activeTab === 'schedule' && renderSchedule()}
          {activeTab === 'setup' && renderSetup()}
          {activeTab === 'plan' && renderPlan()}
          {activeTab === 'profile' && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 via-violet-100 to-emerald-100 rounded-full flex items-center justify-center shadow-inner">
                <User className="w-12 h-12 text-violet-600" />
              </div>

              {!isEditingProfile && (
                <button 
                  onClick={() => setIsEditingProfile(true)}
                  className="flex items-center gap-2 bg-violet-50 text-violet-600 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-violet-100 transition-all active:scale-95 shadow-sm border border-violet-100"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h3 className="font-black text-2xl bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">{userName || 'Planova Kidz'}</h3>
                  <p className="text-slate-400 font-bold tracking-widest text-xs uppercase mt-1">v1.0.0</p>
                </motion.div>
              )}
              <div className="pt-8 w-full max-w-[200px] space-y-3">
                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-indigo-500" />
                </div>
                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full w-2/3 bg-violet-500" />
                </div>
                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-emerald-500" />
                </div>
              </div>
              <button 
                onClick={() => {
                  if(confirm('Reset all data?')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="text-rose-500 font-bold text-sm pt-8 hover:underline"
              >
                Reset App Data
              </button>
            </div>
          )}
        </AnimatePresence>
      </main>

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
            onClick={() => setActiveTab(item.id)}
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

