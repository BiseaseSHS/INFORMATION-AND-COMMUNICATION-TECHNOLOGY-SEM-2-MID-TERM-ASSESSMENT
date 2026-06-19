// script.js
(function () {
  "use strict";

  // ====== CONFIG ======
  const EXAM_DURATION_SECONDS = 20 * 60; // 20 minutes
  const MAX_VIOLATIONS = 3;
  const STORAGE_KEY = "bshs_ict_exam_attempts"; // now stores an array of attempts
  const DRAFT_KEY = "bshs_ict_exam_draft";
  // Replace with your deployed Google Apps Script Web App URL
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxDr9NVBQU1HDqMQDiGl3XrEc43Wqf9a62wabEDr6h_AKY7tId6Xb7bzqI_RoJjI39VFw/exec";

  // ====== STATE ======
  let questions = [];
  let answers = {};       // { questionId: optionIndex | text }
  let currentIndex = 0;
  let timeRemaining = EXAM_DURATION_SECONDS;
  let timerInterval = null;
  let violationCount = 0;
  let examStartTime = null;
  let studentInfo = { name: "", class: "", id: "" };
  let examSubmitted = false;

  // ====== DOM ======
  const $ = (id) => document.getElementById(id);
  const screens = {
    welcome: $("welcomeScreen"),
    locked: $("lockedScreen"),
    exam: $("examScreen"),
    submitting: $("submittingScreen"),
    result: $("resultScreen"),
  };

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  // ====== UTILITIES ======
  function shuffle(array) {
    const a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function generateStudentId() {
    return "STU-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(Math.random() * 900 + 100);
  }

  function getInitials(name) {
    return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "ST";
  }

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function showToast(message) {
    const toast = $("violationToast");
    toast.textContent = message;
    toast.classList.remove("hidden");
    requestAnimationFrame(() => toast.classList.add("show"));
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.classList.add("hidden"), 300);
    }, 3200);
  }

  // ====== ATTEMPT LOCK CHECK (by name + class) ======

  // Returns the stored attempts array
  function getStoredAttempts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      // Support legacy single-object format from older versions
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") return [parsed];
      return [];
    } catch (e) {
      return [];
    }
  }

  // Returns a prior attempt matching the given name + class (case-insensitive, trimmed)
  function findPriorAttempt(name, cls) {
    const attempts = getStoredAttempts();
    const normName = name.trim().toLowerCase();
    const normClass = cls.trim().toLowerCase();
    return attempts.find(
      (a) =>
        a.name && a.class &&
        a.name.trim().toLowerCase() === normName &&
        a.class.trim().toLowerCase() === normClass
    ) || null;
  }

  // Saves a completed attempt into the attempts array (keyed by name+class)
  function storeAttempt(record) {
    const attempts = getStoredAttempts();
    // Replace if same student already exists, otherwise push
    const idx = attempts.findIndex(
      (a) =>
        a.name && a.class &&
        a.name.trim().toLowerCase() === record.name.trim().toLowerCase() &&
        a.class.trim().toLowerCase() === record.class.trim().toLowerCase()
    );
    if (idx >= 0) {
      attempts[idx] = record;
    } else {
      attempts.push(record);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
    } catch (e) { /* ignore quota errors */ }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ====== CHECK PRIOR ATTEMPT (called after student submits name + class) ======
  function checkPriorAttemptForStudent(name, cls) {
    const prior = findPriorAttempt(name, cls);
    if (prior) {
      $("lockedSummary").innerHTML = `
        <div><span>Name</span><span>${escapeHtml(prior.name)}</span></div>
        <div><span>Class</span><span>${escapeHtml(prior.class)}</span></div>
        <div><span>Score</span><span>${prior.correct}/${prior.total} (${prior.percentage}%)</span></div>
        <div><span>Grade</span><span>${prior.grade}</span></div>
        <div><span>Date</span><span>${prior.timestamp}</span></div>
      `;
      showScreen("locked");
      return true;
    }
    return false;
  }

  // ====== QUESTION PREP (randomization) ======
  function prepareQuestions() {
    const shuffledQuestions = shuffle(QUESTION_BANK);
    questions = shuffledQuestions.map((q) => {
      if (q.type === "mcq") {
        const optionObjs = q.options.map((text, idx) => ({ text, isCorrect: idx === q.correctIndex }));
        const shuffledOptions = shuffle(optionObjs);
        return { ...q, options: shuffledOptions };
      }
      return { ...q };
    });
  }

  // ====== LOCAL DRAFT (temporary answer save) ======
  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        answers,
        currentIndex,
        timeRemaining,
        violationCount,
        studentInfo,
        examStartTime,
      }));
    } catch (e) { /* ignore quota errors */ }
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
  }

  // ====== STUDENT FORM ======
  $("studentForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const name = $("studentName").value.trim();
    const cls = $("studentClass").value.trim();
    if (!name || !cls) return;

    // Check if this specific student (name + class) has already taken the exam
    if (checkPriorAttemptForStudent(name, cls)) return;

    studentInfo = { name, class: cls, id: generateStudentId() };
    startExam();
  });

  // ====== EXAM START ======
  function startExam() {
    prepareQuestions();
    answers = {};
    currentIndex = 0;
    timeRemaining = EXAM_DURATION_SECONDS;
    violationCount = 0;
    examStartTime = Date.now();
    examSubmitted = false;

    $("headerName").textContent = studentInfo.name;
    $("headerClass").textContent = studentInfo.class;
    $("avatarInitials").textContent = getInitials(studentInfo.name);

    buildNavGrid();
    renderQuestion();
    startTimer();
    enableAntiCheat();
    disableBackButton();

    showScreen("exam");
    saveDraft();
  }

  // ====== TIMER ======
  function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      timeRemaining--;
      updateTimerDisplay();
      if (timeRemaining % 5 === 0) saveDraft();
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        timeRemaining = 0;
        updateTimerDisplay();
        submitExam(true);
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    $("timerDisplay").textContent = formatTime(timeRemaining);
    const panel = $("timerPanel");
    if (timeRemaining <= 120) {
      panel.classList.add("warning");
    } else {
      panel.classList.remove("warning");
    }
  }

  // ====== NAVIGATION GRID ======
  function buildNavGrid() {
    const grid = $("navGrid");
    grid.innerHTML = "";
    questions.forEach((q, idx) => {
      const btn = document.createElement("div");
      btn.className = "nav-item";
      btn.textContent = idx + 1;
      btn.dataset.index = idx;
      btn.addEventListener("click", () => {
        currentIndex = idx;
        renderQuestion();
      });
      grid.appendChild(btn);
    });
    refreshNavGrid();
  }

  function refreshNavGrid() {
    const items = $("navGrid").children;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      item.classList.remove("answered", "current");
      const qId = questions[i].id;
      if (answers[qId] !== undefined && answers[qId] !== "") item.classList.add("answered");
      if (i === currentIndex) item.classList.add("current");
    }
  }

  // ====== RENDER QUESTION ======
  function renderQuestion() {
    const q = questions[currentIndex];
    $("paperLabel").textContent = q.paper;
    $("questionNumber").textContent = `Question ${currentIndex + 1} of ${questions.length}`;
    $("marksTag").textContent = `${q.marks} mark${q.marks > 1 ? "s" : ""}`;
    $("questionText").textContent = q.question;
    $("mobileProgress").textContent = `${currentIndex + 1} / ${questions.length}`;

    const optionsContainer = $("optionsContainer");
    const textInput = $("textAnswerInput");

    if (q.type === "mcq") {
      textInput.classList.add("hidden");
      optionsContainer.classList.remove("hidden");
      optionsContainer.innerHTML = "";
      const letters = ["A", "B", "C", "D", "E", "F"];
      q.options.forEach((opt, idx) => {
        const label = document.createElement("label");
        label.className = "option-label";
        if (answers[q.id] === idx) label.classList.add("selected");
        label.innerHTML = `
          <input type="radio" name="option" ${answers[q.id] === idx ? "checked" : ""}>
          <span><b>${letters[idx]}.</b> ${escapeHtml(opt.text)}</span>
        `;
        label.addEventListener("click", () => {
          answers[q.id] = idx;
          saveDraft();
          renderQuestion();
        });
        optionsContainer.appendChild(label);
      });
    } else {
      optionsContainer.classList.add("hidden");
      textInput.classList.remove("hidden");
      textInput.value = answers[q.id] || "";
      textInput.oninput = () => {
        answers[q.id] = textInput.value;
        refreshNavGrid();
        saveDraft();
      };
    }

    refreshNavGrid();
    updateProgressBar();

    $("prevBtn").disabled = currentIndex === 0;
    $("nextBtn").textContent = currentIndex === questions.length - 1 ? "Review →" : "Next →";
  }

  function updateProgressBar() {
    const answeredCount = questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== "").length;
    const pct = Math.round((answeredCount / questions.length) * 100);
    $("progressBarFill").style.width = pct + "%";
  }

  // ====== NAV BUTTONS ======
  $("prevBtn").addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      renderQuestion();
    }
  });

  $("nextBtn").addEventListener("click", () => {
    if (currentIndex < questions.length - 1) {
      currentIndex++;
      renderQuestion();
    } else {
      openConfirmModal();
    }
  });

  $("submitExamBtn").addEventListener("click", openConfirmModal);

  // ====== CONFIRM MODAL ======
  function openConfirmModal() {
    const unanswered = questions.filter((q) => answers[q.id] === undefined || answers[q.id] === "").length;
    $("unansweredWarning").textContent = unanswered > 0
      ? `You have ${unanswered} unanswered question${unanswered > 1 ? "s" : ""}.`
      : "All questions answered. Great job!";
    $("confirmModal").classList.remove("hidden");
  }

  $("cancelSubmitBtn").addEventListener("click", () => $("confirmModal").classList.add("hidden"));
  $("confirmSubmitBtn").addEventListener("click", () => {
    $("confirmModal").classList.add("hidden");
    submitExam(false);
  });

  // ====== ANTI-CHEAT ======
  function enableAntiCheat() {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
  }

  function disableAntiCheat() {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("blur", handleWindowBlur);
  }

  let lastViolationTime = 0;
  function registerViolation() {
    if (examSubmitted) return;
    const now = Date.now();
    if (now - lastViolationTime < 1000) return; // debounce
    lastViolationTime = now;

    violationCount++;
    $("violationIndicator").classList.add("show");
    $("violationCount").textContent = violationCount;
    showToast(`Warning! Leaving the examination page is prohibited. (${violationCount}/${MAX_VIOLATIONS})`);
    saveDraft();

    if (violationCount >= MAX_VIOLATIONS) {
      submitExam(false, true);
    }
  }

  function handleVisibilityChange() {
    if (document.hidden) registerViolation();
  }

  function handleWindowBlur() {
    registerViolation();
  }

  // ====== DISABLE REFRESH / BACK BUTTON ======
  function disableBackButton() {
    history.pushState(null, "", location.href);
    window.addEventListener("popstate", () => {
      if (!examSubmitted) {
        history.pushState(null, "", location.href);
        showToast("Navigating back is disabled during the examination.");
      }
    });
  }

  window.addEventListener("beforeunload", function (e) {
    if (screens.exam.classList.contains("active") && !examSubmitted) {
      e.preventDefault();
      e.returnValue = "";
      return "";
    }
  });

  // ====== MARKING ======
  function markExam() {
    let correct = 0;
    const total = questions.length;

    questions.forEach((q) => {
      const given = answers[q.id];
      if (q.type === "mcq") {
        if (given !== undefined && q.options[given] && q.options[given].isCorrect) correct++;
      } else {
        if (typeof given === "string" && given.trim() !== "") {
          const normalized = given.toLowerCase();
          const matched = q.acceptableAnswers.filter((term) => normalized.includes(term));
          const uniqueMatches = new Set(matched);
          if (uniqueMatches.size >= (q.requiredCount || 1)) correct++;
        }
      }
    });

    const wrong = total - correct;
    const percentage = Math.round((correct / total) * 100);
    const grade = computeGrade(percentage);

    return { total, correct, wrong, percentage, grade };
  }

  function computeGrade(pct) {
    if (pct >= 80) return "A";
    if (pct >= 70) return "B";
    if (pct >= 60) return "C";
    if (pct >= 50) return "D";
    if (pct >= 40) return "E";
    return "F";
  }

  // ====== SUBMIT ======
  function submitExam(timeExpired, violationTriggered) {
    if (examSubmitted) return;
    examSubmitted = true;

    clearInterval(timerInterval);
    disableAntiCheat();

    const endTime = Date.now();
    const timeUsedSeconds = Math.round((endTime - examStartTime) / 1000);
    const timeUsedMin = Math.max(1, Math.round(timeUsedSeconds / 60));

    showScreen("submitting");
    $("submittingStatus").textContent = timeExpired
      ? "Time expired — calculating your results…"
      : violationTriggered
      ? "Maximum violations reached — calculating your results…"
      : "Calculating your results, please wait.";

    setTimeout(() => {
      const result = markExam();
      const status = timeExpired ? "Auto-Submitted (Time Expired)" : violationTriggered ? "Auto-Submitted (Violations)" : "Submitted";

      const record = {
        timestamp: new Date().toLocaleString(),
        name: studentInfo.name,
        class: studentInfo.class,
        studentId: studentInfo.id,
        total: result.total,
        correct: result.correct,
        wrong: result.wrong,
        percentage: result.percentage,
        grade: result.grade,
        timeUsed: `${timeUsedMin} min`,
        status,
      };

      // Lock this student (name + class) from retaking — other students on same device are unaffected
      storeAttempt(record);
      clearDraft();

      renderResult(record, timeExpired);
      sendToGoogleSheets(record);
    }, 1200);
  }

  function renderResult(record, timeExpired) {
    $("resultName").textContent = record.name;
    $("gradeDisplay").textContent = record.grade;
    $("scorePercent").textContent = record.percentage + "%";
    $("statTotal").textContent = record.total;
    $("statCorrect").textContent = record.correct;
    $("statWrong").textContent = record.wrong;
    $("statTime").textContent = record.timeUsed;

    const icon = $("resultIcon");
    if (record.percentage >= 50) {
      icon.className = "icon-circle icon-success";
      icon.textContent = "✓";
    } else {
      icon.className = "icon-circle icon-error";
      icon.textContent = "!";
    }

    if (timeExpired) {
      showToast("Time expired! Your test was submitted automatically.");
    }

    showScreen("result");
  }

  // ====== GOOGLE SHEETS SUBMISSION ======
  function sendToGoogleSheets(record) {
    const sheetStatus = $("sheetStatus");
    sheetStatus.textContent = "Syncing result to school records…";
    sheetStatus.className = "sheet-status";

    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("REPLACE_WITH_YOUR_DEPLOYMENT_ID")) {
      sheetStatus.textContent = "Result saved locally. (Google Sheets URL not configured.)";
      sheetStatus.className = "sheet-status error";
      return;
    }

    fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(record),
    })
      .then(() => {
        sheetStatus.textContent = "✓ Result successfully sent to school records.";
        sheetStatus.className = "sheet-status success";
      })
      .catch(() => {
        sheetStatus.textContent = "Could not reach school records server. Result is saved on this device.";
        sheetStatus.className = "sheet-status error";
      });
  }

  // ====== INIT ======
  function resumeDraftIfPresent() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      const draft = JSON.parse(raw);
      if (!draft || !draft.studentInfo || !draft.studentInfo.name) return false;

      // Don't resume if this student already has a completed attempt
      if (findPriorAttempt(draft.studentInfo.name, draft.studentInfo.class)) return false;

      studentInfo = draft.studentInfo;
      answers = draft.answers || {};
      currentIndex = draft.currentIndex || 0;
      timeRemaining = typeof draft.timeRemaining === "number" ? draft.timeRemaining : EXAM_DURATION_SECONDS;
      violationCount = draft.violationCount || 0;
      examStartTime = draft.examStartTime || Date.now();
      examSubmitted = false;

      if (timeRemaining <= 0) return false;

      prepareQuestions();

      $("headerName").textContent = studentInfo.name;
      $("headerClass").textContent = studentInfo.class;
      $("avatarInitials").textContent = getInitials(studentInfo.name);
      if (violationCount > 0) {
        $("violationIndicator").classList.add("show");
        $("violationCount").textContent = violationCount;
      }

      buildNavGrid();
      renderQuestion();
      startTimer();
      enableAntiCheat();
      disableBackButton();
      showScreen("exam");
      return true;
    } catch (e) {
      return false;
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    // On page load, just show the welcome screen — no device-level lock check
    if (resumeDraftIfPresent()) return;
    showScreen("welcome");
  });
})();
