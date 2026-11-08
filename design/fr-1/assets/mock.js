/* Shared presentation behaviour. Each direction styles the results. */

const root = document.documentElement;
const params = new URLSearchParams(window.location.search);
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const capture = params.has("capture") || reduced;

root.classList.add("js");
if (params.has("capture")) root.classList.add("capture");

/* Reveal on scroll ---------------------------------------------------- */

const revealEls = Array.from(document.querySelectorAll(".reveal"));

if (capture) {
  revealEls.forEach((el) => el.classList.add("in"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
  );
  revealEls.forEach((el) => revealObserver.observe(el));
}

/* Pipelines ----------------------------------------------------------- */

const pipelines = Array.from(document.querySelectorAll("[data-pipeline]"));

function runPipeline(pipeline) {
  pipeline.classList.remove("is-running");
  // Force a reflow so the animation can restart.
  void pipeline.offsetWidth;
  pipeline.classList.add("is-running");
}

if (capture) {
  pipelines.forEach((p) => p.classList.add("is-running"));
} else {
  const pipelineObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runPipeline(entry.target);
          pipelineObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.35 }
  );
  pipelines.forEach((p) => pipelineObserver.observe(p));
}

document.querySelectorAll("[data-replay]").forEach((button) => {
  button.addEventListener("click", () => {
    const scope = button.closest("[data-pipeline-scope]") || document;
    scope.querySelectorAll("[data-pipeline]").forEach(runPipeline);
  });
});

/* Tabs ---------------------------------------------------------------- */

document.querySelectorAll("[data-tabs]").forEach((group) => {
  const tabs = Array.from(group.querySelectorAll("[data-tab]"));
  const panels = Array.from(group.querySelectorAll("[data-panel]"));
  if (!tabs.length) return;

  const select = (name) => {
    tabs.forEach((tab) => {
      const active = tab.dataset.tab === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      const active = panel.dataset.panel === name;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => select(tab.dataset.tab));
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const next =
        event.key === "ArrowRight"
          ? tabs[(index + 1) % tabs.length]
          : tabs[(index - 1 + tabs.length) % tabs.length];
      next.focus();
      select(next.dataset.tab);
    });
  });

  const initial = tabs.find((tab) => tab.classList.contains("is-active")) || tabs[0];
  select(initial.dataset.tab);
});

/* Theme toggle -------------------------------------------------------- */

document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
  const targetSelector = button.dataset.themeTarget;
  const target = targetSelector
    ? document.querySelector(targetSelector)
    : button.closest("[data-theme-scope]") || document;

  button.addEventListener("click", () => {
    const dark = target.classList.toggle("is-dark");
    button.dataset.mode = dark ? "dark" : "light";
    button.setAttribute("aria-pressed", String(dark));
    const label = button.querySelector("[data-theme-label]");
    if (label) label.textContent = dark ? "Dark" : "Light";
  });
});

/* Count-up numbers ---------------------------------------------------- */

const counters = Array.from(document.querySelectorAll("[data-count-to]"));

function animateCount(el) {
  const to = Number(el.dataset.countTo);
  const from = Number(el.dataset.countFrom || 0);
  const duration = Number(el.dataset.countDuration || 1200);
  if (capture) {
    el.textContent = String(to);
    return;
  }
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 4);
    el.textContent = String(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

if (counters.length) {
  if (capture) {
    counters.forEach((el) => (el.textContent = String(el.dataset.countTo)));
  } else {
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            countObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((el) => countObserver.observe(el));
  }
}

/* Pointer spotlight --------------------------------------------------- */

document.querySelectorAll("[data-spotlight]").forEach((el) => {
  if (capture) return;
  el.addEventListener("pointermove", (event) => {
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    el.style.setProperty("--my", `${event.clientY - rect.top}px`);
  });
});

/* Live timestamps ----------------------------------------------------- */

document.querySelectorAll("[data-time]").forEach((el) => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  el.textContent = el.dataset.time === "short" ? `${hh}:${mm}` : `${hh}:${mm}:${String(now.getSeconds()).padStart(2, "0")}`;
});

/* Scroll progress ----------------------------------------------------- */

const progressBar = document.querySelector("[data-progress]");
if (progressBar && !capture) {
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

/* Sticky / fixed header state ---------------------------------------- */

const pageHeader = document.querySelector(".top");
if (pageHeader) {
  const updateHeader = () => {
    pageHeader.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

/* Section nav --------------------------------------------------------- */

const navLinks = Array.from(document.querySelectorAll("[data-nav]"));
if (navLinks.length) {
  const sections = navLinks
    .map((link) => {
      const id = link.getAttribute("href");
      if (!id || !id.startsWith("#")) return null;
      const section = document.querySelector(id);
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  if (sections.length) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          sections.forEach(({ link, section }) =>
            link.classList.toggle("is-active", section === entry.target)
          );
        });
      },
      { rootMargin: "-40% 0px -50% 0px" }
    );
    sections.forEach(({ section }) => navObserver.observe(section));
  }
}

/* Stamp-in elements --------------------------------------------------- */

if (!capture) {
  const stampObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-stamped");
          stampObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  document.querySelectorAll("[data-stamp]").forEach((el) => stampObserver.observe(el));
} else {
  document.querySelectorAll("[data-stamp]").forEach((el) => el.classList.add("is-stamped"));
}
