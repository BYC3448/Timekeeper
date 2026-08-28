<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import MonthCalendar from '../../components/MonthCalendar.svelte';
  import type { ScheduleEvent } from '../../lib/types';

  export let events: ScheduleEvent[] = [];
  export let selectedDate: Date = new Date();

  const dispatch = createEventDispatcher<{
    selectDate: Date;
    viewSource: {
      title: string;
      sourceImage?: string;
      sourceText?: string;
      date?: string;
      fileName?: string;
      category?: string;
    };
  }>();
</script>

<div class="w-full animate-fade-in">
  <MonthCalendar
    events={events}
    selectedDate={selectedDate}
    on:selectDate={(e) => dispatch('selectDate', e.detail)}
    on:viewSource={(e) => dispatch('viewSource', e.detail)}
  />
</div>
