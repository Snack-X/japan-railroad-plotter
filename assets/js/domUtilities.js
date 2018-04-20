window.$ = document.querySelector.bind(document);
window.$$ = document.querySelectorAll.bind(document);

[ HTMLDocument, HTMLElement ].forEach(p => {
  p.prototype.$ = p.prototype.querySelector;
  p.prototype.$$ = p.prototype.querySelectorAll;
});

HTMLElement.prototype.$show = function(v = "block") { this.style.display = v; };
HTMLElement.prototype.$hide = function() { this.style.display = "none"; };

window._make = (name, attrs = {}) => {
  const el = document.createElement(name);
  Object.keys(attrs).forEach(key => { el.setAttribute(key, attrs[key]); });
  return el;
};

window.log = (...args) => { console.log("[" + new Date().toLocaleString() + "]", ...args); };
