const video = document.getElementById("webcam");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const repCountEl = document.getElementById("rep-count");
const angleDisplayEl = document.getElementById("angle-display");
const accuracyBarEl = document.getElementById("accuracy-bar");
const accuracyBadgeEl = document.getElementById("accuracy-badge");
const feedbackEl = document.getElementById("form-feedback");
const statusEl = document.getElementById("status-text");
const startBtn = document.getElementById("start-btn");
const finishBtn = document.getElementById("finish-btn");
const overlayMsg = document.getElementById("overlay-msg");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingText = document.getElementById("loading-text");
const timerValueEl = document.getElementById("timer-value");
const liveIndicator = document.getElementById("live-indicator");
const exerciseNameEl = document.getElementById("exercise-name");

let poseLandmarker;
let running = false;
let repCount = 0;
let formState = "DOWN";
let skeletonColor = "#30d158";
let selectedExercise = "bicep-curl";

let totalReps = 0;
let goodFormReps = 0;
let accuracyHistory = [];
let sessionStartTime = null;
let timerInterval = null;

const UP_THRESHOLD = 50;
const DOWN_THRESHOLD = 160;

const MP_CDN_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
let PoseLandmarker, FilesetResolver, DrawingUtils;

let settings = {
  voice: true,
  skeleton: true,
  sensitivity: 2, //
};

async function initModel() {
  loadingText.innerText = "Loading neural engine...";

  try {
    const vision = await import(MP_CDN_URL);
    PoseLandmarker = vision.PoseLandmarker;
    FilesetResolver = vision.FilesetResolver;
    DrawingUtils = vision.DrawingUtils;

    loadingText.innerText = "Downloading pose model...";
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
  const exerciseNames = {
    "bicep-curl": "Bicep Curl",
    squat: "Bodyweight Squat",
  };
  exerciseNameEl.innerText = exerciseNames[exercise];

  document.getElementById("exercise-selector").classList.add("hidden");
  startBtn.disabled = false;
  feedbackEl.innerText = "Ready when you are";
  updateLiveIndicator("Ready", "var(--success)");
}

async function startCamera() {
  try {
    updateLiveIndicator("Starting...", "var(--warning)");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
    });
    video.srcObject = stream;

    video.onloadedmetadata = () => {
      video.play().then(() => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        running = true;
        startBtn.disabled = true;
        startBtn.innerHTML =
          '<span class="btn-icon">●</span><span>Recording</span>';
        finishBtn.disabled = false;

        sessionStartTime = Date.now();
        timerInterval = setInterval(updateTimer, 1000);

        updateLiveIndicator("Live", "var(--success)");
        feedbackEl.innerText = "Begin your exercise";
        predictWebcam();
      });
    };
  } catch (err) {
    console.error("Camera error:", err);
    updateLiveIndicator("Error", "var(--error)");
    feedbackEl.innerText = "Camera access denied";
  }
}

let lastVideoTime = -1;
async function predictWebcam() {
  if (!running) return;

  if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const results = poseLandmarker.detectForVideo(video, performance.now());

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (settings.skeleton) {
      const drawingUtils = new DrawingUtils(ctx);

      if (results.landmarks && results.landmarks.length > 0) {
        overlayMsg.classList.add("hidden");
        const landmark = results.landmarks[0];

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

        let angle = 0;
        let isVisible = false;

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

        if (isVisible) {
          updateFormAndReps(angle);
        } else {
          overlayMsg.classList.remove("hidden");
          feedbackEl.innerText = "Step back to show full body";
          feedbackEl.style.color = "var(--error)";
        }
      } else {
        overlayMsg.classList.remove("hidden");
        feedbackEl.innerText = "No person detected";
      }
    }
  }
  window.requestAnimationFrame(predictWebcam);
}

function calculateAngle(p1, p2, p3) {
  const ab = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  const bc = Math.sqrt(Math.pow(p2.x - p3.x, 2) + Math.pow(p2.y - p3.y, 2));
  const ac = Math.sqrt(Math.pow(p1.x - p3.x, 2) + Math.pow(p1.y - p3.y, 2));
  let radians = Math.acos((ab * ab + bc * bc - ac * ac) / (2 * ab * bc));
  return radians * (180 / Math.PI);
}

function updateFormAndReps(angle) {
  angleDisplayEl.innerText = Math.round(angle) + "°";

  if (angle < UP_THRESHOLD && formState === "DOWN") {
    formState = "UP";
    skeletonColor = "var(--success)";
    feedbackEl.innerText = "Great! Lower it down slowly";
    feedbackEl.style.color = "var(--success)";
  } else if (angle > DOWN_THRESHOLD && formState === "UP") {
    formState = "DOWN";
    repCount++;
    totalReps++;

    if (skeletonColor === "var(--success)" || skeletonColor === "#30d158") {
      goodFormReps++;
    }

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
    feedbackEl.innerText = "Perfect rep!";
    feedbackEl.style.color = "var(--success)";

    if (settings.voice) speakFeedback("Perfect");
  } else {
    if (formState === "DOWN") feedbackEl.innerText = "Lift up";
    else feedbackEl.innerText = "Lower down";

    if (angle < 30 && formState === "UP") {
      skeletonColor = "var(--error)";
      feedbackEl.innerText = "Control the movement";
      feedbackEl.style.color = "var(--error)";
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
    utterance.pitch = 1;
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

let historyChart;
function initChart() {
  const ctx = document.getElementById("history-chart").getContext("2d");
  historyChart = new Chart(ctx, {
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
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(0,0,0,0.8)",
          padding: 10,
          cornerRadius: 8,
          titleFont: { size: 11 },
          bodyFont: { size: 13, weight: "bold" },
        },
      },
      scales: {
        x: { display: false },
        y: {
          display: false,
          min: 0,
          max: 100,
        },
      },
      interaction: {
        intersect: false,
        mode: "index",
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

function updateLiveIndicator(text, color) {
  const dot = liveIndicator.querySelector(".live-dot");
  const textEl = liveIndicator.querySelector(".live-text");
  dot.style.background = color;
  textEl.innerText = text;
}

function toggleSettings() {
  document.getElementById("settings-panel").classList.toggle("hidden");
}

document.getElementById("voice-toggle").addEventListener("change", (e) => {
  settings.voice = e.target.checked;
});

document.getElementById("skeleton-toggle").addEventListener("change", (e) => {
  settings.skeleton = e.target.checked;
  if (!settings.skeleton) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
});

document.getElementById("theme-toggle").addEventListener("change", (e) => {
  document.documentElement.setAttribute(
    "data-theme",
    e.target.checked ? "dark" : "light",
  );
});

document.getElementById("sensitivity-slider").addEventListener("input", (e) => {
  settings.sensitivity = parseInt(e.target.value);
});

finishBtn.addEventListener("click", finishSession);

function finishSession() {
  running = false;
  clearInterval(timerInterval);

  const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const accuracy =
    totalReps > 0 ? Math.round((goodFormReps / totalReps) * 100) : 0;
  const calories = Math.round((elapsed / 60) * 5);

  document.getElementById("summary-reps").innerText = repCount;
  document.getElementById("summary-accuracy").innerText = accuracy + "%";
  document.getElementById("summary-duration").innerText =
    `${minutes}:${seconds.toString().padStart(2, "0")}`;
  document.getElementById("summary-calories").innerText = calories;

  let aiText = "";
  if (accuracy >= 85)
    aiText =
      "Outstanding form consistency. Your controlled tempo and full range of motion show excellent body awareness. Keep this precision up.";
  else if (accuracy >= 70)
    aiText =
      "Solid performance with good technique. Focus on maintaining alignment through the full movement for even better results.";
  else if (accuracy >= 50)
    aiText =
      "Good effort today. Try slowing down the eccentric phase and ensure you're hitting full range of motion on each rep.";
  else
    aiText =
      "Every session is a step forward. Focus on quality over quantity — slower, more controlled reps will build better movement patterns.";

  document.getElementById("ai-summary-text").innerText = aiText;
  document.getElementById("session-summary").classList.remove("hidden");
}

function exportSession() {
  const accuracy =
    totalReps > 0 ? Math.round((goodFormReps / totalReps) * 100) : 0;
  const report = `MotionMend AI Session Report\n\nReps: ${repCount}\nAccuracy: ${accuracy}%\nExercise: ${selectedExercise}\nDate: ${new Date().toLocaleDateString()}`;
  const blob = new Blob([report], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `motionmend-session-${Date.now()}.txt`;
  a.click();
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
window.exportSession = exportSession;

initChart();
initModel();
