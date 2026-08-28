export type EventCategory = 'exam' | 'document' | 'student' | 'meeting' | 'event' | 'general';
export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low';
export type SourceType = 'clipboard_image' | 'clipboard_text' | 'file_hwp' | 'manual' | 'demo';

export interface TeacherProfile {
  schoolName: string;
  teacherName: string;
  isHomeroom: boolean;
  homeroomClass: string; // 예: "3학년 2반"
  department: string; // 예: "진로진학부", "교무기획부"
  position: string; // 예: "부장교사", "교과주임", "일반교사"
  subjects: string; // 예: "2학년 물리학, 3학년 생활과과학"
  extraDuties: string; // 예: "수능 응시원서 접수, 추경 예산 관리"
}

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  category: EventCategory;
  priority: PriorityLevel;
  description?: string;
  sourceType: SourceType;
  sourceText?: string;
  sourceImage?: string; // base64 data URL
  fileName?: string;
  createdAt: string;
  isCompleted?: boolean;
}

export interface TodoItem {
  id: string;
  eventId?: string; // 연관된 마감 일정 ID
  eventTitle?: string; // 연관된 마감 일정 제목 (예: "1차 지필평가 원안 제출")
  title: string; // 세부 태스크 제목
  date: string; // 실행 예정일 (YYYY-MM-DD - 이 날짜의 '오늘의 할 일'에 노출)
  deadlineDate?: string; // 원래 최종 마감일
  daysBefore?: number; // 마감 며칠 전 태스크인지 (D-7, D-3 등)
  isCompleted: boolean;
  priority: PriorityLevel;
  sourceImage?: string; // 원본 보기용
  sourceText?: string;
  fileName?: string;
  tag?: '조종례' | '수업' | '출제' | '공문' | '상담' | '일반';
  createdAt: string;
  isRollover?: boolean; // 미완료 자동 이월 항목 표시용
}

export interface TimetableSlot {
  period: number; // 1 ~ 7
  subject: string; // 과목명 (예: 영어, 수학, 비움)
  className: string; // 학급 (예: 2-3, 1-1)
  room?: string; // 특별실 등 (예: 어학실)
  isSwapped?: boolean; // 교체/보강 여부
  swapNote?: string; // "김교사 5교시와 맞교환"
}

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri';

export type WeeklyTimetable = Record<DayOfWeek, TimetableSlot[]>;

export interface MorningBriefingItem {
  id: string;
  content: string;
  type: 'announcement' | 'handout' | 'safety' | 'special';
  isDone: boolean;
  date: string;
}

export interface AIParsedResult {
  title: string;
  date: string; // 최종 마감일
  category: EventCategory;
  priority: PriorityLevel;
  summary: string;
  studentNotice?: string | null; // 조·종례 전달사항이 있는 경우
  subTasks: {
    title: string;
    daysBefore: number; // 마감 D-N일 전
    calculatedDate: string; // 역산된 실행 날짜 (YYYY-MM-DD)
  }[];
}

export interface MultiParsedItem {
  id: string;
  title: string;
  date: string;
  category: EventCategory;
  priority: PriorityLevel;
  type: string; // 고정, 마감, 시작가능, 미정, 확인만
  isMine: boolean;
  mineReason?: string;
  confidence?: 'high' | 'low';
  steps?: string[];
  selected: boolean;
}

export interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  useCloudSync?: boolean;
}
