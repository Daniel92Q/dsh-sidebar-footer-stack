/**
 * Browser half of dsh-sidebar-footer-stack.
 *
 * 1. Layout: stack every entry of the host slot `sidebar.footer.action`
 *    vertically and give each one the same card chrome dsh-cost-meter uses.
 *    The container holds one class-less, display:contents outlet element
 *    (measured 0x0) whose children are the real entries, so chrome has to land
 *    on that second level and the outlet itself must stay invisible.
 *
 * 2. Drag to reorder: entries are draggable and dropping one on another's edge
 *    moves it there. Order is expressed with the flex `order` property, NOT by
 *    moving DOM nodes: the slot is React-rendered, so an imperative DOM move is
 *    undone by the next re-render, while `order` is a style React does not own.
 *    The resulting sequence is kept in localStorage, so it survives reloads.
 *
 * Selectors match on the CSS-module SUFFIX only: the same package built into
 * the app and into the CLI carries different hashes (n_2Q3W_* vs hHd-Xa_*), so
 * a full class name silently matches nothing.
 */
window.__ModuleLoader__.load({
  id: 'dsh-sidebar-footer-stack',
  factory: function () {
    var module = { exports: {} };
    var exports = module.exports;

    var VERSION = '1.5.0';
    var STYLE_ID = 'dsh-sidebar-footer-stack';
    var PROBE = '/sidebar-footer-stack/probe';
    var ORDER_KEY = 'dsh-sidebar-footer-stack.order';
    var CARD = 'border:1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.28)) !important;border-radius:12px !important;background:var(--dsw-alias-bg-layer-1, transparent) !important;box-sizing:border-box';
    var CARET = '.cm-bbox';
    var BRAND = 'var(--dsw-alias-brand-primary, #4f7cff)';

    var CSS = [
      /* 1. stack every entry vertically */
      '[class*="footerActions"]{flex-direction:column !important;align-items:stretch;gap:6px}',
      '[class*="collapsed"] [class*="footerActions"]{align-items:center;gap:6px}',
      /* 2. one card frame per entry - container level and outlet level */
      '[class*="footerActions"] > *{' + CARD + '}',
      '[class*="footerActions"] > *:not([class]) > *{' + CARD + '}',
      /* 3. an entry that renders its own card boxes keeps its own frame */
      '[class*="footerActions"] > *:has(' + CARET + '):not([class*="simple"]),' +
      '[class*="footerActions"] > *:not([class]) > *:has(' + CARET + '):not([class*="simple"])' +
      '{border-color:transparent !important;background:transparent !important}',
      /* 4. the outlet wrapper never paints a frame */
      '[class*="footerActions"] > *:not([class]){border:0 !important;border-radius:0 !important;background:transparent !important}',
      /* 5. drag affordances */
      '[data-dshs-drag]{cursor:grab;-webkit-user-drag:element}',
      '[data-dshs-drag]:active{cursor:grabbing}',
      '[data-dshs-dragging="true"]{opacity:.45}',
      '[data-dshs-over="above"]{box-shadow:0 -2px 0 0 ' + BRAND + '}',
      '[data-dshs-over="below"]{box-shadow:0 2px 0 0 ' + BRAND + '}',
      /* 6. separator hairline in the host's own style */
      '[class*="footerActions"]{border-top:.5px solid var(--dsw-alias-border-l2, rgba(128,128,128,.28))}'
    ].join('\n');

    /** Inject or REFRESH the stylesheet: the host hot-swaps bundles without a page reload. */
    function ensureStyle() {
      if (typeof document === 'undefined') return;
      var tag = document.getElementById(STYLE_ID);
      if (tag === null) {
        tag = document.createElement('style');
        tag.id = STYLE_ID;
        tag.dataset.plugin = 'dsh-sidebar-footer-stack';
        document.head.appendChild(tag);
      }
      if (tag.textContent !== CSS) tag.textContent = CSS;
      tag.dataset.rev = VERSION;
    }

    // ---------------------------------------------------------------- order

    /** Diagnostics are opt-in: set localStorage['dsh-sidebar-footer-stack.debug'] = '1' and reload. */
    function debugEnabled() {
      try {
        return localStorage.getItem('dsh-sidebar-footer-stack.debug') === '1';
      } catch (error) {
        return false;
      }
    }

    function readStored() {
      try {
        var value = JSON.parse(localStorage.getItem(ORDER_KEY) || '[]');
        return Object.prototype.toString.call(value) === '[object Array]' ? value : [];
      } catch (error) {
        return [];
      }
    }
    function writeStored(ids) {
      try { localStorage.setItem(ORDER_KEY, JSON.stringify(ids)); } catch (error) { void error; }
    }

    /** A stable name for one entry, derived from what the plugin itself renders. */
    function identity(el) {
      var pinned = el.getAttribute('data-dshs-id');
      if (pinned !== null) return pinned;
      var cls = String(el.className || '').trim();
      var dataNames = [];
      for (var i = 0; i < el.attributes.length; i++) {
        var name = el.attributes[i].name;
        if (name.indexOf('data-') === 0 && name !== 'data-dshs-id') dataNames.push(name);
      }
      var id = cls !== '' ? cls : (dataNames.length > 0 ? dataNames.join('+') : el.tagName.toLowerCase());
      el.setAttribute('data-dshs-id', id);
      return id;
    }

    function orderOf(el) {
      var raw = el.style.order;
      return raw === '' ? Number.MAX_SAFE_INTEGER : Number(raw);
    }
    function byRendered(a, b, entries) {
      var oa = orderOf(a), ob = orderOf(b);
      if (oa !== ob) return oa - ob;
      return entries.indexOf(a) - entries.indexOf(b);
    }
    function applyOrder(seq) {
      for (var i = 0; i < seq.length; i++) seq[i].style.order = String(i);
      var ids = [];
      for (var j = 0; j < seq.length; j++) ids.push(identity(seq[j]));
      writeStored(ids);
    }

    // ------------------------------------------------------------------ dom

    var containerEl = null;
    function container() {
      if (containerEl !== null && containerEl.isConnected) return containerEl;
      containerEl = document.querySelector('[class*="footerActions"]');
      return containerEl;
    }
    /** The host's class-less display:contents outlet holds the entries. */
    function entryHost(box) {
      var first = box.children[0];
      if (first !== undefined && first !== null && String(first.className || '') === '' && first.children.length > 0) return first;
      return box;
    }
    function entriesOf(box) {
      return Array.prototype.slice.call(entryHost(box).children);
    }

    var dragEl = null, overEl = null, overBelow = false, lastDragEnd = 0;

    function clearOver() {
      if (overEl !== null) overEl.removeAttribute('data-dshs-over');
      overEl = null;
    }
    function entryFrom(node) {
      if (node === null || node === undefined) return null;
      return node.closest === undefined ? null : node.closest('[data-dshs-drag]');
    }
    function syncDraggable() {
      var box = container();
      if (box === null) return;
      var entries = entriesOf(box);
      for (var i = 0; i < entries.length; i++) {
        entries[i].setAttribute('draggable', 'true');
        entries[i].setAttribute('data-dshs-drag', '');
      }
    }
    /** Re-assert the stored sequence, but only when it is actually out of sync. */
    function syncOrder() {
      var box = container();
      if (box === null) return;
      var entries = entriesOf(box);
      if (entries.length < 2) return;
      var stored = readStored();
      if (stored.length === 0) return;
      var want = entries.slice().sort(function (a, b) {
        var ia = stored.indexOf(identity(a)), ib = stored.indexOf(identity(b));
        if (ia < 0 && ib < 0) return entries.indexOf(a) - entries.indexOf(b);
        if (ia < 0) return 1;
        if (ib < 0) return -1;
        return ia - ib;
      });
      var have = entries.slice().sort(function (a, b) { return byRendered(a, b, entries); });
      if (want.join('|') === have.join('|')) return;
      applyOrder(want);
    }

    function onDragStart(event) {
      var el = entryFrom(event.target);
      if (el === null) return;
      dragEl = el;
      el.setAttribute('data-dshs-dragging', 'true');
      try {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', identity(el));
      } catch (error) { void error; }
    }
    function onDragOver(event) {
      if (dragEl === null) return;
      var el = entryFrom(event.target);
      if (el === null || el === dragEl) { clearOver(); return; }
      event.preventDefault();
      try { event.dataTransfer.dropEffect = 'move'; } catch (error) { void error; }
      var box = el.getBoundingClientRect();
      var below = event.clientY > box.top + box.height / 2;
      if (overEl !== el || overBelow !== below) {
        clearOver();
        overEl = el;
        overBelow = below;
        el.setAttribute('data-dshs-over', below ? 'below' : 'above');
      }
    }
    function onDrop(event) {
      if (dragEl === null) return;
      event.preventDefault();
      event.stopPropagation();
      var target = overEl, below = overBelow, moved = dragEl;
      var box = container();
      if (box !== null) {
        var entries = entriesOf(box);
        var seq = entries.slice().sort(function (a, b) { return byRendered(a, b, entries); });
        var from = seq.indexOf(moved);
        if (from >= 0) {
          seq.splice(from, 1);
          var at = target === null ? seq.length : seq.indexOf(target) + (below ? 1 : 0);
          if (at < 0) at = seq.length;
          seq.splice(at, 0, moved);
          applyOrder(seq);
        }
      }
      finishDrag();
      report();
    }
    function finishDrag() {
      if (dragEl !== null) dragEl.removeAttribute('data-dshs-dragging');
      dragEl = null;
      lastDragEnd = Date.now();
      clearOver();
    }
    function onDragEnd() { finishDrag(); }
    /** A drag that ends on a card still fires a click; swallow that one. */
    function onClickCapture(event) {
      if (Date.now() - lastDragEnd < 300) {
        event.stopPropagation();
        event.preventDefault();
      }
    }

    var wired = [];
    function wire() {
      var box = container();
      if (box === null) return;
      syncDraggable();
      syncOrder();
      var host = entryHost(box);
      if (wired.indexOf(host) >= 0) return;
      wired.push(host);
      host.addEventListener('dragstart', onDragStart, true);
      host.addEventListener('dragover', onDragOver, true);
      host.addEventListener('drop', onDrop, true);
      host.addEventListener('dragend', onDragEnd, true);
      host.addEventListener('click', onClickCapture, true);
      var observer = new MutationObserver(function () { syncDraggable(); syncOrder(); });
      observer.observe(host, { childList: true, attributes: true, attributeFilter: ['style'] });
    }

    // ---------------------------------------------------------------- probe

    function describe(el) {
      var es = getComputedStyle(el);
      var r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        cls: String(el.className).slice(0, 140),
        id: el.getAttribute('data-dshs-id'),
        order: el.style.order === '' ? null : el.style.order,
        draggable: el.getAttribute('draggable'),
        display: es.display,
        border: es.borderTopWidth + ' ' + es.borderTopStyle + ' ' + es.borderTopColor,
        radius: es.borderTopLeftRadius,
        bg: es.backgroundColor,
        size: Math.round(r.width) + 'x' + Math.round(r.height),
        kids: Array.prototype.slice.call(el.children).slice(0, 4).map(describe)
      };
    }
    function snapshot() {
      var out = { version: VERSION, href: String(location.href), cssLength: CSS.length, stored: readStored(), containers: [] };
      var tag = document.getElementById(STYLE_ID);
      out.styleTagLength = tag === null ? null : String(tag.textContent).length;
      var nodes = document.querySelectorAll('[class*="footerActions"]');
      for (var i = 0; i < nodes.length; i++) {
        var c = nodes[i];
        var cs = getComputedStyle(c);
        out.containers.push({
          cls: String(c.className),
          dir: cs.flexDirection,
          width: Math.round(c.getBoundingClientRect().width),
          kids: Array.prototype.slice.call(c.children).map(describe)
        });
      }
      return out;
    }
    function report() {
      if (!debugEnabled()) return;
      try {
        fetch(PROBE, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(snapshot()) }).catch(function () {});
      } catch (error) { void error; }
    }

    // ---------------------------------------------------------------- apply

    function apply(ctx) {
      ensureStyle();
      wire();
      var tries = 0;
      var timer = setInterval(function () {
        tries += 1;
        wire();
        if (tries > 600) clearInterval(timer);
      }, 1000);
      setTimeout(report, 1500);
      setTimeout(report, 7000);
      if (ctx !== undefined && ctx !== null && typeof ctx.effect === 'function') {
        ctx.effect(function () {
          return function () {
            clearInterval(timer);
            var el = typeof document === 'undefined' ? null : document.getElementById(STYLE_ID);
            if (el !== null && el.parentNode !== null) el.parentNode.removeChild(el);
          };
        });
      }
    }

    exports.apply = apply;
    exports.inject = [];
    return module.exports;
  }
});
