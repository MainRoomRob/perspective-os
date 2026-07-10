export const THEMES = [
  { id: 'product-light', label: 'Product Light' },
  { id: 'product-dark', label: 'Product Dark' },
  { id: 'editorial-light', label: 'Editorial Light' },
  { id: 'editorial-dark', label: 'Editorial Dark' },
];

export const PALETTES = [
  { id: 'mrs', label: 'MainRoom' },
  { id: 'cool-industrial', label: 'Cool industrial' },
  { id: 'earthy-ochre', label: 'Earthy ochre' },
  { id: 'slate-sand', label: 'Slate & sand' },
  { id: 'braun-signal', label: 'Braun signal' },
];

export const STORAGE_KEY = 'mrs-theme';
export const PALETTE_STORAGE_KEY = 'mrs-palette';

export function applyTheme(themeId, root = document.documentElement) {
  root.setAttribute('data-theme', themeId);

  try {
    localStorage.setItem(STORAGE_KEY, themeId);
  } catch {
    /* storage blocked */
  }
}

export function applyPalette(paletteId, root = document.documentElement) {
  root.setAttribute('data-palette', paletteId);

  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, paletteId);
  } catch {
    /* storage blocked */
  }
}

export function applyColorSystem({ theme, palette }, root = document.documentElement) {
  if (theme) applyTheme(theme, root);
  if (palette) applyPalette(palette, root);
}

export function getStoredTheme(fallback = 'product-light') {
  try {
    return localStorage.getItem(STORAGE_KEY) || fallback;
  } catch {
    return fallback;
  }
}

export function getStoredPalette(fallback = 'mrs') {
  try {
    return localStorage.getItem(PALETTE_STORAGE_KEY) || fallback;
  } catch {
    return fallback;
  }
}

function syncActiveButtons(selector, activeId, dataAttr) {
  document.querySelectorAll(selector).forEach((btn) => {
    const isActive = btn.dataset[dataAttr] === activeId;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

export function initThemeSwitcher(options = {}) {
  const { root = document.documentElement, onChange, onPaletteChange } = options;
  const savedTheme = getStoredTheme();
  const savedPalette = getStoredPalette();
  applyColorSystem({ theme: savedTheme, palette: savedPalette }, root);
  onChange?.(savedTheme);
  onPaletteChange?.(savedPalette);

  document.querySelectorAll('[data-theme-option]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const themeId = btn.dataset.themeOption;
      applyTheme(themeId, root);
      onChange?.(themeId);
      syncActiveButtons('[data-theme-option]', themeId, 'themeOption');
    });
  });

  document.querySelectorAll('[data-palette-option]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const paletteId = btn.dataset.paletteOption;
      applyPalette(paletteId, root);
      onPaletteChange?.(paletteId);
      syncActiveButtons('[data-palette-option]', paletteId, 'paletteOption');
    });
  });

  syncActiveButtons('[data-theme-option]', savedTheme, 'themeOption');
  syncActiveButtons('[data-palette-option]', savedPalette, 'paletteOption');
}
