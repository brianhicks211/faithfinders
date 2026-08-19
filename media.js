(async () => {
  const fallbackConfig = window.FAITHFINDERS_MEDIA || { live: {}, services: [] };
  let config = fallbackConfig;
  const livePlayer = document.querySelector('#live-player');
  const status = document.querySelector('#stream-status');
  const statusText = document.querySelector('#stream-status-text');
  const grid = document.querySelector('#service-video-grid');
  const emptyState = document.querySelector('#archive-empty');
  const searchInput = document.querySelector('#service-search');
  const yearSelect = document.querySelector('#service-year');
  const archiveControls = document.querySelector('.archive-controls');
  const modal = document.querySelector('#video-modal');
  const modalPlayer = document.querySelector('#video-modal-player');
  const modalTitle = document.querySelector('#video-modal-title');
  const modalDate = document.querySelector('#video-modal-date');
  const modalMeta = document.querySelector('#video-modal-meta');
  let lastFocusedElement = null;

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function databaseIsConfigured() {
    const settings = window.FAITHFINDERS_SUPABASE || {};
    return Boolean(
      /^https:\/\/.+\.supabase\.co\/?$/i.test(String(settings.url || '').trim())
      && settings.anonKey
      && !String(settings.anonKey).includes('YOUR_SUPABASE')
    );
  }

  async function loadSupabaseSdk() {
    if (window.supabase?.createClient) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.dataset.supabaseSdk = 'true';
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });
  }

  async function loadPublishedLibrary() {
    if (!databaseIsConfigured()) return fallbackConfig;
    try {
      await loadSupabaseSdk();
      const settings = window.FAITHFINDERS_SUPABASE;
      const client = window.supabase.createClient(settings.url, settings.anonKey);
      const { data, error } = await client
        .from('service_videos')
        .select('id,title,service_date,speaker,category,description,video_url,thumbnail_url,is_featured')
        .eq('published', true)
        .order('service_date', { ascending: false });
      if (error) throw error;
      if (!Array.isArray(data) || !data.length) return fallbackConfig;

      const services = data.map((record) => ({
        id: record.id,
        title: record.title,
        date: record.service_date,
        speaker: record.speaker,
        category: record.category,
        description: record.description,
        videoUrl: record.video_url,
        thumbnail: record.thumbnail_url || ''
      }));
      const featured = data.find((record) => record.is_featured) || data[0];
      return {
        live: {
          embedUrl: featured.video_url,
          externalUrl: '',
          platform: 'FaithFinders',
          statusText: 'Featured service',
          isLive: false,
          poster: featured.thumbnail_url || ''
        },
        services
      };
    } catch (error) {
      console.warn('FaithFinders video library is using its built-in fallback.', error);
      return fallbackConfig;
    }
  }

  function toEmbedUrl(url = '') {
    const value = String(url).trim();
    if (!value) return '';

    try {
      const parsed = new URL(value, window.location.href);
      const host = parsed.hostname.replace(/^www\./, '');

      if (host === 'youtu.be') {
        const id = parsed.pathname.split('/').filter(Boolean)[0];
        return id ? `https://www.youtube.com/embed/${id}` : value;
      }

      if (host.includes('youtube.com')) {
        if (parsed.pathname.startsWith('/embed/')) return value;
        if (parsed.pathname === '/watch') {
          const id = parsed.searchParams.get('v');
          return id ? `https://www.youtube.com/embed/${id}` : value;
        }
        if (parsed.pathname.startsWith('/shorts/')) {
          const id = parsed.pathname.split('/')[2];
          return id ? `https://www.youtube.com/embed/${id}` : value;
        }
        return value;
      }

      if (host.includes('vimeo.com')) {
        const id = parsed.pathname.split('/').filter(Boolean).pop();
        return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : value;
      }

      if (host.includes('facebook.com') && /\/videos\/\d+\/?$/.test(parsed.pathname)) {
        const videoUrl = `https://www.facebook.com${parsed.pathname.replace(/\/$/, '')}`;
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoUrl)}&show_text=false&autoplay=false&width=734`;
      }

      return value;
    } catch (_) {
      return value;
    }
  }

  function isDirectVideo(url = '') {
    try {
      const parsed = new URL(url, window.location.href);
      return /\.(mp4|webm|ogg|mov|m4v)$/i.test(parsed.pathname);
    } catch (_) {
      return /\.(mp4|webm|ogg|mov|m4v)(?:[?#]|$)/i.test(String(url));
    }
  }

  function playerMarkup(url, title, poster = '', eager = false) {
    const safeUrl = escapeHtml(url);
    const safeTitle = escapeHtml(title || 'FaithFinders service');
    const safePoster = poster ? ` poster="${escapeHtml(poster)}"` : '';
    if (isDirectVideo(url)) {
      return `<video controls playsinline preload="${eager ? 'metadata' : 'none'}"${safePoster} aria-label="${safeTitle}">
        <source src="${safeUrl}" />
        Your browser does not support this video format.
      </video>`;
    }
    return `<iframe
      src="${safeUrl}"
      title="${safeTitle}"
      loading="${eager ? 'eager' : 'lazy'}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen></iframe>`;
  }

  function formatDate(dateValue) {
    if (!dateValue) return '';
    const date = new Date(`${dateValue}T12:00:00`);
    if (Number.isNaN(date.getTime())) return dateValue;
    return new Intl.DateTimeFormat('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    }).format(date);
  }

  function youtubeThumbnail(url = '') {
    const embed = toEmbedUrl(url);
    const match = embed.match(/youtube\.com\/embed\/([^?&/]+)/);
    return match ? `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg` : '';
  }

  function renderLive() {
    if (!livePlayer) return;
    const live = config.live || {};
    const embedUrl = toEmbedUrl(live.embedUrl || '');

    if (!embedUrl) return;

    const isFacebookFeed = /facebook\.com\/plugins\/page\.php/i.test(embedUrl);
    livePlayer.classList.toggle('is-facebook-feed', isFacebookFeed);

    livePlayer.innerHTML = playerMarkup(embedUrl, 'FaithFinders featured service', live.poster || '', true);

    if (status) status.classList.toggle('is-live', Boolean(live.isLive));
    if (statusText) statusText.textContent = live.isLive ? 'Live now' : (live.statusText || (isFacebookFeed ? 'Facebook videos' : 'Stream connected'));

    if (live.externalUrl) {
      const note = document.createElement('p');
      note.className = 'stream-backup-link';
      note.innerHTML = `<a href="${escapeHtml(live.externalUrl)}" target="_blank" rel="noopener">Open on ${escapeHtml(live.platform || 'streaming platform')} <span aria-hidden="true">↗</span></a>`;
      livePlayer.insertAdjacentElement('afterend', note);
    }
  }

  function buildYears(services) {
    if (!yearSelect) return;
    const years = [...new Set(services.map((service) => String(service.date || '').slice(0, 4)).filter((year) => /^\d{4}$/.test(year)))].sort().reverse();
    years.forEach((year) => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    });
  }

  function serviceMatches(service, query, year) {
    const haystack = [service.title, service.speaker, service.category, service.description, service.date].join(' ').toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesYear = year === 'all' || String(service.date || '').startsWith(year);
    return matchesQuery && matchesYear;
  }

  function renderServices() {
    if (!grid) return;
    const services = Array.isArray(config.services) ? config.services : [];
    const hasServices = services.some((service) => service && service.videoUrl);
    const query = String(searchInput?.value || '').trim().toLowerCase();
    const year = yearSelect?.value || 'all';
    const filtered = services
      .filter((service) => service && service.videoUrl)
      .filter((service) => serviceMatches(service, query, year))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    grid.innerHTML = '';
    if (archiveControls) archiveControls.hidden = !hasServices;
    if (emptyState) emptyState.hidden = hasServices;

    if (!filtered.length && hasServices) {
      grid.innerHTML = '<p class="archive-no-results">No services match your search.</p>';
      return;
    }

    filtered.forEach((service, index) => {
      const card = document.createElement('article');
      card.className = 'service-video-card reveal is-visible';
      const thumb = service.thumbnail || youtubeThumbnail(service.videoUrl);
      const style = thumb ? ` style="background-image:url('${escapeHtml(thumb)}')"` : '';
      const category = service.category || 'FaithFinders Service';
      const speaker = service.speaker || '';
      const description = service.description || '';

      card.innerHTML = `
        <button class="service-video-card__media" type="button" data-service-index="${index}"${style} aria-label="Play ${escapeHtml(service.title || 'service video')}">
          <span class="service-video-card__overlay"></span>
          <span class="service-video-card__play" aria-hidden="true">▶</span>
          <span class="service-video-card__category">${escapeHtml(category)}</span>
        </button>
        <div class="service-video-card__copy">
          <p>${escapeHtml(formatDate(service.date))}</p>
          <h3>${escapeHtml(service.title || 'FaithFinders Service')}</h3>
          ${speaker ? `<span>${escapeHtml(speaker)}</span>` : ''}
          ${description ? `<div>${escapeHtml(description)}</div>` : ''}
        </div>`;

      card.querySelector('button').addEventListener('click', () => openModal(service));
      grid.appendChild(card);
    });
  }

  function openModal(service) {
    if (!modal || !modalPlayer) return;
    const embedUrl = toEmbedUrl(service.videoUrl || '');
    if (!embedUrl) return;
    lastFocusedElement = document.activeElement;
    modalPlayer.innerHTML = playerMarkup(embedUrl, service.title || 'FaithFinders service', service.thumbnail || '', false);
    if (modalTitle) modalTitle.textContent = service.title || 'FaithFinders Service';
    if (modalDate) modalDate.textContent = formatDate(service.date);
    if (modalMeta) modalMeta.textContent = [service.speaker, service.category].filter(Boolean).join(' • ');
    modal.hidden = false;
    document.body.classList.add('modal-open');
    modal.querySelector('.video-modal__close')?.focus();
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (modalPlayer) modalPlayer.innerHTML = '';
    lastFocusedElement?.focus();
  }

  document.querySelectorAll('[data-close-video]').forEach((button) => button.addEventListener('click', closeModal));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });
  searchInput?.addEventListener('input', renderServices);
  yearSelect?.addEventListener('change', renderServices);

  config = await loadPublishedLibrary();
  const services = Array.isArray(config.services) ? config.services : [];
  renderLive();
  buildYears(services);
  renderServices();
})();
