/**
 * Theme Management System
 * Handles light/dark mode with system preference detection and persistence
 */

export function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    
    // 1. Determine initial theme
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    
    const initialTheme = savedTheme || (systemPrefersDark.matches ? 'dark' : 'light');
    
    // 2. Apply initial theme
    applyTheme(initialTheme);
    
    // 3. Sync toggle switch state
    if (themeToggle) {
        themeToggle.checked = (initialTheme === 'dark');
        
        // 4. Listen for manual changes
        themeToggle.addEventListener('change', () => {
            const newTheme = themeToggle.checked ? 'dark' : 'light';
            applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
    
    // 5. Listen for system change if no manual override exists
    systemPrefersDark.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
            if (themeToggle) themeToggle.checked = e.matches;
        }
    });

    function applyTheme(theme) {
        htmlElement.setAttribute('data-theme', theme);
    }
}
