<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X, Clock, Sparkles, Check, RefreshCw, Upload } from 'lucide-svelte';
  import type { WeeklyTimetable, DayOfWeek } from '../lib/types';
  import { sanitizeTimetable } from '../lib/storage';
  import { INITIAL_TIMETABLE } from '../lib/mockData';

  export let isOpen: boolean = false;
  export let timetable: WeeklyTimetable | null = null;

  const dispatch = createEventDispatcher<{
    close: void;
    saveTimetable: WeeklyTimetable;
    uploadImage: { base64: string; mimeType: string };
  }>();

  let currentTimetable: WeeklyTimetable = sanitizeTimetable(timetable);
  let savedToast = false;
  let timetableFileInput: HTMLInputElement;

  $: if (isOpen && timetable) {
    currentTimetable = sanitizeTimetable(timetable);
  }

  const days: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const DAY_LABELS: Record<DayOfWeek, string> = {
    mon: '월요일',
    tue: '화요일',
    wed: '수요일',
    thu: '목요일',
    fri: '금요일',
  };

  function handleCellChange(
    day: DayOfWeek,
    period: number,
    field: 'subject' | 'className',
    value: string
  ) {
    const daySlots = [...(currentTimetable[day] || [])];
    const existingIndex = daySlots.findIndex((s) => s.period === period);

    if (existingIndex >= 0) {
      daySlots[existingIndex] = {
        ...daySlots[existingIndex],
        [field]: value,
      };
    } else {
      daySlots.push({
        period,
        subject: field === 'subject' ? value : '공강',
        className: field === 'className' ? value : '-',
      });
    }

    currentTimetable = {
      ...currentTimetable,
      [day]: daySlots,
    };
  }

  function handleToggleSwap(day: DayOfWeek, period: number) {
    const daySlots = [...(currentTimetable[day] || [])];
    const existingIndex = daySlots.findIndex((s) => s.period === period);

    if (existingIndex >= 0) {
      daySlots[existingIndex] = {
        ...daySlots[existingIndex],
        isSwapped: !daySlots[existingIndex].isSwapped,
      };
    }

    currentTimetable = {
      ...currentTimetable,
      [day]: daySlots,
    };
  }

  function handleSaveAndClose() {
    dispatch('saveTimetable', currentTimetable);
    savedToast = true;
    setTimeout(() => {
      savedToast = false;
      dispatch('close');
    }, 500);
  }

  function handleResetTimetable() {
    if (confirm('기본 시간표 예시 데이터로 초기화할까요?')) {
      currentTimetable = sanitizeTimetable(INITIAL_TIMETABLE);
    }
  }

  function handleTimetableImageUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        dispatch('uploadImage', {
          base64: reader.result as string,
          mimeType: file.type || 'image/png',
        });
      };
      reader.readAsDataURL(file);
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
    <div class="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
      <!-- 상단 헤더 -->
      <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
        <div class="flex items-center space-x-2.5">
          <div class="p-2 bg-blue-600/30 rounded-xl">
            <Clock class="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 class="text-base font-bold flex items-center space-x-2">
              <span>내 주간 시간표 관리</span>
              <span class="text-[11px] bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full font-medium">
                1~7교시 컴시간 매트릭스
              </span>
            </h2>
            <p class="text-xs text-slate-400">
              과목명이나 학급(반)을 직접 수정하거나 시간표 사진을 던져넣으세요.
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <!-- 시간표 스샷 업로드 버튼 -->
          <input
            type="file"
            bind:this={timetableFileInput}
            on:change={handleTimetableImageUpload}
            accept="image/*"
            class="hidden"
          />
          <button
            type="button"
            on:click={() => timetableFileInput?.click()}
            class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Sparkles class="w-3.5 h-3.5" />
            <span>시간표 사진 AI 인식</span>
          </button>

          <button
            type="button"
            on:click={() => dispatch('close')}
            class="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- 본문: 월~금 시간표 매트릭스 그리드 -->
      <div class="p-6 overflow-y-auto flex-1 space-y-4">
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-center border-collapse">
            <thead>
              <tr class="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <th class="py-2.5 px-3 w-16">교시</th>
                {#each days as day}
                  <th class="py-2.5 px-3 min-w-[130px]">
                    {DAY_LABELS[day]}
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              {#each [1, 2, 3, 4, 5, 6, 7] as period}
                <tr class="hover:bg-slate-50/50 transition">
                  <!-- 교시 라벨 -->
                  <td class="py-2 px-2 font-bold font-mono text-slate-500 bg-slate-50/50">
                    {period}교시
                  </td>

                  <!-- 월~금 슬롯 -->
                  {#each days as day}
                    {@const daySlots = currentTimetable[day] || []}
                    {@const slot = daySlots.find((s) => s.period === period) || { period, subject: '공강', className: '-' }}
                    {@const isKongang = slot.subject === '공강'}

                    <td class={`p-1.5 border border-slate-100 ${
                      slot.isSwapped
                        ? 'bg-amber-50/70'
                        : isKongang
                        ? 'bg-slate-50/30'
                        : 'bg-white'
                    }`}>
                      <div class="flex flex-col space-y-1">
                        <input
                          type="text"
                          value={slot.subject}
                          on:input={(e) => handleCellChange(day, period, 'subject', e.currentTarget.value)}
                          placeholder="과목명"
                          class={`px-2 py-1 text-xs font-bold rounded-lg border text-center focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                            isKongang
                              ? 'text-slate-400 bg-slate-50 border-slate-200'
                              : 'text-blue-900 bg-blue-50/60 border-blue-200'
                          }`}
                        />
                        <div class="flex items-center space-x-1">
                          <input
                            type="text"
                            value={slot.className}
                            on:input={(e) => handleCellChange(day, period, 'className', e.currentTarget.value)}
                            placeholder="반"
                            class="w-full px-1.5 py-0.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded text-center focus:outline-none"
                          />
                          <button
                            type="button"
                            on:click={() => handleToggleSwap(day, period)}
                            title="보강/교체 표시 토글"
                            class={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer flex-shrink-0 ${
                              slot.isSwapped
                                ? 'bg-amber-500 text-white border-amber-600'
                                : 'bg-slate-100 text-slate-400 border-slate-200 hover:text-amber-600'
                            }`}
                          >
                            교체
                          </button>
                        </div>
                      </div>
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 하단 바 -->
      <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
        <button
          type="button"
          on:click={handleResetTimetable}
          class="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition flex items-center space-x-1 cursor-pointer"
        >
          <RefreshCw class="w-3.5 h-3.5" />
          <span>샘플 시간표로 리셋</span>
        </button>

        <div class="flex items-center space-x-2">
          {#if savedToast}
            <span class="text-xs text-emerald-600 font-bold flex items-center space-x-1">
              <Check class="w-4 h-4" />
              <span>저장 완료!</span>
            </span>
          {/if}
          <button
            type="button"
            on:click={handleSaveAndClose}
            class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
          >
            <Check class="w-4 h-4" />
            <span>시간표 저장</span>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
