<script lang="ts">
  import { page } from '$app/state';
  import github from '$lib/images/github.svg';

  const routes = [
    { text: 'Home', url: '/' },
    { text: 'Loops', url: '/loops' },
    { text: 'Positions', url: '/positions' },
  ];
</script>

<style>
  header {
    display: flex;
    justify-content: space-between;
    padding: 1rem 2rem;
  }

  .corner {
    width: 3em;
    height: 3em;

    a {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    img {
      width: 2em;
      height: 2em;
    }
  }

  nav {
    display: flex;
    justify-content: center;

    a {
      color: var(--color-text);
      display: flex;
      height: 100%;
      align-items: center;
      padding: 0 0.5rem;
      font-weight: 700;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      text-decoration: none;
      transition: color 0.2s linear;

      &:hover {
        color: var(--color-theme-1);
      }
    }
  }

  ul {
    padding: 0;
    margin: 0;
    display: flex;
    list-style: none;

    li {
      position: relative;

      &[aria-current='page'] {
        &::before {
          --size: 6px;
          content: '';
          width: 0;
          height: 0;
          position: absolute;
          top: 0;
          left: calc(50% - var(--size));
          border: var(--size) solid transparent;
          border-top: var(--size) solid var(--color-theme-1);
        }

        a {
          color: var(--color-theme-1);
        }
      }
    }
  }
</style>

<header>
  <nav>
    <ul>
      {#each routes as route}
        <li aria-current={page.url.pathname === route.url ? 'page' : undefined}>
          <a href={route.url}>{route.text}</a>
        </li>
      {/each}
    </ul>
  </nav>

  <div class="corner">
    <a href="https://github.com/MikeJerred/alpha-loop" target="_blank">
      <img src={github} alt="GitHub" />
    </a>
  </div>
</header>
