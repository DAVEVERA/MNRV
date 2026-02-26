/* ============================================
   MNRV - Windows 98 Desktop Interactions
   ============================================ */

(function() {
  'use strict';

  // --- State ---
  let highestZ = 200;
  let startMenuOpen = false;
  let dragState = null;
  let resizeState = null;

  // --- Init ---
  document.addEventListener('DOMContentLoaded', function() {
    initClock();
    initStartMenu();
    initDesktopIcons();
    initWindows();
    initTaskbarButtons();
    closeStartMenuOnClickOutside();


    // Clippy is initialized via its own inline script in index.html
  });

  // --- Clock ---
  function initClock() {
    const clockEl = document.getElementById('tray-clock');
    if (!clockEl) return;

    function updateClock() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      clockEl.textContent = h + ':' + m;
    }

    updateClock();
    setInterval(updateClock, 10000);
  }

  // --- Start Menu ---
  function initStartMenu() {
    const startBtn = document.getElementById('start-btn');
    const startMenu = document.getElementById('start-menu');
    if (!startBtn || !startMenu) return;

    startBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      startMenuOpen = !startMenuOpen;
      startMenu.classList.toggle('open', startMenuOpen);
      startBtn.classList.toggle('active', startMenuOpen);
    });

    // Shut down easter egg
    const shutdownBtn = document.getElementById('start-shutdown');
    if (shutdownBtn) {
      shutdownBtn.addEventListener('click', function() {
        closeStartMenu();
        showShutdownDialog();
      });
    }
  }

  function closeStartMenu() {
    const startBtn = document.getElementById('start-btn');
    const startMenu = document.getElementById('start-menu');
    if (startMenu) {
      startMenu.classList.remove('open');
      startMenuOpen = false;
    }
    if (startBtn) {
      startBtn.classList.remove('active');
    }
  }

  function closeStartMenuOnClickOutside() {
    document.addEventListener('click', function(e) {
      const startMenu = document.getElementById('start-menu');
      const startBtn = document.getElementById('start-btn');
      if (!startMenu || !startBtn) return;

      if (startMenuOpen && !startMenu.contains(e.target) && !startBtn.contains(e.target)) {
        closeStartMenu();
      }
    });
  }

  // --- Desktop Icons ---
  function initDesktopIcons() {
    const icons = document.querySelectorAll('.desktop-icon');
    let selectedIcon = null;

    icons.forEach(function(icon) {
      // Single click to select
      icon.addEventListener('click', function(e) {
        e.preventDefault();
        if (selectedIcon) selectedIcon.classList.remove('selected');
        icon.classList.add('selected');
        selectedIcon = icon;
        closeStartMenu();
      });

      // Double click to open
      icon.addEventListener('dblclick', function(e) {
        e.preventDefault();
        const target = icon.getAttribute('data-target');
        const windowId = icon.getAttribute('data-window');

        if (windowId) {
          showWindow(windowId);
        } else if (target) {
          window.location.href = target;
        }
      });
    });

    // Click on empty desktop to deselect
    const desktop = document.querySelector('.desktop');
    if (desktop) {
      desktop.addEventListener('click', function(e) {
        if (e.target === desktop || e.target.classList.contains('desktop-icons')) {
          if (selectedIcon) {
            selectedIcon.classList.remove('selected');
            selectedIcon = null;
          }
        }
      });
    }
  }

  // --- Windows ---
  function initWindows() {
    const windows = document.querySelectorAll('.win-window');

    windows.forEach(function(win) {
      // Focus on click
      win.addEventListener('mousedown', function() {
        focusWindow(win);
      });

      // Title bar buttons
      const closeBtn = win.querySelector('.close-btn');
      const minBtn = win.querySelector('.min-btn');
      const maxBtn = win.querySelector('.max-btn');

      if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          hideWindow(win.id);
        });
      }

      if (minBtn) {
        minBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          minimizeWindow(win.id);
        });
      }

      if (maxBtn) {
        maxBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          toggleMaximize(win);
        });

        // Double-click titlebar to maximize
        const titlebar = win.querySelector('.win-titlebar');
        if (titlebar) {
          titlebar.addEventListener('dblclick', function(e) {
            if (e.target.closest('.win-titlebar-btn')) return;
            toggleMaximize(win);
          });
        }
      }

      // Add resize handles (skip dialogs)
      if (!win.classList.contains('win-dialog')) {
        addResizeHandles(win);
      }

      // Draggable title bar
      const titlebar = win.querySelector('.win-titlebar');
      if (titlebar) {
        titlebar.addEventListener('mousedown', function(e) {
          if (e.target.closest('.win-titlebar-btn')) return;
          if (win.classList.contains('maximized')) return;

          focusWindow(win);

          dragState = {
            win: win,
            startX: e.clientX,
            startY: e.clientY,
            origLeft: win.offsetLeft,
            origTop: win.offsetTop
          };

          e.preventDefault();
        });
      }
    });

    // Global mouse handlers for dragging + resizing
    document.addEventListener('mousemove', function(e) {
      if (resizeState) {
        handleResize(e.clientX, e.clientY);
        return;
      }
      if (!dragState) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      dragState.win.style.left = (dragState.origLeft + dx) + 'px';
      dragState.win.style.top = (dragState.origTop + dy) + 'px';
    });

    document.addEventListener('mouseup', function() {
      dragState = null;
      resizeState = null;
    });

    // Touch support for dragging + resizing
    document.addEventListener('touchmove', function(e) {
      const touch = e.touches[0];
      if (resizeState) {
        handleResize(touch.clientX, touch.clientY);
        return;
      }
      if (!dragState) return;
      const dx = touch.clientX - dragState.startX;
      const dy = touch.clientY - dragState.startY;
      dragState.win.style.left = (dragState.origLeft + dx) + 'px';
      dragState.win.style.top = (dragState.origTop + dy) + 'px';
    }, { passive: false });

    document.addEventListener('touchend', function() {
      dragState = null;
      resizeState = null;
    });

    // Add touch support to title bars
    windows.forEach(function(win) {
      const titlebar = win.querySelector('.win-titlebar');
      if (titlebar) {
        titlebar.addEventListener('touchstart', function(e) {
          if (e.target.closest('.win-titlebar-btn')) return;
          if (win.classList.contains('maximized')) return;

          focusWindow(win);
          const touch = e.touches[0];

          dragState = {
            win: win,
            startX: touch.clientX,
            startY: touch.clientY,
            origLeft: win.offsetLeft,
            origTop: win.offsetTop
          };
        }, { passive: true });
      }
    });
  }

  // --- Resize Handles ---
  function addResizeHandles(win) {
    const directions = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'];
    directions.forEach(function(dir) {
      const handle = document.createElement('div');
      handle.className = 'win-resize win-resize-' + dir;
      handle.addEventListener('mousedown', function(e) {
        e.stopPropagation();
        e.preventDefault();
        if (win.classList.contains('maximized')) return;
        startResize(win, dir, e.clientX, e.clientY);
      });
      handle.addEventListener('touchstart', function(e) {
        e.stopPropagation();
        if (win.classList.contains('maximized')) return;
        const touch = e.touches[0];
        startResize(win, dir, touch.clientX, touch.clientY);
      }, { passive: true });
      win.appendChild(handle);
    });
  }

  function startResize(win, dir, x, y) {
    focusWindow(win);
    resizeState = {
      win: win,
      dir: dir,
      startX: x,
      startY: y,
      origLeft: win.offsetLeft,
      origTop: win.offsetTop,
      origWidth: win.offsetWidth,
      origHeight: win.offsetHeight
    };
  }

  function handleResize(cx, cy) {
    if (!resizeState) return;
    const s = resizeState;
    const dx = cx - s.startX;
    const dy = cy - s.startY;
    const minW = parseInt(getComputedStyle(s.win).minWidth) || 200;
    const minH = parseInt(getComputedStyle(s.win).minHeight) || 120;

    let newW = s.origWidth, newH = s.origHeight, newL = s.origLeft, newT = s.origTop;

    if (s.dir.includes('e')) { newW = Math.max(minW, s.origWidth + dx); }
    if (s.dir.includes('s')) { newH = Math.max(minH, s.origHeight + dy); }
    if (s.dir.includes('w')) {
      newW = Math.max(minW, s.origWidth - dx);
      if (newW > minW) newL = s.origLeft + dx;
    }
    if (s.dir.includes('n')) {
      newH = Math.max(minH, s.origHeight - dy);
      if (newH > minH) newT = s.origTop + dy;
    }

    s.win.style.width = newW + 'px';
    s.win.style.height = newH + 'px';
    s.win.style.left = newL + 'px';
    s.win.style.top = newT + 'px';
  }

  // --- Maximize toggle (stores pre-max position) ---
  function toggleMaximize(win) {
    if (win.classList.contains('maximized')) {
      // Restore
      win.classList.remove('maximized');
      if (win._preMaxRect) {
        win.style.left = win._preMaxRect.left;
        win.style.top = win._preMaxRect.top;
        win.style.width = win._preMaxRect.width;
        win.style.height = win._preMaxRect.height;
      }
    } else {
      // Save position before maximizing
      win._preMaxRect = {
        left: win.style.left,
        top: win.style.top,
        width: win.style.width,
        height: win.style.height
      };
      win.classList.add('maximized');
    }
  }

  function focusWindow(win) {
    // Remove focused from all
    document.querySelectorAll('.win-window').forEach(function(w) {
      w.classList.remove('focused');
    });
    win.classList.add('focused');
    highestZ++;
    win.style.zIndex = highestZ;

    // Update taskbar
    updateTaskbarButtons();
  }

  function showWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;
    win.classList.remove('hidden');
    // Play restore animation if it was minimized
    if (win._wasMinimized) {
      win._wasMinimized = false;
      win.classList.add('restoring');
      win.addEventListener('animationend', function handler() {
        win.classList.remove('restoring');
        win.removeEventListener('animationend', handler);
      });
    }
    focusWindow(win);
    addTaskbarButton(id);
    updateTaskbarButtons();
  }

  function hideWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;
    win.classList.add('hidden');
    removeTaskbarButton(id);
  }

  function minimizeWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;
    win.classList.remove('focused');
    win._wasMinimized = true;
    // Play minimize animation
    win.classList.add('minimizing');
    win.addEventListener('animationend', function handler() {
      win.classList.remove('minimizing');
      win.classList.add('hidden');
      win.removeEventListener('animationend', handler);
      updateTaskbarButtons();
    });
    updateTaskbarButtons();
  }

  // --- Taskbar Window Buttons ---
  function initTaskbarButtons() {
    const container = document.getElementById('taskbar-windows');
    if (!container) return;

    container.addEventListener('click', function(e) {
      const btn = e.target.closest('.taskbar-window-btn');
      if (!btn) return;

      const winId = btn.getAttribute('data-window');
      const win = document.getElementById(winId);
      if (!win) return;

      if (win.classList.contains('hidden')) {
        showWindow(winId);
      } else if (win.classList.contains('focused')) {
        minimizeWindow(winId);
      } else {
        focusWindow(win);
      }
    });
  }

  function addTaskbarButton(winId) {
    const container = document.getElementById('taskbar-windows');
    if (!container) return;

    // Don't duplicate
    if (container.querySelector('[data-window="' + winId + '"]')) return;

    const win = document.getElementById(winId);
    if (!win) return;

    const title = win.querySelector('.win-titlebar-title');
    const btn = document.createElement('button');
    btn.className = 'taskbar-window-btn';
    btn.setAttribute('data-window', winId);
    btn.textContent = title ? title.textContent : winId;
    container.appendChild(btn);
  }

  function removeTaskbarButton(winId) {
    const container = document.getElementById('taskbar-windows');
    if (!container) return;
    const btn = container.querySelector('[data-window="' + winId + '"]');
    if (btn) btn.remove();
  }

  function updateTaskbarButtons() {
    const container = document.getElementById('taskbar-windows');
    if (!container) return;

    container.querySelectorAll('.taskbar-window-btn').forEach(function(btn) {
      const winId = btn.getAttribute('data-window');
      const win = document.getElementById(winId);
      btn.classList.toggle('active', win && win.classList.contains('focused') && !win.classList.contains('hidden'));
    });
  }

  // --- Shutdown Dialog ---
  function showShutdownDialog() {
    let dialog = document.getElementById('shutdown-dialog');
    if (dialog) {
      dialog.classList.remove('hidden');
      focusWindow(dialog);
      return;
    }

    dialog = document.createElement('div');
    dialog.id = 'shutdown-dialog';
    dialog.className = 'win-window win-dialog focused';
    dialog.style.cssText = 'width:340px;left:50%;top:50%;transform:translate(-50%,-50%);';
    dialog.innerHTML = [
      '<div class="win-titlebar">',
      '  <span class="win-titlebar-title">Afsluiten</span>',
      '  <div class="win-titlebar-buttons">',
      '    <button class="win-titlebar-btn close-btn" onclick="this.closest(\'.win-window\').classList.add(\'hidden\')">X</button>',
      '  </div>',
      '</div>',
      '<div class="dialog-content">',
      '  <svg class="dialog-icon" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#ffcc00" stroke="#000" stroke-width="2"/><text x="16" y="22" text-anchor="middle" font-size="20" font-weight="bold" fill="#000">!</text></svg>',
      '  <div class="dialog-text">',
      '    <p><strong>MNRV kan niet worden afgesloten!</strong></p>',
      '    <p style="margin-top:8px">De toekomst van AI stopt nooit. Maar je kunt altijd terugkomen.</p>',
      '  </div>',
      '</div>',
      '<div class="dialog-buttons">',
      '  <button class="win-btn win-btn-default" onclick="this.closest(\'.win-window\').classList.add(\'hidden\')">OK</button>',
      '</div>'
    ].join('\n');

    document.querySelector('.desktop').appendChild(dialog);
    focusWindow(dialog);
  }


  // --- Expose globals ---
  window.MNRV = {
    showWindow: showWindow,
    hideWindow: hideWindow,
    focusWindow: focusWindow,
    closeStartMenu: closeStartMenu
  };

})();
