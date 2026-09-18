const video = document.getElementById("webcam");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const repCountEl = document.getElementById("rep-count");
const angleDisplayEl = document.getElementById("angle-display");
const accuracyBarEl = document.getElementById("accuracy-bar");
const accuracyBadgeEl = document.getElementById("accuracy-badge");
const feedbackEl = document.getElementById("form-feedback");
const startBtn = document.getElementById("start-btn");
const finishBtn = document.getElementById("finish-btn");
const overlayMsg = document.getElementById("overlay-msg");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingText = document.getElementById("loading-text");
const timerValueEl = document.getElementById("timer-value");
const liveIndicator = document.getElementById("live-indicator");
const exerciseNameEl = document.getElementById("exercise-name");
const hrValueEl = document.getElementById("hr-value");

let poseLandmarker;
let running = false;
let repCount = 0;
let formState = "DOWN";
let skeletonColor = "#30d158";
let selectedExercise = "bicep-curl";
let currentLang = "en";

let totalReps = 0;
let goodFormReps = 0;
let perfectStreak = 0;
let accuracyHistory = [];
let sessionStartTime = null;
let timerInterval = null;
let hrInterval = null;
let heartRate = 72;
let peakHeartRate = 72;

const UP_THRESHOLD = 50;
const DOWN_THRESHOLD = 160;
const MP_CDN_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
let PoseLandmarker, FilesetResolver, DrawingUtils;

let settings = { voice: true, skeleton: true };

const translations = {
  en: {
    loading: "Initializing neural engine...",
    step1: "Step 1 of 2",
    chooseExercise: "Choose Your Exercise",
    selectMovement: "Select a movement to begin",
    bicepCurl: "Bicep Curl",
    bicepDesc: "Upper body · Left arm tracking",
    squat: "Bodyweight Squat",
    squatDesc: "Lower body · Knee & hip alignment",
    shoulderPress: "Shoulder Press",
    comingSoon: "Coming in MotionMend V2",
    stayTuned: "Stay tuned",
    sessionComplete: "Session Complete",
    greatWork: "Great work today 🎉",
    reps: "Repetitions",
    accuracy: "Accuracy",
    duration: "Duration",
    peakHR: "Peak Heart Rate",
    aiCoach: "AI Coach",
    analyzing: "Analyzing your performance...",
    newSession: "Start New Session",
    exportPDF: "📄 Export PDF Report",
    settings: "Settings",
    language: "Language",
    voiceFeedback: "Voice Feedback",
    voiceDesc: "Audio cues during exercise",
    skeletonOverlay: "Skeleton Overlay",
    skeletonDesc: "Show pose tracking lines",
    darkMode: "Dark Mode",
    darkDesc: "Easier on the eyes",
    ready: "Ready",
    session: "Session",
    stepIntoFrame: "Please step into the frame",
    keepGoing: "Keep going",
    angle: "Angle",
    realtime: "Real-time",
    formAccuracy: "Form Accuracy",
    poor: "Poor",
    good: "Good",
    perfect: "Perfect",
    liveCoaching: "Live Coaching",
    selectExerciseBegin: "Select an exercise to begin",
    formHistory: "Form History",
    startCamera: "Start Camera",
    finishSession: "Finish Session",
    start: "Start",
    finish: "Finish",
    disclaimer: "Prototype for DSH Hacks V2 · Not a medical device",
  },
  es: {
    loading: "Inicializando motor neural...",
    step1: "Paso 1 de 2",
    chooseExercise: "Elige tu Ejercicio",
    selectMovement: "Selecciona un movimiento para comenzar",
    bicepCurl: "Curl de Bíceps",
    bicepDesc: "Parte superior · Seguimiento brazo izq.",
    squat: "Sentadilla",
    squatDesc: "Parte inferior · Alineación de rodilla",
    shoulderPress: "Press de Hombros",
    comingSoon: "Próximamente en V2",
    stayTuned: "Mantente atento",
    sessionComplete: "Sesión Completada",
    greatWork: "¡Gran trabajo hoy! 🎉",
    reps: "Repeticiones",
    accuracy: "Precisión",
    duration: "Duración",
    peakHR: "Freq. Cardíaca Máx",
    aiCoach: "Entrenador IA",
    analyzing: "Analizando tu rendimiento...",
    newSession: "Nueva Sesión",
    exportPDF: "📄 Exportar Informe PDF",
    settings: "Ajustes",
    language: "Idioma",
    voiceFeedback: "Comentarios de Voz",
    voiceDesc: "Indicaciones de audio",
    skeletonOverlay: "Esqueleto",
    skeletonDesc: "Mostrar líneas de seguimiento",
    darkMode: "Modo Oscuro",
    darkDesc: "Más fácil para la vista",
    ready: "Listo",
    session: "Sesión",
    stepIntoFrame: "Por favor, entra en el encuadre",
    keepGoing: "Sigue así",
    angle: "Ángulo",
    realtime: "Tiempo real",
    formAccuracy: "Precisión de Forma",
    poor: "Malo",
    good: "Bueno",
    perfect: "Perfecto",
    liveCoaching: "Coaching en Vivo",
    selectExerciseBegin: "Selecciona un ejercicio",
    formHistory: "Historial de Forma",
    startCamera: "Iniciar Cámara",
    finishSession: "Finalizar Sesión",
    start: "Inicio",
    finish: "Fin",
    disclaimer: "Prototipo para DSH Hacks V2 · No es un dispositivo médico",
  },
  fr: {
    loading: "Initialisation du moteur neuronal...",
    step1: "Étape 1 sur 2",
    chooseExercise: "Choisissez votre Exercice",
    selectMovement: "Sélectionnez un mouvement",
    bicepCurl: "Curl Biceps",
    bicepDesc: "Haut du corps · Suivi bras gauche",
    squat: "Squat",
    squatDesc: "Bas du corps · Alignement genou",
    shoulderPress: "Développé Épaules",
    comingSoon: "Bientôt dans la V2",
    stayTuned: "Restez à l'écoute",
    sessionComplete: "Séance Terminée",
    greatWork: "Excellent travail aujourd'hui 🎉",
    reps: "Répétitions",
    accuracy: "Précision",
    duration: "Durée",
    peakHR: "Freq. Cardiaque Max",
    aiCoach: "Coach IA",
    analyzing: "Analyse de vos performances...",
    newSession: "Nouvelle Séance",
    exportPDF: "📄 Exporter Rapport PDF",
    settings: "Paramètres",
    language: "Langue",
    voiceFeedback: "Retour Vocal",
    voiceDesc: "Indications audio",
    skeletonOverlay: "Squelette",
    skeletonDesc: "Afficher les lignes de suivi",
    darkMode: "Mode Sombre",
    darkDesc: "Plus doux pour les yeux",
    ready: "Prêt",
    session: "Séance",
    stepIntoFrame: "Veuillez entrer dans le cadre",
    keepGoing: "Continuez",
    angle: "Angle",
    realtime: "Temps réel",
    formAccuracy: "Précision de Forme",
    poor: "Mauvais",
    good: "Bon",
    perfect: "Parfait",
    liveCoaching: "Coaching en Direct",
    selectExerciseBegin: "Sélectionnez un exercice",
    formHistory: "Historique de Forme",
    startCamera: "Démarrer Caméra",
    finishSession: "Terminer la Séance",
    start: "Début",
    finish: "Fin",
    disclaimer: "Prototype pour DSH Hacks V2 · Non dispositif médical",
  },
  zh: {
    loading: "正在初始化神经引擎...",
    step1: "第 1 步，共 2 步",
    chooseExercise: "选择您的运动",
    selectMovement: "选择一个动作开始",
    bicepCurl: "二头肌弯举",
    bicepDesc: "上半身 · 左臂追踪",
    squat: "自重深蹲",
    squatDesc: "下半身 · 膝盖和臀部对齐",
    shoulderPress: "肩推",
    comingSoon: "即将在 V2 推出",
    stayTuned: "敬请期待",
    sessionComplete: "训练完成",
    greatWork: "今天表现很棒！🎉",
    reps: "重复次数",
    accuracy: "准确度",
    duration: "持续时间",
    peakHR: "最高心率",
    aiCoach: "AI 教练",
    analyzing: "正在分析您的表现...",
    newSession: "开始新训练",
    exportPDF: "📄 导出 PDF 报告",
    settings: "设置",
    language: "语言",
    voiceFeedback: "语音反馈",
    voiceDesc: "运动期间的音频提示",
    skeletonOverlay: "骨骼叠加",
    skeletonDesc: "显示姿态追踪线",
    darkMode: "深色模式",
    darkDesc: "对眼睛更友好",
    ready: "准备就绪",
    session: "训练",
    stepIntoFrame: "请进入画面",
    keepGoing: "继续加油",
    angle: "角度",
    realtime: "实时",
    formAccuracy: "动作准确度",
    poor: "差",
    good: "良好",
    perfect: "完美",
    liveCoaching: "实时指导",
    selectExerciseBegin: "请选择一个运动",
    formHistory: "动作历史",
    startCamera: "启动摄像头",
    finishSession: "结束训练",
    start: "开始",
    finish: "结束",
    disclaimer: "DSH Hacks V2 原型 · 非医疗设备",
  },
};

function setLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[lang][key]) {
      el.innerText = translations[lang][key];
    }
  });
}

const achievements = {
  firstRep: {
    id: "firstRep",
    icon: "🌟",
    title: {
      en: "First Step",
      es: "Primer Paso",
      fr: "Premier Pas",
      zh: "第一步",
    },
    desc: {
      en: "Completed your first rep!",
      es: "¡Completaste tu primera repetición!",
      fr: "Première répétition terminée !",
      zh: "完成了你的第一次重复！",
    },
    unlocked: false,
  },
  tenReps: {
    id: "tenReps",
    icon: "💪",
    title: {
      en: "Getting Strong",
      es: "Haciéndose Fuerte",
      fr: "Devenir Fort",
      zh: "变得更强",
    },
    desc: {
      en: "Hit 10 reps!",
      es: "¡10 repeticiones!",
      fr: "10 répétitions !",
      zh: "达到 10 次重复！",
    },
    unlocked: false,
  },
  perfectStreak: {
    id: "perfectStreak",
    icon: "🔥",
    title: {
      en: "Flawless",
      es: "Impecable",
      fr: "Sans Faute",
      zh: "完美无瑕",
    },
    desc: {
      en: "5 perfect reps in a row!",
      es: "¡5 repeticiones perfectas seguidas!",
      fr: "5 répétitions parfaites d'affilée !",
      zh: "连续 5 次完美重复！",
    },
    unlocked: false,
    streak: 0,
  },
};

function checkAchievements() {
  if (repCount === 1 && !achievements.firstRep.unlocked) {
    achievements.firstRep.unlocked = true;
    showToast(achievements.firstRep);
  }
  if (repCount === 10 && !achievements.tenReps.unlocked) {
    achievements.tenReps.unlocked = true;
    showToast(achievements.tenReps);
  }
  if (perfectStreak >= 5 && !achievements.perfectStreak.unlocked) {
    achievements.perfectStreak.unlocked = true;
    showToast(achievements.perfectStreak);
  }
}

function showToast(achievement) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
        <div class="toast-icon">${achievement.icon}</div>
        <div class="toast-content">
            <h4>${achievement.title[currentLang]}</h4>
            <p>${achievement.desc[currentLang]}</p>
        </div>
    `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function startHeartRateMonitor() {
  heartRate = 72;
  peakHeartRate = 72;
  hrInterval = setInterval(() => {
    let targetHR = 72 + repCount * 1.8;
    if (targetHR > 145) targetHR = 145;

    heartRate = heartRate + (targetHR - heartRate) * 0.15;
    if (heartRate > peakHeartRate) peakHeartRate = heartRate;

    hrValueEl.innerText = Math.round(heartRate);
  }, 1000);
}

async function initModel() {
  loadingText.innerText = translations[currentLang].loading;
  try {
    const vision = await import(MP_CDN_URL);
    PoseLandmarker = vision.PoseLandmarker;
    FilesetResolver = vision.FilesetResolver;
    DrawingUtils = vision.DrawingUtils;

    const filesetResolver = await FilesetResolver.forVisionTasks(
      `${MP_CDN_URL}/wasm`,
    );
    poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
    });

    loadingOverlay.classList.add("hidden");
    document.getElementById("exercise-selector").classList.remove("hidden");
  } catch (error) {
    console.error("Error loading MediaPipe:", error);
    loadingText.innerText = "Failed to load model. Please refresh.";
  }
}

function selectExercise(exercise) {
  if (exercise === "shoulder-press") return;
  selectedExercise = exercise;
  const names = {
    "bicep-curl":
      currentLang === "es"
        ? "Curl de Bíceps"
        : currentLang === "fr"
          ? "Curl Biceps"
          : currentLang === "zh"
            ? "二头肌弯举"
            : "Bicep Curl",
    squat:
      currentLang === "es"
        ? "Sentadilla"
        : currentLang === "fr"
          ? "Squat"
          : currentLang === "zh"
            ? "自重深蹲"
            : "Bodyweight Squat",
  };
  exerciseNameEl.innerText = names[exercise];

  document.getElementById("exercise-selector").classList.add("hidden");
  startBtn.disabled = false;
  feedbackEl.innerText = translations[currentLang].ready;
  updateLiveIndicator(translations[currentLang].ready, "var(--success)");
}

async function startCamera() {
  try {
    updateLiveIndicator("Starting...", "var(--warning)");
    feedbackEl.innerText = "Requesting camera access...";

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    video.srcObject = stream;

    video.onloadedmetadata = () => {
      video
        .play()
        .then(() => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          running = true;
          startBtn.disabled = true;
          startBtn.innerHTML =
            '<span class="btn-icon">●</span><span>Recording</span>';
          finishBtn.disabled = false;

          sessionStartTime = Date.now();
          timerInterval = setInterval(updateTimer, 1000);
          startHeartRateMonitor();

          updateLiveIndicator("Live", "var(--success)");
          feedbackEl.innerText = "Begin your exercise";
          predictWebcam();
        })
        .catch((err) => {
          console.error("Video play failed:", err);
          feedbackEl.innerText = "Error: Could not play video stream.";
        });
    };
  } catch (err) {
    console.error("Camera error:", err);
    updateLiveIndicator("Error", "var(--error)");

    let errorMsg = "Camera access failed. ";
    if (
      err.name === "NotAllowedError" ||
      err.name === "PermissionDeniedError"
    ) {
      errorMsg +=
        "Permission denied. Click the 🔒 icon in your address bar to allow camera.";
    } else if (
      err.name === "NotFoundError" ||
      err.name === "DevicesNotFoundError"
    ) {
      errorMsg += "No camera found on this device.";
    } else if (
      err.name === "NotReadableError" ||
      err.name === "TrackStartError"
    ) {
      errorMsg +=
        "Your camera is already in use by another app (like Zoom, Teams, or Discord). Please close that app and refresh.";
    } else if (err.name === "AbortError") {
      errorMsg +=
        "Timeout starting video. Try refreshing the page and ensuring no other app is using the camera.";
    } else {
      errorMsg += err.message;
    }

    feedbackEl.innerText = errorMsg;
    alert(errorMsg);
  }
}
let lastVideoTime = -1;
async function predictWebcam() {
  if (!running) return;
  if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const results = poseLandmarker.detectForVideo(video, performance.now());
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (
      settings.skeleton &&
      results.landmarks &&
      results.landmarks.length > 0
    ) {
      overlayMsg.classList.add("hidden");
      const landmark = results.landmarks[0];
      const drawingUtils = new DrawingUtils(ctx);

      drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS, {
        color: skeletonColor,
        lineWidth: 4,
      });
      drawingUtils.drawLandmarks(landmark, {
        color: skeletonColor,
        lineWidth: 1,
        fillColor: "#fff",
        radius: 5,
      });

      let angle = 0,
        isVisible = false;
      if (selectedExercise === "bicep-curl") {
        const shoulder = landmark[11],
          elbow = landmark[13],
          wrist = landmark[15];
        isVisible =
          shoulder.visibility > 0.6 &&
          elbow.visibility > 0.6 &&
          wrist.visibility > 0.6;
        if (isVisible) angle = calculateAngle(shoulder, elbow, wrist);
      } else if (selectedExercise === "squat") {
        const hip = landmark[23],
          knee = landmark[25],
          ankle = landmark[27];
        isVisible =
          hip.visibility > 0.6 &&
          knee.visibility > 0.6 &&
          ankle.visibility > 0.6;
        if (isVisible) angle = calculateAngle(hip, knee, ankle);
      }

      if (isVisible) updateFormAndReps(angle);
      else {
        overlayMsg.classList.remove("hidden");
        feedbackEl.innerText =
          currentLang === "es"
            ? "Aléjate para mostrar todo el cuerpo"
            : currentLang === "fr"
              ? "Reculez pour montrer tout le corps"
              : currentLang === "zh"
                ? "后退以显示全身"
                : "Step back to show full body";
      }
    } else if (!results.landmarks || results.landmarks.length === 0) {
      overlayMsg.classList.remove("hidden");
    }
  }
  window.requestAnimationFrame(predictWebcam);
}

function calculateAngle(p1, p2, p3) {
  const ab = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  const bc = Math.sqrt(Math.pow(p2.x - p3.x, 2) + Math.pow(p2.y - p3.y, 2));
  const ac = Math.sqrt(Math.pow(p1.x - p3.x, 2) + Math.pow(p1.y - p3.y, 2));
  return (
    Math.acos((ab * ab + bc * bc - ac * ac) / (2 * ab * bc)) * (180 / Math.PI)
  );
}

function updateFormAndReps(angle) {
  angleDisplayEl.innerText = Math.round(angle) + "°";

  if (angle < UP_THRESHOLD && formState === "DOWN") {
    formState = "UP";
    skeletonColor = "var(--success)";
    perfectStreak++;
    feedbackEl.innerText =
      currentLang === "es"
        ? "¡Genial! Bájalo lentamente"
        : currentLang === "fr"
          ? "Super ! Redescendez lentement"
          : currentLang === "zh"
            ? "很好！慢慢放下"
            : "Great! Lower it down slowly";
  } else if (angle > DOWN_THRESHOLD && formState === "UP") {
    formState = "DOWN";
    repCount++;
    totalReps++;

    if (skeletonColor === "var(--success)" || skeletonColor === "#30d158")
      goodFormReps++;
    else perfectStreak = 0;

    const accuracy = Math.round((goodFormReps / totalReps) * 100);
    accuracyBarEl.style.width = accuracy + "%";
    accuracyBadgeEl.innerText = accuracy + "%";

    if (repCount % 3 === 0) {
      accuracyHistory.push(accuracy);
      updateChart();
    }

    repCountEl.innerText = repCount;
    repCountEl.classList.remove("bounce");
    void repCountEl.offsetWidth;
    repCountEl.classList.add("bounce");

    skeletonColor = "var(--success)";
    feedbackEl.innerText =
      currentLang === "es"
        ? "¡Repetición perfecta!"
        : currentLang === "fr"
          ? "Répétition parfaite !"
          : currentLang === "zh"
            ? "完美的重复！"
            : "Perfect rep!";

    checkAchievements();
    if (settings.voice) speakFeedback("Perfect");
  } else {
    perfectStreak = 0;
    if (formState === "DOWN")
      feedbackEl.innerText =
        currentLang === "es"
          ? "Levanta"
          : currentLang === "fr"
            ? "Levez"
            : currentLang === "zh"
              ? "举起"
              : "Lift up";
    else
      feedbackEl.innerText =
        currentLang === "es"
          ? "Baja"
          : currentLang === "fr"
            ? "Descendez"
            : currentLang === "zh"
              ? "放下"
              : "Lower down";

    if (angle < 30 && formState === "UP") {
      skeletonColor = "var(--error)";
      feedbackEl.innerText =
        currentLang === "es"
          ? "Controla el movimiento"
          : currentLang === "fr"
            ? "Contrôlez le mouvement"
            : currentLang === "zh"
              ? "控制动作"
              : "Control the movement";
    } else {
      skeletonColor = "var(--accent)";
    }
  }
}

function speakFeedback(text) {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.volume = 0.7;
    window.speechSynthesis.speak(utterance);
  }
}

function updateTimer() {
  if (!sessionStartTime) return;
  const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (elapsed % 60).toString().padStart(2, "0");
  timerValueEl.innerText = `${minutes}:${seconds}`;
}

function updateLiveIndicator(text, color) {
  const dot = liveIndicator.querySelector(".live-dot");
  const textEl = liveIndicator.querySelector(".live-text");
  dot.style.background = color;
  textEl.innerText = text;
}

let historyChart;
function initChart() {
  const ctxChart = document.getElementById("history-chart").getContext("2d");
  historyChart = new Chart(ctxChart, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          borderColor: "rgb(0, 113, 227)",
          backgroundColor: "rgba(0, 113, 227, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { display: false, min: 0, max: 100 },
      },
    },
  });
}

function updateChart() {
  if (!historyChart) return;
  historyChart.data.labels = accuracyHistory.map((_, i) => `R${(i + 1) * 3}`);
  historyChart.data.datasets[0].data = accuracyHistory;
  historyChart.update("none");
}

function toggleSettings() {
  document.getElementById("settings-panel").classList.toggle("hidden");
}

document
  .getElementById("voice-toggle")
  .addEventListener("change", (e) => (settings.voice = e.target.checked));
document.getElementById("skeleton-toggle").addEventListener("change", (e) => {
  settings.skeleton = e.target.checked;
  if (!settings.skeleton) ctx.clearRect(0, 0, canvas.width, canvas.height);
});
document.getElementById("theme-toggle").addEventListener("change", (e) => {
  document.documentElement.setAttribute(
    "data-theme",
    e.target.checked ? "dark" : "light",
  );
});

finishBtn.addEventListener("click", finishSession);

function finishSession() {
  running = false;
  clearInterval(timerInterval);
  clearInterval(hrInterval);

  const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const accuracy =
    totalReps > 0 ? Math.round((goodFormReps / totalReps) * 100) : 0;

  document.getElementById("summary-reps").innerText = repCount;
  document.getElementById("summary-accuracy").innerText = accuracy + "%";
  document.getElementById("summary-duration").innerText =
    `${minutes}:${seconds.toString().padStart(2, "0")}`;
  document.getElementById("summary-hr").innerHTML =
    `${Math.round(peakHeartRate)} <span class="unit">BPM</span>`;

  let aiText = "";
  if (accuracy >= 85)
    aiText =
      currentLang === "es"
        ? "Consistencia de forma excepcional."
        : currentLang === "fr"
          ? "Cohérence de forme exceptionnelle."
          : currentLang === "zh"
            ? "出色的动作一致性。"
            : "Outstanding form consistency. Your controlled tempo shows excellent body awareness.";
  else if (accuracy >= 70)
    aiText =
      currentLang === "es"
        ? "Buen rendimiento con buena técnica."
        : currentLang === "fr"
          ? "Bonne performance avec une bonne technique."
          : currentLang === "zh"
            ? "表现良好，技术不错。"
            : "Solid performance with good technique. Focus on maintaining alignment.";
  else
    aiText =
      currentLang === "es"
        ? "Buen esfuerzo. Intenta ralentizar el movimiento."
        : currentLang === "fr"
          ? "Bon effort. Essayez de ralentir le mouvement."
          : currentLang === "zh"
            ? "努力了。尝试放慢动作。"
            : "Good effort today. Try slowing down the eccentric phase for better results.";

  document.getElementById("ai-summary-text").innerText = aiText;
  document.getElementById("session-summary").classList.remove("hidden");
}

async function exportPDF() {
  const { jsPDF } = window.jspdf;
  const element = document.getElementById("pdf-capture-area");

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor:
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "#1c1c1e"
        : "#ffffff",
  });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");
  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save(`MotionMend-Report-${Date.now()}.pdf`);
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !startBtn.disabled) {
    e.preventDefault();
    startCamera();
  } else if (e.code === "Escape" && !finishBtn.disabled) {
    finishSession();
  } else if (e.code === "KeyS") {
    toggleSettings();
  }
});

window.selectExercise = selectExercise;
window.toggleSettings = toggleSettings;
window.finishSession = finishSession;
window.exportPDF = exportPDF;
window.setLanguage = setLanguage;

startBtn.addEventListener("click", startCamera);

initChart();
initModel();
