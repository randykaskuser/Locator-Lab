// Runs in <head> before paint so a saved theme never flashes.
try {
  const saved = localStorage.getItem('lab-theme');
  if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved;
} catch { /* storage blocked */ }
