/**
 * Dynamically loads a Google Font by name.
 * @param {string} fontName - The name of the Google Font to load.
 */
export function loadGoogleFont(fontName) {
  if (!fontName || fontName === 'Arial' || fontName === 'Helvetica' || fontName === 'sans-serif') {
    return;
  }

  const fontId = `google-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(fontId)) {
    return;
  }

  const link = document.createElement('link');
  link.id = fontId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

/**
 * Updates the label font in the document root and loads it if it's a Google Font.
 * @param {string} fontName - The name of the font.
 */
export function applyLabelFont(fontName) {
  if (!fontName) return;
  
  // Apply to CSS variable
  document.documentElement.style.setProperty('--label-font', `'${fontName}', sans-serif`);
  
  // Load if it's a Google Font (assuming everything else is a system font)
  const systemFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Trebuchet MS'];
  if (!systemFonts.includes(fontName)) {
    loadGoogleFont(fontName);
  }
}
