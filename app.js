// --- STATE APLIKASI ---
let focusMinutes = 25;
let breakMinutes = 5;
let totalLaps = 4;
let currentLap = 1;
let treesGrown = 0;
let currentPhase = "focus";
let timeLeft = focusMinutes * 60;
let timerId = null;
let isRunning = false;
let isHudExpanded = false; // Manual override untuk memperbesar/memperkecil HUD saat timer jalan
let forestStageModels = [];

// --- DOM REFERENCES ---
const topBarEl = document.getElementById("topBar");
const forestStageEl = document.getElementById("forestStage");
const grownClonesEl = document.getElementById("grownClones");
const mainStageBoxEl = document.getElementById("mainStageBox");
const mainScaleWrapperEl = document.getElementById("mainScaleWrapper");
const viewerEl = document.getElementById("viewer");
const modelSelect = document.getElementById("modelSelect");

const motionToggle = document.getElementById("motionToggle");
const growToggle = document.getElementById("growToggle");
const cloneToggle = document.getElementById("cloneToggle");
const cloneMoveToggle = document.getElementById("cloneMoveToggle");
const cloneGrowToggle = document.getElementById("cloneGrowToggle");

const customPanel = document.getElementById("customPanel");
const collapseHudBtn = document.getElementById("collapseHudBtn");
const lapDotsEl = document.getElementById("lapDots");
const timerEl = document.getElementById("timer");
const startBtn = document.getElementById("startBtn");

const phaseBadge = document.getElementById("phaseBadge");
const lapText = document.getElementById("lapText");
const forestCountEl = document.getElementById("forestCount");
const focusInput = document.getElementById("focusInput");
const breakInput = document.getElementById("breakInput");
const lapsInput = document.getElementById("lapsInput");

const bgAudio = document.getElementById("bgAudio");
const playIcon = document.getElementById("playIcon");
const pauseIcon = document.getElementById("pauseIcon");
const trackNameEl = document.getElementById("trackName");
const audioStatusEl = document.getElementById("audioStatus");
const volumeSlider = document.getElementById("volumeSlider");
const volOnIcon = document.getElementById("volOnIcon");
const volMuteIcon = document.getElementById("volMuteIcon");

// --- 1. HUD EXPAND / COLLAPSE CONTROL ---
function toggleHudSize() {
  isHudExpanded = !isHudExpanded;
  updateHudLayout();
}

function updateHudLayout() {
  const shouldCompact = isRunning && !isHudExpanded;
  document.body.classList.toggle("hud-compact", shouldCompact);

  if (shouldCompact) {
    topBarEl.classList.add("opacity-50", "hover:opacity-100");
    collapseHudBtn.classList.add("hidden");
    collapseHudBtn.classList.remove("flex");
  } else {
    topBarEl.classList.remove("opacity-50", "hover:opacity-100");
    if (isRunning) {
      collapseHudBtn.classList.remove("hidden");
      collapseHudBtn.classList.add("flex");
    } else {
      collapseHudBtn.classList.add("hidden");
      collapseHudBtn.classList.remove("flex");
    }
  }
  updateModelGrowthScale();
}

// --- 2. GROWTH SCALE, MOTION & CLONES ---
function getFocusProgress() {
  const totalFocusSec = focusMinutes * 60;
  const elapsed = Math.max(0, totalFocusSec - timeLeft);
  return Math.min(1, elapsed / totalFocusSec);
}

function updateModelGrowthScale() {
  const shouldCompact = isRunning && !isHudExpanded;
  // Geser sedikit ke atas (-8%) hanya saat HUD penuh terbuka, dan kembali ke tengah (0%) saat compact
  const translateY = shouldCompact ? "0%" : "-8%";

  if (!growToggle.checked) {
    mainScaleWrapperEl.style.transform = `translateY(${translateY}) scale(1)`;
    return;
  }

  if (currentPhase === "focus") {
    const progress = getFocusProgress();
    const minScale = 0.35;
    const s = (minScale + (1 - minScale) * progress).toFixed(4);
    mainScaleWrapperEl.style.transform = `translateY(${translateY}) scale(${s})`;
  } else {
    mainScaleWrapperEl.style.transform = `translateY(${translateY}) scale(1)`;
  }
}

  if (currentPhase === "focus") {
    const progress = getFocusProgress();
    const minScale = 0.35;
    const s = (minScale + (1 - minScale) * progress).toFixed(4);
    mainScaleWrapperEl.style.transform = `scale(${s})`;
  } else {
    mainScaleWrapperEl.style.transform = "scale(1)";
  }
}

// Update skala semua kloningan berdasarkan toggle Clone Grow:
// - Mati: semua kloningan tetap kecil (scale 0.28)
// - Nyala: kloningan yang sudah selesai tumbuh ke ukuran dewasa (0.56), dan jika sedang focus ikut membesar bertahap
function updateCloneScales() {
  const clones = grownClonesEl.querySelectorAll("model-viewer");
  const isCloneGrowOn = cloneGrowToggle.checked;
  const progress = currentPhase === "focus" ? getFocusProgress() : 1;

  clones.forEach((clone, idx) => {
    const tx = clone.dataset.tx;
    const ty = clone.dataset.ty;

    if (!isCloneGrowOn) {
      // Clone Grow MATI -> tetap kecil (miniatur)
      clone.style.transform = `translate(${tx}%, ${ty}%) scale(0.28)`;
      clone.style.opacity = "0.78";
    } else {
      // Clone Grow NYALA -> tumbuh bertahap (0.28 -> 0.56)
      const dynamicScale = (0.34 + 0.22 * progress).toFixed(3);
      clone.style.transform = `translate(${tx}%, ${ty}%) scale(${dynamicScale})`;
      clone.style.opacity = "0.92";
    }
  });
}

function applyMotionToElement(el, active) {
  if (!el) return;
  if (active) {
    el.autoRotate = true;
    el.rotationPerSecond = currentPhase === "focus" ? "15deg" : "6deg";
    if (el.availableAnimations && el.availableAnimations.length > 0) {
      const preferred = el.availableAnimations.find(a => /idle|walk|dance|wave|grow/i.test(a));
      el.animationName = preferred || el.availableAnimations[0];
    }
    if (typeof el.play === "function") el.play();
  } else {
    el.autoRotate = false;
    if (typeof el.pause === "function") el.pause();
  }
}

function syncModelState() {
  updateHudLayout();
  updateModelGrowthScale();
  updateCloneScales();

  const mainShouldMove = isRunning && motionToggle.checked;
  applyMotionToElement(viewerEl, mainShouldMove);

  const clonesShouldMove = isRunning && cloneMoveToggle.checked;
  grownClonesEl.querySelectorAll("model-viewer").forEach(cloneEl => {
    applyMotionToElement(cloneEl, clonesShouldMove);
  });
}

function renderGrownClones() {
  grownClonesEl.innerHTML = "";
  if (!cloneToggle.checked || treesGrown <= 0) return;

  const currentSrc = viewerEl.getAttribute("src");
  const offsets = [-23, 23, -37, 37, -14, 14, -45, 45];
  const count = Math.min(treesGrown, offsets.length);

  for (let i = 0; i < count; i++) {
    const clone = document.createElement("model-viewer");
    clone.className = "clone-item";
    clone.src = currentSrc;
    clone.shadowIntensity = 0.8;
    clone.exposure = 0.85;
    clone.cameraOrbit = `${(i % 2 === 0 ? 25 : -25)}deg 75deg auto`;
    
    const xOffset = offsets[i];
    const yOffset = (i % 2 === 0) ? -6 : -11;
    clone.dataset.tx = xOffset;
    clone.dataset.ty = yOffset;

    // Mulai dari skala kecil terlebih dahulu lalu transisi ke skala target
    clone.style.transform = `translate(${xOffset}%, ${yOffset}%) scale(0.15)`;
    clone.style.opacity = "0";

    clone.addEventListener("load", () => {
      applyMotionToElement(clone, isRunning && cloneMoveToggle.checked);
      requestAnimationFrame(() => updateCloneScales());
    });

    grownClonesEl.appendChild(clone);
  }
  requestAnimationFrame(() => updateCloneScales());
}

viewerEl.addEventListener("load", syncModelState);

function updateForestStageModel() {
  if (forestStageModels.length > 0) {
    const stageIdx = Math.min(treesGrown, forestStageModels.length - 1);
    const targetFile = forestStageModels[stageIdx];
    if (viewerEl.getAttribute("src") !== targetFile) {
      viewerEl.src = targetFile;
      modelSelect.value = targetFile;
    }
  }
  renderGrownClones();
}

function changeModel(modelUrl) {
  viewerEl.src = modelUrl;
  renderGrownClones();
}

function changeBg(gradientCss, swatchEl) {
  forestStageEl.style.background = gradientCss;
  document.querySelectorAll(".swatch").forEach(s => {
    s.classList.remove("border-white", "scale-110");
    s.classList.add("border-white/25");
  });
  swatchEl.classList.remove("border-white/25");
  swatchEl.classList.add("border-white", "scale-110");
}

// --- 3. GENTLE CHIME ---
function playChime() {
  if (isMuted) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(528, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(792, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch (e) {}
}

// --- 4. TIMER & LAP LOGIC ---
function renderSessionUI() {
  const mins = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const secs = (timeLeft % 60).toString().padStart(2, "0");
  timerEl.textContent = `${mins}:${secs}`;
  document.title = `${mins}:${secs} (${currentPhase.toUpperCase()} ${currentLap}/${totalLaps})`;

  phaseBadge.textContent = currentPhase === "focus" ? "FOCUS" : "BREAK";
  if (currentPhase === "break") {
    phaseBadge.classList.remove("bg-white/10", "text-zinc-100");
    phaseBadge.classList.add("bg-sky-400/20", "text-sky-400");
  } else {
    phaseBadge.classList.add("bg-white/10", "text-zinc-100");
    phaseBadge.classList.remove("bg-sky-400/20", "text-sky-400");
  }

  lapText.textContent = `LAP ${currentLap} / ${totalLaps}`;
  forestCountEl.textContent = `🌲 ${treesGrown}`;

  lapDotsEl.innerHTML = "";
  for (let i = 1; i <= totalLaps; i++) {
    const dot = document.createElement("span");
    dot.className = "w-1.5 h-1.5 rounded-full transition-all ";
    if (i < currentLap) dot.className += "bg-[#1ed760]";
    else if (i === currentLap) dot.className += "bg-white scale-125";
    else dot.className += "bg-white/20";
    lapDotsEl.appendChild(dot);
  }
}

function handlePhaseComplete(autoContinue = true) {
  playChime();

  if (currentPhase === "focus") {
    treesGrown++;
    updateForestStageModel();

    if (currentLap >= totalLaps) {
      clearInterval(timerId);
      isRunning = false;
      isHudExpanded = false;
      startBtn.textContent = "Start";
      timeLeft = 0;
      updateModelGrowthScale();

      currentLap = totalLaps + 1;
      renderSessionUI();
      lapText.textContent = `DONE (${totalLaps}/${totalLaps})`;
      currentLap = 1;
      timeLeft = focusMinutes * 60;
      syncModelState();
      return;
    }
    currentPhase = "break";
    timeLeft = breakMinutes * 60;
  } else {
    currentPhase = "focus";
    currentLap++;
    timeLeft = focusMinutes * 60;
  }

  renderSessionUI();
  syncModelState();

  if (!autoContinue) {
    clearInterval(timerId);
    isRunning = false;
    isHudExpanded = false;
    startBtn.textContent = "Start";
    syncModelState();
  }
}

function toggleTimer() {
  if (isRunning) {
    clearInterval(timerId);
    startBtn.textContent = "Resume";
    isRunning = false;
    isHudExpanded = false;
  } else {
    isRunning = true;
    isHudExpanded = false; // Otomatis ciutkan saat mulai fokus, bisa dibuka lewat tombol expand
    startBtn.textContent = "Pause";
    customPanel.classList.add("hidden");
    customPanel.classList.remove("grid");
    timerId = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
        renderSessionUI();
        updateModelGrowthScale();
        updateCloneScales();
      } else {
        handlePhaseComplete(true);
      }
    }, 1000);
  }
  syncModelState();
}

function skipPhase() {
  handlePhaseComplete(isRunning);
}

function resetSession() {
  clearInterval(timerId);
  isRunning = false;
  isHudExpanded = false;
  currentPhase = "focus";
  currentLap = 1;
  treesGrown = 0;
  timeLeft = focusMinutes * 60;
  startBtn.textContent = "Start";
  updateForestStageModel();
  renderSessionUI();
  syncModelState();
}

function setActiveTab(activeBtn) {
  document.querySelectorAll(".mode-btn").forEach(b => {
    b.classList.remove("bg-zinc-100", "text-zinc-950", "border-zinc-100", "font-semibold");
    b.classList.add("text-zinc-400", "border-white/15");
  });
  activeBtn.classList.remove("text-zinc-400", "border-white/15");
  activeBtn.classList.add("bg-zinc-100", "text-zinc-950", "border-zinc-100", "font-semibold");
}

function applyPreset(fMins, bMins, laps, btnEl) {
  setActiveTab(btnEl);
  customPanel.classList.add("hidden");
  customPanel.classList.remove("grid");

  focusMinutes = fMins;
  breakMinutes = bMins;
  totalLaps = laps;

  focusInput.value = fMins;
  breakInput.value = bMins;
  lapsInput.value = laps;

  resetSession();
}

function toggleCustomPanel(btnEl) {
  setActiveTab(btnEl);
  if (customPanel.classList.contains("hidden")) {
    customPanel.classList.remove("hidden");
    customPanel.classList.add("grid");
  } else {
    customPanel.classList.add("hidden");
    customPanel.classList.remove("grid");
  }
}

function applyCustomSettings() {
  const f = parseInt(focusInput.value, 10);
  const b = parseInt(breakInput.value, 10);
  const l = parseInt(lapsInput.value, 10);

  if (f > 0 && f <= 180) focusMinutes = f;
  if (b > 0 && b <= 60) breakMinutes = b;
  if (l > 0 && l <= 20) totalLaps = l;

  customPanel.classList.add("hidden");
  customPanel.classList.remove("grid");
  resetSession();
}

// --- 5. BUILT-IN LO-FI SYNTH ENGINE + MP3 PLAYLIST + MUTE ---
const playlist = [
  { title: "Midnight Rhodes & Rain (Synth)", type: "synth", chords: [[261.63, 329.63, 392.00, 493.88], [220.00, 261.63, 329.63, 392.00], [174.61, 220.00, 261.63, 329.63], [196.00, 246.94, 293.66, 349.23]] },
  { title: "Warm Sunset Jazz Chords (Synth)", type: "synth", chords: [[293.66, 349.23, 440.00, 523.25], [196.00, 246.94, 293.66, 349.23], [261.63, 329.63, 392.00, 493.88], [220.00, 261.63, 329.63, 392.00]] }
];

let currentTrackIndex = 0;
let isAudioPlaying = false;
let masterVolume = 0.5;
let previousVolume = 0.5;
let isMuted = false;
let synthCtx = null;
let synthInterval = null;
let rainNode = null;
let masterGain = null;

bgAudio.volume = masterVolume;

function updateVolumeUI() {
  const effectiveVol = isMuted ? 0 : masterVolume;
  bgAudio.volume = effectiveVol;
  volumeSlider.value = effectiveVol;

  if (masterGain && synthCtx) {
    masterGain.gain.setTargetAtTime(effectiveVol * 0.35, synthCtx.currentTime, 0.05);
  }

  if (isMuted || effectiveVol === 0) {
    volOnIcon.classList.add("hidden");
    volMuteIcon.classList.remove("hidden");
  } else {
    volOnIcon.classList.remove("hidden");
    volMuteIcon.classList.add("hidden");
  }
}

function toggleMute() {
  if (isMuted) {
    isMuted = false;
    masterVolume = previousVolume > 0 ? previousVolume : 0.5;
  } else {
    previousVolume = masterVolume;
    isMuted = true;
  }
  updateVolumeUI();
}

function changeVolume(val) {
  const v = parseFloat(val);
  masterVolume = v;
  isMuted = (v === 0);
  if (v > 0) previousVolume = v;
  updateVolumeUI();
}

function setPlayingUI(playing) {
  isAudioPlaying = playing;
  if (playing) {
    playIcon.classList.add("hidden");
    pauseIcon.classList.remove("hidden");
    audioStatusEl.textContent = "PLAYING";
  } else {
    playIcon.classList.remove("hidden");
    pauseIcon.classList.add("hidden");
    audioStatusEl.textContent = "PAUSED";
  }
}

function stopSynth() {
  if (synthInterval) {
    clearInterval(synthInterval);
    synthInterval = null;
  }
  if (rainNode) {
    try { rainNode.stop(); } catch (e) {}
    rainNode = null;
  }
}

function startSynth(track) {
  stopSynth();
  if (!synthCtx) {
    synthCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (synthCtx.state === "suspended") synthCtx.resume();

  masterGain = synthCtx.createGain();
  masterGain.gain.value = (isMuted ? 0 : masterVolume) * 0.35;
  masterGain.connect(synthCtx.destination);

  const bufferSize = synthCtx.sampleRate * 2;
  const noiseBuffer = synthCtx.createBuffer(1, bufferSize, synthCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    output[i] = (lastOut + (0.02 * white)) / 1.02;
    lastOut = output[i];
    output[i] *= 0.18;
  }
  rainNode = synthCtx.createBufferSource();
  rainNode.buffer = noiseBuffer;
  rainNode.loop = true;

  const filter = synthCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 850;
  rainNode.connect(filter);
  filter.connect(masterGain);
  rainNode.start();

  let step = 0;
  const playChord = () => {
    if (!isAudioPlaying) return;
    const chord = track.chords[step % track.chords.length];
    step++;

    chord.forEach((freq, idx) => {
      const osc = synthCtx.createOscillator();
      const noteGain = synthCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, synthCtx.currentTime + idx * 0.04);

      noteGain.gain.setValueAtTime(0.001, synthCtx.currentTime + idx * 0.04);
      noteGain.gain.linearRampToValueAtTime(0.14, synthCtx.currentTime + idx * 0.04 + 0.15);
      noteGain.gain.exponentialRampToValueAtTime(0.0008, synthCtx.currentTime + 3.0);

      osc.connect(noteGain);
      noteGain.connect(masterGain);
      osc.start(synthCtx.currentTime + idx * 0.04);
      osc.stop(synthCtx.currentTime + 3.1);
    });
  };

  playChord();
  synthInterval = setInterval(playChord, 3200);
}

function stopAllAudio() {
  bgAudio.pause();
  stopSynth();
  setPlayingUI(false);
}

function loadTrack(index, autoPlay = false) {
  currentTrackIndex = index;
  const track = playlist[currentTrackIndex];
  trackNameEl.textContent = track.title;

  bgAudio.pause();
  stopSynth();

  if (autoPlay) {
    if (track.type === "synth") {
      setPlayingUI(true);
      startSynth(track);
    } else {
      bgAudio.src = track.url;
      bgAudio.play().then(() => {
        setPlayingUI(true);
      }).catch(() => {
        playNextTrack();
      });
    }
  } else {
    setPlayingUI(false);
  }
}

function playNextTrack() {
  const nextIndex = (currentTrackIndex + 1) % playlist.length;
  loadTrack(nextIndex, true);
}

function playRandomTrack() {
  if (playlist.length <= 1) {
    loadTrack(0, true);
    return;
  }
  let nextIndex;
  do {
    nextIndex = Math.floor(Math.random() * playlist.length);
  } while (nextIndex === currentTrackIndex);
  loadTrack(nextIndex, true);
}

bgAudio.addEventListener("ended", playRandomTrack);

function toggleAudio() {
  if (isAudioPlaying) {
    stopAllAudio();
  } else {
    loadTrack(currentTrackIndex, true);
  }
}

// --- 6. AUTO-FETCH FILE .GLB & .MP3 DARI GITHUB REPO ---
const GITHUB_USER = "scarlet-azure";
const GITHUB_REPO = "lofi-3d-timer";

async function initApp() {
  renderSessionUI();

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/`);
    if (res.ok) {
      const files = await res.json();

      const glbFiles = files
        .filter(f => f.name.toLowerCase().endsWith(".glb"))
        .sort((a, b) => a.name.localeCompare(b.name));

      forestStageModels = glbFiles
        .filter(f => /(tree|forest|stage|lap)[-_]?\d+\.glb$/i.test(f.name))
        .map(f => f.name);

      glbFiles.forEach((file, index) => {
        const opt = document.createElement("option");
        opt.value = file.name;
        const cleanName = file.name.replace(/\.glb$/i, "").replace(/[-_]/g, " ");
        opt.textContent = `3D: ${cleanName.replace(/\b\w/g, l => l.toUpperCase())}`;
        opt.className = "bg-zinc-900";
        modelSelect.appendChild(opt);

        if (index === 0) {
          modelSelect.value = file.name;
          changeModel(file.name);
        }
      });

      const mp3Files = files.filter(f => f.name.toLowerCase().endsWith(".mp3"));
      mp3Files.forEach(file => {
        const cleanTitle = file.name.replace(/\.mp3$/i, "").replace(/[-_]/g, " ");
        playlist.unshift({
          title: `${cleanTitle.replace(/\b\w/g, l => l.toUpperCase())} (My Track)`,
          type: "mp3",
          url: file.name
        });
      });
    }
  } catch (err) {
    console.log("Menggunakan aset default:", err);
  }

  loadTrack(0, false);
  syncModelState();
}

initApp();
