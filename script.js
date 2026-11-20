(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- footer year ---------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- theme toggle ---------- */
  const root = document.documentElement;
  const themeBtn = $("#themeToggle");
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const safeGet = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
  const safeSet = (key, val) => { try { localStorage.setItem(key, val); } catch { /* storage blocked */ } };

  const currentTheme = () => root.dataset.theme || (darkQuery.matches ? "dark" : "light");

  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    themeBtn.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#14122a" : "#4a2c9a");
  };

  const saved = safeGet("theme");
  if (saved === "light" || saved === "dark") applyTheme(saved);
  else applyTheme(currentTheme());

  themeBtn.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    safeSet("theme", next);
  });

  /* ---------- mobile menu ---------- */
  const nav = $("#nav");
  const menuBtn = $("#menuToggle");

  const setMenu = (open) => {
    nav.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };

  menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) { setMenu(false); menuBtn.focus(); }
  });
  window.addEventListener("resize", () => { if (window.innerWidth > 760) setMenu(false); });

  /* ---------- active nav link on scroll ---------- */
  const navLinks = $$(".nav a");
  const sections = navLinks
    .map((a) => $(a.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = "#" + entry.target.id;
          navLinks.forEach((a) => {
            const active = a.getAttribute("href") === id;
            a.classList.toggle("active", active);
            if (active) a.setAttribute("aria-current", "true");
            else a.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- hero ballot ---------- */
  const ballot = $("#ballot");
  const ballotMsg = $("#ballotMsg");
  const ballotReset = $("#ballotReset");
  const radios = $$('input[name="vote"]', ballot);
  let redirectTimer = null;

  const messages = {
    contact: "Vote recorded. Taking you to the contact section.",
    work: "Vote recorded. Taking you to the E-Voting System.",
  };

  const goTo = (id) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  };

  radios.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      ballot.classList.add("voted");
      ballotMsg.textContent = messages[radio.value];
      ballotReset.hidden = false;

      clearTimeout(redirectTimer);
      redirectTimer = setTimeout(() => goTo(radio.value), reduceMotion ? 0 : 1100);
    });
  });

  const resetBallot = () => {
    clearTimeout(redirectTimer);
    radios.forEach((r) => { r.checked = false; });
    ballot.classList.remove("voted");
    ballotMsg.textContent = "Your vote is not recorded yet.";
    ballotReset.hidden = true;
  };

  ballotReset.addEventListener("click", resetBallot);
  ballot.addEventListener("submit", (e) => e.preventDefault());

  /* ---------- project tally bars: fill once when scrolled into view ---------- */
  const tally = $("#tally");
  const fillTally = () => {
    $$(".tally-row", tally).forEach((row) => {
      $("i", row).style.width = row.dataset.pct + "%";
    });
  };

  if (tally) {
    if ("IntersectionObserver" in window && !reduceMotion) {
      const once = new IntersectionObserver((entries, obs) => {
        if (entries.some((en) => en.isIntersecting)) {
          fillTally();
          obs.disconnect();
        }
      }, { threshold: 0.4 });
      once.observe(tally);
    } else {
      fillTally();
    }
  }

  /* ---------- contact form: validate, then open the email app ---------- */
  const form = $("#contactForm");
  const note = $("#formNote");
  const TO = "vs3615861@gmail.com";

  const rules = {
    cName: (v) => (v.trim() ? "" : "Enter your name."),
    cEmail: (v) => {
      if (!v.trim()) return "Enter your email address.";
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Enter a valid email address, like name@example.com.";
    },
    cMsg: (v) => (v.trim().length >= 10 ? "" : "Write a message of at least 10 characters."),
  };

  const validateField = (input) => {
    const msg = rules[input.id](input.value);
    const wrap = input.closest(".field");
    $(".err", wrap).textContent = msg;
    wrap.classList.toggle("invalid", Boolean(msg));
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    if (msg) input.setAttribute("aria-describedby", $(".err", wrap).id || (($(".err", wrap).id = input.id + "Err")));
    return !msg;
  };

  const inputs = $$("input, textarea", form);
  inputs.forEach((input) => {
    input.addEventListener("blur", () => validateField(input));
    input.addEventListener("input", () => {
      if (input.closest(".field").classList.contains("invalid")) validateField(input);
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const results = inputs.map(validateField);
    const firstBad = inputs[results.indexOf(false)];
    if (firstBad) {
      firstBad.focus();
      note.textContent = "Fix the highlighted fields, then send again.";
      return;
    }

    const name = $("#cName").value.trim();
    const email = $("#cEmail").value.trim();
    const message = $("#cMsg").value.trim();

    const subject = `Portfolio message from ${name}`;
    const body = `${message}\n\n${name}\n${email}`;
    window.location.href = `mailto:${TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    note.textContent = "Your email app should open with the message ready to send. If it doesn't, write to " + TO + ".";
  });
})();