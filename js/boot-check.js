// Plain (non-module) script, so it still runs when the game's ES modules
// can't load: opened as a file:// page, or a stale cached file after an
// update. Instead of "Loading…" forever, it explains what to do.
// js/main.js sets data-booted on <html> once it starts.
(function () {
  var WAIT_MS = 8000;
  var app = document.getElementById('app');

  function show(title, lines, withReload) {
    if (!app || document.documentElement.getAttribute('data-booted')) return;
    var screen = document.createElement('div');
    screen.className = 'screen menu';
    var hero = document.createElement('header');
    hero.className = 'hero';
    var h1 = document.createElement('h1');
    h1.className = 'hero-title';
    h1.textContent = title;
    hero.appendChild(h1);
    lines.forEach(function (text) {
      var p = document.createElement('p');
      p.className = 'hero-sub';
      p.textContent = text;
      hero.appendChild(p);
    });
    screen.appendChild(hero);
    if (withReload) {
      var actions = document.createElement('div');
      actions.className = 'actions';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-primary';
      btn.textContent = 'Reload';
      btn.addEventListener('click', function () { location.reload(); });
      actions.appendChild(btn);
      screen.appendChild(actions);
    }
    app.removeAttribute('aria-busy');
    app.replaceChildren(screen);
  }

  if (location.protocol === 'file:') {
    show('Open SortRight through a web server', [
      'Browsers block this game when index.html is opened as a file.',
      'In the project folder, run: python -m http.server 8000 (python3 on Mac/Linux), then open http://localhost:8000',
    ], false);
    return;
  }

  setTimeout(function () {
    show('SortRight couldn’t start', [
      'Try reloading the page.',
      'If it keeps happening, do a hard refresh (Ctrl+Shift+R, or Cmd+Shift+R on a Mac) to clear old files.',
    ], true);
  }, WAIT_MS);
})();
