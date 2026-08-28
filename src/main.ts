import './app.css';
import App from './App.svelte';

const target = document.getElementById('app');

const app = target
  ? new App({
      target,
    })
  : undefined;

export default app;
