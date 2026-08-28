import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { ScheduleEvent, TodoItem, WeeklyTimetable, MorningBriefingItem, FirebaseConfig } from './types';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let activeUnsubscribes: Unsubscribe[] = [];

/**
 * 환경 변수 또는 사용자 지정 Firebase 설정으로 Firebase 초기화
 */
export function initFirebase(config?: FirebaseConfig): boolean {
  try {
    const finalConfig = {
      apiKey: config?.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: config?.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: config?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: config?.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: config?.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: config?.appId || import.meta.env.VITE_FIREBASE_APP_ID,
    };

    if (!finalConfig.apiKey || !finalConfig.projectId) {
      // Firebase 설정이 없거나 불완전하면 로컬 모드로 작동
      return false;
    }

    if (!getApps().length) {
      app = initializeApp(finalConfig);
    } else {
      app = getApp();
    }

    db = getFirestore(app);
    return true;
  } catch (error) {
    console.warn('[Firebase] 초기화 실패 (로컬 스토리지 모드로 작동):', error);
    app = null;
    db = null;
    return false;
  }
}

export function isFirebaseConnected(): boolean {
  return db !== null;
}

/**
 * Firestore에 전체 이벤트 동기화
 */
export async function syncEventsToFirestore(events: ScheduleEvent[], userId = 'default_teacher'): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, 'teachers', userId, 'data', 'events');
    await setDoc(docRef, { items: events, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('[Firebase] 이벤트 동기화 오류:', e);
  }
}

/**
 * Firestore에 전체 To-Do 동기화
 */
export async function syncTodosToFirestore(todos: TodoItem[], userId = 'default_teacher'): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, 'teachers', userId, 'data', 'todos');
    await setDoc(docRef, { items: todos, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('[Firebase] To-Do 동기화 오류:', e);
  }
}

/**
 * Firestore에 시간표 동기화
 */
export async function syncTimetableToFirestore(timetable: WeeklyTimetable, userId = 'default_teacher'): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, 'teachers', userId, 'data', 'timetable');
    await setDoc(docRef, { data: timetable, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('[Firebase] 시간표 동기화 오류:', e);
  }
}

/**
 * Firestore에 조·종례 동기화
 */
export async function syncBriefingsToFirestore(briefings: MorningBriefingItem[], userId = 'default_teacher'): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, 'teachers', userId, 'data', 'briefings');
    await setDoc(docRef, { items: briefings, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('[Firebase] 조·종례 동기화 오류:', e);
  }
}

/**
 * Firestore 실시간 리스너 연결
 */
export function subscribeToTeacherData(
  userId = 'default_teacher',
  callbacks: {
    onEvents?: (events: ScheduleEvent[]) => void;
    onTodos?: (todos: TodoItem[]) => void;
    onTimetable?: (timetable: WeeklyTimetable) => void;
    onBriefings?: (briefings: MorningBriefingItem[]) => void;
  }
): () => void {
  // 이전 구독 정리
  activeUnsubscribes.forEach((unsub) => unsub());
  activeUnsubscribes = [];

  if (!db) return () => {};

  try {
    if (callbacks.onEvents) {
      const unsub = onSnapshot(doc(db, 'teachers', userId, 'data', 'events'), (snap) => {
        if (snap.exists() && snap.data()?.items) {
          callbacks.onEvents?.(snap.data().items);
        }
      });
      activeUnsubscribes.push(unsub);
    }

    if (callbacks.onTodos) {
      const unsub = onSnapshot(doc(db, 'teachers', userId, 'data', 'todos'), (snap) => {
        if (snap.exists() && snap.data()?.items) {
          callbacks.onTodos?.(snap.data().items);
        }
      });
      activeUnsubscribes.push(unsub);
    }

    if (callbacks.onTimetable) {
      const unsub = onSnapshot(doc(db, 'teachers', userId, 'data', 'timetable'), (snap) => {
        if (snap.exists() && snap.data()?.data) {
          callbacks.onTimetable?.(snap.data().data);
        }
      });
      activeUnsubscribes.push(unsub);
    }

    if (callbacks.onBriefings) {
      const unsub = onSnapshot(doc(db, 'teachers', userId, 'data', 'briefings'), (snap) => {
        if (snap.exists() && snap.data()?.items) {
          callbacks.onBriefings?.(snap.data().items);
        }
      });
      activeUnsubscribes.push(unsub);
    }
  } catch (e) {
    console.error('[Firebase] 실시간 구독 설정 오류:', e);
  }

  return () => {
    activeUnsubscribes.forEach((unsub) => unsub());
    activeUnsubscribes = [];
  };
}
