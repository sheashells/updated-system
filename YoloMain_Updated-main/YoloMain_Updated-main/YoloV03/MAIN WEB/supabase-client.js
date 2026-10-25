/* SIERRA HAVEN Supabase setup (lives in MAIN WEB/).
   Uses the PUBLISHABLE key only. Never put a service_role / sb_secret_ key in browser code. */
(() => {
  const SUPABASE_URL = 'https://uranjhaewlkyzpveedvj.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZPy3oOBCGAGWiVIwPKktBA_RTqpPRcR';
  const LEGACY_AUTH_FLAG = 'sierra-haven-demo-authenticated'; // old flag some pages still read

  // Browser-storage keys that now ALSO live in Supabase (table: user_data), one copy per user.
  const SYNC_KEYS = [
    'sierra-haven-tenant-demo',        // tenant requests, activity, notifications, payment methods
    'sierra-haven-property-interests', // buying inquiries
    'sierra-haven-home-rewards'        // rewards progress
  ];
  const MARKER_KEY = 'sierra-haven-synced-user'; // remembers WHICH user the local copy belongs to

  if (!window.supabase || !window.supabase.createClient) {
    console.error('Supabase library did not load. Add the supabase-js <script> tag BEFORE supabase-client.js.');
    return;
  }
  if (SUPABASE_PUBLISHABLE_KEY.startsWith('PASTE_')) {
    console.warn('Set SUPABASE_PUBLISHABLE_KEY in MAIN WEB/supabase-client.js before using database features.');
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  window.sierraSupabase = client;

  // Original storage functions (so our own writes do not trigger a second save).
  const nativeGet = Storage.prototype.getItem;
  const nativeSet = Storage.prototype.setItem;
  const nativeRemove = Storage.prototype.removeItem;
  const local = (fn, ...args) => { try { return fn.apply(window.localStorage, args); } catch (e) { return null; } };

  let currentUserId = null;

  const syncLegacyFlag = (session) => {
    if (session) local(nativeSet, LEGACY_AUTH_FLAG, 'true');
    else local(nativeRemove, LEGACY_AUTH_FLAG);
  };

  // Simple user object every page can read: window.sierraUser
  const buildUser = (session) => {
    if (!session || !session.user) return null;
    const u = session.user;
    const meta = u.user_metadata || {};
    const email = u.email || '';
    const fullName = String(meta.full_name || '').trim() || email.split('@')[0] || 'Member';
    const parts = fullName.split(/\s+/);
    return {
      id: u.id,
      email,
      fullName,
      firstName: parts[0],
      initials: parts.slice(0, 2).map((p) => (p[0] || '').toUpperCase()).join('')
    };
  };

  const saveKey = async (key, value) => {
    if (!currentUserId) return;
    const { error } = await client.from('user_data').upsert(
      { user_id: currentUserId, key, value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,key' }
    );
    if (error) console.error('Could not save to Supabase:', error.message);
  };
  const deleteKey = async (key) => {
    if (!currentUserId) return;
    const { error } = await client.from('user_data').delete().eq('user_id', currentUserId).eq('key', key);
    if (error) console.error('Could not delete from Supabase:', error.message);
  };

  // Whenever a page saves one of our keys in the browser, also save it to Supabase for this user.
  const isLocalStorage = (store) => { try { return store === window.localStorage; } catch (e) { return false; } };
  Storage.prototype.setItem = function (key, value) {
    nativeSet.call(this, key, value);
    if (isLocalStorage(this) && SYNC_KEYS.includes(key)) saveKey(key, String(value));
  };
  Storage.prototype.removeItem = function (key) {
    nativeRemove.call(this, key);
    if (isLocalStorage(this) && SYNC_KEYS.includes(key)) deleteKey(key);
  };

  // On page load: put THIS user's saved data into the browser, then reload once so the page shows it.
  const loadUserData = async (user) => {
    const { data, error } = await client.from('user_data').select('key,value');
    if (error) {
      console.warn('Could not read user_data. Did you run the SQL setup in Supabase?', error.message);
      return;
    }
    const rows = (data || []).filter((row) => SYNC_KEYS.includes(row.key));
    const marker = local(nativeGet, MARKER_KEY);
    let changed = false;

    // A different person used this browser before: remove their local copy.
    if (marker && marker !== user.id) {
      SYNC_KEYS.forEach((key) => {
        if (local(nativeGet, key) !== null) { local(nativeRemove, key); changed = true; }
      });
    }
    // Server copy wins.
    rows.forEach((row) => {
      if (local(nativeGet, row.key) !== row.value) { local(nativeSet, row.key, row.value); changed = true; }
    });
    // Anything only in the browser (first time on this account) gets uploaded.
    for (const key of SYNC_KEYS) {
      if (rows.some((row) => row.key === key)) continue;
      const value = local(nativeGet, key);
      if (value !== null) await saveKey(key, value);
    }
    local(nativeSet, MARKER_KEY, user.id);
    if (changed) window.location.reload();
  };

  window.sierraReady = client.auth.getSession()
    .then(async ({ data }) => {
      const session = data.session;
      syncLegacyFlag(session);
      window.sierraUser = buildUser(session);
      currentUserId = window.sierraUser ? window.sierraUser.id : null;
      if (window.sierraUser) {
        try { await loadUserData(window.sierraUser); } catch (e) { console.error('Loading user data failed.', e); }
      }
      return session;
    })
    .catch((error) => { console.error('Could not read Supabase session.', error); return null; });

  client.auth.onAuthStateChange((event, session) => {
    syncLegacyFlag(session);
    currentUserId = session && session.user ? session.user.id : null;
    if (event === 'SIGNED_OUT') {
      // Do not leave this person's data in the browser for the next person.
      SYNC_KEYS.concat(MARKER_KEY).forEach((key) => local(nativeRemove, key));
      window.sierraUser = null;
    }
  });
})();
