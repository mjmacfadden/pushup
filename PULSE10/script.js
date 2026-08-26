// PULSE 10 — Application State & Interactivity

document.addEventListener('DOMContentLoaded', () => {
  // App State
  let currentReps = 0;
  const targetReps = 10;
  let isCompletedToday = false;
  let userStreak = 18;

  // DOM Elements
  const body = document.body;
  const darkThemeBtn = document.getElementById('darkThemeBtn');
  const lightThemeBtn = document.getElementById('lightThemeBtn');

  const navItems = document.querySelectorAll('.nav-item');
  const viewPanels = document.querySelectorAll('.view-panel');

  const startWorkoutBtn = document.getElementById('startWorkoutBtn');
  const cancelWorkoutBtn = document.getElementById('cancelWorkoutBtn');
  const completeWorkoutBtn = document.getElementById('completeWorkoutBtn');
  const repTriggerZone = document.getElementById('repTriggerZone');
  
  const repNumber = document.getElementById('repNumber');
  const ringProgress = document.getElementById('ringProgress');
  const dashboardProgress = document.getElementById('dashboardProgress');
  const targetStatusText = document.getElementById('targetStatusText');
  const userTeammateCard = document.getElementById('userTeammateCard');
  const userStatusSubtext = document.getElementById('userStatusSubtext');
  const userRepStat = document.getElementById('userRepStat');
  const headerStreak = document.getElementById('headerStreak');
  
  const simNudgeBtn = document.getElementById('simNudgeBtn');
  const toast = document.getElementById('toast');

  // --- Theme Toggling ---
  darkThemeBtn.addEventListener('click', () => {
    body.classList.remove('light-theme');
    body.classList.add('dark-theme');
    darkThemeBtn.classList.add('active');
    lightThemeBtn.classList.remove('active');
  });

  lightThemeBtn.addEventListener('click', () => {
    body.classList.remove('dark-theme');
    body.classList.add('light-theme');
    lightThemeBtn.classList.add('active');
    darkThemeBtn.classList.remove('active');
  });

  // --- View Navigation Router ---
  function switchView(targetViewId) {
    viewPanels.forEach(panel => {
      panel.classList.remove('active');
    });

    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-target') === targetViewId) {
        item.classList.add('active');
      }
    });

    const activePanel = document.getElementById(targetViewId);
    if (activePanel) {
      activePanel.classList.add('active');
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.getAttribute('data-target');
      switchView(targetView);
    });
  });

  startWorkoutBtn.addEventListener('click', () => {
    switchView('viewWorkout');
  });

  cancelWorkoutBtn.addEventListener('click', () => {
    switchView('viewDashboard');
  });

  // --- Rep Counter Logic ---
  const ringCircumference = 326.72; // 2 * PI * 52

  function updateRepUI() {
    repNumber.textContent = currentReps;
    
    // Calculate stroke offset
    const progressRatio = currentReps / targetReps;
    const offset = ringCircumference - (progressRatio * ringCircumference);
    ringProgress.style.strokeDashoffset = offset;

    if (currentReps >= targetReps) {
      completeWorkoutBtn.removeAttribute('disabled');
      completeWorkoutBtn.style.opacity = '1';
    } else {
      completeWorkoutBtn.setAttribute('disabled', 'true');
    }
  }

  // Trigger rep tap
  repTriggerZone.addEventListener('click', () => {
    if (currentReps < targetReps) {
      currentReps++;
      updateRepUI();

      // Audio / Haptic feedback simulation
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      // Visual feedback pulse
      repTriggerZone.style.transform = 'scale(0.97)';
      setTimeout(() => {
        repTriggerZone.style.transform = 'scale(1)';
      }, 100);
    }
  });

  // Complete Workout Flow
  completeWorkoutBtn.addEventListener('click', () => {
    if (currentReps >= targetReps && !isCompletedToday) {
      isCompletedToday = true;
      userStreak++;
      headerStreak.textContent = userStreak;

      // Update Dashboard State
      dashboardProgress.style.width = '100%';
      targetStatusText.textContent = '🎉 Completed for today! Squad streak saved.';
      startWorkoutBtn.textContent = '✓ 10 REPS COMPLETED';
      startWorkoutBtn.style.background = '#2ed573';
      startWorkoutBtn.style.boxShadow = '0 4px 16px rgba(46, 213, 115, 0.3)';
      startWorkoutBtn.disabled = true;

      // Update Teammate Card
      userTeammateCard.classList.remove('pending');
      userTeammateCard.classList.add('done');
      userStatusSubtext.textContent = 'Logged 10 reps • Just now';
      userRepStat.textContent = '10 / 10';
      userRepStat.style.color = 'var(--success-color)';

      // Switch back to dashboard
      switchView('viewDashboard');
      showToast('🎉 Workout Logged! Streak is safe!');
    }
  });

  // --- Nudge Simulator ---
  window.triggerNudgeAnim = function(buttonEl) {
    showToast('⚡ Sent a nudge alert to Jake!');
    buttonEl.textContent = '⚡ NUDGED';
    buttonEl.style.opacity = '0.6';
    buttonEl.disabled = true;
  };

  simNudgeBtn.addEventListener('click', () => {
    showToast('⚡ Sent a nudge alert to Jake!');
  });

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  // Initial setup
  updateRepUI();
});
