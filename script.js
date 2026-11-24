const promptInput = document.getElementById("promptInput");
const generateBtn = document.getElementById("generateBtn");
const statusDiv = document.getElementById("status");
const resultDiv = document.getElementById("result");
const voiceCheck = document.getElementById("voiceCheck");
const soundCheck = document.getElementById("soundCheck");

let sceneInterval = null;
let typeInterval = null;
let audioCtx = null;
let oscList = [];

function stopAllTimersAndAudio() {
    if (sceneInterval) {
        clearInterval(sceneInterval);
        sceneInterval = null;
    }
    if (typeInterval) {
        clearInterval(typeInterval);
        typeInterval = null;
    }
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }
    oscList.forEach((osc) => {
        try { osc.stop(); } catch (e) {}
    });
    oscList = [];
    if (audioCtx) {
        try { audioCtx.close(); } catch (e) {}
        audioCtx = null;
    }
}

function startSoftSound() {
    if (!soundCheck.checked) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    audioCtx = new AudioContextClass();
    const gain = audioCtx.createGain();
    gain.gain.value = 0.05;
    gain.connect(audioCtx.destination);

    [220, 277.18, 329.63].forEach((freq) => {
        const osc = audioCtx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start();
        oscList.push(osc);
    });
}

function speakLine(text) {
    if (!voiceCheck.checked || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const hasBangla = /[\u0980-\u09FF]/.test(text);
    utter.lang = hasBangla ? "bn-BD" : "en-US";
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
}

function parseLineToScene(line) {
    if (line.includes("|")) {
        const parts = line.split("|");
        const caption = parts[0].trim();
        const imagePrompt = parts.slice(1).join("|").trim() || caption;
        return { caption, imagePrompt };
    }
    return { caption: line, imagePrompt: line };
}

function downloadSceneFrame(imgElement, captionText, sceneNumber) {
    try {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = 1280;
        tempCanvas.height = 720;
        const ctx = tempCanvas.getContext("2d");

        ctx.drawImage(imgElement, 0, 0, tempCanvas.width, tempCanvas.height);

        ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
        ctx.fillRect(0, tempCanvas.height - 110, tempCanvas.width, 110);

        ctx.font = "bold 32px 'Segoe UI', Arial, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(captionText, tempCanvas.width / 2, tempCanvas.height - 44);

        const dataUrl = tempCanvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `scene-${sceneNumber}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        statusDiv.textContent = `Scene ${sceneNumber} ডাউনলোড হয়েছে!`;
    } catch (err) {
        const blob = new Blob([captionText], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `caption-scene-${sceneNumber}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        statusDiv.textContent = `ক্যাপশন ফাইল (Scene ${sceneNumber}) ডাউনলোড হয়েছে!`;
    }
}

generateBtn.addEventListener("click", () => {
    stopAllTimersAndAudio();

    const lines = promptInput.value
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    if (lines.length === 0) {
        statusDiv.textContent = "আগে কিছু একটা লিখুন!";
        resultDiv.innerHTML = "";
        return;
    }

    statusDiv.textContent = "দৃশ্য তৈরি হচ্ছে...";
    resultDiv.innerHTML = "";
    generateBtn.disabled = true;

    const scenes = lines.map((line) => {
        const parsed = parseLineToScene(line);
        return {
            caption: parsed.caption,
            url: `https://image.pollinations.ai/prompt/${encodeURIComponent(parsed.imagePrompt)}`
        };
    });

    const stage = document.createElement("div");
    stage.className = "video-stage";

    const img = document.createElement("img");
    img.crossOrigin = "anonymous";

    const topBar = document.createElement("div");
    topBar.className = "top-bar";

    const badge = document.createElement("div");
    badge.className = "badge";

    const captionBox = document.createElement("div");
    captionBox.className = "caption-box";

    const controls = document.createElement("div");
    controls.className = "controls";

    const pauseBtn = document.createElement("button");
    pauseBtn.type = "button";
    pauseBtn.className = "ctrl-btn";
    pauseBtn.textContent = "Pause";

    const replayBtn = document.createElement("button");
    replayBtn.type = "button";
    replayBtn.className = "ctrl-btn";
    replayBtn.textContent = "Restart";

    const downloadBtn = document.createElement("button");
    downloadBtn.type = "button";
    downloadBtn.className = "download-btn";
    downloadBtn.textContent = "Download Current Scene";

    topBar.appendChild(badge);
    stage.appendChild(img);
    stage.appendChild(topBar);
    stage.appendChild(captionBox);

    controls.appendChild(pauseBtn);
    controls.appendChild(replayBtn);

    resultDiv.appendChild(stage);
    resultDiv.appendChild(controls);
    resultDiv.appendChild(downloadBtn);

    let index = 0;
    let paused = false;

    function animateCaption(text) {
        if (typeInterval) clearInterval(typeInterval);
        captionBox.textContent = "";
        let i = 0;
        typeInterval = setInterval(() => {
            if (paused) return;
            captionBox.textContent += text.charAt(i);
            i++;
            if (i >= text.length) {
                clearInterval(typeInterval);
                typeInterval = null;
            }
        }, 45);
    }

    function showScene(idx, playAudio = true) {
        const current = scenes[idx];
        badge.textContent = `Scene ${idx + 1} / ${scenes.length}`;
        img.src = current.url;
        img.alt = current.caption;
        animateCaption(current.caption);
        if (playAudio) {
            speakLine(current.caption);
        }
    }

    function startPlayback() {
        stopAllTimersAndAudio();
        startSoftSound();
        showScene(index, true);

        if (scenes.length > 1) {
            sceneInterval = setInterval(() => {
                if (!paused) {
                    index = (index + 1) % scenes.length;
                    showScene(index, true);
                }
            }, 4500);
        }
    }

    pauseBtn.addEventListener("click", () => {
        paused = !paused;
        stage.classList.toggle("paused", paused);
        pauseBtn.textContent = paused ? "Play" : "Pause";
        if (paused && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        } else if (!paused) {
            speakLine(scenes[index].caption);
        }
    });

    replayBtn.addEventListener("click", () => {
        paused = false;
        stage.classList.remove("paused");
        pauseBtn.textContent = "Pause";
        index = 0;
        startPlayback();
    });

    downloadBtn.addEventListener("click", () => {
        downloadSceneFrame(img, scenes[index].caption, index + 1);
    });

    img.onload = () => {
        statusDiv.textContent = "ভিডিও প্রিভিউ চলছে!";
        generateBtn.disabled = false;
    };

    img.onerror = () => {
        statusDiv.textContent = "ছবি লোড হতে সময় নিচ্ছে বা সমস্যা হয়েছে, আবার চেষ্টা করুন।";
        generateBtn.disabled = false;
    };

    startPlayback();
});
