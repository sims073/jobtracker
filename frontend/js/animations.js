document.addEventListener("DOMContentLoaded", () => {
  runReveal();
  const counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { animateCounters(); io.disconnect(); } });
    }, { threshold: 0.4 });
    io.observe(counters[0]);
  }
});
