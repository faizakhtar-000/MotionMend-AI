// ==========================================
// DOM Elements
// ==========================================
const video = document.getElementById("webcam");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const repCountEl = document.getElementById("rep-count");
const feedbackEl = document.getElementById("form-feedback");
const statusEl = document.getElementById("status-text");
const startBtn = document.getElementById("start-btn");
const overlayMsg = document.getElementById("overlay-msg");

// ==========================================
// State Variables
// ==========================================
let poseLandmarker;
let running = false;
let repCount = 0;
let formState = "DOWN"; // "DOWN" (arm extended) or "UP" (arm curled)
let skeletonColor = "#2A9D8F"; // Default teal/green

// Thresholds for Bicep Curl
const UP_THRESHOLD = 50; // Arm fully curled
const DOWN_THRESHOLD = 160; // Arm fully extended

// CDN Path (Pinned to a specific version for stability)
const MP_CDN_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

// We will hold our MediaPipe classes here after we load them
let PoseLandmarker;
let FilesetResolver;
let DrawingUtils;

// ==========================================
// 1. Initialize the AI Model (Using Dynamic Import)
// ==========================================
async function initModel() {
  statusEl.innerText = "Loading AI Model (This may take a few seconds)...";

  try {
    // THIS IS THE FIX: We use await import() instead of a top-level import
    const vision = await import(MP_CDN_URL);

    // Extract the classes we need from the loaded vision bundle
    PoseLandmarker = vision.PoseLandmarker;
    FilesetResolver = vision.FilesetResolver;
    DrawingUtils = vision.DrawingUtils;

    // Initialize the WASM resolver with the correct path
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

    statusEl.innerText = "Model Loaded. Click Start Camera.";
    startBtn.disabled = false;
  } catch (error) {
    console.error("Error loading MediaPipe:", error);
    statusEl.innerText = "Failed to load model. Check console.";
  }
}

// ==========================================
// 2. Start the Webcam
// ==========================================
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
    });
    video.srcObject = stream;

    video.addEventListener("loadeddata", () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      running = true;
      predictWebcam();
    });
  } catch (err) {
    alert("Camera access denied. Please allow camera permissions.");
    console.error(err);
  }
}

// ==========================================
// 3. The Main Loop (Runs ~30 times a second)
// ==========================================
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

      // Draw the skeleton
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

      // Get Left Arm Joints (Indices: 11=Shoulder, 13=Elbow, 15=Wrist)
      const shoulder = landmark[11];
      const elbow = landmark[13];
      const wrist = landmark[15];

      // Check visibility before doing math
      if (
        shoulder.visibility > 0.6 &&
        elbow.visibility > 0.6 &&
        wrist.visibility > 0.6
      ) {
        const angle = calculateAngle(shoulder, elbow, wrist);
        updateFormAndReps(angle);
      } else {
        overlayMsg.classList.remove("hidden");
        overlayMsg.innerText = "Step into the light / Show full arm";
        feedbackEl.innerText = "Tracking lost...";
        feedbackEl.style.color = "#E63946";
      }
    } else {
      overlayMsg.classList.remove("hidden");
      overlayMsg.innerText = "No person detected. Step into the frame.";
    }
  }

  window.requestAnimationFrame(predictWebcam);
}

// ==========================================
// 4. The Math: Law of Cosines
// ==========================================
function calculateAngle(p1, p2, p3) {
  const ab = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  const bc = Math.sqrt(Math.pow(p2.x - p3.x, 2) + Math.pow(p2.y - p3.y, 2));
  const ac = Math.sqrt(Math.pow(p1.x - p3.x, 2) + Math.pow(p1.y - p3.y, 2));

  let radians = Math.acos((ab * ab + bc * bc - ac * ac) / (2 * ab * bc));
  return radians * (180 / Math.PI);
}

// ==========================================
// 5. The Logic: State Machine
// ==========================================
function updateFormAndReps(angle) {
  if (angle < UP_THRESHOLD && formState === "DOWN") {
    formState = "UP";
    skeletonColor = "#2A9D8F"; // Green
    feedbackEl.innerText = "Great! Lower it down slowly.";
    feedbackEl.style.color = "#2A9D8F";
  } else if (angle > DOWN_THRESHOLD && formState === "UP") {
    formState = "DOWN";
    repCount++;
    repCountEl.innerText = repCount;
    skeletonColor = "#2A9D8F"; // Green
    feedbackEl.innerText = "Perfect rep! Curl it back up.";
    feedbackEl.style.color = "#2A9D8F";
  } else {
    if (formState === "DOWN") {
      feedbackEl.innerText = "Curl the weight up.";
    } else {
      feedbackEl.innerText = "Lower the weight down.";
    }

    if (angle < 30 && formState === "UP") {
      skeletonColor = "#E63946"; // Red
      feedbackEl.innerText = "Don't cheat! Lower the weight slightly.";
      feedbackEl.style.color = "#E63946";
    } else {
      skeletonColor = "#0077B6"; // Blue for neutral
    }
  }
}

// ==========================================
// Event Listeners & Init
// ==========================================
startBtn.addEventListener("click", () => {
  startCamera();
  startBtn.innerText = "Camera Active";
  startBtn.disabled = true;
  statusEl.innerText = "Tracking active. Perform a left-arm bicep curl.";
});

initModel();
