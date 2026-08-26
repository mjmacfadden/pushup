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
  let totalReps = LS.get('totalReps', 0);
  let lastDropDate = LS.get('lastDropDate', '');
  let squads = LS.get('squads', []);
  let activeSquadIdx = LS.get('activeSquadIdx', 0);
  let loggedIn = LS.get('loggedIn', false);
  let currentReps = 0;
  const targetReps = 10;
  let isDoneToday = false;
  let cameraStream = null;
  let cameraOn = false;

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

  function checkTodayDone() {
    if (lastDropDate === todayStr()) {
      isDoneToday = true;
      currentReps = targetReps;
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
  });

  // ============================================
  // ONBOARDING
  // ============================================
  function showOnboarding() {
    authScreen.classList.remove('active');
    onboardScreen.classList.add('active');
    showOnboardStep('onboardStep1');
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
      squads.push({ name: 'Joined Squad', code: code, members: MOCK_MEMBERS });
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
  document.getElementById('closeBannerBtn').addEventListener('click', () => {
    pwaBanner.style.display = 'none';
  });
  document.getElementById('installBtn').addEventListener('click', () => {
    showToast('Installed to Home Screen!');
    pwaBanner.style.display = 'none';
  });

  // ============================================
  // VIEW NAVIGATION
  // ============================================
  const navBtns = document.querySelectorAll('.nav-btn[data-target]');
  const viewPanels = document.querySelectorAll('.view-panel');

  function switchView(targetId) {
    viewPanels.forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => {
      if (b.dataset.target === targetId) b.classList.add('active');
    });
    const panel = document.getElementById(targetId);
    if (panel) panel.classList.add('active');
    appBody.scrollTop = 0;
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

  document.getElementById('cancelWorkoutBtn').addEventListener('click', () => {
    stopCamera();
    switchView('viewToday');
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
  }

  document.getElementById('noseTrigger').addEventListener('click', () => {
    if (currentReps < targetReps) {
      currentReps++;
      updateReps();
      if (navigator.vibrate) navigator.vibrate(40);
    }
  });

  completeWorkoutBtn.addEventListener('click', () => {
    if (currentReps >= targetReps && !isDoneToday) {
      isDoneToday = true;
      streak++;
      if (streak > bestStreak) bestStreak = streak;
      totalReps += targetReps;
      lastDropDate = todayStr();

      LS.set('streak', streak);
      LS.set('bestStreak', bestStreak);
      LS.set('totalReps', totalReps);
      LS.set('lastDropDate', lastDropDate);

      stopCamera();
      renderAll();
      switchView('viewToday');
      showToast('Workout saved! Squad notified.');
    }
  });

  // ============================================
  // RENDER DASHBOARD
  // ============================================
  function renderDashboard() {
    const sq = activeSquad();
    document.getElementById('streakVal').textContent = streak;
    document.getElementById('squadTagDash').textContent = sq ? sq.name : 'No Squad';
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
    const members = sq ? sq.members : MOCK_MEMBERS;
    const userName = username || 'You';
    const userInitials = userName.slice(0, 2).toUpperCase();

    let doneCount = 0;
    if (isDoneToday) doneCount++;
    members.forEach(m => { if (m.done) doneCount++; });
    const total = members.length + 1;
    document.getElementById('squadFeedCount').textContent = doneCount + '/' + total + ' Ready';

    feedList.innerHTML = '';

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

    // User card
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
  // CAMERA + RECORD TOGGLE
  // ============================================
  const camVideo = document.getElementById('camVideo');
  const recBadge = document.getElementById('recBadge');
  const recordToggleBtn = document.getElementById('recordToggleBtn');

  async function startCamera() {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      camVideo.srcObject = cameraStream;
      cameraOn = true;
      recordToggleBtn.classList.add('recording');
      recBadge.classList.add('active');
    } catch (err) {
      showToast('Camera access denied');
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
    }
    camVideo.srcObject = null;
    cameraOn = false;
    recordToggleBtn.classList.remove('recording');
    recBadge.classList.remove('active');
  }

  recordToggleBtn.addEventListener('click', () => {
    if (cameraOn) stopCamera(); else startCamera();
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
    document.getElementById('profileTotal').textContent = totalReps;
  }

  // ============================================
  // LOGOUT
  // ============================================
  document.getElementById('btnLogout').addEventListener('click', () => {
    LS.remove('loggedIn');
    LS.remove('username');
    LS.remove('streak');
    LS.remove('bestStreak');
    LS.remove('totalReps');
    LS.remove('lastDropDate');
    LS.remove('squads');
    LS.remove('activeSquadIdx');
    loggedIn = false;
    username = '';
    streak = 0;
    bestStreak = 0;
    totalReps = 0;
    lastDropDate = '';
    squads = [];
    activeSquadIdx = 0;
    isDoneToday = false;
    currentReps = 0;

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
    LS.remove('lastDropDate');
    LS.remove('totalReps');
    lastDropDate = '';
    totalReps = 0;
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
