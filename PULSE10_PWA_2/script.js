// GrindStone PWA — Full Interactive Logic (Multi-Squad)

document.addEventListener('DOMContentLoaded', () => {

  // ============================================
  // localStorage Helpers
  // ============================================
  const LS = {
    get(key, fallback) {
      try { const v = localStorage.getItem('gs_' + key); return v !== null ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    },
    set(key, val) { localStorage.setItem('gs_' + key, JSON.stringify(val)); },
    remove(key) { localStorage.removeItem('gs_' + key); }
  };

  // ============================================
  // App State
  // ============================================
  let username = LS.get('username', '');
  let streak = LS.get('streak', 0);
  let bestStreak = LS.get('bestStreak', 0);
  let totalDays = LS.get('totalDays', 0);
  let totalReps = LS.get('totalReps', 0);
  let lastDropDate = LS.get('lastDropDate', '');
  let workoutHistory = LS.get('workoutHistory', {});
  let soundEnabled = LS.get('soundEnabled', true);
  let hapticEnabled = LS.get('hapticEnabled', true);
  let squads = LS.get('squads', []);
  let activeSquadIdx = LS.get('activeSquadIdx', 0);
  let loggedIn = LS.get('loggedIn', false);
  let currentReps = 0;
  const targetReps = 10;
  let isDoneToday = false;
  let cameraStream = null;
  let cameraOn = false;
  let micStream = null;

  function activeSquad() {
    if (squads.length === 0) return null;
    if (activeSquadIdx >= squads.length) activeSquadIdx = squads.length - 1;
    return squads[activeSquadIdx] || null;
  }

  function saveSquads() {
    LS.set('squads', squads);
    LS.set('activeSquadIdx', activeSquadIdx);
  }

  // ============================================
  // DOM References
  // ============================================
  const body = document.body;
  const authScreen = document.getElementById('authScreen');
  const onboardScreen = document.getElementById('onboardScreen');
  const appHeader = document.getElementById('appHeader');
  const appBody = document.getElementById('appBody');
  const appNav = document.getElementById('appNav');
  const pwaBanner = document.getElementById('installBanner');
  const pwaToast = document.getElementById('pwaToast');

  // ============================================
  // Mock Squad Data
  // ============================================
  const MOCK_MEMBERS = [
    { name: 'Sarah K.', initials: 'SK', streak: 30, done: true },
    { name: 'Alex R.', initials: 'AR', streak: 28, done: true },
    { name: 'Jake M.', initials: 'JM', streak: 3, done: false, slacker: true },
    { name: 'Taylor W.', initials: 'TW', streak: 14, done: true },
  ];

  const MOCK_MEMBERS_2 = [
    { name: 'Chris P.', initials: 'CP', streak: 22, done: true },
    { name: 'Dana L.', initials: 'DL', streak: 15, done: false, slacker: true },
    { name: 'Evan T.', initials: 'ET', streak: 9, done: true },
  ];

  function generateCode() {
    return String(Math.floor(10000 + Math.random() * 90000));
  }

  // ============================================
  // QR Code Generator (using qrcode-generator lib)
  // ============================================
  function drawQR(canvas, data) {
    const typeNumber = 0; // auto-detect
    const errorCorrectionLevel = 'M';
    const qr = qrcode(typeNumber, errorCorrectionLevel);
    qr.addData(data);
    qr.make();

    const ctx = canvas.getContext('2d');
    const modules = qr.getModuleCount();
    const cellSize = canvas.width / modules;
    const margin = 0;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#111111';
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(
            margin + c * cellSize,
            margin + r * cellSize,
            cellSize + 0.5,
            cellSize + 0.5
          );
        }
      }
    }
  }

  // ============================================
  // Toast
  // ============================================
  function showToast(msg) {
    pwaToast.textContent = msg;
    pwaToast.classList.add('show');
    setTimeout(() => pwaToast.classList.remove('show'), 2500);
  }

  // ============================================
  // Time Helpers
  // ============================================
  function getTimeLeft() {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const diff = end - now;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h + 'h ' + m + 'm left';
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function yesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  function checkTodayDone() {
    if (lastDropDate === todayStr()) {
      isDoneToday = true;
      currentReps = targetReps;
    } else if (lastDropDate && lastDropDate !== yesterdayStr()) {
      streak = 0;
      LS.set('streak', streak);
    }
  }

  // ============================================
  // SQUAD TOGGLE RENDERING
  // ============================================
  function renderSquadToggles() {
    const todayToggle = document.getElementById('squadToggleToday');
    const squadToggle = document.getElementById('squadToggleSquad');

    [todayToggle, squadToggle].forEach(container => {
      if (!container) return;
      container.innerHTML = '';

      squads.forEach((sq, idx) => {
        const pill = document.createElement('button');
        pill.className = 'squad-pill' + (idx === activeSquadIdx ? ' active' : '');
        pill.textContent = sq.name;
        pill.addEventListener('click', () => {
          activeSquadIdx = idx;
          saveSquads();
          renderAll();
        });
        container.appendChild(pill);
      });

      // Always show "+" button so user can join/create at any time
      const addBtn = document.createElement('button');
      addBtn.className = 'squad-pill squad-pill-add';
      addBtn.textContent = '+';
      addBtn.addEventListener('click', () => {
        // If on Today view, switch to Squad view first
        if (!document.getElementById('viewSquad').classList.contains('active')) {
          switchView('viewSquad');
        }
        showJoinPanel();
      });
      container.appendChild(addBtn);
    });
  }

  // ============================================
  // AUTH SCREEN
  // ============================================
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    submitLogin();
  });

  function submitLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();
    if (!email || !pass) {
      showToast('Please enter email and password');
      return;
    }
    LS.set('loggedIn', true);
    loggedIn = true;

    if (username) {
      enterApp();
    } else {
      showOnboarding();
    }
  }

  document.getElementById('loginBtn').addEventListener('click', (e) => {
    e.preventDefault();
    submitLogin();
  });

  // ============================================
  // ONBOARDING
  // ============================================
  function showOnboarding() {
    authScreen.classList.remove('active');
    onboardScreen.classList.add('active');
    showOnboardStep('onboardStep1');
    requestAnimationFrame(() => document.getElementById('usernameInput').focus());
  }

  function showOnboardStep(id) {
    document.querySelectorAll('#onboardScreen .onboard-step').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = '';
  }

  // Step 1: Username
  document.getElementById('onboardForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('usernameInput').value.trim();
    if (!name) { showToast('Enter a name'); return; }
    username = name;
    LS.set('username', username);
    showOnboardStep('onboardStep2');
  });

  // Step 2: Join or Create
  document.getElementById('btnShowJoin').addEventListener('click', () => {
    showOnboardStep('onboardJoin');
    setTimeout(() => document.querySelector('.code-digit[data-idx="0"]').focus(), 100);
  });

  document.getElementById('btnShowCreate').addEventListener('click', () => {
    showOnboardStep('onboardCreate');
  });

  document.getElementById('btnSkipSquad').addEventListener('click', () => {
    enterApp();
  });

  document.getElementById('btnBackOnboard').addEventListener('click', () => {
    showOnboardStep('onboardStep2');
  });

  document.getElementById('btnBackOnboard2').addEventListener('click', () => {
    showOnboardStep('onboardStep2');
  });

  // Join squad — code input
  const codeDigits = document.querySelectorAll('#onboardJoin .code-digit');
  codeDigits.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val;
      if (val && idx < 4) codeDigits[idx + 1].focus();
      updateJoinBtn();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) codeDigits[idx - 1].focus();
    });
  });

  function getOnboardCode() {
    return Array.from(codeDigits).map(d => d.value).join('');
  }

  function updateJoinBtn() {
    document.getElementById('btnJoinSquad').disabled = getOnboardCode().length !== 5;
  }

  document.getElementById('btnJoinSquad').addEventListener('click', () => {
    const code = getOnboardCode();
    if (code.length === 5) {
      squads.push({ name: 'Push Crew', code: code, members: MOCK_MEMBERS });
      activeSquadIdx = squads.length - 1;
      saveSquads();
      showToast('Joined squad!');
      enterApp();
    }
  });

  // Create squad
  document.getElementById('createSquadForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('squadNameInput').value.trim();
    if (!name) { showToast('Enter a squad name'); return; }
    const code = generateCode();
    squads.push({ name: name, code: code, members: MOCK_MEMBERS });
    activeSquadIdx = squads.length - 1;
    saveSquads();
    document.getElementById('createdSquadCode').textContent = code;
    drawQR(document.getElementById('qrCanvas'), 'grindstone-squad-' + code);
    showOnboardStep('onboardCreated');
  });

  document.getElementById('btnCopyCode').addEventListener('click', () => {
    const sq = activeSquad();
    const code = sq ? sq.code : '';
    navigator.clipboard.writeText(code).then(() => showToast('Code copied!')).catch(() => showToast('Code: ' + code));
  });

  document.getElementById('btnShowQR').addEventListener('click', () => {
    const qr = document.getElementById('qrDisplay');
    qr.style.display = qr.style.display === 'none' ? '' : 'none';
  });

  document.getElementById('btnFinishOnboard').addEventListener('click', () => {
    enterApp();
  });

  // ============================================
  // ENTER APP
  // ============================================
  function enterApp() {
    checkTodayDone();
    authScreen.classList.remove('active');
    onboardScreen.classList.remove('active');
    appHeader.style.display = '';
    appBody.style.display = '';
    appNav.style.display = '';
    pwaBanner.style.display = '';
    renderAll();
    updateCountdown();
    setInterval(updateCountdown, 60000);
  }

  function renderAll() {
    renderSquadToggles();
    renderDashboard();
    renderCommitGrid();
    renderSquadView();
    renderProfile();
  }

  // ============================================
  // THEME TOGGLE
  // ============================================
  document.getElementById('themeToggleBtn').addEventListener('click', () => {
    body.classList.toggle('light-theme');
  });

  // ============================================
  // INSTALL BANNER
  // ============================================
  let deferredPrompt = null;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!isStandalone) pwaBanner.style.display = '';
  });

  // Show banner on iOS if not already installed
  if (isIOS && !isStandalone) {
    setTimeout(() => { pwaBanner.style.display = ''; }, 3000);
  }

  document.getElementById('closeBannerBtn').addEventListener('click', () => {
    pwaBanner.style.display = 'none';
  });

  document.getElementById('installBtn').addEventListener('click', async () => {
    if (deferredPrompt) {
      // Android/Chrome: trigger native install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') showToast('Installed to Home Screen!');
      deferredPrompt = null;
      pwaBanner.style.display = 'none';
    } else if (isIOS) {
      // iOS: show instructions modal
      showIOSInstallModal();
    } else {
      showToast('Use your browser menu to install');
      pwaBanner.style.display = 'none';
    }
  });

  function showIOSInstallModal() {
    pwaBanner.style.display = 'none';
    const modal = document.getElementById('iosInstallModal');
    modal.style.display = '';
    modal.classList.add('active');
  }

  document.getElementById('closeIOSInstall').addEventListener('click', () => {
    const modal = document.getElementById('iosInstallModal');
    modal.style.display = 'none';
    modal.classList.remove('active');
  });

  // ============================================
  // VIEW NAVIGATION
  // ============================================
  const navBtns = document.querySelectorAll('.nav-btn[data-target]');
  const viewPanels = document.querySelectorAll('.view-panel');

  function switchView(targetId) {
    if (targetId !== 'viewWorkout') resetCamera();
    viewPanels.forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => {
      if (b.dataset.target === targetId) b.classList.add('active');
    });
    const panel = document.getElementById(targetId);
    if (panel) panel.classList.add('active');
    appBody.scrollTop = 0;
    if (targetId === 'viewToday') {
      requestAnimationFrame(() => renderCommitGrid());
    }
    if (targetId !== 'viewSquad') {
      document.getElementById('squadQRPanel').style.display = 'none';
    hideAllPanels();
    }
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.target));
  });

  document.getElementById('startWorkoutBtn').addEventListener('click', () => {
    if (isDoneToday) { showToast('Already done for today!'); return; }
    currentReps = 0;
    isDoneToday = false;
    updateReps();
    switchView('viewWorkout');
  });

  document.getElementById('resetCounterBtn').addEventListener('click', () => {
    if (isDoneToday) {
      isDoneToday = false;
      streak = Math.max(0, streak - 1);
      totalDays = Math.max(0, totalDays - 1);
      totalReps = Math.max(0, totalReps - targetReps);
      delete workoutHistory[todayStr()];
      lastDropDate = '';
      LS.set('workoutHistory', workoutHistory);
      LS.set('streak', streak);
      LS.set('totalDays', totalDays);
      LS.set('totalReps', totalReps);
      LS.set('lastDropDate', lastDropDate);
      renderAll();
    }
    currentReps = 0;
    updateReps();
    showToast('Today\'s workout cleared');
  });

  // ============================================
  // COUNTER LOGIC
  // ============================================
  const ringCircumference = 326.72;
  const ringProgress = document.getElementById('ringProgress');
  const repNumber = document.getElementById('repNumber');
  const completeWorkoutBtn = document.getElementById('completeWorkoutBtn');

  function updateReps() {
    repNumber.textContent = currentReps;
    const offset = ringCircumference - ((currentReps / targetReps) * ringCircumference);
    ringProgress.style.strokeDashoffset = offset;
    completeWorkoutBtn.disabled = currentReps < targetReps;
    document.getElementById('resetCounterBtn').style.display = currentReps > 0 ? '' : 'none';
  }

  // ============================================
  // SOUND + HAPTIC FEEDBACK
  // ============================================
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function playTapSound() {
    if (!soundEnabled) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  }

  function triggerHaptic() {
    if (hapticEnabled && navigator.vibrate) navigator.vibrate(40);
  }

  // Toggle handlers
  document.getElementById('soundToggle').checked = soundEnabled;
  document.getElementById('hapticToggle').checked = hapticEnabled;

  document.getElementById('soundToggle').addEventListener('change', (e) => {
    soundEnabled = e.target.checked;
    LS.set('soundEnabled', soundEnabled);
  });

  document.getElementById('hapticToggle').addEventListener('change', (e) => {
    hapticEnabled = e.target.checked;
    LS.set('hapticEnabled', hapticEnabled);
  });

  document.getElementById('noseTrigger').addEventListener('click', () => {
    if (currentReps < targetReps) {
      currentReps++;
      updateReps();
      playTapSound();
      triggerHaptic();
    }
  });

  completeWorkoutBtn.addEventListener('click', () => {
    if (currentReps >= targetReps && !isDoneToday) {
      isDoneToday = true;

      if (lastDropDate && lastDropDate !== yesterdayStr()) {
        streak = 0;
      }
      streak++;
      if (streak > bestStreak) bestStreak = streak;
      totalDays++;
      totalReps += targetReps;
      lastDropDate = todayStr();

      workoutHistory[lastDropDate] = { reps: currentReps };
      LS.set('workoutHistory', workoutHistory);
      LS.set('streak', streak);
      LS.set('bestStreak', bestStreak);
      LS.set('totalDays', totalDays);
      LS.set('totalReps', totalReps);
      LS.set('lastDropDate', lastDropDate);

      stopCamera();
      renderAll();
      switchView('viewToday');
      showToast('Workout saved! Squad notified.');
    }
  });

  // ============================================
  // COMMIT GRID
  // ============================================
  function renderCommitGrid() {
    const cellsContainer = document.getElementById('commitGridCells');
    const legend = document.getElementById('gridLegend');
    const wrapper = cellsContainer.parentElement;
    if (!cellsContainer) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const colWidth = 11 + 3;
    const availableWidth = wrapper.clientWidth - 24;
    const totalWeeks = Math.max(1, Math.floor(availableWidth / colWidth));

    const historyKeys = Object.keys(workoutHistory);
    legend.textContent = historyKeys.length + ' day' + (historyKeys.length !== 1 ? 's' : '') + ' logged';

    cellsContainer.innerHTML = '';
    for (let w = 0; w < totalWeeks; w++) {
      const col = document.createElement('div');
      col.className = 'commit-grid-col';

      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (w * 7 + d));
        const key = date.toISOString().slice(0, 10);
        const cell = document.createElement('div');
        cell.className = 'commit-cell';

        if (workoutHistory[key]) {
          const reps = workoutHistory[key].reps || 0;
          const level = reps >= 10 ? 4 : reps >= 7 ? 3 : reps >= 4 ? 2 : reps >= 1 ? 1 : 0;
          cell.classList.add('level-' + level);
        }

        const label = date.toLocaleString('default', { month: 'short', day: 'numeric' });
        const reps = workoutHistory[key] ? workoutHistory[key].reps : 0;
        cell.setAttribute('title', label + ': ' + reps + ' reps');
        col.appendChild(cell);
      }
      cellsContainer.appendChild(col);
    }
  }

  // ============================================
  // RENDER DASHBOARD
  // ============================================
  function renderDashboard() {
    const sq = activeSquad();
    document.getElementById('streakVal').textContent = streak;
    document.getElementById('bestStreakVal').textContent = bestStreak;
    document.getElementById('totalDaysVal').textContent = totalDays;
    document.getElementById('timeLeft').textContent = getTimeLeft();

    if (isDoneToday) {
      document.getElementById('dashboardProgress').style.width = '100%';
      document.getElementById('targetStatusText').textContent = 'Completed! Squad streak is safe.';
      const btn = document.getElementById('startWorkoutBtn');
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> 10 REPS DONE';
      btn.style.pointerEvents = 'none';
    } else {
      document.getElementById('dashboardProgress').style.width = '0%';
      document.getElementById('targetStatusText').textContent = 'Time to put your nose to the grindstone.';
      const btn = document.getElementById('startWorkoutBtn');
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> START 10 REPS';
      btn.style.pointerEvents = '';
    }

    // Squad feed
    const feedList = document.getElementById('squadFeedList');
    const userName = username || 'You';
    const userInitials = userName.slice(0, 2).toUpperCase();

    feedList.innerHTML = '';

    if (!sq) {
      document.getElementById('squadFeedCount').textContent = '';
      const emptyCard = document.createElement('div');
      emptyCard.className = 'tm-card empty-squad-feed';
      emptyCard.innerHTML =
        '<div class="tm-info" style="width:100%">' +
          '<strong>No squad yet</strong>' +
          '<span><a href="#" id="feedJoinLink" style="color:var(--accent-primary);text-decoration:none;">Join</a> or <a href="#" id="feedCreateLink" style="color:var(--accent-primary);text-decoration:none;">create</a> a squad to see your crew.</span>' +
        '</div>';
      feedList.appendChild(emptyCard);

      emptyCard.querySelector('#feedJoinLink').addEventListener('click', (e) => {
        e.preventDefault();
        switchView('viewSquad');
        document.getElementById('joinAnotherPanel').style.display = '';
        setTimeout(() => document.querySelector('.switch-digit[data-idx="0"]').focus(), 100);
      });
      emptyCard.querySelector('#feedCreateLink').addEventListener('click', (e) => {
        e.preventDefault();
        switchView('viewSquad');
        hideAllPanels();
        document.getElementById('createSquadPanel').style.display = '';
        document.getElementById('squadNameInputView').value = '';
        document.getElementById('squadNameInputView').focus();
      });
    } else {
      const members = sq.members;
      let doneCount = 0;
      if (isDoneToday) doneCount++;
      members.forEach(m => { if (m.done) doneCount++; });
      const total = members.length + 1;
      document.getElementById('squadFeedCount').textContent = doneCount + '/' + total + ' Ready';

      members.forEach(m => {
        const card = document.createElement('div');
        card.className = 'tm-card' + (m.done ? ' done' : '') + (m.slacker ? ' slacker' : '');
        card.innerHTML =
          '<div class="avatar-box">' + m.initials +
            (m.done ? '<span class="badge-check">✓</span>' : '') +
            (m.slacker ? '<span class="badge-alert">!</span>' : '') +
          '</div>' +
          '<div class="tm-info">' +
            '<strong>' + m.name + '</strong>' +
            '<span>' + (m.done ? 'Completed today' : (m.slacker ? '⚠️ Holding back the squad!' : 'Pending')) + '</span>' +
          '</div>' +
          (m.slacker ? '<button class="nudge-btn">NUDGE</button>' : '<span class="rep-stat">' + (m.done ? '10/10' : '0/10') + '</span>');
        feedList.appendChild(card);

        if (m.slacker) {
          card.querySelector('.nudge-btn').addEventListener('click', () => {
            showToast('Nudge sent to ' + m.name.split(' ')[0] + '!');
          });
        }
      });
    }

    // User card (only show when in a squad)
    if (sq) {
      const userCard = document.createElement('div');
      userCard.className = 'tm-card' + (isDoneToday ? ' done' : '');
      userCard.innerHTML =
        '<div class="avatar-box self">' + userInitials + (isDoneToday ? '<span class="badge-check">✓</span>' : '') + '</div>' +
        '<div class="tm-info">' +
          '<strong>You (' + userName + ')</strong>' +
          '<span>' + (isDoneToday ? 'Completed today' : 'Pending 10 reps') + '</span>' +
        '</div>' +
        '<span class="rep-stat" style="' + (isDoneToday ? 'color:var(--accent-primary)' : '') + '">' + (isDoneToday ? '10/10' : '0/10') + '</span>';
      feedList.appendChild(userCard);
    }
  }

  // ============================================
  // LEAVE SQUAD
  // ============================================
  document.getElementById('btnLeaveSquad').addEventListener('click', () => {
    const sq = activeSquad();
    if (!sq) return;
    if (!confirm('Leave "' + sq.name + '"? Your streak will be preserved.')) return;
    squads.splice(activeSquadIdx, 1);
    if (activeSquadIdx >= squads.length) activeSquadIdx = Math.max(0, squads.length - 1);
    saveSquads();
    renderAll();
    showToast('Left squad');
  });

  // ============================================
  // JOIN ANOTHER SQUAD (from Squad view)
  // ============================================
  function showJoinPanel() {
    const panel = document.getElementById('joinAnotherPanel');
    panel.style.display = '';
    setTimeout(() => document.querySelector('.switch-digit[data-idx="0"]').focus(), 100);
  }

  document.getElementById('btnJoinAnother').addEventListener('click', () => {
    const panel = document.getElementById('joinAnotherPanel');
    if (panel.style.display === 'none' || panel.style.display === '') {
      showJoinPanel();
    } else {
      panel.style.display = 'none';
    }
  });

  document.getElementById('btnCancelJoinAnother').addEventListener('click', () => {
    document.getElementById('joinAnotherPanel').style.display = 'none';
    document.querySelectorAll('.switch-digit').forEach(d => d.value = '');
    updateJoinAnotherBtn();
  });

  const switchDigits = document.querySelectorAll('.switch-digit');
  switchDigits.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val;
      if (val && idx < 4) switchDigits[idx + 1].focus();
      updateJoinAnotherBtn();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) switchDigits[idx - 1].focus();
    });
  });

  function getSwitchCode() {
    return Array.from(switchDigits).map(d => d.value).join('');
  }

  function updateJoinAnotherBtn() {
    document.getElementById('btnConfirmJoinAnother').disabled = getSwitchCode().length !== 5;
  }

  document.getElementById('btnConfirmJoinAnother').addEventListener('click', () => {
    const code = getSwitchCode();
    if (code.length !== 5) return;
    squads.push({ name: 'Joined Squad', code: code, members: MOCK_MEMBERS });
    activeSquadIdx = squads.length - 1;
    saveSquads();
    hideAllPanels();
    switchDigits.forEach(d => d.value = '');
    updateJoinAnotherBtn();
    renderAll();
    showToast('Joined new squad!');
  });

  // ============================================
  // CREATE SQUAD (from Squad view)
  // ============================================
  document.getElementById('btnCreateSquadFromView').addEventListener('click', () => {
    hideAllPanels();
    document.getElementById('createSquadPanel').style.display = '';
    document.getElementById('squadNameInputView').value = '';
    document.getElementById('squadNameInputView').focus();
  });

  document.getElementById('btnCancelCreateSquad').addEventListener('click', () => {
    hideAllPanels();
  });

  document.getElementById('btnConfirmCreateSquad').addEventListener('click', () => {
    const name = document.getElementById('squadNameInputView').value.trim();
    if (!name) { showToast('Enter a squad name'); return; }
    const code = generateCode();
    squads.push({ name: name, code: code, members: MOCK_MEMBERS });
    activeSquadIdx = squads.length - 1;
    saveSquads();
    document.getElementById('createdSquadCodeView').textContent = code;
    drawQR(document.getElementById('qrCanvasView'), 'grindstone-squad-' + code);
    hideAllPanels();
    document.getElementById('createdSquadPanel').style.display = '';
    renderAll();
  });

  document.getElementById('btnCopyCodeView').addEventListener('click', () => {
    const sq = activeSquad();
    const code = sq ? sq.code : '';
    navigator.clipboard.writeText(code).then(() => showToast('Code copied!')).catch(() => showToast('Code: ' + code));
  });

  document.getElementById('btnShowQRView').addEventListener('click', () => {
    const qr = document.getElementById('qrDisplayView');
    qr.style.display = qr.style.display === 'none' ? '' : 'none';
  });

  document.getElementById('btnDoneCreateSquad').addEventListener('click', () => {
    hideAllPanels();
    renderAll();
  });

  function hideAllPanels() {
    document.getElementById('joinAnotherPanel').style.display = 'none';
    document.getElementById('createSquadPanel').style.display = 'none';
    document.getElementById('createdSquadPanel').style.display = 'none';
    document.getElementById('qrDisplayView').style.display = 'none';
  }

  // ============================================
  // RENDER SQUAD VIEW
  // ============================================
  function renderSquadView() {
    const sq = activeSquad();
    const name = sq ? sq.name : 'No Squad Yet';
    document.getElementById('squadNameDisplay').textContent = name;
    document.getElementById('squadStreakStat').textContent = streak;
    document.getElementById('squadMemberCount').textContent = sq ? (sq.members.length + 1) : 1;
    document.getElementById('squadSuccessRate').textContent = streak > 0 ? Math.min(100, 70 + streak) + '%' : '--%';

    const mgmtRow = document.querySelector('.squad-management-row');
    const actionsRow = document.querySelector('.squad-actions-row');
    const leaveBtn = document.getElementById('btnLeaveSquad');

    // Share/QR only when there's a squad
    actionsRow.style.display = sq ? '' : 'none';
    // Leave only when there's a squad
    leaveBtn.style.display = sq ? '' : 'none';
    // Join Another always visible
    mgmtRow.style.display = '';

    document.getElementById('joinAnotherPanel').style.display = 'none';

    if (sq) {
      document.getElementById('squadCodeDisplay').textContent = sq.code;
      document.getElementById('qrSquadName').textContent = sq.name;
      drawQR(document.getElementById('squadQRCanvas'), 'grindstone-squad-' + sq.code);
    }

    // Leaderboard
    const lb = document.getElementById('leaderboard');
    lb.innerHTML = '';

    const entries = [];
    if (sq) {
      sq.members.forEach(m => entries.push({ name: m.name, initials: m.initials, streak: m.streak, self: false }));
    }
    entries.push({ name: username || 'You', initials: (username || 'Y').slice(0, 2).toUpperCase(), streak: streak, self: true });
    entries.sort((a, b) => b.streak - a.streak);

    entries.forEach((e, i) => {
      const row = document.createElement('div');
      row.className = 'lb-row';
      row.innerHTML =
        '<span class="rank">' + (i + 1) + '</span>' +
        '<div class="lb-avatar' + (e.self ? ' self' : '') + '">' + e.initials + '</div>' +
        '<div class="lb-info"><strong>' + e.name + (e.self ? ' (You)' : '') + '</strong><span>' + e.streak + ' Day Streak</span></div>' +
        '<span class="lb-score">' + (e.streak * 10) + ' reps</span>';
      lb.appendChild(row);
    });
  }

  // Squad QR toggle
  document.getElementById('btnSquadQR').addEventListener('click', () => {
    const panel = document.getElementById('squadQRPanel');
    panel.style.display = panel.style.display === 'none' ? '' : 'none';
  });

  // Squad share
  document.getElementById('btnShareSquad').addEventListener('click', () => {
    const sq = activeSquad();
    if (sq && navigator.share) {
      navigator.share({ title: 'Join my GrindStone squad!', text: 'Use code ' + sq.code + ' to join ' + sq.name + ' on GrindStone!' })
        .catch(() => {});
    } else if (sq) {
      navigator.clipboard.writeText('Join ' + sq.name + ' on GrindStone! Code: ' + sq.code)
        .then(() => showToast('Squad link copied!'))
        .catch(() => showToast('Code: ' + sq.code));
    } else {
      showToast('Create a squad first!');
    }
  });

  // ============================================
  // CAMERA + RECORDING
  // ============================================
  const camVideo = document.getElementById('camVideo');
  const recBadge = document.getElementById('recBadge');
  const recordToggleBtn = document.getElementById('recordToggleBtn');
  const recordCanvas = document.getElementById('recordCanvas');
  const recordCtx = recordCanvas.getContext('2d');
  let micTrack = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let isRecording = false;
  let drawFrameId = null;

  // 0=off, 1=cam on, 2=recording
  let recordState = 0;

  async function startCamera() {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      camVideo.srcObject = cameraStream;
      cameraOn = true;
      recordState = 1;
      updateRecordBtn();
    } catch (err) {
      showToast('Camera access denied');
    }
  }

  function stopCamera() {
    if (isRecording) stopRecording();
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
    }
    camVideo.srcObject = null;
    cameraOn = false;
    recordState = 0;
    updateRecordBtn();
    recBadge.classList.remove('active');
  }

  function resetCamera() {
    stopCamera();
    micTrack = null;
  }

  function updateRecordBtn() {
    const doneBtn = document.getElementById('completeWorkoutBtn');
    recordToggleBtn.classList.remove('cam-on', 'recording');
    if (recordState === 0) {
      recordToggleBtn.innerHTML = '<svg class="cam-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>';
      doneBtn.style.display = '';
    } else if (recordState === 1) {
      recordToggleBtn.classList.add('cam-on');
      recordToggleBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff"/></svg>';
      doneBtn.style.display = '';
    } else if (recordState === 2) {
      recordToggleBtn.classList.add('recording');
      recordToggleBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ff4757"/></svg>';
      doneBtn.style.display = 'none';
      recBadge.classList.add('active');
    }
  }

  // --- Canvas compositing loop ---
  function drawFrame() {
    if (!cameraOn) return;
    const vw = camVideo.videoWidth || 640;
    const vh = camVideo.videoHeight || 480;
    if (recordCanvas.width !== vw) recordCanvas.width = vw;
    if (recordCanvas.height !== vh) recordCanvas.height = vh;

    // Draw mirrored video
    recordCtx.save();
    recordCtx.translate(vw, 0);
    recordCtx.scale(-1, 1);
    recordCtx.drawImage(camVideo, 0, 0, vw, vh);
    recordCtx.restore();

    // Darken overlay
    recordCtx.fillStyle = 'rgba(0,0,0,0.15)';
    recordCtx.fillRect(0, 0, vw, vh);

    // Watermark
    recordCtx.save();
    recordCtx.font = `900 ${Math.round(vw * 0.045)}px sans-serif`;
    recordCtx.fillStyle = 'rgba(255,255,255,0.1)';
    recordCtx.textAlign = 'center';
    recordCtx.textBaseline = 'middle';
    recordCtx.fillText('GRINDSTONE', vw / 2, vh * 0.62);
    recordCtx.restore();

    // Ring
    const ringR = Math.round(vw * 0.12);
    const cx = vw / 2;
    const cy = vh * 0.40;
    const circumference = 2 * Math.PI * 52;
    const progress = currentReps / targetReps;
    const offset = circumference * (1 - progress);

    recordCtx.save();
    recordCtx.translate(cx, cy);
    recordCtx.rotate(-Math.PI / 2);

    // Ring bg
    recordCtx.beginPath();
    recordCtx.arc(0, 0, ringR, 0, Math.PI * 2);
    recordCtx.strokeStyle = 'rgba(255,255,255,0.1)';
    recordCtx.lineWidth = ringR * 0.19;
    recordCtx.stroke();

    // Ring progress
    recordCtx.beginPath();
    recordCtx.arc(0, 0, ringR, 0, Math.PI * 2 * progress);
    recordCtx.strokeStyle = '#b7f34a';
    recordCtx.lineWidth = ringR * 0.19;
    recordCtx.lineCap = 'round';
    recordCtx.stroke();
    recordCtx.restore();

    // Rep number
    recordCtx.save();
    recordCtx.font = `800 ${Math.round(vw * 0.1)}px 'JetBrains Mono', monospace`;
    recordCtx.fillStyle = '#fff';
    recordCtx.textAlign = 'center';
    recordCtx.textBaseline = 'middle';
    recordCtx.shadowColor = 'rgba(0,0,0,0.5)';
    recordCtx.shadowBlur = 12;
    recordCtx.fillText(String(currentReps), cx, cy);
    recordCtx.shadowBlur = 0;

    // Rep label
    recordCtx.font = `700 ${Math.round(vw * 0.02)}px sans-serif`;
    recordCtx.fillStyle = 'rgba(255,255,255,0.5)';
    recordCtx.fillText('/ ' + targetReps + ' REPS', cx, cy + ringR * 0.55);
    recordCtx.restore();

    if (isRecording) drawFrameId = requestAnimationFrame(drawFrame);
  }

  // --- Start / stop recording ---
  async function startRecording() {
    if (!cameraStream) return;

    // Get mic
    try {
      const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
      micTrack = audio.getAudioTracks()[0];
    } catch (e) {
      // mic optional
    }

    // Draw first frame so canvas has content
    recordCanvas.width = camVideo.videoWidth || 640;
    recordCanvas.height = camVideo.videoHeight || 480;
    drawFrame();

    const canvasStream = recordCanvas.captureStream(30);
    if (micTrack) canvasStream.addTrack(micTrack);

    const mimeType = MediaRecorder.isTypeSupported('video/mp4')
      ? 'video/mp4'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    mediaRecorder = new MediaRecorder(canvasStream, { mimeType });
    recordedChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      if (micTrack) { micTrack.stop(); micTrack = null; }
      cancelAnimationFrame(drawFrameId);
      const blob = new Blob(recordedChunks, { type: mimeType });
      showRecordingPreview(blob, ext);
    };

    mediaRecorder.start(100);
    isRecording = true;
    recordState = 2;
    updateRecordBtn();
    drawFrame();
    showToast('Recording started');
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    isRecording = false;
    recordState = 1;
    updateRecordBtn();
    recBadge.classList.remove('active');
    showToast('Recording stopped');
  }

  // --- Preview modal ---
  function showRecordingPreview(blob, ext) {
    const url = URL.createObjectURL(blob);
    const previewVideo = document.getElementById('previewVideo');
    previewVideo.src = url;

    const modal = document.getElementById('recordingPreviewModal');
    modal.style.display = '';
    modal.classList.add('active');

    document.getElementById('btnDownloadRec').onclick = () => {
      const a = document.createElement('a');
      a.href = url;
      a.download = 'grindstone-' + Date.now() + '.' + ext;
      a.click();
    };

    document.getElementById('btnShareRec').onclick = async () => {
      const file = new File([blob], 'grindstone-' + Date.now() + '.' + ext, { type: blob.type });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'GrindStone Workout' });
        } catch (e) {
          if (e.name !== 'AbortError') showToast('Share failed');
        }
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = 'grindstone-' + Date.now() + '.' + ext;
        a.click();
      }
    };

    document.getElementById('btnClosePreview').onclick = () => {
      modal.style.display = 'none';
      modal.classList.remove('active');
      URL.revokeObjectURL(url);
    };
  }

  // --- Record button click handler ---
  recordToggleBtn.addEventListener('click', () => {
    if (recordState === 0) {
      startCamera();
    } else if (recordState === 1) {
      startRecording();
    } else if (recordState === 2) {
      stopRecording();
    }
  });

  // ============================================
  // RENDER PROFILE
  // ============================================
  function renderProfile() {
    const sq = activeSquad();
    const initials = (username || '?').slice(0, 2).toUpperCase();
    document.getElementById('profileAvatar').textContent = initials;
    document.getElementById('profileName').textContent = username || 'User';
    document.getElementById('profileRole').textContent = 'GrindStone Member' + (sq ? ' • ' + sq.name : '');
    document.getElementById('profileStreak').textContent = streak;
    document.getElementById('profileBest').textContent = bestStreak;
    document.getElementById('profileTotalDays').textContent = totalDays;
  }

  // ============================================
  // LOGOUT
  // ============================================
  document.getElementById('btnLogout').addEventListener('click', () => {
    LS.remove('loggedIn');
    LS.remove('username');
    LS.remove('streak');
    LS.remove('bestStreak');
    LS.remove('totalDays');
    LS.remove('totalReps');
    LS.remove('lastDropDate');
    LS.remove('squads');
    LS.remove('activeSquadIdx');
    LS.remove('workoutHistory');
    loggedIn = false;
    username = '';
    streak = 0;
    bestStreak = 0;
    totalDays = 0;
    totalReps = 0;
    lastDropDate = '';
    squads = [];
    activeSquadIdx = 0;
    isDoneToday = false;
    currentReps = 0;
    workoutHistory = {};

    appHeader.style.display = 'none';
    appBody.style.display = 'none';
    appNav.style.display = 'none';
    pwaBanner.style.display = 'none';
    onboardScreen.classList.remove('active');
    authScreen.classList.add('active');

    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('usernameInput').value = '';
    document.getElementById('squadNameInput').value = '';
    codeDigits.forEach(d => d.value = '');
    updateJoinBtn();
  });

  // ============================================
  // DEV TOOLS
  // ============================================
  document.getElementById('btnClearDay').addEventListener('click', () => {
    delete workoutHistory[todayStr()];
    LS.set('workoutHistory', workoutHistory);
    LS.remove('lastDropDate');
    LS.remove('totalReps');
    LS.remove('totalDays');
    lastDropDate = '';
    totalReps = 0;
    totalDays = 0;
    streak = 0;
    currentReps = 0;
    isDoneToday = false;
    renderAll();
    showToast('Today\'s set cleared');
  });

  document.getElementById('btnClearAll').addEventListener('click', () => {
    if (!confirm('Clear ALL local data? This cannot be undone.')) return;
    localStorage.clear();
    location.reload();
  });

  document.getElementById('btnSeedDays').addEventListener('click', () => {
    const history = {};
    const now = new Date();
    for (let i = 0; i < 10; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i - 2);
      const key = d.toISOString().slice(0, 10);
      history[key] = { reps: 10 };
    }
    workoutHistory = history;
    streak = 10;
    bestStreak = Math.max(bestStreak, 10);
    totalDays = 10;
    totalReps = 100;
    lastDropDate = todayStr();
    LS.set('workoutHistory', workoutHistory);
    LS.set('streak', streak);
    LS.set('bestStreak', bestStreak);
    LS.set('totalDays', totalDays);
    LS.set('totalReps', totalReps);
    LS.set('lastDropDate', lastDropDate);
    renderAll();
    showToast('Seeded 10 days of history');
  });

  // ============================================
  // COUNTDOWN TIMER
  // ============================================
  function updateCountdown() {
    const el = document.getElementById('timeLeft');
    if (el) el.textContent = getTimeLeft();
  }

  // ============================================
  // INIT
  // ============================================
  if (loggedIn) {
    if (username) {
      enterApp();
    } else {
      showOnboarding();
    }
  }

  updateReps();
});
