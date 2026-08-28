import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  onSnapshot,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  ScheduleEvent,
  TodoItem,
  WeeklyTimetable,
  MorningBriefingItem,
  FirebaseConfig,
} from './types';
import type { AppSettings } from './storage';

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
      return false;
    }

    if (!getApps().length) {
      app = initializeApp(finalConfig);
      try {
        db = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        });
      } catch {
        db = getFirestore(app);
      }
    } else {
      app = getApp();
      db = getFirestore(app);
    }

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

export function getFirestoreInstance(): Firestore | null {
  return db;
}

/* =========================================================================
   1. 학사일정 및 마감 이벤트 (Events)
   ========================================================================= */

export async function fetchEventsFromFirestore(userId = 'default_teacher'): Promise<ScheduleEvent[]> {
  if (!db) return [];
  try {
    const colRef = collection(db, 'teachers', userId, 'events');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as ScheduleEvent);
    }
    // 레거시 단일 문서 포맷 fallback 확인
    const legacyDoc = await getDoc(doc(db, 'teachers', userId, 'data', 'events'));
    if (legacyDoc.exists() && legacyDoc.data()?.items) {
      return legacyDoc.data().items as ScheduleEvent[];
    }
    return [];
  } catch (e) {
    console.error('[Firebase] fetchEvents 오류:', e);
    return [];
  }
}

export async function addEventToFirestore(event: ScheduleEvent, userId = 'default_teacher'): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, 'teachers', userId, 'events', event.id);
    await setDoc(docRef, { ...event, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (e) {
    console.error('[Firebase] addEvent 오류:', e);
  }
}

export async function deleteEventFromFirestore(id: string, userId = 'default_teacher'): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, 'teachers', userId, 'events', id);
    await deleteDoc(docRef);
  } catch (e) {
    console.error('[Firebase] deleteEvent 오류:', e);
  }
}

export async function syncAllEventsToFirestore(events: ScheduleEvent[], userId = 'default_teacher'): Promise<void> {
  if (!db || !Array.isArray(events)) return;
  try {
    const batch = writeBatch(db);
    // 컬렉션 문서 일괄 업데이트
    events.forEach((evt) => {
      const docRef = doc(db!, 'teachers', userId, 'events', evt.id);
      batch.set(docRef, { ...evt, updatedAt: new Date().toISOString() }, { merge: true });
    });
    // 레거시 백업 문서도 동기화
    const legacyDoc = doc(db, 'teachers', userId, 'data', 'events');
    batch.set(legacyDoc, { items: events, updatedAt: new Date().toISOString() });
    await batch.commit();
  } catch (e) {
    console.error('[Firebase] syncAllEvents 오류:', e);
  }
}

/* =========================================================================
   2. 실행 과업 (To-Do Items)
   ========================================================================= */

export async function fetchTodosFromFirestore(userId = 'default_teacher'): Promise<TodoItem[]> {
  if (!db) return [];
  try {
    const colRef = collection(db, 'teachers', userId, 'todos');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as TodoItem);
    }
    const legacyDoc = await getDoc(doc(db, 'teachers', userId, 'data', 'todos'));
    if (legacyDoc.exists() && legacyDoc.data()?.items) {
      return legacyDoc.data().items as TodoItem[];
    }
    return [];
  } catch (e) {
    console.error('[Firebase] fetchTodos 오류:', e);
    return [];
  }
}

export async function addTodosToFirestore(todos: TodoItem[], userId = 'default_teacher'): Promise<void> {
  if (!db || !Array.isArray(todos)) return;
  try {
    const batch = writeBatch(db);
    todos.forEach((todo) => {
      const docRef = doc(db!, 'teachers', userId, 'todos', todo.id);
      batch.set(docRef, { ...todo, updatedAt: new Date().toISOString() }, { merge: true });
    });
    await batch.commit();
  } catch (e) {
    console.error('[Firebase] addTodos 오류:', e);
  }
}

export async function toggleTodoInFirestore(id: string, isCompleted: boolean, userId = 'default_teacher'): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, 'teachers', userId, 'todos', id);
    await setDoc(docRef, { isCompleted, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (e) {
    console.error('[Firebase] toggleTodo 오류:', e);
  }
}

export async function deleteTodoFromFirestore(id: string, userId = 'default_teacher'): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, 'teachers', userId, 'todos', id);
    await deleteDoc(docRef);
  } catch (e) {
    console.error('[Firebase] deleteTodo 오류:', e);
  }
}

export async function syncAllTodosToFirestore(todos: TodoItem[], userId = 'default_teacher'): Promise<void> {
  if (!db || !Array.isArray(todos)) return;
  try {
    const batch = writeBatch(db);
    todos.forEach((todo) => {
      const docRef = doc(db!, 'teachers', userId, 'todos', todo.id);
      batch.set(docRef, { ...todo, updatedAt: new Date().toISOString() }, { merge: true });
    });
    const legacyDoc = doc(db, 'teachers', userId, 'data', 'todos');
    batch.set(legacyDoc, { items: todos, updatedAt: new Date().toISOString() });
    await batch.commit();
  } catch (e) {
    console.error('[Firebase] syncAllTodos 오류:', e);
  }
}

/* =========================================================================
   3. 주간 시간표 (Weekly Timetable)
   ========================================================================= */

export async function fetchTimetableFromFirestore(userId = 'default_teacher'): Promise<WeeklyTimetable | null> {
  if (!db) return null;
  try {
    const docRef = doc(db, 'teachers', userId, 'timetable', 'weekly');
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data()?.data) {
      return snap.data().data as WeeklyTimetable;
    }
    const legacyDoc = await getDoc(doc(db, 'teachers', userId, 'data', 'timetable'));
    if (legacyDoc.exists() && legacyDoc.data()?.data) {
      return legacyDoc.data().data as WeeklyTimetable;
    }
    return null;
  } catch (e) {
    console.error('[Firebase] fetchTimetable 오류:', e);
    return null;
  }
}

export async function saveTimetableToFirestore(timetable: WeeklyTimetable, userId = 'default_teacher'): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, 'teachers', userId, 'timetable', 'weekly');
    await setDoc(docRef, { data: timetable, updatedAt: new Date().toISOString() }, { merge: true });
    // 레거시 경로도 백업
    const legacyDoc = doc(db, 'teachers', userId, 'data', 'timetable');
    await setDoc(legacyDoc, { data: timetable, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (e) {
    console.error('[Firebase] saveTimetable 오류:', e);
  }
}

/* =========================================================================
   4. 조·종례 전달사항 (Morning Briefings)
   ========================================================================= */

export async function fetchBriefingsFromFirestore(userId = 'default_teacher'): Promise<MorningBriefingItem[]> {
  if (!db) return [];
  try {
    const colRef = collection(db, 'teachers', userId, 'briefings');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as MorningBriefingItem);
    }
    const legacyDoc = await getDoc(doc(db, 'teachers', userId, 'data', 'briefings'));
    if (legacyDoc.exists() && legacyDoc.data()?.items) {
      return legacyDoc.data().items as MorningBriefingItem[];
    }
    return [];
  } catch (e) {
    console.error('[Firebase] fetchBriefings 오류:', e);
    return [];
  }
}

export async function addBriefingToFirestore(briefing: MorningBriefingItem, userId = 'default_teacher'): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, 'teachers', userId, 'briefings', briefing.id);
    await setDoc(docRef, { ...briefing, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (e) {
    console.error('[Firebase] addBriefing 오류:', e);
  }
}

export async function toggleBriefingInFirestore(id: string, isDone: boolean, userId = 'default_teacher'): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, 'teachers', userId, 'briefings', id);
    await setDoc(docRef, { isDone, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (e) {
    console.error('[Firebase] toggleBriefing 오류:', e);
  }
}

export async function deleteBriefingFromFirestore(id: string, userId = 'default_teacher'): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, 'teachers', userId, 'briefings', id);
    await deleteDoc(docRef);
  } catch (e) {
    console.error('[Firebase] deleteBriefing 오류:', e);
  }
}

export async function syncAllBriefingsToFirestore(briefings: MorningBriefingItem[], userId = 'default_teacher'): Promise<void> {
  if (!db || !Array.isArray(briefings)) return;
  try {
    const batch = writeBatch(db);
    briefings.forEach((b) => {
      const docRef = doc(db!, 'teachers', userId, 'briefings', b.id);
      batch.set(docRef, { ...b, updatedAt: new Date().toISOString() }, { merge: true });
    });
    const legacyDoc = doc(db, 'teachers', userId, 'data', 'briefings');
    batch.set(legacyDoc, { items: briefings, updatedAt: new Date().toISOString() });
    await batch.commit();
  } catch (e) {
    console.error('[Firebase] syncAllBriefings 오류:', e);
  }
}

/* =========================================================================
   5. 교사 프로필 및 앱 설정 (Settings)
   ========================================================================= */

export async function fetchSettingsFromFirestore(userId = 'default_teacher'): Promise<Partial<AppSettings> | null> {
  if (!db) return null;
  try {
    const docRef = doc(db, 'teachers', userId, 'settings', 'main');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Partial<AppSettings>;
    }
    return null;
  } catch (e) {
    console.error('[Firebase] fetchSettings 오류:', e);
    return null;
  }
}

export async function saveSettingsToFirestore(settings: Partial<AppSettings>, userId = 'default_teacher'): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, 'teachers', userId, 'settings', 'main');
    await setDoc(docRef, { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (e) {
    console.error('[Firebase] saveSettings 오류:', e);
  }
}

/* =========================================================================
   6. Firestore 실시간 리스너 구독 (Realtime Subscriptions)
   ========================================================================= */

export function subscribeToTeacherData(
  userId = 'default_teacher',
  callbacks: {
    onEvents?: (events: ScheduleEvent[]) => void;
    onTodos?: (todos: TodoItem[]) => void;
    onTimetable?: (timetable: WeeklyTimetable) => void;
    onBriefings?: (briefings: MorningBriefingItem[]) => void;
    onSettings?: (settings: Partial<AppSettings>) => void;
  }
): () => void {
  // 기존 구독 해제
  activeUnsubscribes.forEach((unsub) => unsub());
  activeUnsubscribes = [];

  if (!db) return () => {};

  try {
    // Events 실시간 리스너 (컬렉션 우선, 레거시 폴백)
    if (callbacks.onEvents) {
      const unsub = onSnapshot(collection(db, 'teachers', userId, 'events'), (snap) => {
        if (!snap.empty) {
          callbacks.onEvents?.(snap.docs.map((d) => d.data() as ScheduleEvent));
        } else {
          // 컬렉션이 비었으면 단일 문서 확인
          getDoc(doc(db!, 'teachers', userId, 'data', 'events')).then((legacySnap) => {
            if (legacySnap.exists() && legacySnap.data()?.items) {
              callbacks.onEvents?.(legacySnap.data().items);
            }
          });
        }
      });
      activeUnsubscribes.push(unsub);
    }

    // Todos 실시간 리스너
    if (callbacks.onTodos) {
      const unsub = onSnapshot(collection(db, 'teachers', userId, 'todos'), (snap) => {
        if (!snap.empty) {
          callbacks.onTodos?.(snap.docs.map((d) => d.data() as TodoItem));
        } else {
          getDoc(doc(db!, 'teachers', userId, 'data', 'todos')).then((legacySnap) => {
            if (legacySnap.exists() && legacySnap.data()?.items) {
              callbacks.onTodos?.(legacySnap.data().items);
            }
          });
        }
      });
      activeUnsubscribes.push(unsub);
    }

    // Timetable 실시간 리스너
    if (callbacks.onTimetable) {
      const unsub = onSnapshot(doc(db, 'teachers', userId, 'timetable', 'weekly'), (snap) => {
        if (snap.exists() && snap.data()?.data) {
          callbacks.onTimetable?.(snap.data().data);
        } else {
          getDoc(doc(db!, 'teachers', userId, 'data', 'timetable')).then((legacySnap) => {
            if (legacySnap.exists() && legacySnap.data()?.data) {
              callbacks.onTimetable?.(legacySnap.data().data);
            }
          });
        }
      });
      activeUnsubscribes.push(unsub);
    }

    // Briefings 실시간 리스너
    if (callbacks.onBriefings) {
      const unsub = onSnapshot(collection(db, 'teachers', userId, 'briefings'), (snap) => {
        if (!snap.empty) {
          callbacks.onBriefings?.(snap.docs.map((d) => d.data() as MorningBriefingItem));
        } else {
          getDoc(doc(db!, 'teachers', userId, 'data', 'briefings')).then((legacySnap) => {
            if (legacySnap.exists() && legacySnap.data()?.items) {
              callbacks.onBriefings?.(legacySnap.data().items);
            }
          });
        }
      });
      activeUnsubscribes.push(unsub);
    }

    // Settings 실시간 리스너
    if (callbacks.onSettings) {
      const unsub = onSnapshot(doc(db, 'teachers', userId, 'settings', 'main'), (snap) => {
        if (snap.exists()) {
          callbacks.onSettings?.(snap.data() as Partial<AppSettings>);
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

/* =========================================================================
   7. 초기 데이터 마이그레이션 / 자동 시딩
   ========================================================================= */

export async function seedInitialDataIfEmpty(
  userId = 'default_teacher',
  initial: {
    events: ScheduleEvent[];
    todos: TodoItem[];
    timetable: WeeklyTimetable;
    briefings: MorningBriefingItem[];
    settings?: AppSettings;
  }
): Promise<boolean> {
  if (!db) return false;
  try {
    const existingEvents = await fetchEventsFromFirestore(userId);
    if (existingEvents.length === 0 && initial.events.length > 0) {
      console.log('[Firebase] Firestore 초기 데이터 자동 시딩 진행...');
      await syncAllEventsToFirestore(initial.events, userId);
      await syncAllTodosToFirestore(initial.todos, userId);
      await saveTimetableToFirestore(initial.timetable, userId);
      await syncAllBriefingsToFirestore(initial.briefings, userId);
      if (initial.settings) {
        await saveSettingsToFirestore(initial.settings, userId);
      }
      return true;
    }
    return false;
  } catch (e) {
    console.error('[Firebase] 초기 데이터 시딩 오류:', e);
    return false;
  }
}
