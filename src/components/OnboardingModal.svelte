<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { parseTeacherInboxWithGemini, type ParsedItem } from '../lib/gemini';
  import { sanitizeTimetable } from '../lib/storage';
  import type { WeeklyTimetable, DayOfWeek } from '../lib/types';
  import { format } from 'date-fns';
  import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-svelte';
  import type { AppSettings } from '../lib/storage';

  export let isOpen = false;
  export let settings: AppSettings | null = null;

  type CalItem = ParsedItem & { id: string; selected: boolean };

  const dispatch = createEventDispatcher<{
    complete: {
      profile: {
        teacherName: string;
        schoolName: string;
        isHomeroom: boolean;
        homeroomClass: string;
        department: string;
        position: string;
        subjects: string;
        extraDuties: string;
      } | null;
      timetable: WeeklyTimetable | null;
      calendarItems: CalItem[];
    };
  }>();

  let step = 1;

  // Profile state
  let teacherName = '';
  let schoolName = '';
  let isHomeroom = true;
  let homeroomClass = '';
  let department = '';
  let position = '';
  let subjects = '';
  let extraDuties = '';

  $: if (isOpen && settings) {
    teacherName = settings.teacherName || '';
    schoolName = settings.schoolName || '';
    isHomeroom = settings.profile?.isHomeroom ?? true;
    homeroomClass = settings.profile?.homeroomClass || '';
    department = settings.profile?.department || '';
    position = settings.profile?.position || '';
    subjects = settings.profile?.subjects || '';
    extraDuties = settings.profile?.extraDuties || '';
  }

  $: if (!isOpen) step = 1;

  // Timetable state
  let timetableLoading = false;
  let timetableParsed: WeeklyTimetable | null = null;
  let timetableError = '';
  let timetableFileInput: HTMLInputElement;

  // Calendar state
  let calendarLoading = false;
  let calendarItems: CalItem[] = [];
  let calendarError = '';
  let calendarFileInput: HTMLInputElement;

  const DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const DAY_LABELS: Record<DayOfWeek, string> = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금' };

  const CAT_LABEL: Record<string, string> = {
    '평가': '고사·평가', '생기부': '생활기록부', '행정': '공문·행정',
    '연수': '회의·연수', '상담': '학생 상담', '회의': '회의·연수',
    '수업': '수업 관련', '행사': '학교 행사', '기타': '기타',
  };

  const CAT_COLOR: Record<string, string> = {
    '평가': 'bg-red-100 text-red-700',
    '생기부': 'bg-indigo-100 text-indigo-700',
    '행정': 'bg-amber-100 text-amber-700',
    '연수': 'bg-blue-100 text-blue-700',
    '상담': 'bg-green-100 text-green-700',
    '회의': 'bg-blue-100 text-blue-700',
    '수업': 'bg-teal-100 text-teal-700',
    '행사': 'bg-purple-100 text-purple-700',
    '기타': 'bg-slate-100 text-slate-600',
  };

  function getTeacherContext() {
    return {
      today: format(new Date(), 'yyyy-MM-dd'),
      subject: subjects || settings?.profile?.subjects || '',
      duty: `${schoolName || '학교'} ${teacherName || '선생님'} | 담임: ${homeroomClass} | 소속/보직: ${department} ${position} | 주요업무: ${extraDuties}`,
    };
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleTimetableUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    timetableLoading = true;
    timetableError = '';
    timetableParsed = null;

    try {
      const base64 = await fileToBase64(file);
      const result = await parseTeacherInboxWithGemini({
        imageFileBase64: base64,
        mimeType: file.type || 'image/png',
        teacherContext: getTeacherContext(),
      });

      if (result.kind === '시간표' && result.timetable) {
        timetableParsed = sanitizeTimetable(result.timetable);
      } else {
        timetableError = '시간표로 인식하지 못했습니다. 시간표 화면이 잘 보이는 이미지인지 확인해 주세요.';
      }
    } catch (err: any) {
      timetableError = err.message || 'AI 분석 중 오류가 발생했습니다.';
    } finally {
      timetableLoading = false;
      (e.target as HTMLInputElement).value = '';
    }
  }

  async function handleCalendarUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    calendarLoading = true;
    calendarError = '';
    calendarItems = [];

    try {
      const base64 = await fileToBase64(file);
      const result = await parseTeacherInboxWithGemini({
        imageFileBase64: base64,
        mimeType: file.type || 'image/png',
        teacherContext: getTeacherContext(),
      });

      if (result.items && result.items.length > 0) {
        calendarItems = result.items.map((item, idx) => ({
          ...item,
          id: `onb-${Date.now()}-${idx}`,
          selected: item.isMine,
        }));
      } else {
        calendarError = '학사일정 항목을 인식하지 못했습니다. 다른 파일을 시도해 보세요.';
      }
    } catch (err: any) {
      calendarError = err.message || 'AI 분석 중 오류가 발생했습니다.';
    } finally {
      calendarLoading = false;
      (e.target as HTMLInputElement).value = '';
    }
  }

  $: groupedItems = calendarItems.reduce<Record<string, CalItem[]>>((acc, item) => {
    const cat = item.category || '기타';
    (acc[cat] ??= []).push(item);
    return acc;
  }, {});

  function toggleItem(id: string) {
    calendarItems = calendarItems.map(i => i.id === id ? { ...i, selected: !i.selected } : i);
  }

  function toggleGroup(cat: string) {
    const group = groupedItems[cat] ?? [];
    const allOn = group.every(i => i.selected);
    calendarItems = calendarItems.map(i => i.category === cat ? { ...i, selected: !allOn } : i);
  }

  function handleComplete() {
    dispatch('complete', {
      profile: {
        teacherName, schoolName, isHomeroom, homeroomClass,
        department, position, subjects, extraDuties,
      },
      timetable: timetableParsed,
      calendarItems: calendarItems.filter(i => i.selected),
    });
  }

  function skipAll() {
    dispatch('complete', { profile: null, timetable: null, calendarItems: [] });
  }

  function next() { step = Math.min(step + 1, 4); }
  function prev() { step = Math.max(step - 1, 1); }
</script>

{#if isOpen}
<div class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
  <div class="w-full max-w-xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden" style="max-height: 90vh;">

    <!-- Header / Progress -->
    <div class="px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-bold text-slate-400 tracking-widest uppercase">초기 설정</span>
        <button type="button" on:click={skipAll} class="text-xs text-slate-400 hover:text-slate-600 transition cursor-pointer">나중에 하기</button>
      </div>
      <div class="flex space-x-1.5">
        {#each [1, 2, 3, 4] as s}
          <div class="flex-1 h-1 rounded-full transition-all duration-300 {step >= s ? 'bg-blue-500' : 'bg-slate-200'}"></div>
        {/each}
      </div>
    </div>

    <!-- Scrollable Content -->
    <div class="flex-1 overflow-y-auto px-6 py-6 min-h-0">

      <!-- Step 1: Welcome -->
      {#if step === 1}
        <div class="text-center py-2">
          <div class="w-20 h-20 bg-blue-50 rounded-3xl mx-auto mb-5 flex items-center justify-center text-5xl select-none">🏫</div>
          <h1 class="text-xl font-bold text-slate-800 mb-2">스마트 교무실에 오신 걸 환영합니다</h1>
          <p class="text-sm text-slate-500 leading-relaxed mb-7 max-w-xs mx-auto">공문·메신저를 AI가 분석해서 일정과 할 일을 자동으로 정리해 드립니다.</p>
          <div class="grid grid-cols-3 gap-3 text-left">
            {#each [
              { icon: '📄', title: '공문 자동 파싱', desc: '이미지 / 텍스트 붙여넣기' },
              { icon: '🗓️', title: '일정 자동 등록', desc: 'D-7, D-3 역산 할 일' },
              { icon: '📊', title: '시간표 인식', desc: '사진 한 장으로 등록' },
            ] as feat}
              <div class="bg-slate-50 rounded-2xl p-4">
                <div class="text-2xl mb-2">{feat.icon}</div>
                <div class="font-semibold text-slate-700 text-xs leading-tight">{feat.title}</div>
                <div class="text-slate-400 text-xs mt-1">{feat.desc}</div>
              </div>
            {/each}
          </div>
        </div>

      <!-- Step 2: Profile -->
      {:else if step === 2}
        <div>
          <h2 class="text-lg font-bold text-slate-800 mb-0.5">선생님 정보를 입력해 주세요</h2>
          <p class="text-sm text-slate-500 mb-5">AI가 내 담당 업무에 맞는 항목을 선별합니다.</p>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-semibold text-slate-600 mb-1 block">성함 <span class="text-blue-500">*</span></label>
                <input
                  bind:value={teacherName}
                  class="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600 mb-1 block">학교명</label>
                <input
                  bind:value={schoolName}
                  class="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  placeholder="새솔고등학교"
                />
              </div>
            </div>
            <div>
              <label class="text-xs font-semibold text-slate-600 mb-2 block">담임 여부</label>
              <div class="flex space-x-2">
                <button type="button" on:click={() => isHomeroom = true}
                  class="px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer {isHomeroom ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                  담임
                </button>
                <button type="button" on:click={() => isHomeroom = false}
                  class="px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer {!isHomeroom ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                  비담임
                </button>
              </div>
            </div>
            {#if isHomeroom}
              <div>
                <label class="text-xs font-semibold text-slate-600 mb-1 block">담임 학급</label>
                <input
                  bind:value={homeroomClass}
                  class="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  placeholder="3학년 2반"
                />
              </div>
            {/if}
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-semibold text-slate-600 mb-1 block">소속 부서</label>
                <input
                  bind:value={department}
                  class="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  placeholder="진로진학부"
                />
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600 mb-1 block">직위/보직</label>
                <input
                  bind:value={position}
                  class="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  placeholder="교과주임"
                />
              </div>
            </div>
            <div>
              <label class="text-xs font-semibold text-slate-600 mb-1 block">담당 과목</label>
              <input
                bind:value={subjects}
                class="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                placeholder="2학년 물리학Ⅰ, 3학년 생활과 과학"
              />
            </div>
            <div>
              <label class="text-xs font-semibold text-slate-600 mb-1 block">주요 업무</label>
              <textarea
                bind:value={extraDuties}
                rows="2"
                class="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
                placeholder="수능 원서 접수 총괄, 과학교구 예산 관리"
              ></textarea>
            </div>
          </div>
        </div>

      <!-- Step 3: Timetable -->
      {:else if step === 3}
        <div>
          <h2 class="text-lg font-bold text-slate-800 mb-0.5">주간 시간표 등록 <span class="text-sm font-normal text-slate-400">(선택)</span></h2>
          <p class="text-sm text-slate-500 mb-5">시간표 사진을 올리면 AI가 자동으로 인식합니다. 나중에 상단 메뉴에서도 추가할 수 있습니다.</p>

          {#if timetableParsed}
            <div class="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-sm text-emerald-700 font-medium">
              <CheckCircle2 class="w-4 h-4 flex-shrink-0" />
              <span>시간표 인식 완료!</span>
            </div>
            <div class="overflow-x-auto rounded-xl border border-slate-200">
              <table class="w-full text-xs min-w-[300px]">
                <thead>
                  <tr class="bg-slate-50">
                    <th class="px-2 py-2 text-slate-400 font-semibold w-8 text-center">교시</th>
                    {#each DAYS as day}
                      <th class="px-2 py-2 text-slate-600 font-semibold text-center">{DAY_LABELS[day]}</th>
                    {/each}
                  </tr>
                </thead>
                <tbody>
                  {#each [1,2,3,4,5,6,7] as period}
                    <tr class="border-t border-slate-100 {period % 2 === 0 ? 'bg-slate-50/50' : ''}">
                      <td class="px-2 py-2 text-center text-slate-400 font-medium">{period}</td>
                      {#each DAYS as day}
                        {@const slot = timetableParsed[day]?.find(s => s.period === period)}
                        <td class="px-2 py-2 text-center">
                          {#if slot && slot.subject && slot.subject !== '공강'}
                            <div class="font-semibold text-slate-700 text-[10px] leading-tight">{slot.subject}</div>
                            {#if slot.className && slot.className !== '-'}
                              <div class="text-slate-400 text-[10px]">{slot.className}</div>
                            {/if}
                          {:else}
                            <span class="text-slate-300 text-[10px]">-</span>
                          {/if}
                        </td>
                      {/each}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              on:click={() => { timetableParsed = null; timetableError = ''; }}
              class="mt-2 text-xs text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              다시 업로드
            </button>
          {:else}
            <label
              class="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/40 transition {timetableLoading ? 'pointer-events-none opacity-60' : ''}"
            >
              {#if timetableLoading}
                <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p class="text-sm text-slate-500">AI가 시간표를 분석하는 중…</p>
              {:else}
                <span class="text-4xl mb-3">📸</span>
                <p class="text-sm font-semibold text-slate-700 mb-1">시간표 이미지 업로드</p>
                <p class="text-xs text-slate-400">JPG, PNG, WEBP 파일</p>
              {/if}
              <input
                type="file"
                accept="image/*"
                class="hidden"
                bind:this={timetableFileInput}
                on:change={handleTimetableUpload}
              />
            </label>
            {#if timetableError}
              <div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">{timetableError}</div>
            {/if}
          {/if}
        </div>

      <!-- Step 4: Academic Calendar -->
      {:else if step === 4}
        <div>
          <h2 class="text-lg font-bold text-slate-800 mb-0.5">연간 학사일정 등록 <span class="text-sm font-normal text-slate-400">(선택)</span></h2>
          <p class="text-sm text-slate-500 mb-5">학사일정 파일을 올리면 카테고리별로 분류해 드립니다. 나중에 메인 화면에서도 추가할 수 있습니다.</p>

          {#if calendarItems.length > 0}
            <div class="space-y-4 max-h-72 overflow-y-auto pr-1">
              {#each Object.entries(groupedItems) as [cat, items]}
                <div>
                  <button
                    type="button"
                    on:click={() => toggleGroup(cat)}
                    class="flex items-center space-x-2 mb-1.5 w-full text-left cursor-pointer"
                  >
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold {CAT_COLOR[cat] || 'bg-slate-100 text-slate-600'}">
                      {CAT_LABEL[cat] || cat}
                    </span>
                    <span class="text-xs text-slate-400">{items.filter(i => i.selected).length}/{items.length} 선택</span>
                  </button>
                  <div class="space-y-0.5 pl-1">
                    {#each items as item (item.id)}
                      <label class="flex items-start space-x-3 py-1.5 px-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          on:change={() => toggleItem(item.id)}
                          class="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-400 cursor-pointer"
                        />
                        <div class="flex-1 min-w-0">
                          <p class="text-sm text-slate-700 leading-tight truncate">{item.title}</p>
                          <p class="text-xs text-slate-400 mt-0.5">{item.date || '날짜 미정'}</p>
                        </div>
                      </label>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
            <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <p class="text-xs text-slate-500">총 <span class="font-semibold text-slate-700">{calendarItems.filter(i => i.selected).length}개</span> 일정 등록 예정</p>
              <button
                type="button"
                on:click={() => { calendarItems = []; calendarError = ''; }}
                class="text-xs text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                다시 업로드
              </button>
            </div>
          {:else}
            <label
              class="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/40 transition {calendarLoading ? 'pointer-events-none opacity-60' : ''}"
            >
              {#if calendarLoading}
                <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p class="text-sm text-slate-500">AI가 학사일정을 분석하는 중…</p>
              {:else}
                <span class="text-4xl mb-3">📅</span>
                <p class="text-sm font-semibold text-slate-700 mb-1">학사일정 이미지 업로드</p>
                <p class="text-xs text-slate-400">JPG, PNG 파일</p>
              {/if}
              <input
                type="file"
                accept="image/*"
                class="hidden"
                bind:this={calendarFileInput}
                on:change={handleCalendarUpload}
              />
            </label>
            {#if calendarError}
              <div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">{calendarError}</div>
            {/if}
          {/if}
        </div>
      {/if}

    </div>

    <!-- Footer -->
    <div class="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
      <!-- Back button -->
      {#if step > 1}
        <button
          type="button"
          on:click={prev}
          class="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium text-sm transition cursor-pointer"
        >
          <ArrowLeft class="w-4 h-4" />
          <span>이전</span>
        </button>
      {:else}
        <span></span>
      {/if}

      <!-- Right side actions -->
      <div class="flex items-center space-x-2">
        {#if step === 1}
          <button
            type="button"
            on:click={next}
            class="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition shadow-sm cursor-pointer"
          >
            <span>시작하기</span>
            <ArrowRight class="w-4 h-4" />
          </button>

        {:else if step === 2}
          <button
            type="button"
            on:click={next}
            disabled={!teacherName.trim()}
            class="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>다음</span>
            <ArrowRight class="w-4 h-4" />
          </button>

        {:else if step === 3}
          <button type="button" on:click={next} class="text-sm text-slate-400 hover:text-slate-600 px-3 py-2.5 transition cursor-pointer">건너뛰기</button>
          <button
            type="button"
            on:click={next}
            disabled={timetableLoading}
            class="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition shadow-sm disabled:opacity-40 cursor-pointer"
          >
            <span>다음</span>
            <ArrowRight class="w-4 h-4" />
          </button>

        {:else if step === 4}
          <button type="button" on:click={handleComplete} class="text-sm text-slate-400 hover:text-slate-600 px-3 py-2.5 transition cursor-pointer">건너뛰기</button>
          <button
            type="button"
            on:click={handleComplete}
            disabled={calendarLoading}
            class="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition shadow-sm disabled:opacity-40 cursor-pointer"
          >
            <CheckCircle2 class="w-4 h-4" />
            <span>완료</span>
          </button>
        {/if}
      </div>
    </div>

  </div>
</div>
{/if}
