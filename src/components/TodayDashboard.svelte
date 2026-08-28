<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import {
    CheckCircle2,
    Circle,
    Clock,
    AlertTriangle,
    FileSearch,
    Plus,
    Trash2,
    Megaphone,
    Sparkles,
    Calendar,
    ChevronRight,
  } from 'lucide-svelte';
  import { format, differenceInDays, parseISO } from 'date-fns';
  import { ko } from 'date-fns/locale';
  import confetti from 'canvas-confetti';
  import type { TodoItem, ScheduleEvent, WeeklyTimetable, MorningBriefingItem, DayOfWeek } from '../lib/types';

  export let selectedDate: Date = new Date();
  export let todos: TodoItem[] = [];
  export let events: ScheduleEvent[] = [];
  export let timetable: WeeklyTimetable | null = null;
  export let briefings: MorningBriefingItem[] = [];

  const dispatch = createEventDispatcher<{
    toggleTodo: string;
    deleteTodo: string;
    addTodo: { title: string; tag?: TodoItem['tag'] };
    toggleBriefing: string;
    addBriefing: string;
    viewSource: {
      title: string;
      sourceImage?: string;
      sourceText?: string;
      date?: string;
      fileName?: string;
      category?: string;
    };
    openTimetableModal: void;
  }>();

  let newTodoText = '';
  let newBriefingText = '';
  let todayEventsAsTodos: TodoItem[] = [];

  $: safeEvents = Array.isArray(events) ? events : [];
  $: safeTodos = Array.isArray(todos) ? todos : [];
  $: safeBriefings = Array.isArray(briefings) ? briefings : [];

  $: selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  $: isToday = selectedDateStr === todayStr;

  // 현재 요일 (시간표 조회용)
  const dayNames: DayOfWeek[] = ['mon', 'mon', 'tue', 'wed', 'thu', 'fri', 'mon'];
  $: dayIndex = selectedDate.getDay();
  $: currentDayKey = dayNames[dayIndex] || 'mon';
  $: rawSlots = timetable?.[currentDayKey] || [];
  $: todaySlots = [1, 2, 3, 4, 5, 6, 7].map((p) => {
    const found = Array.isArray(rawSlots) ? rawSlots.find((s) => s?.period === p) : undefined;
    return found || { period: p, subject: '공강', className: '-' };
  });

  // 오늘 날짜로 잡혀있는 이벤트가 있다면, 가운데 To-Do 목록에 자동 통합
  $: todayEventsAsTodos = safeEvents
    .filter((e) => e && e.date === todayStr && !safeTodos.some((t) => t.eventId === e.id || t.title === e.title))
    .map((e): TodoItem => ({
      id: `todo-evt-${e.id}`,
      eventId: e.id,
      eventTitle: e.title,
      title: e.title,
      date: todayStr,
      deadlineDate: e.date,
      isCompleted: false,
      priority: e.priority,
      tag: (e.category === 'exam' ? '출제' : '공문') as TodoItem['tag'],
      sourceImage: e.sourceImage,
      sourceText: e.sourceText,
      fileName: e.fileName,
      createdAt: e.createdAt,
      isRollover: false,
    }));

  $: targetTodos = isToday
    ? [
        // 1. 오늘 날짜로 등록된 업무/이벤트 (가운데 To-Do로 직행)
        ...todayEventsAsTodos,
        // 2. 과거 날짜의 미완료 할 일 (자동 이월)
        ...safeTodos
          .filter((t) => t && t.date && t.date < todayStr && !t.isCompleted)
          .map((t) => ({ ...t, isRollover: true })),
        // 3. 오늘 날짜의 할 일
        ...safeTodos.filter((t) => t && t.date === todayStr),
      ]
    : safeTodos.filter((t) => t && t.date === selectedDateStr);

  $: completedCount = targetTodos.filter((t) => t?.isCompleted).length;
  $: progressPercent =
    targetTodos.length > 0 ? Math.round((completedCount / targetTodos.length) * 100) : 0;

  // 다가오는 마감일 (우측 3열: 내일부터 마감인 미래의 마감만 D-1, D-2, D-7로 표시)
  $: upcomingDeadlines = safeEvents
    .filter((e) => e && e.date && e.date > todayStr)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  function handleTodoClick(todo: TodoItem) {
    dispatch('toggleTodo', todo.id);
    if (!todo.isCompleted) {
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.8 },
      });
    }
  }

  function handleAddTodoSubmit() {
    if (!newTodoText.trim()) return;
    dispatch('addTodo', { title: newTodoText.trim(), tag: '일반' });
    newTodoText = '';
  }

  function handleAddBriefingSubmit() {
    if (!newBriefingText.trim()) return;
    dispatch('addBriefing', newBriefingText.trim());
    newBriefingText = '';
  }

  function getDaysUntil(dateStr: string): number {
    try {
      return differenceInDays(parseISO(dateStr), today);
    } catch {
      return 0;
    }
  }

  function getTagColor(tag?: string): string {
    switch (tag) {
      case '출제':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case '조종례':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case '공문':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case '상담':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case '수업':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }
</script>

<div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
  <!-- ================= 1열 (좌측 4컬럼): 수업 & 학급 (아침 루틴) ================= -->
  <div class="lg:col-span-4 space-y-4">
    <!-- 1. 오늘의 시간표 (컴시간 연동 위젯) -->
    <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <div class="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <Clock class="w-4 h-4" />
          </div>
          <h2 class="font-bold text-sm text-slate-800">
            {format(selectedDate, 'M월 d일 (EEEE)', { locale: ko })} 시간표
          </h2>
        </div>
        <button
          type="button"
          on:click={() => dispatch('openTimetableModal')}
          class="text-xs text-blue-600 hover:text-blue-700 font-semibold transition cursor-pointer"
        >
          시간표 변경/교체
        </button>
      </div>

      <div class="grid grid-cols-7 gap-1.5 text-center">
        {#each todaySlots as slot}
          <div
            class={`p-2 rounded-xl border text-xs flex flex-col justify-between min-h-[72px] transition ${
              slot.subject === '공강'
                ? 'bg-slate-50 border-slate-100 text-slate-400'
                : slot.isSwapped
                ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-200/60 font-semibold'
                : 'bg-blue-50/70 border-blue-200/80 text-blue-900 font-semibold'
            }`}
          >
            <span class="text-[10px] text-slate-500 font-mono font-bold block mb-1">
              {slot.period}교시
            </span>
            <div class="truncate font-bold text-xs">
              {slot.subject}
            </div>
            <div class="text-[10px] text-slate-500 truncate mt-0.5">
              {slot.className}
            </div>
            {#if slot.isSwapped}
              <span class="text-[9px] bg-amber-200 text-amber-800 rounded px-1 mt-1 font-bold truncate" title={slot.swapNote}>
                보강/교체
              </span>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- 2. 조·종례 전달사항 (아침 학급 브리핑) -->
    <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <div class="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
            <Megaphone class="w-4 h-4" />
          </div>
          <div>
            <h2 class="font-bold text-sm text-slate-800">조·종례 전달사항</h2>
            <p class="text-[11px] text-slate-500">학생들에게 알릴 전달사항 체크리스트</p>
          </div>
        </div>
      </div>

      <div class="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1">
        {#if safeBriefings.length === 0}
          <div class="py-6 text-center text-xs text-slate-400">
            등록된 조·종례 전달사항이 없습니다.
          </div>
        {:else}
          {#each safeBriefings as b}
            <div
              class={`flex items-start space-x-2.5 p-2.5 rounded-xl border text-xs transition ${
                b.isDone ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-amber-50/40 border-amber-200 text-slate-800'
              }`}
            >
              <button
                type="button"
                on:click={() => dispatch('toggleBriefing', b.id)}
                class="mt-0.5 text-slate-400 hover:text-amber-600 transition flex-shrink-0 cursor-pointer"
              >
                {#if b.isDone}
                  <CheckCircle2 class="w-4 h-4 text-emerald-600" />
                {:else}
                  <Circle class="w-4 h-4" />
                {/if}
              </button>
              <span class={`flex-1 leading-relaxed ${b.isDone ? 'line-through' : 'font-medium'}`}>
                {b.content}
              </span>
            </div>
          {/each}
        {/if}
      </div>

      <!-- 전달사항 빠른 추가 폼 -->
      <form on:submit|preventDefault={handleAddBriefingSubmit} class="flex items-center space-x-2">
        <input
          type="text"
          bind:value={newBriefingText}
          placeholder="조·종례 전달사항 입력..."
          class="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-none"
        />
        <button
          type="submit"
          disabled={!newBriefingText.trim()}
          class="p-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl transition cursor-pointer"
        >
          <Plus class="w-4 h-4" />
        </button>
      </form>
    </div>
  </div>

  <!-- ================= 2열 (가운데 5컬럼): 오늘 꼭 실행할 To-Do ================= -->
  <div class="lg:col-span-5 space-y-4">
    <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
      <!-- 헤더 & 진행도 바 -->
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center space-x-2">
          <div class="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Sparkles class="w-4 h-4" />
          </div>
          <div>
            <h2 class="font-bold text-base text-slate-900">
              {isToday ? '오늘 꼭 해야 할 일' : `${format(selectedDate, 'M월 d일')} 할 일`}
            </h2>
            <p class="text-xs text-slate-500">
              {completedCount}개 완료 / 총 {targetTodos.length}개 태스크
            </p>
          </div>
        </div>

        <span class="text-sm font-black text-indigo-600">
          {progressPercent}%
        </span>
      </div>

      <!-- 프로그레스 바 -->
      <div class="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
        <div
          class="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
          style={`width: ${progressPercent}%`}
        ></div>
      </div>

      <!-- 할 일 리스트 -->
      <div class="space-y-2.5 mb-4 max-h-[480px] overflow-y-auto pr-1">
        {#if targetTodos.length === 0}
          <div class="py-12 text-center text-xs text-slate-400 space-y-2">
            <CheckCircle2 class="w-8 h-8 text-emerald-400 mx-auto opacity-60" />
            <p class="font-semibold text-slate-600">이 날짜에 예정된 할 일이 없습니다.</p>
            <p class="text-slate-400">공문서나 메신저 글을 던져넣어 일정을 자동으로 역산해 보세요!</p>
          </div>
        {:else}
          {#each targetTodos as todo}
            <div
              class={`group flex items-start justify-between p-3.5 rounded-2xl border transition-all ${
                todo.isCompleted
                  ? 'bg-slate-50/80 border-slate-200 text-slate-400'
                  : todo.isRollover
                  ? 'bg-rose-50/40 border-rose-200/80 text-slate-800 shadow-2xs'
                  : 'bg-white border-slate-200/90 hover:border-blue-300 text-slate-800 shadow-2xs hover:shadow-sm'
              }`}
            >
              <div class="flex items-start space-x-3 flex-1">
                <button
                  type="button"
                  on:click={() => handleTodoClick(todo)}
                  class="mt-0.5 text-slate-400 hover:text-blue-600 transition flex-shrink-0 cursor-pointer"
                >
                  {#if todo.isCompleted}
                    <CheckCircle2 class="w-5 h-5 text-emerald-600" />
                  {:else}
                    <Circle class="w-5 h-5" />
                  {/if}
                </button>

                <div class="flex-1 space-y-1">
                  <div class="flex flex-wrap items-center gap-1.5">
                    {#if todo.tag}
                      <span class={`px-2 py-0.5 rounded text-[10px] font-bold border ${getTagColor(todo.tag)}`}>
                        {todo.tag}
                      </span>
                    {/if}

                    {#if todo.isRollover}
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-500 text-white animate-pulse">
                        미완료 이월
                      </span>
                    {/if}

                    {#if todo.deadlineDate}
                      <span class="text-[11px] font-mono text-slate-500">
                        (마감: {todo.deadlineDate})
                      </span>
                    {/if}
                  </div>

                  <p class={`text-xs sm:text-sm leading-relaxed ${todo.isCompleted ? 'line-through text-slate-400' : 'font-medium'}`}>
                    {todo.title}
                  </p>

                  {#if todo.eventTitle && todo.eventTitle !== todo.title}
                    <p class="text-[11px] text-slate-500 flex items-center space-x-1">
                      <span class="text-blue-600">↳</span>
                      <span>연관 공문: {todo.eventTitle}</span>
                    </p>
                  {/if}
                </div>
              </div>

              <div class="flex items-center space-x-1 ml-2 opacity-80 group-hover:opacity-100 transition">
                {#if todo.sourceImage || todo.sourceText}
                  <button
                    type="button"
                    on:click={() => dispatch('viewSource', {
                      title: todo.eventTitle || todo.title,
                      sourceImage: todo.sourceImage,
                      sourceText: todo.sourceText,
                      date: todo.deadlineDate,
                      fileName: todo.fileName,
                    })}
                    class="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    title="원본 공문/메신저 보기"
                  >
                    <FileSearch class="w-4 h-4" />
                  </button>
                {/if}
                <button
                  type="button"
                  on:click={() => dispatch('deleteTodo', todo.id)}
                  class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  title="삭제하기"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <!-- 할 일 직접 추가 폼 -->
      <form on:submit|preventDefault={handleAddTodoSubmit} class="flex items-center space-x-2 pt-2 border-t border-slate-100">
        <input
          type="text"
          bind:value={newTodoText}
          placeholder="오늘 할 일 직접 입력 (Enter)..."
          class="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
        />
        <button
          type="submit"
          disabled={!newTodoText.trim()}
          class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>추가</span>
        </button>
      </form>
    </div>
  </div>

  <!-- ================= 3열 (우측 3컬럼): 다가오는 마감 D-Day ================= -->
  <div class="lg:col-span-3 space-y-4">
    <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
      <div class="flex items-center space-x-2 mb-3">
        <div class="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
          <AlertTriangle class="w-4 h-4" />
        </div>
        <div>
          <h2 class="font-bold text-sm text-slate-800">다가오는 최종 마감</h2>
          <p class="text-[11px] text-slate-500">내일부터 마감인 학사 일정</p>
        </div>
      </div>

      <div class="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
        {#if upcomingDeadlines.length === 0}
          <div class="py-8 text-center text-xs text-slate-400">
            예정된 마감 일정이 없습니다.
          </div>
        {:else}
          {#each upcomingDeadlines as event}
            {@const dDays = getDaysUntil(event.date)}
            <div class="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition space-y-1.5">
              <div class="flex items-center justify-between">
                <span class={`px-2 py-0.5 rounded text-[11px] font-black font-mono ${
                  dDays <= 3 ? 'bg-rose-500 text-white' : dDays <= 7 ? 'bg-amber-500 text-white' : 'bg-blue-100 text-blue-800'
                }`}>
                  D-{dDays}
                </span>
                <span class="text-[11px] text-slate-400 font-mono">
                  {event.date}
                </span>
              </div>

              <h4 class="font-bold text-xs text-slate-800 leading-snug">
                {event.title}
              </h4>

              {#if event.description}
                <p class="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  {event.description}
                </p>
              {/if}

              {#if event.sourceImage || event.sourceText}
                <div class="pt-1 flex justify-end">
                  <button
                    type="button"
                    on:click={() => dispatch('viewSource', {
                      title: event.title,
                      sourceImage: event.sourceImage,
                      sourceText: event.sourceText,
                      date: event.date,
                      fileName: event.fileName,
                      category: event.category,
                    })}
                    class="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-0.5 cursor-pointer"
                  >
                    <span>원문 공문 보기</span>
                    <ChevronRight class="w-3 h-3" />
                  </button>
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>
