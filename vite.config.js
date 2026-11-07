import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Most visitors are customers, so start downloading the customer section
 * (and the files it needs) at the same time as the main file, instead of
 * waiting for the main file to run first. Saves one network round trip on 3G.
 */
function preloadCustomerSection() {
  return {
      name: 'preload-customer-section',
      apply: 'build',
      transformIndexHtml: {
        order: 'post',
        handler(html, ctx) {
          if (!ctx.bundle) return html;
          const chunks = Object.values(ctx.bundle).filter((c) => c.type === 'chunk');
          const entry = chunks.find((c) => c.facadeModuleId?.endsWith('/pages/customer/CustomerApp.jsx'));
          if (!entry) return html;
          // The demo database is requested on the very first render (settings), so fetch it early too.
          const db = chunks.find((c) => c.facadeModuleId?.endsWith('/services/db.js'));
          const files = new Set([entry.fileName, ...entry.imports, ...(db ? [db.fileName] : [])]);
          const tags = [
            ...[...files].filter((f) => !html.includes(f)).map((f) => ({ tag: 'link', attrs: { rel: 'modulepreload', href: `/${f}`, crossorigin: true }, injectTo: 'head' })),
          ];
          return { html, tags };
        },
      },
    };
  }

  /**
   * /api proxy for `npm run dev` and `npm run preview`: forwards to the Zevio API
   * and adds the secret key from .env.local, so the key is never in the browser.
   * (In production the Netlify edge function in netlify/edge-functions/api.js does this.)
   */
  function apiProxy(env) {
    const target = (env.ZEVIO_API_URL || 'http://127.0.0.1:2222').replace(/\/+$/, '');

    // Say so at startup rather than letting every call come back as a generic
    // "something went wrong" in the browser. A missing .env.local is the most
    // common way this app breaks locally, and it looks exactly like a server
    // outage from the inside.
    if (!env.ZEVIO_API_KEY || !env.ZEVIO_API_URL) {
      const missing = [
        !env.ZEVIO_API_URL && 'ZEVIO_API_URL',
        !env.ZEVIO_API_KEY && 'ZEVIO_API_KEY',
      ].filter(Boolean);
      console.warn(
        `\n  Zevio: .env.local is missing ${missing.join(' and ')}.\n` +
        `  Every /api call will fail and the app will show "Something went wrong".\n` +
        `  Copy .env.example to .env.local, fill it in, and restart this server.\n`,
      );
    }

    return {
      '/api': {
        target,
        changeOrigin: true,
        secure: true,
        headers: env.ZEVIO_API_KEY ? { 'X-API-Key': env.ZEVIO_API_KEY } : {},
      },
    };
  }

  export default defineConfig(async ({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    /*
     * `npm run dev:phone` serves over HTTPS so the app can be tested on a real
     * phone. Browsers only allow location on https:// or on localhost, and a
     * phone reaching this laptop at http://192.168.x.x:5173 is neither — so
     * there, geolocation is silently refused and GPS can never be tested.
     * A laptop has no GPS of its own, so the phone is where location has to be
     * checked. The certificate is self-signed: the phone warns once, and
     * "Advanced → Proceed" is safe on your own network.
     */
    const phone = mode === 'phone';
    // Loaded only when asked for, so a production build never depends on a
    // dev-only package being installed.
    const phonePlugins = phone ? [(await import('@vitejs/plugin-basic-ssl')).default()] : [];
    return {
    plugins: [react(), preloadCustomerSection(), ...phonePlugins],
    server: { host: true, port: 5173, proxy: apiProxy(env) },
    preview: { proxy: apiProxy(env) },
    build: {
      target: 'es2018',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          // React + router rarely change: keep them in their own file so phones
          // keep it cached when we ship app updates.
          manualChunks(id) {
            if (/node_modules\/(react|react-dom|react-router|react-router-dom|@remix-run|scheduler)\//.test(id)) return 'vendor';
            // Firebase is only for the admin sign-in: its own file, loaded only by /admin.
            if (/node_modules\/(firebase|@firebase|idb|tslib)\//.test(id)) return 'firebase';
            if (/\/src\/(services\/adminAuth\/|context\/AdminAuthContext)/.test(id)) return undefined;
            // Code shared by several sections (UI kit, hooks, services, helpers) goes in ONE
            // file instead of many tiny ones — every extra file costs a round trip on 3G.
            const shared = /\/src\/(components\/(ui|icons|layout)|hooks|utils|i18n|context|styles)\//.test(id) ||
              (/\/src\/services\//.test(id) && !/\/services\/db\.js$/.test(id));
            if (shared && !id.includes('DevRoleSwitcher')) return 'common';
            return undefined;
          },
        },
      },
    },
  };
});
