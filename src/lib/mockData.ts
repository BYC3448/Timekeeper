import { ScheduleEvent, TodoItem, WeeklyTimetable, MorningBriefingItem, AIParsedResult } from './types';
import { format, addDays } from 'date-fns';

const today = new Date();
const todayStr = format(today, 'yyyy-MM-dd');
const dPlus7 = format(addDays(today, 7), 'yyyy-MM-dd');
const dPlus3 = format(addDays(today, 3), 'yyyy-MM-dd');
const dPlus14 = format(addDays(today, 14), 'yyyy-MM-dd');

// 해커톤 발표용 실감형 샘플 공문 이미지 (SVG Data URL)
export const SAMPLE_NOTICE_IMAGE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
  <rect width="600" height="380" fill="%23ffffff" rx="8" stroke="%23cbd5e1" stroke-width="2"/>
  <rect x="0" y="0" width="600" height="45" fill="%23f1f5f9" rx="8"/>
  <text x="20" y="28" font-family="sans-serif" font-size="16" font-weight="bold" fill="%231e293b">📄 [공문 안내] 2026학년도 2학기 1차 지필평가 출제 및 관리 계획</text>
  <line x1="20" y1="55" x2="580" y2="55" stroke="%23e2e8f0" stroke-width="1.5"/>
  
  <text x="25" y="85" font-family="sans-serif" font-size="13" font-weight="bold" fill="%23334155">1. 평가 개요</text>
  <text x="35" y="108" font-family="sans-serif" font-size="12" fill="%23475569">- 평가 대상: 1, 2, 3학년 전체</text>
  <text x="35" y="128" font-family="sans-serif" font-size="12" fill="%23475569">- 평가 기간: ${dPlus14} ~ ${format(addDays(today, 17), 'yyyy-MM-dd')}</text>
  
  <text x="25" y="160" font-family="sans-serif" font-size="13" font-weight="bold" fill="%23e11d48">2. 출제 원안 및 이원목적분류표 제출 일정 (엄수)</text>
  <rect x="25" y="172" width="550" height="95" fill="%23fff1f2" rx="4" stroke="%23fecdd3"/>
  <text x="40" y="196" font-family="sans-serif" font-size="12" font-weight="bold" fill="%239f1239">★ 최종 마감일: ${dPlus7} (금) 16:30까지 [교무기획부 제출]</text>
  <text x="40" y="218" font-family="sans-serif" font-size="12" fill="%23be123c">• 동교과 교사 교차 검토 및 윤문: ${dPlus3}까지 완료 권장</text>
  <text x="40" y="238" font-family="sans-serif" font-size="12" fill="%23be123c">• 원안 1차 작성 시작 권장: 오늘(${todayStr})부터 착수 요망</text>
  <text x="40" y="258" font-family="sans-serif" font-size="11" fill="%23881337">※ 인쇄실 인쇄 의뢰는 마감 3일 전 일괄 진행 예정</text>
  
  <text x="25" y="295" font-family="sans-serif" font-size="13" font-weight="bold" fill="%23334155">3. 담임 전달사항</text>
  <text x="35" y="318" font-family="sans-serif" font-size="12" fill="%23475569">- 조·종례 시 학생들에게 시험 범위 및 부정행위 예방 사전 안내 요망</text>
  
  <rect x="25" y="338" width="550" height="26" fill="%23f8fafc" rx="4"/>
  <text x="40" y="355" font-family="sans-serif" font-size="11" fill="%2364748b">발신: 교무기획부 평가계 | 기안자: 김평가 교사 | 접수일시: ${todayStr} 09:15</text>
</svg>`;

// 초기 캘린더 마감 일정
export const INITIAL_EVENTS: ScheduleEvent[] = [
  {
    id: 'evt-1',
    title: '2학기 1차 지필평가 출제원안 제출',
    date: dPlus7,
    category: 'exam',
    priority: 'urgent',
    description: '이원목적분류표 및 원안 교무부 평가계 제출 (기한 엄수)',
    sourceType: 'clipboard_image',
    sourceImage: SAMPLE_NOTICE_IMAGE,
    fileName: '지필평가_출제계획안_캡처.png',
    createdAt: todayStr,
  },
  {
    id: 'evt-2',
    title: '2학기 현장체험학습 안전관리계획 심의',
    date: dPlus14,
    category: 'document',
    priority: 'high',
    description: '학교운영위원회 심의 안건 서류 제출',
    sourceType: 'file_hwp',
    fileName: '2026_현장체험학습_추진계획.hwp',
    createdAt: todayStr,
  },
  {
    id: 'evt-3',
    title: '학교폭력 실태조사 결과 마감',
    date: format(addDays(today, 10), 'yyyy-MM-dd'),
    category: 'student',
    priority: 'medium',
    description: '나이스 온라인 실태조사 담임 확인',
    sourceType: 'manual',
    createdAt: todayStr,
  },
  {
    id: 'evt-4',
    title: '교직원 월례 장학협의회',
    date: format(addDays(today, 4), 'yyyy-MM-dd'),
    category: 'meeting',
    priority: 'medium',
    description: '도서관 1층 / 전교직원 참석',
    sourceType: 'manual',
    createdAt: todayStr,
  },
];

// 역산되어 생성된 To-Do 리스트 (오늘 날짜의 실행 태스크 포함)
export const INITIAL_TODOS: TodoItem[] = [
  {
    id: 'todo-1',
    eventId: 'evt-1',
    eventTitle: '2학기 1차 지필평가 출제원안 제출',
    title: '2학년 영어 지필평가 1~10번 문항 초안 출제',
    date: todayStr,
    deadlineDate: dPlus7,
    daysBefore: 7,
    isCompleted: false,
    priority: 'high',
    sourceImage: SAMPLE_NOTICE_IMAGE,
    tag: '출제',
    createdAt: todayStr,
  },
  {
    id: 'todo-2',
    eventId: 'evt-2',
    eventTitle: '2학기 현장체험학습 안전관리계획 심의',
    title: '수학여행 참가동의서 및 서약서 3-2반 수거',
    date: todayStr,
    isCompleted: false,
    priority: 'urgent',
    sourceImage: SAMPLE_NOTICE_IMAGE,
    tag: '조종례',
    createdAt: todayStr,
  },
  {
    id: 'todo-3',
    eventId: 'evt-1',
    eventTitle: '2학기 1차 지필평가 출제원안 제출',
    title: '동교과(이선생님)와 지필평가 교차 검토 및 윤문',
    date: dPlus3,
    deadlineDate: dPlus7,
    daysBefore: 4,
    isCompleted: false,
    priority: 'medium',
    sourceImage: SAMPLE_NOTICE_IMAGE,
    tag: '출제',
    createdAt: todayStr,
  },
  {
    id: 'todo-4',
    title: '동아리활동 일지 나이스(NEIS) 입력',
    date: todayStr,
    isCompleted: true,
    priority: 'low',
    tag: '공문',
    createdAt: todayStr,
  }
];

// 주간 시간표 데이터 (1~7교시)
export const INITIAL_TIMETABLE: WeeklyTimetable = {
  mon: [
    { period: 1, subject: '물리Ⅰ', className: '2-3', room: '과학실' },
    { period: 2, subject: '공강', className: '-' },
    { period: 3, subject: '물리Ⅰ', className: '2-1', room: '2-1교실' },
    { period: 4, subject: '물리Ⅰ', className: '2-4', room: '2-4교실' },
    { period: 5, subject: '진로', className: '2-3', room: '2-3교실' },
    { period: 6, subject: '동아리', className: '과학탐구반' },
    { period: 7, subject: '공강', className: '-' },
  ],
  tue: [
    { period: 1, subject: '물리Ⅰ', className: '2-2' },
    { period: 2, subject: '물리Ⅰ', className: '2-3' },
    { period: 3, subject: '공강', className: '-' },
    { period: 4, subject: '보강', className: '1-2', isSwapped: true, swapNote: '박선생님 병가 보강' },
    { period: 5, subject: '물리Ⅰ', className: '2-1' },
    { period: 6, subject: '자율활동', className: '3-2' },
    { period: 7, subject: '방과후', className: '심화물리' },
  ],
  wed: [
    { period: 1, subject: '공강', className: '-' },
    { period: 2, subject: '물리Ⅰ', className: '2-4' },
    { period: 3, subject: '물리Ⅰ', className: '2-2' },
    { period: 4, subject: '생활과과학', className: '3-2' },
    { period: 5, subject: '수업연구', className: '교무실' },
    { period: 6, subject: '공강', className: '-' },
    { period: 7, subject: '공강', className: '-' },
  ],
  thu: [
    { period: 1, subject: '물리Ⅰ', className: '2-1' },
    { period: 2, subject: '공강', className: '-' },
    { period: 3, subject: '물리Ⅰ', className: '2-3' },
    { period: 4, subject: '물리Ⅰ', className: '2-4' },
    { period: 5, subject: '창체/회의', className: '시청각실' },
    { period: 6, subject: '학급회의', className: '3-2' },
    { period: 7, subject: '진학상담', className: '3-2' },
  ],
  fri: [
    { period: 1, subject: '물리Ⅰ', className: '2-2' },
    { period: 2, subject: '물리Ⅰ', className: '2-1' },
    { period: 3, subject: '공강', className: '-' },
    { period: 4, subject: '생활과과학', className: '3-2' },
    { period: 5, subject: '스포츠클럽', className: '체육관' },
    { period: 6, subject: '학급자치', className: '3-2' },
    { period: 7, subject: '종례', className: '3-2' },
  ],
};

// 조·종례 전달사항
export const INITIAL_BRIEFINGS: MorningBriefingItem[] = [
  {
    id: 'brf-1',
    content: '수학여행 참가동의서 오늘 6교시까지 전원 제출 (미제출자 3명)',
    type: 'handout',
    isDone: false,
    date: todayStr,
  },
  {
    id: 'brf-2',
    content: '내일 3교시 전교생 지진대피훈련 (실내화 주머니 지참 금지)',
    type: 'safety',
    isDone: false,
    date: todayStr,
  },
  {
    id: 'brf-3',
    content: '급식 후 양치 지도 및 복도 우측통행 준수 강조',
    type: 'announcement',
    isDone: true,
    date: todayStr,
  }
];

// 발표 시연용 모의 AI 파싱 결과 (데모 버튼용)
export const DEMO_AI_PARSED: AIParsedResult = {
  title: '2학기 1차 지필평가 출제원안 제출',
  date: dPlus7,
  category: 'exam',
  priority: 'urgent',
  summary: '2학기 1차 지필평가 원안 및 이원목적분류표 교무기획부 제출 공문입니다.',
  studentNotice: '조·종례 시 학생들에게 시험 범위 및 부정행위 예방 교육 실시 요망',
  subTasks: [
    {
      title: '출제원안 1차 작성 시작 (1~10번 문항 완성)',
      daysBefore: 7,
      calculatedDate: todayStr,
    },
    {
      title: '동교과 교사 교차 검토 및 윤문 완료',
      daysBefore: 4,
      calculatedDate: dPlus3,
    },
    {
      title: '평가계 서류 최종 제출 및 인쇄실 의뢰 확인',
      daysBefore: 1,
      calculatedDate: format(addDays(today, 6), 'yyyy-MM-dd'),
    }
  ]
};
