/** The credits panel: opens from the footer, closes with the button, Escape or a tap outside. */
export function bindCredits(input) {
  const panel = document.getElementById('credits');
  const openBtn = document.getElementById('credits-btn');
  const closeBtn = document.getElementById('credits-close');
  let lastFocus = null;

  const open = () => {
    lastFocus = document.activeElement;
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    closeBtn.focus();
  };

  const close = () => {
    panel.classList.remove('is-open');
    setTimeout(() => {
      panel.hidden = true;
      lastFocus?.focus?.();
    }, 600);
  };

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  panel.addEventListener('click', (e) => {
    if (e.target === panel) close();
  });
  input.on('escape', () => {
    if (!panel.hidden) close();
  });
}
