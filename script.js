const header = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.primary-nav');
const navLinks = nav ? nav.querySelectorAll('a') : [];
const navDropdowns = document.querySelectorAll('.nav-dropdown');
const form = document.querySelector('#contact-form');
const formNote = document.querySelector('#form-note');

function closeDropdowns(except = null) {
  navDropdowns.forEach((dropdown) => {
    if (dropdown === except) return;
    dropdown.classList.remove('is-open');
    const toggle = dropdown.querySelector('.nav-dropdown__toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  });
}

function closeMenu() {
  closeDropdowns();
  if (!menuToggle || !nav) return;
  menuToggle.setAttribute('aria-expanded', 'false');
  nav.classList.remove('is-open');
  document.body.classList.remove('menu-open');
}

if (menuToggle && nav) menuToggle.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  nav.classList.toggle('is-open', !isOpen);
  document.body.classList.toggle('menu-open', !isOpen);
});

navLinks.forEach((link) => link.addEventListener('click', closeMenu));


navDropdowns.forEach((dropdown) => {
  const toggle = dropdown.querySelector('.nav-dropdown__toggle');
  if (!toggle) return;

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = !dropdown.classList.contains('is-open');
    closeDropdowns(dropdown);
    dropdown.classList.toggle('is-open', willOpen);
    toggle.setAttribute('aria-expanded', String(willOpen));
  });
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.nav-dropdown')) closeDropdowns();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeDropdowns();
    closeMenu();
  }
});


window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 20);
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

if (form) form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const fullName = `${data.get('firstName')} ${data.get('lastName')}`.trim();
  const subject = encodeURIComponent(`Website message from ${fullName}`);
  const body = encodeURIComponent(
    `Name: ${fullName}\nEmail: ${data.get('email')}\nPhone: ${data.get('phone') || 'Not provided'}\n\nMessage:\n${data.get('message')}`
  );

  formNote.textContent = 'Opening your email application…';
  window.location.href = `mailto:rgafaithfinder@yahoo.com?subject=${subject}&body=${body}`;
});
