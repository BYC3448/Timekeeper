<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import {
    X,
    Sparkles,
    Check,
    Calendar,
    Clock,
    Plus,
    Trash2,
    Info,
    Layers,
    Filter,
    ShieldCheck,
    AlertCircle,
  } from 'lucide-svelte';
  import type {
    AIParsedResult,
    EventCategory,
    PriorityLevel,
    ScheduleEvent,
    TodoItem,
    MultiParsedItem,
  } from '../lib/types';
  import { format, subDays, parseISO } from 'date-fns';

  export let isOpen: boolean = false;
  export let parsedResult: (AIParsedResult & {
    type?: string;
    mineReason?: string;
    ignored?: { text: string; reason: string }[];
  }) | null = null;
  export let multiItems: MultiParsedItem[] = [];
  export let sourceImage: string | undefined = undefined;
  export let sourceText: string | undefined = undefined;
  export let fileName: string | undefined = undefined;

  const dispatch = createEventDispatcher<{
    close: void;
    confirmSingle: {
      event: Omit<ScheduleEvent, 'id' | 'createdAt'>;
      todos: Omit<TodoItem, 'id' | 'createdAt'>[];
      studentNotice?: string;
      registerType?: 'todo_only' | 'deadline_event';
    };
    confirmMulti: MultiParsedItem[];
  }>();

  $: isMultiMode = multiItems.length > 1;

  // ===== [다중 일정 모드 상태] =====
  let itemsList: MultiParsedItem[] = [];
  let filterMode: 'all' | 'mine' | 'excluded' = 'all';

  $: if (multiItems) {
    itemsList = [...multiItems];
  }

  function toggleItemSelect(id: string) {
    itemsList = itemsList.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it));
  }

  function updateItemTitle(id: string, newTitle: string) {
    itemsList = itemsList.map((it) => (it.id === id ? { ...it, title: newTitle } : it));
  }

  function updateItemDate(id: string, newDate: string) {
    itemsList = itemsList.map((it) => (it.id === id ? { ...it, date: newDate } : it));
  }

  function handleSelectAll() {
    itemsList = itemsList.map((it) => ({ ...it, selected: true }));
  }

  function handleSelectOnlyMine() {
    itemsList = itemsList.map((it) => ({ ...it, selected: it.isMine }));
  }

  $: filteredMultiItems = itemsList.filter((it) => {
    if (filterMode === 'mine') return it.isMine;
    if (filterMode === 'excluded') return !it.isMine;
    return true;
  });

  $: selectedCount = itemsList.filter((it) => it.selected).length;

  // ===== [단일 일정 모드 상태] =====
  let title = '';
  let date = '';
  let category: EventCategory = 'general';
  let priority: PriorityLevel = 'high';
  let studentNotice = '';
  let subTasks: { title: string; daysBefore: number; calculatedDate: string }[] = [];
  let registerType: 'todo_only' | 'deadline_event' = 'deadline_event';

  $: if (parsedResult) {
    title = parsedResult.title || '';
    date = parsedResult.date || format(new Date(), 'yyyy-MM-dd');
    category = parsedResult.category || 'general';
    priority = parsedResult.priority || 'high';
    studentNotice = parsedResult.studentNotice || '';
    subTasks = (parsedResult.subTasks || []).map((t) => ({ ...t }));
    registerType = parsedResult.type === '확인만' ? 'todo_only' : 'deadline_event';
  }

  function handleSubTaskChange(index: number, newTitle: string) {
    subTasks[index].title = newTitle;
    subTasks = [...subTasks];
  }

  function handleDaysBeforeChange(index: number, days: number) {
    try {
      const baseDate = parseISO(date);
      const newCalcDate = format(subDays(baseDate, days), 'yyyy-MM-dd');
      subTasks[index].daysBefore = days;
      subTasks[index].calculatedDate = newCalcDate;
      subTasks = [...subTasks];
    } catch (e) {
      console.error(e);
    }
  }

  function handleAddSubTask() {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    subTasks = [
      ...subTasks,
      {
        title: '새로운 실행 태스크',
        daysBefore: 1,
        calculatedDate: todayStr,
      },
    ];
  }

  function handleDeleteSubTask(index: number) {
    subTasks = subTasks.filter((_, i) => i !== index);
  }

  function handleSingleSubmit() {
    dispatch('confirmSingle', {
      event: {
        title,
        date,
        category,
        priority,
        description: parsedResult?.summary || title,
        sourceType: sourceImage ? 'clipboard_image' : 'clipboard_text',
        sourceImage,
        sourceText,
        fileName,
      },
      todos: subTasks.map((st) => ({
        title: st.title,
        date: st.calculatedDate,
        deadlineDate: date,
        daysBefore: st.daysBefore,
        isCompleted: false,
        priority,
        sourceImage,
        sourceText,
        fileName,
        tag: category === 'exam' ? '출제' : category === 'document' ? '공문' : '일반',
      })),
      studentNotice: studentNotice.trim() ? studentNotice.trim() : undefined,
      registerType,
    });
  }

  function handleMultiSubmit() {
    const selected = itemsList.filter((it) => it.selected);
    dispatch('confirmMulti', selected);
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
    <div class="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
      <!-- 상단 모달 헤더 -->
      <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
        <div class="flex items-center space-x-2.5">
          <div class="p-2 bg-blue-600/30 rounded-xl">
            <Sparkles class="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 class="text-base font-bold flex items-center space-x-2">
              <span>{isMultiMode ? 'AI 학사일정 다중 분석 결과' : 'AI 일정 분석 및 할 일 역산 검토'}</span>
              <span class="text-[11px] bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full font-medium">
                {isMultiMode ? `총 ${multiItems.length}건 감지` : '교사 확인 화면'}
              </span>
            </h2>
            <p class="text-xs text-slate-400">
              {isMultiMode
                ? '선생님 담당 업무는 자동 선택되었습니다. 등록할 일정을 확인해 주세요.'
                : 'AI가 추천한 마감일과 세부 실행 일정을 확인 후 확정하세요.'}
            </p>
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

      <!-- 모달 본문 영역 -->
      <div class="p-6 overflow-y-auto flex-1 space-y-5">
        {#if isMultiMode}
          <!-- ================= [다중 일정 모드] ================= -->
          <div class="space-y-4">
            <!-- 필터 및 일괄 선택 바 -->
            <div class="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div class="flex items-center space-x-1">
                <button
                  type="button"
                  on:click={() => (filterMode = 'all')}
                  class={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    filterMode === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  전체 ({itemsList.length})
                </button>
                <button
                  type="button"
                  on:click={() => (filterMode = 'mine')}
                  class={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    filterMode === 'mine' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  선생님 담당만 ({itemsList.filter((i) => i.isMine).length})
                </button>
                <button
                  type="button"
                  on:click={() => (filterMode = 'excluded')}
                  class={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    filterMode === 'excluded' ? 'bg-slate-400 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  타 학년/업무 ({itemsList.filter((i) => !i.isMine).length})
                </button>
              </div>

              <div class="flex items-center space-x-2">
                <button
                  type="button"
                  on:click={handleSelectOnlyMine}
                  class="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  내 담당만 선택
                </button>
                <span class="text-slate-300">|</span>
                <button
                  type="button"
                  on:click={handleSelectAll}
                  class="text-xs text-slate-600 hover:underline font-semibold cursor-pointer"
                >
                  모두 선택
                </button>
              </div>
            </div>

            <!-- 다중 일정 목록 -->
            <div class="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
              {#each filteredMultiItems as item}
                <div
                  class={`p-3.5 rounded-2xl border transition ${
                    item.selected
                      ? 'bg-blue-50/40 border-blue-300 shadow-2xs'
                      : 'bg-slate-50/50 border-slate-200 opacity-60'
                  }`}
                >
                  <div class="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      on:change={() => toggleItemSelect(item.id)}
                      class="mt-1 w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />

                    <div class="flex-1 space-y-2">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.isMine ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {item.isMine ? '내 담당' : '타 학년/타 업무'}
                        </span>

                        <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                          {item.type || '고정'}
                        </span>

                        {#if item.mineReason}
                          <span class="text-[11px] text-slate-500 truncate">
                            💡 {item.mineReason}
                          </span>
                        {/if}
                      </div>

                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={item.title}
                          on:input={(e) => updateItemTitle(item.id, e.currentTarget.value)}
                          class="sm:col-span-2 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <input
                          type="date"
                          value={item.date}
                          on:input={(e) => updateItemDate(item.id, e.currentTarget.value)}
                          class="px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {:else if parsedResult}
          <!-- ================= [단일 일정 모드] ================= -->
          <div class="space-y-4">
            <!-- AI 판단 근거 안내 배너 -->
            {#if parsedResult.mineReason}
              <div class="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center space-x-2.5 text-xs text-blue-900">
                <ShieldCheck class="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span class="font-medium">
                  <strong>AI 판단 근거:</strong> {parsedResult.mineReason}
                </span>
              </div>
            {/if}

            <!-- 1. 일정 기본 정보 (제목, 마감일, 카테고리) -->
            <div class="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div class="text-xs font-bold text-slate-700 block">
                최종 마감 일정 정보
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="sm:col-span-2">
                  <label for="single-title-input" class="text-[11px] text-slate-500 mb-1 block">일정 제목</label>
                  <input
                    id="single-title-input"
                    type="text"
                    bind:value={title}
                    class="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label for="single-date-input" class="text-[11px] text-slate-500 mb-1 block">최종 마감일</label>
                  <input
                    id="single-date-input"
                    type="date"
                    bind:value={date}
                    class="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <!-- 등록 유형 선택 (캘린더 D-Day vs 오늘 할 일만) -->
              <div class="pt-2 flex items-center space-x-3 text-xs">
                <span class="font-bold text-slate-700">등록 방식:</span>
                <label class="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    bind:group={registerType}
                    value="deadline_event"
                    class="text-blue-600"
                  />
                  <span>캘린더 마감 + To-Do 역산</span>
                </label>
                <label class="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    bind:group={registerType}
                    value="todo_only"
                    class="text-blue-600"
                  />
                  <span>오늘 할 일에만 등록</span>
                </label>
              </div>
            </div>

            <!-- 2. AI 역산 세부 To-Do 목록 -->
            <div class="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Clock class="w-3.5 h-3.5 text-indigo-600" />
                    <span>실행 단계 (오늘/예정일 To-Do 역산)</span>
                  </div>
                  <p class="text-[11px] text-slate-500 mt-0.5">
                    마감 전 미리 해야 할 일을 역산하여 해당 날짜의 데스크에 넣어드립니다.
                  </p>
                </div>
                <button
                  type="button"
                  on:click={handleAddSubTask}
                  class="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg transition flex items-center space-x-1 cursor-pointer"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>단계 추가</span>
                </button>
              </div>

              <div class="space-y-2">
                {#if subTasks.length === 0}
                  <div class="py-4 text-center text-xs text-slate-400">
                    역산된 실행 태스크가 없습니다. 오늘 할 일로 직접 추가하실 수 있습니다.
                  </div>
                {:else}
                  {#each subTasks as task, idx}
                    <div class="flex items-center space-x-2 bg-white p-2.5 rounded-xl border border-slate-200">
                      <span class="text-xs font-bold text-indigo-600 w-12 font-mono flex-shrink-0">
                        D-{task.daysBefore}
                      </span>

                      <input
                        type="text"
                        value={task.title}
                        on:input={(e) => handleSubTaskChange(idx, e.currentTarget.value)}
                        class="flex-1 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:bg-white focus:outline-none"
                      />

                      <span class="text-[11px] font-mono text-slate-400 flex-shrink-0">
                        {task.calculatedDate}
                      </span>

                      <button
                        type="button"
                        on:click={() => handleDeleteSubTask(idx)}
                        class="p-1 text-slate-400 hover:text-rose-500 rounded transition cursor-pointer"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  {/each}
                {/if}
              </div>
            </div>

            <!-- 3. 조·종례 전달사항 분리 -->
            <div class="space-y-1.5 p-4 bg-amber-50/50 rounded-2xl border border-amber-200">
              <label for="student-notice-input" class="text-xs font-bold text-amber-900 flex items-center space-x-1.5">
                <span>📢 학생 전달사항 (조·종례 체크리스트로 분리)</span>
              </label>
              <input
                id="student-notice-input"
                type="text"
                bind:value={studentNotice}
                placeholder="예: 조·종례 시 시험 범위 및 부정행위 예방 안내 요망 (없으면 비워둠)"
                class="w-full px-3 py-2 text-xs bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            <!-- 4. 버려진 근거 문서 번호 확인 -->
            {#if parsedResult.ignored && parsedResult.ignored.length > 0}
              <div class="p-3 bg-slate-100 rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-1">
                <span class="font-bold text-slate-600 block">버려진 날짜/문구 (혼동 방지 자동 제외):</span>
                {#each parsedResult.ignored as ign}
                  <p class="text-[11px]">
                    • <span class="line-through">{ign.text}</span> ({ign.reason})
                  </p>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- 모달 하단 버튼 바 -->
      <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
        <button
          type="button"
          on:click={() => dispatch('close')}
          class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
        >
          취소
        </button>

        {#if isMultiMode}
          <button
            type="button"
            on:click={handleMultiSubmit}
            disabled={selectedCount === 0}
            class="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
          >
            <Check class="w-4 h-4" />
            <span>선택한 {selectedCount}건 학사일정 일괄 등록</span>
          </button>
        {:else}
          <button
            type="button"
            on:click={handleSingleSubmit}
            class="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
          >
            <Check class="w-4 h-4" />
            <span>확인 완료 및 내 일정·할 일에 등록</span>
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
