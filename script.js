const video = document.getElementById("webcam");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const repCountEl = document.getElementById("rep-count");
const angleDisplayEl = document.getElementById("angle-display");
const accuracyBarEl = document.getElementById("accuracy-bar");
const accuracyTextEl = document.getElementById("accuracy-text");
const feedbackEl = document.getElementById("form-feedback");
const statusEl = document.getElementById("status-text");
const startBtn = document.getElementById("start-btn");
const finishBtn = document.getElementById("finish-btn");
const overlayMsg = document.getElementById("overlay-msg");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingText = document.getElementById("loading-text");

let poseLandmarker;
let running = false;
let repCount = 0;
let formState = "DOWN";
let skeletonColor = "#2A9D8F";
let selectedExercise = "bicep-curl";

let totalReps = 0;
let goodFormReps = 0;

const UP_THRESHOLD = 50;
const DOWN_THRESHOLD = 160;

const MP_CDN_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
let PoseLandmarker, FilesetResolver, DrawingUtils;

async function initModel() {
  loadingText.innerText = "Loading AI Model (This may take a few seconds)...";

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
  if (exercise === "shoulder-press") return; // Disabled

  selectedExercise = exercise;
  document.getElementById("exercise-selector").classList.add("hidden");
  statusEl.innerText = `Ready for ${exercise === "bicep-curl" ? "Left Arm Bicep Curl" : "Bodyweight Squat"}. Click Start Camera.`;
  startBtn.disabled = false;
}

async function startCamera() {
  try {
    statusEl.innerText = "Requesting camera access...";
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    video.onloadedmetadata = () => {
      video.play().then(() => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        running = true;
        statusEl.innerText = "Tracking active. Perform the exercise.";
        startBtn.disabled = true;
        startBtn.innerText = "Camera Active";
        finishBtn.disabled = false;
        predictWebcam();
      });
    };
  } catch (err) {
    console.error("Camera error:", err);
    statusEl.innerText = "Error: Camera access denied or not found.";
    alert("Please allow camera access in your browser settings.");
  }
}

let lastVideoTime = -1;
async function predictWebcam() {
  if (!running) return;

  if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const results = poseLandmarker.detectForVideo(video, performance.now());

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const drawingUtils = new DrawingUtils(ctx);

    if (results.landmarks && results.landmarks.length > 0) {
      overlayMsg.classList.add("hidden");
      const landmark = results.landmarks[0];

      drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS, {
        color: skeletonColor,
        lineWidth: 5,
      });
      drawingUtils.drawLandmarks(landmark, {
        color: skeletonColor,
        lineWidth: 1,
        fillColor: "#fff",
        radius: 6,
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
          ankle = landmark[27]; // Left leg
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
        overlayMsg.innerText = "Step back / Show full body";
        feedbackEl.innerText = "Tracking lost...";
        feedbackEl.style.color = "#E63946";
      }
    } else {
      overlayMsg.classList.remove("hidden");
      overlayMsg.innerText = "No person detected.";
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
    skeletonColor = "#2A9D8F";
    feedbackEl.innerText = "Great! Lower it down slowly.";
    feedbackEl.style.color = "#2A9D8F";
  } else if (angle > DOWN_THRESHOLD && formState === "UP") {
    formState = "DOWN";
    repCount++;
    totalReps++;

    if (skeletonColor === "#2A9D8F") goodFormReps++;

    const accuracy = Math.round((goodFormReps / totalReps) * 100);
    accuracyBarEl.style.width = accuracy + "%";
    accuracyTextEl.innerText = accuracy + "%";

    repCountEl.innerText = repCount;
    skeletonColor = "#2A9D8F";
    feedbackEl.innerText = "Perfect rep!";
    feedbackEl.style.color = "#2A9D8F";

    speakFeedback("Perfect repetition");
  } else {
    if (formState === "DOWN") feedbackEl.innerText = "Lift up.";
    else feedbackEl.innerText = "Lower down.";

    if (angle < 30 && formState === "UP") {
      skeletonColor = "#E63946";
      feedbackEl.innerText = "Don't cheat! Control the movement.";
      feedbackEl.style.color = "#E63946";
    } else {
      skeletonColor = "#0077B6";
    }
  }
}

function speakFeedback(text) {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
}

finishBtn.addEventListener("click", () => {
  running = false;
  const accuracy =
    totalReps > 0 ? Math.round((goodFormReps / totalReps) * 100) : 0;

  document.getElementById("summary-reps").innerText = repCount;
  document.getElementById("summary-accuracy").innerText = accuracy + "%";

  let aiText = "";
  if (accuracy >= 80)
    aiText =
      "Excellent work! Your form was highly consistent. Keep up the great control and tempo.";
  else if (accuracy >= 50)
    aiText =
      "Good effort! Try to focus on controlling the movement and hitting the full range of motion.";
  else
    aiText =
      "Keep practicing! Make sure to step back so the camera can see your full body, and move at a steady pace.";

  document.getElementById("ai-summary-text").innerText = `"${aiText}"`;
  document.getElementById("session-summary").classList.remove("hidden");
});

startBtn.addEventListener("click", startCamera);
initModel();
