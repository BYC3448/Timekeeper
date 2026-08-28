<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Calendar, Settings, Clock, Sparkles, RefreshCw, Cloud, LayoutDashboard, CalendarDays } from 'lucide-svelte';

  export let schoolName: string = '새솔고등학교';
  export let teacherName: string = '김선생님';
  export let hasApiKey: boolean = false;
  export let firebaseConnected: boolean = false;
  export let activePage: 'today' | 'calendar' = 'today';

  const dispatch = createEventDispatcher<{
    openSettings: void;
    openTimetable: void;
    runDemo: void;
    resetData: void;
    changePage: 'today' | 'calendar';
  }>();
</script>

<header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
    <!-- 로고 & 타이틀 -->
    <div class="flex items-center space-x-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
        <Calendar class="w-6 h-6" />
      </div>
      <div>
        <div class="flex items-center space-x-2">
          <h1 class="text-xl font-black tracking-tight text-slate-900">
            T-Cal <span class="text-blue-600 font-semibold text-base">티처스케줄</span>
          </h1>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
            AI 교무 비서
          </span>
          {#if firebaseConnected}
            <span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200" title="Firebase Firestore 클라우드 동기화 활성화됨">
              <Cloud class="w-3 h-3 text-emerald-600" />
              <span class="hidden md:inline">Cloud Sync</span>
            </span>
          {/if}
        </div>
        <p class="text-xs text-slate-500 hidden sm:block">
          {schoolName} · {teacherName}
        </p>
      </div>
    </div>

    <!-- 2개 페이지 네비게이션 탭 (중앙) -->
    <nav class="flex items-center space-x-1 p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl shadow-inner">
      <button
        type="button"
        on:click={() => dispatch('changePage', 'today')}
        class={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          activePage === 'today'
            ? 'bg-white text-blue-600 shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
        }`}
      >
        <LayoutDashboard class="w-4 h-4 {activePage === 'today' ? 'text-blue-600' : 'text-slate-400'}" />
        <span>오늘 하루</span>
      </button>

      <button
        type="button"
        on:click={() => dispatch('changePage', 'calendar')}
        class={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          activePage === 'calendar'
            ? 'bg-white text-blue-600 shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
        }`}
      >
        <CalendarDays class="w-4 h-4 {activePage === 'calendar' ? 'text-blue-600' : 'text-slate-400'}" />
        <span>학사 캘린더</span>
      </button>
    </nav>

    <!-- 우측 액션 버튼들 -->
    <div class="flex items-center space-x-2">
      <!-- 해커톤 시연용 원클릭 데모 버튼 -->
      <button
        type="button"
        on:click={() => dispatch('runDemo')}
        class="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-xs font-semibold shadow hover:from-amber-600 hover:to-orange-600 transition active:scale-95 cursor-pointer"
        title="지필평가 출제 공문 스크린샷 시연 (심사위원 발표용)"
      >
        <Sparkles class="w-3.5 h-3.5 animate-spin text-amber-100" style="animation-duration: 3s;" />
        <span>시연용 공문 투척</span>
      </button>

      <!-- 시간표 버튼 -->
      <button
        type="button"
        on:click={() => dispatch('openTimetable')}
        class="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition active:scale-95 cursor-pointer"
      >
        <Clock class="w-3.5 h-3.5 text-slate-600" />
        <span class="hidden sm:inline">내 시간표</span>
      </button>

      <!-- 설정 버튼 -->
      <button
        type="button"
        on:click={() => dispatch('openSettings')}
        class={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 border cursor-pointer ${
          hasApiKey
            ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 animate-bounce'
        }`}
      >
        <Settings class="w-3.5 h-3.5" />
        <span>{hasApiKey ? '설정' : 'API 키 등록'}</span>
      </button>

      <!-- 리셋 버튼 -->
      <button
        type="button"
        on:click={() => dispatch('resetData')}
        title="초기 샘플 데이터로 복원"
        class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
      >
        <RefreshCw class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</header>

