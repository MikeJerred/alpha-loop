<script lang="ts">
  import 'viem/window';
  import Header from './Header.svelte';
  import '../app.css';

  let { children } = $props();
</script>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    width: 100%;
    max-width: 64rem;
    margin: 0 auto;
    box-sizing: border-box;
  }
</style>

<div class="app">
  <Header />

  <main class="@container">
    {@render children()}
  </main>
</div>
