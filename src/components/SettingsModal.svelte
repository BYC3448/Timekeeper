<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X, Key, Shield, School, User, RotateCcw, Check, ExternalLink, Cloud, Database } from 'lucide-svelte';
  import type { AppSettings } from '../lib/storage';

  export let isOpen: boolean = false;
  export let settings: AppSettings | null = null;

  const dispatch = createEventDispatcher<{
    close: void;
    save: AppSettings;
    resetData: void;
  }>();

  let geminiApiKey = '';
  let autoMask = true;
  let schoolName = '새솔고등학교';
  let teacherName = '김선생님';
  let homeroomClass = '3학년 2반';
  let department = '진로진학부, 과학과 교과주임';
  let subjects = '2학년 물리학Ⅰ, 3학년 생활과 과학';
  let extraDuties = '수능 응시원서 접수 총괄, 과학교구 예산 추경 관리';

  // Firebase 설정
  let firebaseApiKey = '';
  let firebaseProjectId = '';
  let firebaseAppId = '';
  let firebaseAuthDomain = '';
  let useCloudSync = false;

  let activeTab: 'gemini' | 'firebase' | 'profile' = 'gemini';
  let savedToast = false;

  $: if (isOpen && settings) {
    geminiApiKey = settings.geminiApiKey || '';
    autoMask = settings.autoMaskPersonalInfo ?? true;
    schoolName = settings.schoolName || '새솔고등학교';
    teacherName = settings.teacherName || '김선생님';
    homeroomClass = settings.profile?.homeroomClass || '3학년 2반';
    department = settings.profile?.department || '진로진학부, 과학과 교과주임';
    subjects = settings.profile?.subjects || '2학년 물리학Ⅰ, 3학년 생활과 과학';
    extraDuties = settings.profile?.extraDuties || '수능 응시원서 접수 총괄, 과학교구 예산 추경 관리';

    firebaseApiKey = settings.firebaseConfig?.apiKey || '';
    firebaseProjectId = settings.firebaseConfig?.projectId || '';
    firebaseAppId = settings.firebaseConfig?.appId || '';
    firebaseAuthDomain = settings.firebaseConfig?.authDomain || '';
    useCloudSync = settings.firebaseConfig?.useCloudSync || false;
  }

  function handleSave() {
    dispatch('save', {
      geminiApiKey: geminiApiKey.trim(),
      autoMaskPersonalInfo: autoMask,
      schoolName: schoolName.trim(),
      teacherName: teacherName.trim(),
      profile: {
        schoolName: schoolName.trim(),
        teacherName: teacherName.trim(),
        isHomeroom: !!homeroomClass && !homeroomClass.includes('아님'),
        homeroomClass: homeroomClass.trim(),
        department: department.trim(),
        position: department.trim(),
        subjects: subjects.trim(),
        extraDuties: extraDuties.trim(),
      },
      firebaseConfig: {
        apiKey: firebaseApiKey.trim(),
        projectId: firebaseProjectId.trim(),
        appId: firebaseAppId.trim(),
        authDomain: firebaseAuthDomain.trim(),
        useCloudSync,
      },
    });

    savedToast = true;
    setTimeout(() => {
      savedToast = false;
      dispatch('close');
    }, 600);
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
    <div class="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
      <!-- 상단 헤더 -->
      <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
        <div class="flex items-center space-x-2.5">
          <div class="p-2 bg-blue-600/30 rounded-xl">
            <Key class="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 class="text-base font-bold">환경 설정</h2>
            <p class="text-xs text-slate-400">Gemini AI · Firebase 클라우드 · 교사 프로필</p>
          </div>
        </div>
        <button
          type="button"
          on:click={() => dispatch('close')}
          class="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 탭 네비게이션 -->
      <div class="flex items-center border-b border-slate-200 bg-slate-50 px-6 pt-2">
        <button
          type="button"
          on:click={() => (activeTab = 'gemini')}
          class={`px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'gemini'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Key class="w-3.5 h-3.5" />
          <span>Gemini AI 키</span>
        </button>
        <button
          type="button"
          on:click={() => (activeTab = 'firebase')}
          class={`px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'firebase'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Cloud class="w-3.5 h-3.5" />
          <span>Firebase 연동</span>
        </button>
        <button
          type="button"
          on:click={() => (activeTab = 'profile')}
          class={`px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User class="w-3.5 h-3.5" />
          <span>교사 프로필</span>
        </button>
      </div>

      <!-- 탭 본문 -->
      <div class="p-6 overflow-y-auto flex-1 space-y-5">
        <!-- 1. Gemini AI 설정 -->
        {#if activeTab === 'gemini'}
          <div class="space-y-4">
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label for="gemini-key-input" class="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <Key class="w-3.5 h-3.5 text-blue-600" />
                  <span>Google Gemini API Key</span>
                  <span class="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono font-semibold">
                    gemini-3.5-flash
                  </span>
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  class="text-[11px] text-blue-600 hover:underline flex items-center space-x-0.5"
                >
                  <span>무료 키 발급받기</span>
                  <ExternalLink class="w-3 h-3" />
                </a>
              </div>
              <input
                id="gemini-key-input"
                type="password"
                bind:value={geminiApiKey}
                placeholder="AIzaSy..."
                class="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
              />
              <p class="text-[11px] text-slate-500 mt-1">
                API 키는 브라우저 로컬 저장소에만 안전하게 보관되며 외부 서버로 전송되지 않습니다.
              </p>
            </div>

            <!-- 개인정보 자동 마스킹 옵션 -->
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start space-x-3">
              <input
                id="mask-checkbox"
                type="checkbox"
                bind:checked={autoMask}
                class="mt-0.5 w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
              <div>
                <label for="mask-checkbox" class="text-xs font-bold text-slate-800 cursor-pointer flex items-center space-x-1">
                  <Shield class="w-3.5 h-3.5 text-emerald-600" />
                  <span>학생/학부모 개인정보 자동 마스킹 활성화</span>
                </label>
                <p class="text-[11px] text-slate-500 mt-0.5">
                  AI 분석 전 전화번호, 주민등록번호 등을 자동으로 <code class="text-blue-600">010-****-1234</code> 형태로 가립니다.
                </p>
              </div>
            </div>
          </div>
        {/if}

        <!-- 2. Firebase 연동 설정 -->
        {#if activeTab === 'firebase'}
          <div class="space-y-4">
            <div class="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <p class="font-bold mb-0.5 flex items-center space-x-1">
                <Database class="w-4 h-4 text-amber-600" />
                <span>Firebase Firestore 클라우드 동기화 (선택 사항)</span>
              </p>
              <p class="text-[11px] text-amber-800">
                Firebase 설정을 입력하시면 여러 기기나 브라우저에서 일정이 실시간 동기화됩니다. 비워두시면 브라우저 로컬 저장소로 안전하게 작동합니다.
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="fb-project-id" class="text-[11px] font-bold text-slate-700 block mb-1">Project ID</label>
                <input
                  id="fb-project-id"
                  type="text"
                  bind:value={firebaseProjectId}
                  placeholder="my-teacher-schedule"
                  class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label for="fb-api-key" class="text-[11px] font-bold text-slate-700 block mb-1">Firebase API Key</label>
                <input
                  id="fb-api-key"
                  type="password"
                  bind:value={firebaseApiKey}
                  placeholder="AIzaSy..."
                  class="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label for="fb-app-id" class="text-[11px] font-bold text-slate-700 block mb-1">App ID</label>
                <input
                  id="fb-app-id"
                  type="text"
                  bind:value={firebaseAppId}
                  placeholder="1:123456789:web:abcdef"
                  class="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label for="fb-auth-domain" class="text-[11px] font-bold text-slate-700 block mb-1">Auth Domain (선택)</label>
                <input
                  id="fb-auth-domain"
                  type="text"
                  bind:value={firebaseAuthDomain}
                  placeholder="my-app.firebaseapp.com"
                  class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        {/if}

        <!-- 3. 교사 프로필 개인화 설정 -->
        {#if activeTab === 'profile'}
          <div class="space-y-4">
            <div class="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 text-xs text-blue-900">
              💡 <strong>"내 일(isMine)"</strong> 여부를 AI가 판단할 때 아래 프로필을 기준으로 타 학년/타 부서 업무를 자동으로 걸러냅니다.
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="teacher-school-name" class="text-[11px] font-bold text-slate-700 block mb-1">소속 학교</label>
                <input
                  id="teacher-school-name"
                  type="text"
                  bind:value={schoolName}
                  class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label for="teacher-name-input" class="text-[11px] font-bold text-slate-700 block mb-1">교사 성명</label>
                <input
                  id="teacher-name-input"
                  type="text"
                  bind:value={teacherName}
                  class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label for="teacher-homeroom" class="text-[11px] font-bold text-slate-700 block mb-1">담임 학급 (비담임은 '비담임')</label>
                <input
                  id="teacher-homeroom"
                  type="text"
                  bind:value={homeroomClass}
                  placeholder="예: 3학년 2반"
                  class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label for="teacher-dept" class="text-[11px] font-bold text-slate-700 block mb-1">소속 부서 / 직책</label>
                <input
                  id="teacher-dept"
                  type="text"
                  bind:value={department}
                  placeholder="예: 진로진학부, 과학과 교과주임"
                  class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label for="teacher-subjects" class="text-[11px] font-bold text-slate-700 block mb-1">담당 과목</label>
              <input
                id="teacher-subjects"
                type="text"
                bind:value={subjects}
                placeholder="예: 2학년 물리학Ⅰ, 3학년 생활과 과학"
                class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label for="teacher-extra" class="text-[11px] font-bold text-slate-700 block mb-1">주요 담당 분장 업무</label>
              <input
                id="teacher-extra"
                type="text"
                bind:value={extraDuties}
                placeholder="예: 수능 응시원서 접수 총괄, 과학교구 예산 추경 관리"
                class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        {/if}
      </div>

      <!-- 하단 액션 바 -->
      <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
        <button
          type="button"
          on:click={() => {
            if (confirm('모든 일정 및 시간표 데이터를 초기 예시 상태로 복구할까요?')) {
              dispatch('resetData');
            }
          }}
          class="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition flex items-center space-x-1 cursor-pointer"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          <span>데이터 초기화</span>
        </button>

        <div class="flex items-center space-x-2">
          {#if savedToast}
            <span class="text-xs text-emerald-600 font-bold flex items-center space-x-1">
              <Check class="w-4 h-4" />
              <span>저장되었습니다!</span>
            </span>
          {/if}
          <button
            type="button"
            on:click={handleSave}
            class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
          >
            <Check class="w-4 h-4" />
            <span>설정 저장</span>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
