(() => {
  const settings = window.FAITHFINDERS_SUPABASE || {};
  const isConfigured = /^https:\/\/.+\.supabase\.co\/?$/i.test(String(settings.url || '').trim())
    && settings.anonKey
    && !String(settings.anonKey).includes('YOUR_SUPABASE');

  const configurationNotice = document.querySelector('#configuration-notice');
  const configurationSteps = document.querySelector('#configuration-steps');
  const loginPanel = document.querySelector('#login-panel');
  const loginForm = document.querySelector('#login-form');
  const loginStatus = document.querySelector('#login-status');
  const dashboard = document.querySelector('#admin-dashboard');
  const identity = document.querySelector('#admin-identity');
  const logoutButton = document.querySelector('#logout-button');
  const videoForm = document.querySelector('#video-form');
  const videoStatus = document.querySelector('#video-form-status');
  const videoList = document.querySelector('#admin-video-list');
  const emptyState = document.querySelector('#admin-video-empty');
  const saveButton = document.querySelector('#save-video-button');
  const cancelEdit = document.querySelector('#cancel-edit');
  const refreshButton = document.querySelector('#refresh-videos');
  const progress = document.querySelector('#upload-progress');
  const toast = document.querySelector('#admin-toast');
  const linkFields = document.querySelector('#link-fields');
  const uploadFields = document.querySelector('#upload-fields');
  let client = null;
  let records = [];
  let currentSession = null;
  let toastTimer = null;

  const fields = {
    id: document.querySelector('#video-id'),
    title: document.querySelector('#video-title'),
    date: document.querySelector('#video-date'),
    speaker: document.querySelector('#video-speaker'),
    category: document.querySelector('#video-category'),
    description: document.querySelector('#video-description'),
    url: document.querySelector('#video-url'),
    file: document.querySelector('#video-file'),
    thumbnail: document.querySelector('#thumbnail-file'),
    published: document.querySelector('#video-published'),
    featured: document.querySelector('#video-featured')
  };

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function showStatus(element, message = '', isError = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('is-error', isError);
  }

  function showToast(message, isError = false) {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle('is-error', isError);
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 4200);
  }

  async function loadSupabaseSdk() {
    if (window.supabase?.createClient) return;
    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-supabase-sdk]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.dataset.supabaseSdk = 'true';
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error('The secure database connection could not be loaded.')), { once: true });
      document.head.appendChild(script);
    });
  }

  function formatDate(value) {
    if (!value) return 'Date not set';
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    }).format(date);
  }

  function sourceName(url = '', storagePath = '') {
    if (storagePath) return 'Uploaded';
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (host.includes('facebook')) return 'Facebook';
      if (host.includes('youtube') || host === 'youtu.be') return 'YouTube';
      if (host.includes('vimeo')) return 'Vimeo';
    } catch (_) {}
    return 'Video link';
  }

  function safeFilename(name = 'file') {
    return name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'file';
  }

  async function verifyAdministrator(user) {
    const { data, error } = await client
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  async function showAuthenticated(session) {
    currentSession = session;
    if (!session?.user) {
      loginPanel.hidden = false;
      dashboard.hidden = true;
      return;
    }

    try {
      const isAdmin = await verifyAdministrator(session.user);
      if (!isAdmin) {
        await client.auth.signOut();
        loginPanel.hidden = false;
        dashboard.hidden = true;
        showStatus(loginStatus, 'This account is not authorized for the FaithFinders administrator portal.', true);
        return;
      }
      loginPanel.hidden = true;
      dashboard.hidden = false;
      if (identity) identity.textContent = `Signed in as ${session.user.email || 'administrator'}`;
      await loadVideos();
    } catch (error) {
      loginPanel.hidden = false;
      dashboard.hidden = true;
      showStatus(loginStatus, error.message || 'Administrator access could not be verified.', true);
    }
  }

  async function loadVideos() {
    videoList.innerHTML = '<p class="admin-form-status">Loading the service archive…</p>';
    const { data, error } = await client
      .from('service_videos')
      .select('*')
      .order('service_date', { ascending: false });
    if (error) {
      videoList.innerHTML = '';
      showToast(error.message || 'The video library could not be loaded.', true);
      return;
    }
    records = Array.isArray(data) ? data : [];
    renderVideos();
  }

  function renderVideos() {
    const total = records.length;
    const published = records.filter((record) => record.published).length;
    const featured = records.find((record) => record.is_featured);
    document.querySelector('#stat-total').textContent = String(total);
    document.querySelector('#stat-published').textContent = String(published);
    document.querySelector('#stat-featured').textContent = featured ? formatDate(featured.service_date).replace(/, \d{4}$/, '') : '—';
    videoList.innerHTML = '';
    emptyState.hidden = total > 0;

    records.forEach((record) => {
      const item = document.createElement('article');
      item.className = 'admin-video-item';
      item.innerHTML = `
        <div class="admin-video-item__media">
          <span>${escapeHtml(sourceName(record.video_url, record.storage_path))}</span>
        </div>
        <div class="admin-video-item__copy">
          <div class="admin-video-item__meta">
            <span class="admin-status-badge ${record.published ? 'is-published' : ''}">${record.published ? 'Published' : 'Hidden'}</span>
            ${record.is_featured ? '<span class="admin-status-badge is-featured">Featured</span>' : ''}
          </div>
          <h3>${escapeHtml(record.title)}</h3>
          <p>${escapeHtml(formatDate(record.service_date))} · ${escapeHtml(record.category || 'Service')}</p>
          <div class="admin-video-actions">
            <button type="button" data-action="edit" data-id="${record.id}">Edit</button>
            <button type="button" data-action="publish" data-id="${record.id}">${record.published ? 'Hide' : 'Publish'}</button>
            ${record.is_featured ? '' : `<button type="button" data-action="feature" data-id="${record.id}">Feature</button>`}
            <button class="is-danger" type="button" data-action="delete" data-id="${record.id}">Delete</button>
          </div>
        </div>`;
      const media = item.querySelector('.admin-video-item__media');
      if (record.thumbnail_url) media.style.backgroundImage = `linear-gradient(145deg, rgba(7,24,35,.35), rgba(7,24,35,.18)), url("${String(record.thumbnail_url).replace(/["\\]/g, '')}")`;
      videoList.appendChild(item);
    });
  }

  function resetForm() {
    videoForm.reset();
    fields.id.value = '';
    fields.speaker.value = 'FaithFinders Church';
    fields.category.value = 'Sunday Service';
    fields.published.checked = true;
    fields.featured.checked = false;
    document.querySelector('input[name="source-type"][value="link"]').checked = true;
    linkFields.hidden = false;
    uploadFields.hidden = true;
    cancelEdit.hidden = true;
    saveButton.textContent = 'Publish Service';
    document.querySelector('#editor-title').textContent = 'Publish a service';
    document.querySelectorAll('.file-drop').forEach((label) => label.classList.remove('has-file'));
    showStatus(videoStatus, '');
  }

  function editRecord(record) {
    fields.id.value = record.id;
    fields.title.value = record.title || '';
    fields.date.value = record.service_date || '';
    fields.speaker.value = record.speaker || '';
    fields.category.value = record.category || '';
    fields.description.value = record.description || '';
    fields.url.value = record.storage_path ? '' : (record.video_url || '');
    fields.published.checked = Boolean(record.published);
    fields.featured.checked = Boolean(record.is_featured);
    const source = record.storage_path ? 'upload' : 'link';
    document.querySelector(`input[name="source-type"][value="${source}"]`).checked = true;
    linkFields.hidden = source !== 'link';
    uploadFields.hidden = source !== 'upload';
    cancelEdit.hidden = false;
    saveButton.textContent = 'Save Changes';
    document.querySelector('#editor-title').textContent = 'Edit service';
    document.querySelector('.admin-editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function uploadAsset(file, folder) {
    const path = `${folder}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
    const { error } = await client.storage.from('service-videos').upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || undefined,
      upsert: false
    });
    if (error) throw error;
    const { data } = client.storage.from('service-videos').getPublicUrl(path);
    return { path, url: data.publicUrl };
  }

  async function removeAssets(paths = []) {
    const valid = paths.filter(Boolean);
    if (!valid.length) return;
    const { error } = await client.storage.from('service-videos').remove(valid);
    if (error) throw error;
  }

  async function saveVideo(event) {
    event.preventDefault();
    if (!currentSession?.user) return;
    const editing = records.find((record) => record.id === fields.id.value) || null;
    const sourceType = document.querySelector('input[name="source-type"]:checked')?.value || 'link';
    const newVideoFile = fields.file.files?.[0] || null;
    const newThumbnailFile = fields.thumbnail.files?.[0] || null;
    let videoUrl = sourceType === 'link' ? fields.url.value.trim() : (editing?.video_url || '');
    let storagePath = sourceType === 'upload' ? (editing?.storage_path || null) : null;
    let thumbnailUrl = editing?.thumbnail_url || null;
    let thumbnailStoragePath = editing?.thumbnail_storage_path || null;
    const newUploadPaths = [];

    if (sourceType === 'link' && !videoUrl) {
      showStatus(videoStatus, 'Paste a public video link before saving.', true);
      return;
    }
    if (sourceType === 'upload' && !newVideoFile && !editing?.storage_path) {
      showStatus(videoStatus, 'Choose a video file before saving.', true);
      return;
    }

    saveButton.disabled = true;
    progress.hidden = false;
    showStatus(videoStatus, newVideoFile || newThumbnailFile ? 'Uploading media securely…' : 'Saving service details…');

    try {
      if (newVideoFile) {
        const uploaded = await uploadAsset(newVideoFile, 'videos');
        videoUrl = uploaded.url;
        storagePath = uploaded.path;
        newUploadPaths.push(uploaded.path);
      }
      if (newThumbnailFile) {
        const uploaded = await uploadAsset(newThumbnailFile, 'thumbnails');
        thumbnailUrl = uploaded.url;
        thumbnailStoragePath = uploaded.path;
        newUploadPaths.push(uploaded.path);
      }

      const payload = {
        title: fields.title.value.trim(),
        service_date: fields.date.value,
        speaker: fields.speaker.value.trim() || 'FaithFinders Church',
        category: fields.category.value.trim() || 'Sunday Service',
        description: fields.description.value.trim(),
        video_url: videoUrl,
        storage_path: storagePath,
        thumbnail_url: thumbnailUrl,
        thumbnail_storage_path: thumbnailStoragePath,
        published: fields.published.checked,
        is_featured: fields.featured.checked
      };

      const query = editing
        ? client.from('service_videos').update(payload).eq('id', editing.id)
        : client.from('service_videos').insert(payload);
      const { error } = await query;
      if (error) throw error;

      const oldPaths = [];
      if (editing && newVideoFile && editing.storage_path && editing.storage_path !== storagePath) oldPaths.push(editing.storage_path);
      if (editing && sourceType === 'link' && editing.storage_path) oldPaths.push(editing.storage_path);
      if (editing && newThumbnailFile && editing.thumbnail_storage_path && editing.thumbnail_storage_path !== thumbnailStoragePath) oldPaths.push(editing.thumbnail_storage_path);
      if (oldPaths.length) await removeAssets(oldPaths);

      showToast(editing ? 'Service updated successfully.' : 'Service published successfully.');
      resetForm();
      await loadVideos();
    } catch (error) {
      if (newUploadPaths.length) {
        try { await removeAssets(newUploadPaths); } catch (_) {}
      }
      showStatus(videoStatus, error.message || 'The service could not be saved.', true);
    } finally {
      saveButton.disabled = false;
      progress.hidden = true;
    }
  }

  async function handleVideoAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const record = records.find((item) => item.id === button.dataset.id);
    if (!record) return;
    const action = button.dataset.action;

    if (action === 'edit') {
      editRecord(record);
      return;
    }

    button.disabled = true;
    try {
      if (action === 'publish') {
        const { error } = await client.from('service_videos').update({ published: !record.published }).eq('id', record.id);
        if (error) throw error;
        showToast(record.published ? 'Service hidden from the public archive.' : 'Service published.');
      }
      if (action === 'feature') {
        const { error } = await client.from('service_videos').update({ is_featured: true, published: true }).eq('id', record.id);
        if (error) throw error;
        showToast('Featured service updated.');
      }
      if (action === 'delete') {
        const confirmed = window.confirm(`Delete “${record.title}”? This cannot be undone.`);
        if (!confirmed) return;
        const { error } = await client.from('service_videos').delete().eq('id', record.id);
        if (error) throw error;
        await removeAssets([record.storage_path, record.thumbnail_storage_path]);
        showToast('Service removed from the library.');
      }
      await loadVideos();
    } catch (error) {
      showToast(error.message || 'The requested change could not be completed.', true);
    } finally {
      button.disabled = false;
    }
  }

  document.querySelectorAll('input[name="source-type"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const isLink = radio.value === 'link' && radio.checked;
      if (radio.checked) {
        linkFields.hidden = !isLink;
        uploadFields.hidden = isLink;
      }
    });
  });

  [fields.file, fields.thumbnail].forEach((input) => {
    input?.addEventListener('change', () => {
      const label = input.closest('.file-drop');
      label?.classList.toggle('has-file', Boolean(input.files?.length));
      const text = label?.querySelector('span');
      if (text && input.files?.[0]) text.textContent = input.files[0].name;
    });
  });

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    showStatus(loginStatus, 'Signing in…');
    const email = document.querySelector('#admin-email').value.trim();
    const password = document.querySelector('#admin-password').value;
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      showStatus(loginStatus, error.message || 'Sign in failed.', true);
      return;
    }
    showStatus(loginStatus, '');
    await showAuthenticated(data.session);
  });

  logoutButton?.addEventListener('click', async () => {
    await client.auth.signOut();
    currentSession = null;
    resetForm();
    loginPanel.hidden = false;
    dashboard.hidden = true;
    showStatus(loginStatus, 'You have been signed out.');
  });
  videoForm?.addEventListener('submit', saveVideo);
  videoList?.addEventListener('click', handleVideoAction);
  cancelEdit?.addEventListener('click', resetForm);
  refreshButton?.addEventListener('click', loadVideos);

  async function initialize() {
    if (!isConfigured) {
      configurationNotice.hidden = false;
      configurationSteps.hidden = false;
      loginPanel.hidden = true;
      dashboard.hidden = true;
      return;
    }
    try {
      await loadSupabaseSdk();
    } catch (error) {
      configurationNotice.hidden = false;
      configurationSteps.hidden = true;
      configurationNotice.querySelector('h2').textContent = 'The secure connection is temporarily unavailable';
      configurationNotice.querySelector('p').textContent = 'Refresh the page when an internet connection is available. Your public website and existing video archive are still working.';
      return;
    }
    client = window.supabase.createClient(settings.url, settings.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    const { data } = await client.auth.getSession();
    await showAuthenticated(data.session);
    client.auth.onAuthStateChange((_event, session) => {
      currentSession = session;
    });
  }

  initialize();
})();
