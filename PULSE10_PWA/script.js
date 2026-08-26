// PULSE 10 — PWA Interactive Logic

document.addEventListener('DOMContentLoaded', () => {
  let currentReps = 0;
  const targetReps = 10;
  let isDone = false;
  let streak = 18;

  // DOM Elements
  const body = document.body;
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const installBanner = document.getElementById('installBanner');
  const closeBannerBtn = document.getElementById('closeBannerBtn');
  const installBtn = document.getElementById('installBtn');

  const navBtns = document.querySelectorAll('.nav-btn');
  const viewPanels = document.querySelectorAll('.view-panel');

  const startWorkoutBtn = document.getElementById('startWorkoutBtn');
  const cancelWorkoutBtn = document.getElementById('cancelWorkoutBtn');
  const completeWorkoutBtn = document.getElementById('completeWorkoutBtn');
  const noseTrigger = document.getElementById('noseTrigger');
  
  const repNumber = document.getElementById('repNumber');
  const ringProgress = document.getElementById('ringProgress');
  const dashboardProgress = document.getElementById('dashboardProgress');
  const targetStatusText = document.getElementById('targetStatusText');
  
  const userCard = document.getElementById('userCard');
  const userSubtext = document.getElementById('userSubtext');
  const userStatText = document.getElementById('userStatText');
  const streakVal = document.getElementById('streakVal');
  const nudgeBtn = document.getElementById('nudgeBtn');
  const pwaToast = document.getElementById('pwaToast');

  // Theme Toggle
  themeToggleBtn.addEventListener('click', () => {
    body.classList.toggle('light-theme');
  });

  // Install Banner dismissal
  closeBannerBtn.addEventListener('click', () => {
    installBanner.style.display = 'none';
  });

  installBtn.addEventListener('click', () => {
    showToast('📲 Installed to Home Screen!');
    installBanner.style.display = 'none';
  });

  // View Navigation
  function switchView(targetId) {
    viewPanels.forEach(panel => panel.classList.remove('active'));
    navBtns.forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-target') === targetId) {
        btn.classList.add('active');
      }
    });
    const activePanel = document.getElementById(targetId);
    if (activePanel) activePanel.classList.add('active');
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.getAttribute('data-target')));
  });

  startWorkoutBtn.addEventListener('click', () => switchView('viewWorkout'));
  cancelWorkoutBtn.addEventListener('click', () => switchView('viewToday'));

  // Counter Ring Logic
  const ringCircumference = 326.72;

  function updateReps() {
    repNumber.textContent = currentReps;
    const offset = ringCircumference - ((currentReps / targetReps) * ringCircumference);
    ringProgress.style.strokeDashoffset = offset;

    if (currentReps >= targetReps) {
      completeWorkoutBtn.removeAttribute('disabled');
    } else {
      completeWorkoutBtn.setAttribute('disabled', 'true');
    }
  }

  // Nose-Tap Sensor Simulation
  noseTrigger.addEventListener('click', () => {
    if (currentReps < targetReps) {
      currentReps++;
      updateReps();
      if (navigator.vibrate) navigator.vibrate(40);
      noseTrigger.style.transform = 'scale(0.96)';
      setTimeout(() => noseTrigger.style.transform = 'scale(1)', 100);
    }
  });

  // Complete Workout Flow
  completeWorkoutBtn.addEventListener('click', () => {
    if (currentReps >= targetReps && !isDone) {
      isDone = true;
      streak++;
      streakVal.textContent = streak;

      dashboardProgress.style.width = '100%';
      targetStatusText.textContent = '🎉 Completed! Squad streak is safe.';
      startWorkoutBtn.textContent = '✓ 10 REPS DONE';
      startWorkoutBtn.style.background = '#2ed573';
      startWorkoutBtn.disabled = true;

      userCard.classList.remove('pending');
      userCard.classList.add('done');
      userSubtext.textContent = 'Logged 10 reps • Just now';
      userStatText.textContent = '10 / 10';
      userStatText.style.color = '#2ed573';

      switchView('viewToday');
      showToast('🔥 Workout Saved! Squad notified.');
    }
  });

  // Nudge Simulator
  nudgeBtn.addEventListener('click', () => {
    showToast('⚡ Sent a nudge alert to Jake!');
    nudgeBtn.textContent = '⚡ SENT';
    nudgeBtn.disabled = true;
    nudgeBtn.style.opacity = '0.6';
  });

  function showToast(msg) {
    pwaToast.textContent = msg;
    pwaToast.classList.add('show');
    setTimeout(() => pwaToast.classList.remove('show'), 2500);
  }

  updateReps();
});
