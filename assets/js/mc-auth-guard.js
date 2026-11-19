import { supabase } from './supabase-client.js';

const page = location.pathname.split('/').pop() || '';
const isDashboard = page === 'dashboard.html';
const params = new URLSearchParams(location.search);
const isPublicWorkspacePreview = page === 'event-workspace.html' &&
  (params.has('fulltemplate') || location.hash.startsWith('#invite='));
const requiresAuth = isDashboard || (page === 'event-workspace.html' && !isPublicWorkspacePreview);

if (requiresAuth) {
  document.documentElement.style.visibility = 'hidden';
  const loginUrl = new URL('./login.html', location.href);
  loginUrl.searchParams.set('next', page === 'event-workspace.html' ? 'dashboard.html' : 'dashboard.html');

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) {
      location.replace(loginUrl.href);
    } else {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        await supabase.auth.signOut();
        location.replace(loginUrl.href);
      } else {
        document.documentElement.style.visibility = '';
        const signOut = document.createElement('button');
        signOut.type = 'button';
        signOut.textContent = 'Sign out';
        signOut.setAttribute('aria-label', 'Sign out of MAGIC CREATIONS');
        signOut.style.cssText = 'position:fixed;right:18px;top:16px;z-index:99999;border:1px solid #d9c9be;background:#fffdf9;color:#554941;padding:8px 12px;border-radius:5px;font:600 11px Arial;cursor:pointer;box-shadow:0 2px 10px #0000000d';
        signOut.addEventListener('click', async () => {
          signOut.disabled = true;
          const { error: signOutError } = await supabase.auth.signOut();
          if (signOutError) {
            signOut.disabled = false;
            alert('Could not sign out. Please try again.');
          } else {
            location.replace('./login.html');
          }
        });
        document.body.appendChild(signOut);
      }
    }
  } catch (error) {
    console.error('MAGIC CREATIONS authentication check failed:', error);
    location.replace(loginUrl.href);
  }

  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') location.replace(loginUrl.href);
  });
}
