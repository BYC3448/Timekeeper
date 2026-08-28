# 🏫 티처스케줄 (T-Cal) — Svelte + Firebase + Netlify

선생님이 공문, 메신저 캡처, 텍스트를 던지면 AI가 일정과 To-Do를 역산하여 캘린더와 오늘 할 일에 자동 등록해 주는 **교사용 스마트 일정 인박스 웹 애플리케이션**입니다.

---

## ⚡ 기술 스택 (Tech Stack)

- **Frontend**: Svelte 4 / Vite / TypeScript
- **Styling**: TailwindCSS / PostCSS
- **Icons**: Lucide-Svelte
- **Cloud Database**: Firebase Cloud Firestore (오프라인/로컬스토리지 자동 하이브리드 지원)
- **Deployment**: Netlify (`netlify.toml` SPA 배포 설정 완비)
- **AI Engine**: Google Gemini API (`gemini-3.5-flash` 및 모델 자동 폴백)

---

## 🚀 로컬 실행 방법 (3단계)

### 1. 패키지 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```

### 3. 브라우저 접속
- 브라우저 주소창에 `http://localhost:3000` 입력

---

## 🌐 Netlify 배포 가이드 (One-Click Deploy)

프로젝트 루트에 `netlify.toml`이 구성되어 있어 Netlify에 Git 리포지토리를 연결하면 별도 설정 없이 자동 배포됩니다.

### Netlify 빌드 설정
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Redirects / SPA Routing**: `/* -> /index.html 200` (`netlify.toml`에 사전 구성됨)

---

## 🔥 Firebase 연동 설정 (선택 사항)

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트를 생성하고 **Cloud Firestore** 데이터베이스를 시작합니다.
2. 웹 앱(`</>`)을 등록하고 제공되는 설정 정보를 확인합니다.
3. 앱 상단 우측 **[설정]** 버튼 -> **[Firebase 연동]** 탭에서 `Project ID`, `API Key`, `App ID`를 입력하거나, 루트 디렉터리에 `.env` 파일을 생성하여 아래와 같이 설정합니다:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
```

> **참고**: Firebase 설정을 입력하지 않아도 브라우저 로컬 스토리지(`localStorage`)를 통해 100% 정상 작동하며, 발표 시연 데모도 자유롭게 실행할 수 있습니다.

---

## 💡 주요 기능

1. **글로벌 인박스 (Ctrl + V / 드래그앤드롭 / 텍스트 입력)**:
   - 화면 어디서나 스크린샷 캡처 붙여넣기(`Ctrl+V`), HWP/PDF/이미지 파일 끌어다 놓기
2. **AI 교사 비서 일정 분석 & To-Do 역산**:
   - `인수인계.md` 및 `파싱프롬프트.md` 공식 교사 비서 프롬프트 내장
   - 최종 마감일 기준 D-N일 전 실행 태스크 자동 역산
   - 교사 프로필(담임 학급, 담당 교과, 부서/보직) 기준 내 일(`isMine`) 자동 필터링
3. **오늘의 교무 데스크 (Today Dashboard)**:
   - 1~7교시 주간 시간표 위젯
   - 아침 조·종례 체크리스트
   - 오늘 실행할 To-Do (진행도 바, 이월 태스크, 폭죽 효과)
   - 다가오는 마감 D-Day 카운트다운
4. **월간 학사 캘린더 (Month Calendar)**:
   - 평가/출제, 공문/기안, 학생/상담, 회의/연수, 교내행사별 색상 배지
   - 클릭 시 원본 공문 뷰어(HWP, PDF, 스크린샷, 텍스트) 즉시 확인
5. **실수 방지 및 복구 (6초 Undo 되살리기)**:
   - 실수로 할 일을 지웠을 때 되살리기 토스트 제공
