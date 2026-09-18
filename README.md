# MotionMend AI 🦾

### Real-time, browser-based physical therapy form tracking powered by Computer Vision.

\*_GitHub repo link _https://github.com/faizakhtar-000/MotionMend-AI*

---

## The Problem

Physical therapy is crucial for recovering from injuries and surgeries, but a major clinical issue is **patient adherence and improper form**. When patients do their prescribed exercises at home, they often perform them incorrectly, leading to re-injury or stalled progress. Physical therapists cannot monitor their patients 24/7, and in-clinic visits are expensive.

## The Solution

**MotionMend AI** is a virtual physical therapy assistant. It uses your device's webcam and on-device AI to track your skeletal joints in real-time. It calculates exact joint angles, checks if your form is correct, counts valid repetitions, and provides live coaching.

Because it runs **100% locally in the browser via WebAssembly**, no video data ever leaves the user's device, making it fully HIPAA-compliant by design.

---

## Core Features

### Advanced Computer Vision & Math

- **Real-Time Pose Estimation:** Powered by Google's MediaPipe Tasks Vision, tracking 33 skeletal landmarks at 30+ FPS.
- **Geometric Form Analysis:** Uses the **Law of Cosines** in JavaScript to calculate exact joint angles (e.g., elbow flexion, knee flexion) in real-time.
- **Hysteresis State Machine:** Prevents "camera jitter" from causing false rep counts by requiring a full, smooth range of motion before logging a repetition.
- **Asymmetry & Posture Checks:** (Roadmap) Ensures baseline spinal alignment before starting and compares left/right limb symmetry.

### Apple-Inspired UI/UX

- **Glassmorphism Dashboard:** Frosted glass cards with `backdrop-filter` blurs and subtle gradient mesh backgrounds.
- **Dark Mode:** Full system-level dark theme toggle for comfortable use in any lighting.
- **Animated Feedback:** Spring-physics animations, odometer-style rep counters, and live Chart.js analytics tracking form accuracy over time.
- **Achievement System:** Gamified toast notifications (e.g., "Flawless Streak", "First 10 Reps") to boost patient adherence.

### Accessibility & Global Reach

- **Multi-Language Support:** Instant UI translation between **English, Spanish, French, and Chinese** to break down language barriers in healthcare.
- **Voice & Audio Cues:** Uses the Web Speech API to provide hands-free audio coaching so patients don't have to stare at the screen.
- **Exertion-Based Heart Rate Monitor:** Simulates cardiovascular exertion tracking tied to rep volume.

### Clinical Reporting

- **One-Click PDF Export:** Generates a high-resolution, beautifully formatted PDF report at the end of the session (Reps, Accuracy, Peak HR, AI Coach Summary) that patients can email directly to their physical therapist.

---

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6 Modules)
- **AI / CV:** MediaPipe Tasks Vision (Pose Landmarker) via WebAssembly
- **Data Visualization:** Chart.js
- **PDF Generation:** html2canvas + jsPDF
- **Math:** Native JS Math API (Law of Cosines)
- **Hosting:** GitHub Pages / Netlify

---

## How the Math Works (Under the Hood)

MediaPipe gives us the `x, y` coordinates of the joints. To find the angle of the elbow (for a bicep curl), we extract the Shoulder (p1), Elbow (p2), and Wrist (p3).

We calculate the distances between these points to form a triangle, then use the **Law of Cosines** to find the angle at the joint:

```javascript
const ab = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
const bc = Math.sqrt(Math.pow(p2.x - p3.x, 2) + Math.pow(p2.y - p3.y, 2));
const ac = Math.sqrt(Math.pow(p1.x - p3.x, 2) + Math.pow(p1.y - p3.y, 2));

let radians = Math.acos((ab * ab + bc * bc - ac * ac) / (2 * ab * bc));
let angle = radians * (180 / Math.PI);
```

## Built with ❤️, math, and too much coffee
