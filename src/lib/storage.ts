import type { ScheduleEvent, TodoItem, WeeklyTimetable, MorningBriefingItem, TeacherProfile, DayOfWeek, FirebaseConfig } from './types';
import { INITIAL_EVENTS, INITIAL_TODOS, INITIAL_TIMETABLE, INITIAL_BRIEFINGS } from './mockData';
import { syncEventsToFirestore, syncTodosToFirestore, syncTimetableToFirestore, syncBriefingsToFirestore } from './firebase';

const KEYS = {
  EVENTS: 'tcal_events_v1',
  TODOS: 'tcal_todos_v1',
  TIMETABLE: 'tcal_timetable_v1',
  BRIEFINGS: 'tcal_briefings_v1',
  SETTINGS: 'tcal_settings_v1',
};

export interface AppSettings {
  geminiApiKey?: string;
  solarApiKey?: string;
  autoMaskPersonalInfo: boolean;
  schoolName: string;
  teacherName: string;
  profile: TeacherProfile;
  firebaseConfig?: FirebaseConfig;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoMaskPersonalInfo: true,
  schoolName: '새솔고등학교',
  teacherName: '김선생님',
  profile: {
    schoolName: '새솔고등학교',
    teacherName: '김선생님',
    isHomeroom: true,
    homeroomClass: '3학년 2반',
    department: '진로진학부',
    position: '과학과 교과주임',
    subjects: '2학년 물리학Ⅰ, 3학년 생활과 과학',
    extraDuties: '수능 응시원서 접수 총괄, 과학교구 예산 추경 관리',
  },
  firebaseConfig: {
    useCloudSync: false,
  },
};

// 클라이언트 사이드 localStorage 안전 접근
function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage`, e);
  }
}

/**
 * 시간표 데이터 무결성 보장 함수 (한글 요일, 대소문자, 객체/배열 형태 모두 정규화)
 */
export function sanitizeTimetable(raw: any): WeeklyTimetable {
  if (!raw || typeof raw !== 'object') return INITIAL_TIMETABLE;

  const keyMap: Record<string, DayOfWeek> = {
    mon: 'mon', monday: 'mon', '월': 'mon', '월요일': 'mon',
    tue: 'tue', tuesday: 'tue', '화': 'tue', '화요일': 'tue',
    wed: 'wed', wednesday: 'wed', '수': 'wed', '수요일': 'wed',
    thu: 'thu', thursday: 'thu', '목': 'thu', '목요일': 'thu',
    fri: 'fri', friday: 'fri', '금': 'fri', '금요일': 'fri',
  };

  const days: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const sanitized: WeeklyTimetable = { mon: [], tue: [], wed: [], thu: [], fri: [] };

  const normalizedRaw: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw)) {
    const mappedKey = keyMap[k.toLowerCase().trim()];
    if (mappedKey) {
      normalizedRaw[mappedKey] = v;
    }
  }

  days.forEach((d) => {
    const rawDayVal = normalizedRaw[d] || raw[d];
    let slotsList: any[] = [];

    if (Array.isArray(rawDayVal)) {
      slotsList = rawDayVal;
    } else if (rawDayVal && typeof rawDayVal === 'object') {
      slotsList = Object.entries(rawDayVal).map(([k, v]) => {
        const periodNum = parseInt(k.replace(/[^0-9]/g, ''), 10) || 1;
        if (typeof v === 'string') {
          return { period: periodNum, subject: v, className: '-' };
        }
        return { period: periodNum, ...(v as object) };
      });
    }

    sanitized[d] = [1, 2, 3, 4, 5, 6, 7].map((p) => {
      const found = slotsList.find((s: any) => s?.period === p);
      if (typeof found === 'string') {
        return { period: p, subject: found, className: '-' };
      }

      let subject = (found?.subject || '공강').trim();
      let className = (found?.className || '-').trim();

      // subject에 과목 대신 학년/학급만 들어가고 className에 과목명이 들어간 경우 자동 보정
      const isGradePattern = /^[1-3]학년?$/.test(subject) || /^[1-3]-[0-9]+$/.test(subject);
      const isClassSubject = className !== '-' && !/^[1-3]학년?$/.test(className) && !/^[1-3]-[0-9]+$/.test(className);

      if (isGradePattern && isClassSubject) {
        const temp = subject;
        subject = className;
        className = temp;
      }

      return {
        period: p,
        subject: subject,
        className: className,
        isSwapped: !!found?.isSwapped,
        swapNote: found?.swapNote,
      };
    });
  });

  return sanitized;
}

/**
 * 스토리지 어댑터 (로컬스토리지 + Firebase Firestore 하이브리드 지원)
 */
export const Storage = {
  // 이벤트(마감 일정) 관리
  getEvents: (): ScheduleEvent[] => {
    const list = safeGet<ScheduleEvent[]>(KEYS.EVENTS, INITIAL_EVENTS);
    return Array.isArray(list) ? list : INITIAL_EVENTS;
  },
  saveEvents: (events: ScheduleEvent[]): ScheduleEvent[] => {
    const clean = Array.isArray(events) ? events : [];
    safeSet(KEYS.EVENTS, clean);
    syncEventsToFirestore(clean);
    return clean;
  },
  addEvent: (event: ScheduleEvent): ScheduleEvent[] => {
    const events = Storage.getEvents();
    const updated = [event, ...events];
    Storage.saveEvents(updated);
    return updated;
  },
  deleteEvent: (id: string): ScheduleEvent[] => {
    const events = Storage.getEvents().filter(e => e.id !== id);
    Storage.saveEvents(events);
    return events;
  },

  // To-Do(오늘의 실행 태스크) 관리
  getTodos: (): TodoItem[] => {
    const list = safeGet<TodoItem[]>(KEYS.TODOS, INITIAL_TODOS);
    return Array.isArray(list) ? list : INITIAL_TODOS;
  },
  saveTodos: (todos: TodoItem[]): TodoItem[] => {
    const clean = Array.isArray(todos) ? todos : [];
    safeSet(KEYS.TODOS, clean);
    syncTodosToFirestore(clean);
    return clean;
  },
  addTodos: (newTodos: TodoItem[]): TodoItem[] => {
    const todos = Storage.getTodos();
    const updated = [...newTodos, ...todos];
    Storage.saveTodos(updated);
    return updated;
  },
  toggleTodo: (id: string): TodoItem[] => {
    const todos = Storage.getTodos().map(t =>
      t.id === id ? { ...t, isCompleted: !t.isCompleted } : t
    );
    Storage.saveTodos(todos);
    return todos;
  },
  deleteTodo: (id: string): TodoItem[] => {
    const todos = Storage.getTodos().filter(t => t.id !== id);
    Storage.saveTodos(todos);
    return todos;
  },

  // 시간표 관리 (데이터 무결성 및 크래시 방지 정규화)
  getTimetable: (): WeeklyTimetable => {
    const raw = safeGet<WeeklyTimetable>(KEYS.TIMETABLE, INITIAL_TIMETABLE);
    return sanitizeTimetable(raw);
  },
  saveTimetable: (timetable: WeeklyTimetable): WeeklyTimetable => {
    const clean = sanitizeTimetable(timetable);
    safeSet(KEYS.TIMETABLE, clean);
    syncTimetableToFirestore(clean);
    return clean;
  },

  // 조·종례 전달사항 관리
  getBriefings: (): MorningBriefingItem[] => {
    return safeGet<MorningBriefingItem[]>(KEYS.BRIEFINGS, INITIAL_BRIEFINGS);
  },
  saveBriefings: (briefings: MorningBriefingItem[]): MorningBriefingItem[] => {
    safeSet(KEYS.BRIEFINGS, briefings);
    syncBriefingsToFirestore(briefings);
    return briefings;
  },
  toggleBriefing: (id: string): MorningBriefingItem[] => {
    const briefings = Storage.getBriefings().map(b =>
      b.id === id ? { ...b, isDone: !b.isDone } : b
    );
    Storage.saveBriefings(briefings);
    return briefings;
  },
  addBriefing: (content: string, type: MorningBriefingItem['type'] = 'announcement'): MorningBriefingItem[] => {
    const list = Storage.getBriefings();
    const newItem: MorningBriefingItem = {
      id: `brf-${Date.now()}`,
      content,
      type,
      isDone: false,
      date: new Date().toISOString().split('T')[0],
    };
    const updated = [newItem, ...list];
    Storage.saveBriefings(updated);
    return updated;
  },

  // 환경설정 및 API 키
  getSettings: (): AppSettings => {
    return safeGet<AppSettings>(KEYS.SETTINGS, DEFAULT_SETTINGS);
  },
  saveSettings: (settings: AppSettings): void => {
    safeSet(KEYS.SETTINGS, settings);
  },

  // 전체 데이터 리셋 (테스트용)
  resetToDefault: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(KEYS.EVENTS);
    localStorage.removeItem(KEYS.TODOS);
    localStorage.removeItem(KEYS.TIMETABLE);
    localStorage.removeItem(KEYS.BRIEFINGS);
  }
};
