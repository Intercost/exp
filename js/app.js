/**
 * EXP SUPPLIER NETWORK — shared UI behaviour
 * Loaded on every page. Small, dependency-free, progressive — every
 * control here degrades to a plain working HTML form/link if JS fails.
 */
(function () {
  "use strict";

  /* ----------------------------- TOASTS ----------------------------- */
  function ensureToastStack() {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      stack.setAttribute("role", "status");
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    return stack;
  }

  window.expToast = function (message, type = "default", timeout = 4200) {
    const stack = ensureToastStack();
    const el = document.createElement("div");
    el.className = "toast" + (type === "error" ? " toast-error" : type === "success" ? " toast-success" : "");
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity .2s ease";
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 200);
    }, timeout);
  };

  /* ----------------------------- MODALS ----------------------------- */
  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open-modal]");
    if (opener) {
      const id = opener.getAttribute("data-open-modal");
      const scrim = document.getElementById(id);
      if (scrim) scrim.classList.add("is-open");
    }
    const closer = e.target.closest("[data-close-modal]");
    if (closer) {
      closer.closest(".modal-scrim")?.classList.remove("is-open");
    }
    if (e.target.classList?.contains("modal-scrim")) {
      e.target.classList.remove("is-open");
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-scrim.is-open").forEach((m) => m.classList.remove("is-open"));
    }
  });

  /* ------------------------- SIDEBAR (mobile) ------------------------- */
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-sidebar-toggle]")) {
      document.querySelector(".dash-sidebar")?.classList.add("is-open");
      document.querySelector(".sidebar-scrim")?.classList.add("is-open");
    }
    if (e.target.closest("[data-sidebar-close]") || e.target.classList?.contains("sidebar-scrim")) {
      document.querySelector(".dash-sidebar")?.classList.remove("is-open");
      document.querySelector(".sidebar-scrim")?.classList.remove("is-open");
    }
  });

  /* --------------------------- MOBILE NAV ----------------------------- */
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-topnav-toggle]")) {
      document.querySelector(".topnav-links")?.classList.toggle("is-open");
    }
    // Close menu when a link is clicked
    if (e.target.closest(".topnav-links a")) {
      document.querySelector(".topnav-links")?.classList.remove("is-open");
    }
  });

  /* ------------------------- PASSWORD TOGGLE -------------------------- */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".password-toggle");
    if (!btn) return;
    const input = btn.closest(".password-row")?.querySelector("input");
    if (!input) return;
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    btn.textContent = showing ? "SHOW" : "HIDE";
  });

  /* --------------------------- PILL SELECTS --------------------------- */
  document.addEventListener("click", (e) => {
    const pill = e.target.closest(".select-pill");
    if (!pill) return;
    const input = pill.querySelector("input");
    if (!input) return;
    if (input.type === "checkbox") {
      input.checked = !input.checked;
      pill.classList.toggle("is-checked", input.checked);
    } else if (input.type === "radio") {
      pill.parentElement.querySelectorAll(".select-pill").forEach((p) => p.classList.remove("is-checked"));
      input.checked = true;
      pill.classList.add("is-checked");
    }
  });

  /* ----------------------------- DROPZONE ----------------------------- */
  document.querySelectorAll(".dropzone").forEach((zone) => {
    const input = zone.querySelector('input[type="file"]');
    if (!input) return;
    ["dragenter", "dragover"].forEach((evt) =>
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        zone.classList.add("is-dragover");
      })
    );
    ["dragleave", "drop"].forEach((evt) =>
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        zone.classList.remove("is-dragover");
      })
    );
    zone.addEventListener("drop", (e) => {
      const files = e.dataTransfer?.files;
      if (files?.length) {
        input.files = files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    zone.addEventListener("click", (e) => {
      if (e.target === zone || zone.contains(e.target)) {
        if (!e.target.closest("button")) input.click();
      }
    });
  });

  /* ------------------------- FORM VALIDATION --------------------------- */
  window.expValidate = function (form) {
    let valid = true;
    form.querySelectorAll("[required]").forEach((field) => {
      const wrap = field.closest(".field") || field;
      const value = field.type === "checkbox" ? field.checked : field.value.trim();
      const isInvalid = field.type === "checkbox" ? !value : !value;
      if (isInvalid) {
        valid = false;
        wrap.classList.add("has-error");
      } else {
        wrap.classList.remove("has-error");
      }
      if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        valid = false;
        wrap.classList.add("has-error");
      }
    });
    return valid;
  };

  document.addEventListener("input", (e) => {
    const field = e.target;
    if (field.matches(".input")) {
      field.closest(".field")?.classList.remove("has-error");
    }
  });

  /* ------------------------- AWAITING-BACKEND NOTE --------------------------
   * Buttons/forms that would hit the live backend show a calm, on-brand
   * toast instead of failing silently while BACKEND_READY is false.
   */
  window.expGuardSubmit = function (label = "This will go live once the backend is connected.") {
    if (!window.EXP_CONFIG?.BACKEND_READY) {
      window.expToast(label, "default");
      return false;
    }
    return true;
  };

  /* ------------------------------ FOOTER YEAR ------------------------------ */
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();