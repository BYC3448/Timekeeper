<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X, FileText, Sparkles, Clipboard } from 'lucide-svelte';

  export let isOpen: boolean = false;

  const dispatch = createEventDispatcher<{
    close: void;
    submitText: string;
  }>();

  let text = '';

  function handleSubmit() {
    if (!text.trim()) return;
    dispatch('submitText', text.trim());
    text = '';
    dispatch('close');
  }

  async function handlePasteClipboard() {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        text = clipText;
      }
    } catch (err) {
      console.warn('클립보드 접근 권한 없음:', err);
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
    <div class="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
      <!-- 헤더 -->
      <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
        <div class="flex items-center space-x-2.5">
          <div class="p-2 bg-blue-600/30 rounded-xl">
            <FileText class="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 class="text-base font-bold">메신저 쪽지 / 텍스트 던지기</h2>
            <p class="text-xs text-slate-400">
              복사한 카톡이나 교내 메신저 글을 그대로 붙여넣으세요
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

      <!-- 본문 폼 -->
      <form on:submit|preventDefault={handleSubmit} class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <label for="messenger-text-input" class="text-xs font-bold text-slate-700">
            공문 본문 또는 메신저 대화 내용:
          </label>
          <button
            type="button"
            on:click={handlePasteClipboard}
            class="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <Clipboard class="w-3.5 h-3.5" />
            <span>클립보드에서 붙여넣기</span>
          </button>
        </div>

        <textarea
          id="messenger-text-input"
          rows={8}
          bind:value={text}
          placeholder="예시:
[2학기 1차 지필평가 출제 안내]
출제원안 및 이원목적분류표 제출 마감일은 9월 24일(금) 16:30까지입니다.
동교과 선생님과의 교차검토는 9월 21일까지 완료해 주시기 바랍니다."
          class="w-full p-3.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none leading-relaxed"
        ></textarea>

        <div class="flex items-center justify-between pt-2">
          <span class="text-[11px] text-slate-400">
            💡 날짜, 시간, 할 일을 AI가 자동으로 뽑아냅니다.
          </span>
          <div class="flex space-x-2">
            <button
              type="button"
              on:click={() => dispatch('close')}
              class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              class="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
            >
              <Sparkles class="w-3.5 h-3.5" />
              <span>AI 일정 분석하기</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
{/if}
