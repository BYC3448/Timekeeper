import type { WeeklyTimetable } from './types';
import { format } from 'date-fns';

/**
 * 텍스트 내 개인정보 마스킹 (전화번호, 주민등록번호, 학생 이름 등)
 */
export function maskPersonalInfo(text: string): string {
  let masked = text.replace(/01[0-9]-?(\d{3,4})-?(\d{4})/g, '010-****-$2');
  masked = masked.replace(/(\d{6})-?[1-4]\d{6}/g, '$1-*******');
  return masked;
}

export interface ParsedItem {
  title: string;
  type: '고정' | '마감' | '시작가능' | '미정' | '확인만';
  date: string | null; // YYYY-MM-DD
  time?: string | null;
  endTime?: string | null;
  place?: string | null;
  category: '생기부' | '평가' | '행정' | '연수' | '상담' | '회의' | '수업' | '행사' | '기타';
  isMine: boolean;
  mineReason?: string;
  needsDate?: boolean;
  overdue?: boolean;
  movable?: boolean;
  steps?: string[];
  linkedTo?: string | null;
  note?: string | null;
  originalText?: string;
  confidence?: 'high' | 'low';
}

export interface ParseResultData {
  kind: '공문' | '업무지시' | '시간표' | '판단불가';
  items: ParsedItem[];
  timetable?: WeeklyTimetable | null;
  ignored: { text: string; reason: string }[];
  note?: string | null;
}

/**
 * Gemini API 호출 (요청 모델 실패 시 자동 fallback)
 */
async function callGeminiGenerate(params: {
  apiKey: string;
  preferredModel?: string;
  parts: any[];
  systemInstruction?: string;
}): Promise<string> {
  const { apiKey, preferredModel = 'gemini-2.5-flash', parts, systemInstruction } = params;

  const candidateModels = Array.from(new Set([
    preferredModel,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ]));

  let lastError: Error | null = null;

  for (const model of candidateModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const requestBody: any = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        response_mime_type: 'application/json',
      },
    };

    if (systemInstruction) {
      requestBody.system_instruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = errData?.error?.message || `HTTP ${response.status}`;
        if (response.status === 404 || msg.includes('not found') || msg.includes('unsupported')) {
          console.warn(`[Gemini] 모델 ${model} 없음. 다음 모델로 fallback 시도...`);
          lastError = new Error(`모델 ${model} 미지원: ${msg}`);
          continue;
        }
        throw new Error(msg);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('AI 분석 결과 텍스트가 비어 있습니다.');
      }
      return rawText;
    } catch (err: any) {
      lastError = err;
      if (err.message && (err.message.includes('404') || err.message.includes('not found'))) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('모든 Gemini 모델 호출에 실패했습니다.');
}

/**
 * 파싱프롬프트.md의 공식 지시문으로 분석 실행
 */
export async function parseTeacherInboxWithGemini(params: {
  apiKey: string;
  model?: string;
  imageFileBase64?: string;
  mimeType?: string;
  textContent?: string;
  teacherContext?: {
    today?: string;
    subject?: string;
    duty?: string;
    timetableText?: string;
  };
}): Promise<ParseResultData> {
  const {
    apiKey,
    model = 'gemini-3.5-flash',
    imageFileBase64,
    mimeType = 'image/png',
    textContent,
    teacherContext = {},
  } = params;

  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. 상단 [설정]에서 API 키를 입력해 주세요.');
  }

  const todayStr = teacherContext.today || format(new Date(), 'yyyy-MM-dd');
  const subjectStr = teacherContext.subject || '2학년 역학과 에너지, 3학년 물리학Ⅱ';
  const dutyStr = teacherContext.duty || '과학과 교사, 담임 아님';
  const timetableStr = teacherContext.timetableText || '월: 4교시(3-10), 5교시(2-8) / 화: 1교시(2-10), 5교시(3-12), 7교시(3-10) / 수: 1교시(2-10), 3교시(3-10), 5교시(2-8), 6교시(3-12) / 목: 1교시(2-10), 3교시(3-12) / 금: 1교시(2-8), 5교시(동아리), 6교시(동아리)';

  // 파싱프롬프트.md 공식 본문
  const systemInstruction = `당신은 한국 고등학교 교사의 업무 비서입니다.
선생님이 건네준 자료에서 "선생님이 행동해야 할 일"과 그 날짜를 뽑아냅니다.

자료는 메신저 메시지, 카카오톡 캡처 이미지, 공문 PDF, 학교 교무업무자료,
시간표 사진, 복사한 텍스트 등 무엇이든 올 수 있습니다.


# 선생님 정보 (★ '내 일(isMine)' 여부 판단의 핵심 기준)

- 오늘 날짜: ${todayStr}
- 교사 프로필: ${dutyStr}
- 담당 과목 및 학년: ${subjectStr}
- 시간표:
${timetableStr}


# 1단계 — 자료가 무엇인지 먼저 판단하십시오

- 시간표    → 주간 시간표로 읽어 timetable 로 출력
  ★ [시간표 추출 엄격 규칙]:
  - subject: 반드시 실제 "교과목명"(예: 물리학Ⅰ, 통합과학, 영어, 국어, 수학, 화학, 진로 등)이어야 합니다.
    절대로 "2학년", "1학년", "3학년" 같은 학년 명칭만 달랑 subject에 넣지 마십시오!
  - className: "학급/반"(예: 2-3, 3-10, 1-1 또는 2학년 3반)을 넣으십시오.
  - 만약 시간표 칸에 '2-3 물리'라고 되어 있다면 subject="물리", className="2-3" 입니다.
- 업무 지시 → 아래 2단계로 진행
- 공문 / 주간업무자료 → 아래 2단계로 진행
- 판단 불가 → items 를 비우고 note 에 이유를 적으십시오


# 2단계 — 항목마다 유형을 판단하십시오

고정      날짜와 시각이 정해져 있고 선생님이 옮길 수 없는 것.
          회의, 연수, 수업 공개, 야간자율학습 감독, 행사, 출장.

마감      그날까지 끝내야 하는 것.
          생기부 입력, 교과세특, 출제 원안, 결석계, 신청서 제출.

시작가능  "○일 이후 가능", "○이 끝난 뒤에" 처럼 그날부터 할 수 있게 되는 것.
          ★ 마감이 아닙니다. 절대 혼동하지 마십시오.
          예: "9월 11일 이후 입력 가능합니다" → 9월 11일은 시작가능일

미정      해야 하는 일인데 날짜가 없는 것.
          date 를 null 로 두고 needsDate 를 true 로 하십시오.

확인만    읽고 알아두면 되는 것. 할 일이 생기지 않습니다.
          보강 안내, 명단 확인 요청, 결과 발표 예정 안내.


# 3단계 — 날짜 고르기 (가장 중요)

자료에 날짜가 여러 개 있으면 **선생님이 행동해야 하는 날짜만** 남깁니다.
나머지는 ignored 에 이유와 함께 적으십시오. 지우지 말고 남겨 두십시오.

## 반드시 버릴 것
- 공문 번호 옆의 날짜 — "교육연수부-1427(2026. 7. 21.)"
- 시행일, 접수일, 결재일, 기안일
- "관련" 항목에 나열된 근거 문서의 날짜

## 반드시 남길 것
- 신청 마감 · 제출 마감  ← 대개 이것이 가장 중요합니다
- 선생님이 참석하는 행사의 일시
- 결과 발표일 (유형은 "확인만")

## 이미 지난 날짜
오늘(${todayStr})보다 이전 날짜라도 버리지 말고 남기되,
overdue 를 true 로 표시하십시오.


# 4단계 — 선생님의 일인지 엄격히 판단하십시오 (주간 업무자료 필터링 핵심)

주간 업무자료나 공문에는 학교 전체의 수십 가지 업무가 나열되어 있습니다.
선생님의 교사 프로필(${dutyStr}, ${subjectStr})과 비교하여 철저히 판단하십시오:

1. 담임 여부:
   - 3학년 담임인 경우: "수능 응시원서 접수", "3학년 대입 상담", "수시 원서 접수", "3학년 졸업앨범 사진 촬영" 등은 100% isMine: true 입니다.
   - 반대로 1학년 자유학기제, 2학년 수학여행 등 타 학년 전용 업무는 isMine: false 입니다.
2. 부서 및 직책(보직):
   - "진로진학부", "교무기획부" 등 소속 부서 업무는 isMine: true 입니다.
   - "예산 추경", "교과교구 구입 신청" 등 교과주임/부서 예산 업무는 isMine: true 입니다.
3. 담당 과목:
   - 담당 과목(물리학, 과학 등)의 출제, 채점, 생기부 세특은 isMine: true 입니다.
4. 전 교직원 공통:
   - 교직원 회의, 법정의무연수, 개교기념일 등은 isMine: true 입니다.

★ mineReason 에는 반드시 "선생님이 3학년 담임이므로", "과학과 교과주임 담당 업무이므로" 처럼 명확한 이유를 1줄로 작성하십시오.


# 5단계 — 여러 단계로 된 일

하나의 일을 끝내려면 여러 단계를 거쳐야 하는 경우,
steps 에 단계를 나누어 적으십시오. 자료에 적힌 단계만 옮기고, 없는 단계를 지어내지 마십시오.


# 절대 하지 말 것

1. 이 일이 며칠 걸리는지, 언제 시작해야 하는지 판단하지 마십시오. 소요 기간을 추측해 적지 마십시오.
2. 자료에 없는 날짜를 만들어내지 마십시오. 날짜가 없으면 유형을 "미정"으로 두십시오.
3. 학생 이름, 학부모 이름, 전화번호는 그대로 옮기지 마십시오. (홍○○ / 010-****-5678)
4. 확실하지 않은 것을 확실한 것처럼 쓰지 마십시오. 애매하면 confidence 를 "low" 로 하십시오.


# 출력 형식 (반드시 아래 순수 JSON 포맷으로만 답하십시오)

{
  "kind": "공문" | "업무지시" | "시간표" | "판단불가",
  "items": [
    {
      "title": "짧고 행동이 드러나는 제목",
      "type": "고정" | "마감" | "시작가능" | "미정" | "확인만",
      "date": "YYYY-MM-DD 또는 null",
      "time": "HH:MM 또는 null",
      "endTime": "HH:MM 또는 null",
      "place": "장소 또는 null",
      "category": "생기부" | "평가" | "행정" | "연수" | "상담" | "회의" | "수업" | "기타",
      "isMine": true,
      "mineReason": "2학년 역학과 에너지 담당 등",
      "needsDate": false,
      "overdue": false,
      "movable": false,
      "steps": ["1단계", "2단계"],
      "linkedTo": null,
      "note": "비고",
      "originalText": "원문 한 줄",
      "confidence": "high" | "low"
    }
  ],
  "timetable": null,
  "ignored": [
    { "text": "제외된 날짜 또는 문구", "reason": "근거 문서 번호 / 접수일 등" }
  ],
  "note": null
}

만약 시간표(컴시간/나이스)라면 kind: "시간표" 로 하고 timetable 에 요일별(mon, tue, wed, thu, fri) 슬롯 배열을 채우십시오.`;

  const parts: any[] = [];
  if (imageFileBase64) {
    const pureBase64 = imageFileBase64.includes('base64,')
      ? imageFileBase64.split('base64,')[1]
      : imageFileBase64;
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: pureBase64,
      },
    });
  }

  let promptText = `다음 자료를 분석하여 일정을 뽑아주세요.`;
  if (textContent) {
    promptText += `\n\n[선생님이 던진 자료]\n${maskPersonalInfo(textContent)}`;
  }
  parts.push({ text: promptText });

  const rawText = await callGeminiGenerate({
    apiKey,
    preferredModel: model,
    parts,
    systemInstruction,
  });

  try {
    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed: ParseResultData = JSON.parse(cleaned);
    return parsed;
  } catch (err) {
    console.error('JSON 파싱 오류:', rawText, err);
    throw new Error('AI 분석 결과를 JSON으로 변환하는 데 실패했습니다.');
  }
}
