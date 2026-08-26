(function () {
  "use strict";

  const USERS = [
    { id: 1, name: "Alex Chen", initials: "AC", color: "#e8e0d4" },
    { id: 2, name: "Jordan Kim", initials: "JK", color: "#d4dde8" },
    { id: 3, name: "Sam Rivera", initials: "SR", color: "#d4e8d8" },
    { id: 4, name: "Casey Park", initials: "CP", color: "#e8d4d4" },
    { id: 5, name: "Morgan Lee", initials: "ML", color: "#e8e4d4" },
    { id: 6, name: "Riley Tan", initials: "RT", color: "#d8d4e8" },
    { id: 7, name: "Taylor Wu", initials: "TW", color: "#d4e8e4" },
  ];

  const SQUADS = [
    {
      id: "office",
      name: "Office Crew",
      streak: 12,
      members: [
        { userId: 1, done: true },
        { userId: 2, done: true },
        { userId: 3, done: true },
        { userId: 4, done: true },
        { userId: 5, done: false },
      ],
    },
    {
      id: "gym",
      name: "Gym Rats",
      streak: 8,
      members: [
        { userId: 1, done: true },
        { userId: 6, done: true },
        { userId: 7, done: false },
      ],
    },
  ];

  const FEED_DATA = [
    {
      userId: 2,
      time: "2 min ago",
      squad: "Office Crew",
      caption: "Morning drop done! Who's next?",
      hasVideo: true,
      reactions: { fire: 3, muscle: 1 },
    },
    {
      userId: 3,
      time: "18 min ago",
      squad: "Office Crew",
      caption: "Quick 10 between meetings",
      hasVideo: false,
      reactions: { clap: 2 },
    },
    {
      userId: 6,
      time: "1 hr ago",
      squad: "Gym Rats",
      caption: "Post-workout bonus reps!",
      hasVideo: true,
      reactions: { fire: 5, boom: 2 },
    },
    {
      userId: 4,
      time: "3 hr ago",
      squad: "Office Crew",
      caption: "Keeping the streak alive",
      hasVideo: false,
      reactions: { muscle: 4, clap: 1 },
    },
    {
      userId: 7,
      time: "5 hr ago",
      squad: "Gym Rats",
      caption: "Late night drop but got it done",
      hasVideo: true,
      reactions: { fire: 2 },
    },
  ];

  let currentScreen = "splash";
  let slideIndex = 0;
  let dropCompleted = false;

  function getUser(id) {
    return USERS.find(function (u) { return u.id === id; });
  }

  function getGreeting() {
    var h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  function switchScreen(name) {
    document.querySelectorAll(".screen").forEach(function (s) {
      s.classList.remove("active");
    });
    var target = document.getElementById("screen-" + name);
    if (target) {
      target.classList.add("active");
      currentScreen = name;
      updateNavActive(name);
    }
  }

  function updateNavActive(screenName) {
    document.querySelectorAll(".nav-item[data-screen]").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.screen === screenName);
    });
  }

  function showToast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("visible");
    setTimeout(function () {
      t.classList.remove("visible");
    }, 2500);
  }

  function openModal(id) {
    var m = document.getElementById("modal-" + id);
    if (m) m.classList.add("active");
  }

  function closeModal(id) {
    var m = document.getElementById("modal-" + id);
    if (m) m.classList.remove("active");
  }

  function closeAllModals() {
    document.querySelectorAll(".modal").forEach(function (m) {
      m.classList.remove("active");
    });
  }

  function renderAvatar(el, user) {
    el.style.background = user.color;
    el.textContent = user.initials;
  }

  function renderHome() {
    document.getElementById("greeting-text").textContent = getGreeting();
    renderAvatar(document.getElementById("my-avatar"), USERS[0]);

    var squadRow = document.getElementById("squad-preview-row");
    squadRow.innerHTML = "";
    SQUADS[0].members.forEach(function (m) {
      var user = getUser(m.userId);
      var card = document.createElement("div");
      card.className = "squad-member-card";
      var avClass = "squad-member-avatar";
      if (m.done) avClass += " done";
      if (m.userId === 1) avClass += " done";
      card.innerHTML =
        '<div class="' + avClass + '" style="background:' + user.color + '">' + user.initials + '</div>' +
        '<div class="squad-member-name">' + (m.userId === 1 ? "You" : user.name.split(" ")[0]) + '</div>';
      squadRow.appendChild(card);
    });

    var activityList = document.getElementById("activity-list-preview");
    activityList.innerHTML = "";
    FEED_DATA.slice(0, 3).forEach(function (item) {
      var user = getUser(item.userId);
      var div = document.createElement("div");
      div.className = "activity-item";
      div.innerHTML =
        '<div class="activity-avatar" style="background:' + user.color + '">' + user.initials + '</div>' +
        '<div class="activity-info">' +
          '<div class="activity-text">' + user.name.split(" ")[0] + ' completed ' + (item.hasVideo ? "video" : "drop") + '</div>' +
          '<div class="activity-time">' + item.time + '</div>' +
        '</div>';
      activityList.appendChild(div);
    });
  }

  function renderSquads() {
    var container = document.getElementById("squad-list");
    container.innerHTML = "";
    SQUADS.forEach(function (squad) {
      var doneCount = squad.members.filter(function (m) { return m.done; }).length;
      var total = squad.members.length;
      var pct = Math.round((doneCount / total) * 100);
      var missing = squad.members.filter(function (m) { return !m.done && m.userId !== 1; });

      var card = document.createElement("div");
      card.className = "squad-card";

      var membersHtml = "";
      squad.members.forEach(function (m) {
        var user = getUser(m.userId);
        var cls = "squad-member-pill";
        if (m.done || m.userId === 1) cls += " done";
        else if (missing.indexOf(m) >= 0) cls += " missed";
        membersHtml +=
          '<div class="' + cls + '">' +
            '<div class="pill-avatar" style="background:' + user.color + '">' + user.initials + '</div>' +
            (m.userId === 1 ? "You" : user.name.split(" ")[0]) +
          '</div>';
      });

      var nudgeHtml = "";
      if (missing.length > 0) {
        nudgeHtml = '<button class="btn-sm btn-nudge-all" data-squad="' + squad.id + '">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>' +
            '<path d="M13.73 21a2 2 0 0 1-3.46 0"/>' +
          '</svg> Nudge Missing (' + missing.length + ')' +
        '</button>';
      }

      card.innerHTML =
        '<div class="squad-card-header">' +
          '<div class="squad-icon"><svg viewBox="0 0 40 40" width="40" height="40">' +
            '<circle cx="20" cy="20" r="18" fill="none" stroke="#222" stroke-width="1.5"/>' +
            '<path d="M12 22 C12 18 16 16 20 16 C24 16 28 18 28 22" fill="none" stroke="#222" stroke-width="1.5"/>' +
            '<circle cx="20" cy="12" r="4" fill="none" stroke="#222" stroke-width="1.5"/>' +
          '</svg></div>' +
          '<div class="squad-card-info">' +
            '<h3>' + squad.name + '</h3>' +
            '<span class="squad-streak-badge">' + squad.streak + ' day streak</span>' +
          '</div>' +
          '<div class="squad-progress-mini">' +
            '<span class="progress-text">' + doneCount + '/' + total + ' done</span>' +
            '<div class="progress-bar-mini"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
          '</div>' +
        '</div>' +
        '<div class="squad-members">' + membersHtml + '</div>' +
        '<div class="squad-card-actions">' +
          nudgeHtml +
          '<button class="btn-sm" onclick="window._copyInvite(\'' + squad.id + '\')">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">' +
              '<line x1="12" y1="5" x2="12" y2="19"/>' +
              '<line x1="5" y1="12" x2="19" y2="12"/>' +
            '</svg> Invite' +
          '</button>' +
        '</div>';

      container.appendChild(card);
    });

    container.querySelectorAll(".btn-nudge-all").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openModal("nudge");
        var squadId = btn.dataset.squad;
        var squad = SQUADS.find(function (s) { return s.id === squadId; });
        var missing = squad.members.filter(function (m) { return !m.done && m.userId !== 1; });
        var names = missing.map(function (m) { return getUser(m.userId).name.split(" ")[0]; }).join(", ");
        document.getElementById("nudge-target-info").innerHTML =
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>' +
            '<circle cx="9" cy="7" r="4"/>' +
          '</svg> ' + names;
      });
    });
  }

  function renderFeed() {
    var container = document.getElementById("feed-list");
    container.innerHTML = "";
    FEED_DATA.forEach(function (item) {
      var user = getUser(item.userId);
      var reactionsHtml = "";
      Object.keys(item.reactions).forEach(function (key) {
        var emojiMap = { fire: "\uD83D\uDD25", muscle: "\uD83D\uDCAA", clap: "\uD83D\uDC4F", boom: "\uD83D\uDCA5" };
        reactionsHtml +=
          '<button class="feed-reaction">' +
            '<span>' + (emojiMap[key] || key) + '</span>' +
            '<span class="count">' + item.reactions[key] + '</span>' +
          '</button>';
      });

      var videoHtml = "";
      if (item.hasVideo) {
        videoHtml =
          '<div class="feed-video-placeholder">' +
            '<div class="play-icon"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#222" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>' +
          '</div>';
      }

      var card = document.createElement("div");
      card.className = "feed-card";
      card.innerHTML =
        '<div class="feed-card-header">' +
          '<div class="feed-avatar" style="background:' + user.color + '">' + user.initials + '</div>' +
          '<div class="feed-user-info">' +
            '<div class="feed-username">' + user.name + '</div>' +
            '<div class="feed-time">' + item.time + '</div>' +
          '</div>' +
          '<div class="feed-squad-badge">' + item.squad + '</div>' +
        '</div>' +
        videoHtml +
        '<div class="feed-caption">' + item.caption + '</div>' +
        '<div class="feed-reactions">' + reactionsHtml + '</div>';
      container.appendChild(card);
    });
  }

  function renderProfile() {
    var squadContainer = document.getElementById("profile-squads");
    squadContainer.innerHTML = "";
    SQUADS.forEach(function (squad) {
      var doneCount = squad.members.filter(function (m) { return m.done || m.userId === 1; }).length;
      var total = squad.members.length;
      var pct = Math.round((doneCount / total) * 100);
      var item = document.createElement("div");
      item.className = "profile-squad-item";
      item.innerHTML =
        '<div class="psi-icon">\uD83D\uDC65</div>' +
        '<div class="psi-info">' +
          '<div class="psi-name">' + squad.name + '</div>' +
          '<div class="psi-streak">' + squad.streak + ' day streak</div>' +
        '</div>' +
        '<div class="psi-progress"><span class="psi-percent">' + pct + '%</span></div>';
      squadContainer.appendChild(item);
    });

    var badges = document.getElementById("badges-grid");
    badges.innerHTML = "";
    var badgeData = [
      { icon: "\uD83D\uDD25", label: "7 Day", earned: true },
      { icon: "\uD83D\uDCAA", label: "First Drop", earned: true },
      { icon: "\u2B50", label: "30 Day", earned: false },
      { icon: "\uD83C\uDFC6", label: "Squad Pro", earned: true },
      { icon: "\uD83C\uDF1F", label: "100 Drops", earned: true },
      { icon: "\uD83D\uDE80", label: "Streak 50", earned: false },
      { icon: "\uD83E\uDDE1", label: "Nudger", earned: true },
      { icon: "\uD83D\uDCAB", label: "Early Bird", earned: false },
    ];
    badgeData.forEach(function (b) {
      var div = document.createElement("div");
      div.className = "badge-item";
      div.innerHTML =
        '<div class="badge-icon ' + (b.earned ? "earned" : "locked") + '">' + b.icon + '</div>' +
        '<div class="badge-label">' + b.label + '</div>';
      badges.appendChild(div);
    });

    var heatmap = document.getElementById("heatmap-placeholder");
    heatmap.innerHTML = '<div class="heatmap-grid"></div>';
    var grid = heatmap.querySelector(".heatmap-grid");
    for (var i = 0; i < 56; i++) {
      var cell = document.createElement("div");
      cell.className = "heatmap-cell";
      var r = Math.random();
      if (r > 0.3) cell.classList.add("l1");
      if (r > 0.5) cell.classList.add("l2");
      if (r > 0.7) cell.classList.add("l3");
      if (r > 0.85) cell.classList.add("l4");
      grid.appendChild(cell);
    }
  }

  function setupSplash() {
    var slides = document.querySelectorAll(".onboarding-slides .slide");
    var dots = document.querySelectorAll(".slide-dots .dot");

    function goToSlide(idx) {
      slides.forEach(function (s, i) {
        s.classList.toggle("active", i === idx);
      });
      dots.forEach(function (d, i) {
        d.classList.toggle("active", i === idx);
      });
      slideIndex = idx;
    }

    setInterval(function () {
      goToSlide((slideIndex + 1) % slides.length);
    }, 4000);

    document.getElementById("btn-get-started").addEventListener("click", function () {
      switchScreen("home");
      renderHome();
    });

    document.getElementById("btn-skip").addEventListener("click", function () {
      switchScreen("home");
      renderHome();
    });

    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () {
        goToSlide(i);
      });
    });
  }

  function setupNavigation() {
    document.querySelectorAll(".nav-item[data-screen]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var screen = btn.dataset.screen;
        switchScreen(screen);
        if (screen === "home") renderHome();
        if (screen === "squad") renderSquads();
        if (screen === "feed") renderFeed();
        if (screen === "profile") renderProfile();
      });
    });

    document.querySelectorAll("[data-goto]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var screen = btn.dataset.goto;
        switchScreen(screen);
        if (screen === "home") renderHome();
        if (screen === "squad") renderSquads();
        if (screen === "feed") renderFeed();
        if (screen === "profile") renderProfile();
      });
    });

    function handleDropNav() {
      if (dropCompleted) {
        showToast("Already completed today's drop!");
        return;
      }
      openModal("checkin");
    }

    var dropBtns = [
      "btn-nav-drop", "btn-nav-drop2", "btn-nav-drop3", "btn-nav-drop4",
      "btn-do-pushups"
    ];
    dropBtns.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", handleDropNav);
    });
  }

  function setupModals() {
    document.querySelectorAll(".modal-overlay").forEach(function (overlay) {
      overlay.addEventListener("click", closeAllModals);
    });

    document.getElementById("btn-close-checkin").addEventListener("click", function () {
      closeModal("checkin");
    });

    document.getElementById("btn-close-nudge").addEventListener("click", function () {
      closeModal("nudge");
    });

    document.getElementById("btn-record-video").addEventListener("click", function () {
      closeModal("checkin");
      showToast("Recording started... (wireframe mock)");
      setTimeout(function () {
        completeCheckin();
      }, 1500);
    });

    document.getElementById("btn-tap-complete").addEventListener("click", function () {
      closeModal("checkin");
      completeCheckin();
    });

    document.querySelectorAll(".nudge-option").forEach(function (btn) {
      btn.addEventListener("click", function () {
        closeModal("nudge");
        var type = btn.dataset.nudge;
        var names = {
          friendly: "Friendly Wave",
          funny: "Funny Bomb",
          horn: "Air Horn",
          stare: "The Stare"
        };
        showToast("Nudge sent: " + names[type] + " \uD83D\uDC4C");
      });
    });

    document.getElementById("btn-done-complete").addEventListener("click", function () {
      closeModal("complete");
    });

    document.querySelectorAll(".reaction-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        btn.style.transform = "scale(1.3)";
        setTimeout(function () {
          btn.style.transform = "";
        }, 200);
        showToast("Reaction sent! \uD83D\uDE0A");
      });
    });
  }

  function completeCheckin() {
    dropCompleted = true;

    var ring = document.getElementById("progress-ring");
    if (ring) {
      ring.style.transition = "stroke-dashoffset 1s ease";
      ring.setAttribute("stroke-dashoffset", "0");
    }

    setTimeout(function () {
      openModal("complete");
    }, 600);
  }

  function setupFilterChips() {
    document.querySelectorAll(".filter-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        document.querySelectorAll(".filter-chip").forEach(function (c) {
          c.classList.remove("active");
        });
        chip.classList.add("active");
        showToast("Filter: " + chip.dataset.filter);
      });
    });
  }

  window._copyInvite = function (squadId) {
    showToast("Invite link copied! \uD83D\uDD17");
  };

  function init() {
    setupSplash();
    setupNavigation();
    setupModals();
    setupFilterChips();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
