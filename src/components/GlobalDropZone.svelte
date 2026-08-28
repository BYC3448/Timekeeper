<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { UploadCloud, Image as ImageIcon, Sparkles, Edit3, Clipboard } from 'lucide-svelte';

  export let isProcessing: boolean = false;

  const dispatch = createEventDispatcher<{
    processInput: {
      type: 'image' | 'text' | 'hwp';
      data: string;
      fileName?: string;
      mimeType?: string;
    };
    openTextInput: void;
  }>();

  let isDragging = false;
  let showPasteToast = false;
  let toastMessage = '클립보드 내용 감지 완료!';
  let fileInput: HTMLInputElement;
  let toastTimer: any = null;

  function triggerPasteAnimation(msg: string) {
    toastMessage = msg;
    showPasteToast = true;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      showPasteToast = false;
    }, 2500);
  }

  function handlePaste(e: ClipboardEvent) {
    // 텍스트 input/textarea에 포커스되어 있는 동안은 paste를 가로채지 않음
    const activeTag = document.activeElement?.tagName.toLowerCase();
    if (activeTag === 'input' || activeTag === 'textarea') {
      return;
    }

    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // 1. 클립보드에 이미지가 있는 경우 (PrintScreen / 화면 캡처)
    const items = clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          triggerPasteAnimation('캡처 이미지 감지 완료! AI가 분석 중...');
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            dispatch('processInput', {
              type: 'image',
              data: base64,
              fileName: `클립보드_캡처_${new Date().toLocaleTimeString('ko-KR')}.png`,
              mimeType: file.type,
            });
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    }

    // 2. 클립보드에 텍스트가 있는 경우 (메신저 쪽지 내용, 카톡 텍스트 등)
    const pastedText = clipboardData.getData('text/plain');
    if (pastedText && pastedText.trim().length > 3) {
      e.preventDefault();
      triggerPasteAnimation('복사한 텍스트 감지 완료! AI가 분석 중...');
      dispatch('processInput', {
        type: 'text',
        data: pastedText.trim(),
        fileName: '메신저_복사_텍스트',
      });
      return;
    }
  }

  onMount(() => {
    window.addEventListener('paste', handlePaste);
  });

  onDestroy(() => {
    window.removeEventListener('paste', handlePaste);
    if (toastTimer) clearTimeout(toastTimer);
  });

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  }

  function handleFileInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      handleFile(file);
    }
  }

  function handleFile(file: File) {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isHwp = file.name.endsWith('.hwp') || file.name.endsWith('.hwpx');

    if (isImage || isPdf) {
      const reader = new FileReader();
      reader.onload = () => {
        dispatch('processInput', {
          type: 'image',
          data: reader.result as string,
          fileName: file.name,
          mimeType: isPdf ? 'application/pdf' : file.type || 'image/png',
        });
      };
      reader.readAsDataURL(file);
    } else if (isHwp) {
      const reader = new FileReader();
      reader.onload = () => {
        dispatch('processInput', {
          type: 'hwp',
          data: reader.result as string,
          fileName: file.name,
        });
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        dispatch('processInput', {
          type: 'text',
          data: reader.result as string,
          fileName: file.name,
        });
      };
      reader.readAsText(file);
    }
  }
</script>

<!-- 클립보드 감지 토스트 팝업 -->
{#if showPasteToast}
  <div class="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border border-slate-700 animate-bounce">
    <div class="p-2 bg-blue-500 rounded-lg">
      <Clipboard class="w-5 h-5 text-white" />
    </div>
    <div>
      <p class="text-sm font-bold">{toastMessage}</p>
      <p class="text-xs text-slate-300">AI가 일정과 To-Do를 역산하는 중입니다...</p>
    </div>
  </div>
{/if}

<!-- 상단 드롭존 배너 -->
<div
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
  role="region"
  aria-label="공문 및 텍스트 업로드 드롭존"
  class={`group relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ${
    isDragging
      ? 'border-blue-500 bg-blue-50/80 scale-[1.01] shadow-lg ring-4 ring-blue-100'
      : isProcessing
      ? 'border-indigo-400 bg-indigo-50/50 animate-pulse'
      : 'border-slate-300/80 bg-white/70 shadow-xs'
  }`}
>
  <input
    type="file"
    bind:this={fileInput}
    on:change={handleFileInputChange}
    accept="image/*,.hwp,.hwpx,.pdf,.txt"
    class="hidden"
  />

  <div class="px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      on:click={() => dispatch('openTextInput')}
      class="flex items-center space-x-3.5 cursor-pointer flex-1"
      title="클릭하여 텍스트를 바로 입력할 수 있습니다"
    >
      <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform">
        <UploadCloud class="w-6 h-6" />
      </div>
      <div>
        <div class="flex items-center space-x-2">
          <span class="font-bold text-slate-800 text-sm sm:text-base">
            스샷이나 복사한 글을 화면 어디서나{' '}
            <kbd class="px-2 py-0.5 text-xs font-mono font-semibold text-blue-700 bg-blue-100 border border-blue-300 rounded shadow-2xs">
              Ctrl + V
            </kbd>
          </span>
          <span class="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800">
            <Sparkles class="w-3 h-3 mr-1" />
            스마트 자동 분석
          </span>
        </div>
        <p class="text-xs text-slate-500 mt-0.5">
          여기를 클릭하면 <strong class="text-blue-600">메신저 글 입력창</strong>이 열리고, 파일이나 스크린샷은 그냥 끌어다 놓으세요.
        </p>
      </div>
    </div>

    <div class="flex items-center space-x-2 text-xs font-medium text-slate-600 flex-shrink-0">
      <!-- 텍스트 직접 붙여넣기 버튼 -->
      <button
        type="button"
        on:click={() => dispatch('openTextInput')}
        class="inline-flex items-center px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition font-bold shadow-xs active:scale-95 cursor-pointer"
      >
        <Edit3 class="w-3.5 h-3.5 mr-1" />
        텍스트 붙여넣기
      </button>
      <!-- 파일 선택 버튼 -->
      <button
        type="button"
        on:click={() => fileInput?.click()}
        class="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition font-semibold active:scale-95 cursor-pointer"
      >
        <ImageIcon class="w-3.5 h-3.5 mr-1 text-slate-500" />
        파일·스샷 선택
      </button>
    </div>
  </div>

  {#if isProcessing}
    <div class="absolute inset-0 bg-white/85 backdrop-blur-2xs flex items-center justify-center space-x-3 z-10">
      <div class="w-5 h-5 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span class="text-sm font-bold text-blue-700">
        Gemini 3.5 Flash가 일정을 분석하고 To-Do를 역산하고 있습니다...
      </span>
    </div>
  {/if}
</div>
