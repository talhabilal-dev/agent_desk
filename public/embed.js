/**
 * AgentDesk embed loader.
 *
 *   <script src="https://your-agentdesk-host/embed.js"
 *           data-agentdesk-key="wgt_..." async></script>
 *
 * Framework-agnostic: plain ES5 in a Shadow DOM, so it works from static HTML,
 * React, Next.js, Vue, WordPress — anything that can emit a script tag. No
 * globals are leaked and no styles escape the shadow root.
 *
 * Optional attributes:
 *   data-api="https://host"   override where the API is fetched from
 *   data-nonce="..."          CSP nonce, used only if constructable stylesheets
 *                             are unavailable
 */
(function () {
  // Served as a classic script into third-party pages, so strict mode is kept
  // deliberately even though Biome treats it as redundant.
  // biome-ignore lint/suspicious/noRedundantUseStrict: intentional for a
  // third-party embed; see comment above.
  "use strict";

  var PANEL_ID = "agentdesk-panel";

  var CSS = [
    ":host{all:initial;position:fixed;bottom:20px;z-index:2147483000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}",
    "*{box-sizing:border-box;margin:0;padding:0}",
    ".launcher{width:56px;height:56px;border:0;border-radius:999px;cursor:pointer;display:grid;place-items:center;background:var(--ad-accent);color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:transform .15s ease}",
    ".launcher:hover{transform:scale(1.05)}",
    ".launcher:focus-visible{outline:2px solid #fff;outline-offset:2px}",
    ".panel{position:absolute;bottom:72px;width:340px;max-width:calc(100vw - 40px);height:460px;max-height:calc(100dvh - 120px);display:flex;flex-direction:column;overflow:hidden;border-radius:16px;background:var(--ad-bg);color:var(--ad-text);box-shadow:0 20px 50px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.08)}",
    ".panel[hidden]{display:none}",
    ".header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 16px;background:var(--ad-accent);color:#fff;font-size:14px;font-weight:600}",
    ".close{background:none;border:0;color:#fff;font-size:20px;line-height:1;cursor:pointer;padding:0 4px;opacity:.85}",
    ".close:hover{opacity:1}",
    ".messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px}",
    ".msg{max-width:85%;padding:9px 12px;border-radius:12px;font-size:13.5px;line-height:1.45;white-space:pre-wrap;word-break:break-word}",
    ".assistant{align-self:flex-start;background:rgba(255,255,255,.08)}",
    ".user{align-self:flex-end;background:var(--ad-accent);color:#fff}",
    ".muted{opacity:.6;font-style:italic}",
    ".sources{align-self:flex-start;width:85%;display:flex;flex-direction:column;gap:4px;margin-top:2px;padding-top:6px;border-top:1px solid rgba(255,255,255,.1)}",
    ".sources-label{font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.45}",
    ".source{display:flex;flex-direction:column;gap:1px}",
    ".source-label{font-size:11px;font-weight:600;opacity:.75}",
    ".source-quote{font-size:11px;line-height:1.4;opacity:.6}",
    ".form{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(255,255,255,.08)}",
    ".input{flex:1;min-width:0;padding:9px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:var(--ad-text);font-size:13.5px;font-family:inherit}",
    ".input:focus{outline:none;border-color:var(--ad-accent)}",
    ".send{border:0;border-radius:10px;padding:0 14px;background:var(--ad-accent);color:#fff;font-weight:600;font-size:13px;cursor:pointer;font-family:inherit}",
    ".send:disabled{opacity:.5;cursor:not-allowed}",
  ].join("");

  /**
   * Applies the stylesheet without a <style> element where possible.
   * Constructable stylesheets are not subject to `style-src`, so a hardened CSP
   * on the host page no longer leaves the widget unstyled.
   */
  function applyStyles(root, script) {
    try {
      if (typeof CSSStyleSheet === "function" && "replaceSync" in CSSStyleSheet.prototype) {
        var sheet = new CSSStyleSheet();
        sheet.replaceSync(CSS);
        root.adoptedStyleSheets = [sheet];
        return;
      }
    } catch (error) {
      /* older engines: fall through to a <style> element */
    }

    var style = document.createElement("style");
    var nonce = script.getAttribute("data-nonce");
    if (nonce) {
      style.setAttribute("nonce", nonce);
    }
    style.textContent = CSS;
    root.appendChild(style);
  }

  function mount(script) {
    var key =
      script.getAttribute("data-agentdesk-key") || script.getAttribute("data-key");
    if (!key) {
      console.warn("[AgentDesk] embed script is missing data-agentdesk-key");
      return;
    }

    var base = script.getAttribute("data-api") || new URL(script.src).origin;
    var endpoint = base + "/api/widget/" + encodeURIComponent(key);

    fetch(endpoint + "/config", { headers: { Accept: "application/json" } })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("config request failed (" + response.status + ")");
        }
        return response.json();
      })
      .then(function (config) {
        render(script, config, endpoint);
      })
      .catch(function (error) {
        console.error("[AgentDesk] could not load widget:", error.message);
      });
  }

  function render(script, config, endpoint) {
    var theme = config.theme || {};
    var history = [];

    var host = document.createElement("div");
    host.style.setProperty("--ad-accent", theme.primaryColor || "#4f46e5");
    host.style.setProperty("--ad-bg", theme.backgroundColor || "#0b0b12");
    host.style.setProperty("--ad-text", theme.textColor || "#f8fafc");

    var left = theme.position === "bottom-left";
    host.style.left = left ? "20px" : "auto";
    host.style.right = left ? "auto" : "20px";

    var root = host.attachShadow({ mode: "open" });
    applyStyles(root, script);

    var launcher = document.createElement("button");
    launcher.className = "launcher";
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Open chat");
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-controls", PANEL_ID);
    launcher.innerHTML =
      '<svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

    var panel = document.createElement("div");
    panel.className = "panel";
    panel.hidden = true;
    panel.id = PANEL_ID;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", PANEL_ID + "-title");

    // Configured size. The stylesheet still clamps both to the viewport, so a
    // large panel on a phone shrinks instead of overflowing.
    var size = config.size || {};
    if (size.width) {
      panel.style.width = size.width + "px";
    }
    if (size.height) {
      panel.style.height = size.height + "px";
    }
    // Anchor the panel to the launcher's side so it opens inward.
    panel.style[left ? "left" : "right"] = "0";

    var header = document.createElement("div");
    header.className = "header";
    var title = document.createElement("span");
    title.id = PANEL_ID + "-title";
    title.textContent = config.title || "Chat";
    var close = document.createElement("button");
    close.className = "close";
    close.type = "button";
    close.setAttribute("aria-label", "Close chat");
    close.textContent = "\u00d7";
    header.appendChild(title);
    header.appendChild(close);

    var messages = document.createElement("div");
    messages.className = "messages";
    // Announced by screen readers as replies and citations arrive.
    messages.setAttribute("role", "log");
    messages.setAttribute("aria-live", "polite");
    messages.setAttribute("aria-relevant", "additions");

    var form = document.createElement("form");
    form.className = "form";
    var input = document.createElement("input");
    input.className = "input";
    input.type = "text";
    input.autocomplete = "off";
    input.setAttribute("aria-label", "Message");
    input.placeholder = "Write a message\u2026";
    var send = document.createElement("button");
    send.className = "send";
    send.type = "submit";
    send.textContent = "Send";
    form.appendChild(input);
    form.appendChild(send);

    panel.appendChild(header);
    panel.appendChild(messages);
    panel.appendChild(form);
    root.appendChild(launcher);
    root.appendChild(panel);
    document.body.appendChild(host);

    addMessage("assistant", config.welcomeMessage || "Hi!");

    function addMessage(role, text) {
      var bubble = document.createElement("div");
      bubble.className = "msg " + role;
      bubble.textContent = text;
      messages.appendChild(bubble);
      messages.scrollTop = messages.scrollHeight;

      return bubble;
    }

    function toggle(open) {
      panel.hidden = !open;
      launcher.setAttribute("aria-expanded", open ? "true" : "false");
      launcher.setAttribute("aria-label", open ? "Close chat" : "Open chat");

      if (open) {
        input.focus();
      } else {
        // Return focus to the control that opened the dialog, so keyboard users
        // are not dropped back onto the document body.
        launcher.focus();
      }
    }

    launcher.addEventListener("click", function () {
      toggle(panel.hidden);
    });
    close.addEventListener("click", function () {
      toggle(false);
    });
    panel.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        toggle(false);
      }
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var text = input.value.trim();
      if (!text) {
        return;
      }

      input.value = "";
      addMessage("user", text);
      history.push({ role: "user", content: text });
      send.disabled = true;

      var pending = addMessage("assistant", "Thinking\u2026");
      pending.classList.add("muted");

      fetch(endpoint + "/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: history.slice(0, -1) }),
      })
        .then(function (response) {
          return response.json().then(function (body) {
            if (!response.ok) {
              throw new Error(body && body.error ? body.error : "request failed");
            }
            return body;
          });
        })
        .then(function (body) {
          var reply = String(body.reply || "");
          pending.classList.remove("muted");
          pending.textContent = reply;
          history.push({ role: "assistant", content: reply });

          var citations = body.citations || [];
          if (citations.length > 0) {
            var box = document.createElement("div");
            box.className = "sources";
            var heading = document.createElement("div");
            heading.className = "sources-label";
            heading.textContent = "Answered from";
            box.appendChild(heading);

            var seen = [];
            for (var i = 0; i < citations.length; i++) {
              var citation = citations[i];
              var citationKey =
                (citation.source || "") + "|" + (citation.quote || "");
              if (seen.indexOf(citationKey) !== -1) {
                continue;
              }
              seen.push(citationKey);

              var item = document.createElement("div");
              item.className = "source";
              var label = document.createElement("div");
              label.className = "source-label";
              label.textContent = citation.source || "";
              var quote = document.createElement("div");
              quote.className = "source-quote";
              quote.textContent = citation.quote
                ? "\u201c" + citation.quote + "\u201d"
                : "";
              item.appendChild(label);
              item.appendChild(quote);
              box.appendChild(item);
            }

            messages.appendChild(box);
            messages.scrollTop = messages.scrollHeight;
          }
        })
        .catch(function (error) {
          pending.classList.remove("muted");
          pending.textContent = "Sorry, something went wrong: " + error.message;
        })
        .then(function () {
          send.disabled = false;
          input.focus();
        });
    });
  }

  /**
   * Mounts every embed that has not been initialised yet.
   *
   * `document.currentScript` is null when the tag uses `async`, and the previous
   * fallback ("the last script on the page") meant a second embed read the wrong
   * key and silently never mounted. Scanning for unmounted tags instead supports
   * any number of embeds per page.
   */
  function init() {
    var scripts = document.querySelectorAll("script[data-agentdesk-key]");

    for (var i = 0; i < scripts.length; i++) {
      var script = scripts[i];
      if (script.getAttribute("data-agentdesk-mounted")) {
        continue;
      }
      script.setAttribute("data-agentdesk-mounted", "1");
      mount(script);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
