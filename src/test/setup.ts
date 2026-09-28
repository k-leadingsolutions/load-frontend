import '@testing-library/jest-dom/vitest'

/*
 * jsdom has no ResizeObserver implementation. RoleLayout (used by every
 * routed page via AppRouter) measures its fixed mobile nav's real height
 * with one to keep bottom-nav content clearance accurate; without this stub
 * every test rendering RoleLayout would throw "ResizeObserver is not
 * defined". This default no-op keeps existing tests unaffected — tests that
 * specifically need to simulate a measured height install their own mock.
 */
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}
