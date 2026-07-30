import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Gracefully handle missing credentials so the app doesn't crash on startup.
// Auth-dependent features will fail at call time instead.
let supabase;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn(
    '⚠️ Supabase URL or Anon Key missing. Copy .env.example to .env and fill in your credentials.'
  );

  // Provide a stub so imports don't explode.
  // Every method call will warn instead of crashing.
  const createChainableStub = () => {
    const fn = () => {};
    fn.then = (onfulfilled, onrejected) =>
      Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }).then(onfulfilled, onrejected);
    return new Proxy(fn, {
      get(_, prop) {
        if (prop === 'then') return fn.then;
        return () => createChainableStub();
      },
    });
  };

  supabase = new Proxy(
    {
      auth: new Proxy({}, {
        get(_, prop) {
          if (prop === 'getSession') {
            return () => Promise.resolve({ data: { session: null } });
          }
          if (prop === 'onAuthStateChange') {
            return () => ({ data: { subscription: { unsubscribe: () => {} } } });
          }
          if (prop === 'signInWithPassword' || prop === 'signUp' || prop === 'signOut') {
            return () => Promise.resolve({ data: null, error: { message: 'Supabase not configured. Add .env credentials.' } });
          }
          return () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } });
        },
      }),
      from: () => createChainableStub(),
    },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        return () => createChainableStub();
      },
    }
  );
}

export { supabase };
