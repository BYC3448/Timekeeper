<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import TodayDashboard from '../../components/TodayDashboard.svelte';
  import type { ScheduleEvent, TodoItem, WeeklyTimetable, MorningBriefingItem } from '../../lib/types';

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
</script>

<div class="w-full animate-fade-in">
  <TodayDashboard
    selectedDate={selectedDate}
    todos={todos}
    events={events}
    timetable={timetable}
    briefings={briefings}
    on:toggleTodo={(e) => dispatch('toggleTodo', e.detail)}
    on:deleteTodo={(e) => dispatch('deleteTodo', e.detail)}
    on:addTodo={(e) => dispatch('addTodo', e.detail)}
    on:toggleBriefing={(e) => dispatch('toggleBriefing', e.detail)}
    on:addBriefing={(e) => dispatch('addBriefing', e.detail)}
    on:viewSource={(e) => dispatch('viewSource', e.detail)}
    on:openTimetableModal={() => dispatch('openTimetableModal')}
  />
</div>
