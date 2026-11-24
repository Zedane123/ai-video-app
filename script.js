const promptInput = document.getElementById("promptInput");
const generateBtn = document.getElementById("generateBtn");
const statusDiv = document.getElementById("status");
const resultDiv = document.getElementById("result");
const voiceToggle = document.getElementById("voiceToggle");
const musicToggle = document.getElementById("musicToggle");

function wrapText(ctx, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let currentLine = words[0] || "";

    for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + " " + words[i];
        if (ctx.measureText(testLine).width <= maxWidth) {
            currentLine = testLine;
        } else {
            lines.push(currentLine);
            currentLine = words[i];
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

function speakCaption(text) {
    if (!voiceToggle.checked || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
}

function createAmbientAudioStream() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    const audioCtx = new AudioCtx();
    const dest = audioCtx.createMediaStreamDestination();
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = musicToggle.checked ? 0.08 : 0.0;

    // নরম অ্যাম্বিয়েন্ট কর্ড (C4, E4, G4)
    const freqs = [261.63, 329.63, 392.0];
    const oscillators = freqs.map((freq) => {
        const osc = audioCtx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(masterGain);
        osc.start();
        return osc;
    });

    masterGain.connect(dest);
    if (musicToggle.checked) {
        masterGain.connect(audioCtx.destination);
    }

    return {
        stream: dest.stream,
        stop: () => {
            oscillators.forEach((osc) => {
                try { osc.stop(); } catch (e) {}
            });
            audioCtx.close();
        }
    };
}

async function loadImage(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("ইমেজ লোড ব্যর্থ");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ img, objectUrl });
        img.onerror = () => reject(new Error("ছবি ডিকোড ব্যর্থ"));
        img.src = objectUrl;
    });
}

generateBtn.addEventListener("click", async () => {
    const lines = promptInput.value
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (lines.length === 0) {
        statusDiv.textContent = "আগে কমপক্ষে একটি দৃশ্যের বর্ণনা লিখুন!";
        return;
    }

    generateBtn.disabled = true;
    resultDiv.innerHTML = "";
    statusDiv.textContent = `AI দিয়ে ${lines.length}টি দৃশ্য তৈরি হচ্ছে...`;

    const scenes = [];
    for (let i = 0; i < lines.length; i++) {
        statusDiv.textContent = `দৃশ্য ${i + 1}/${lines.length} লোড হচ্ছে...`;
        const encoded = encodeURIComponent(lines[i]);
        const url = `https://image.pollinations.ai/prompt/${encoded}?width=720&height=404&nologo=true`;
        try {
            const loaded = await loadImage(url);
            scenes.push({ text: lines[i], ...loaded });
        } catch (err) {
            // কোনো একটি দৃশ্য ব্যর্থ হলে পরেরটিতে যাবে
        }
    }

    if (scenes.length === 0) {
        statusDiv.textContent = "দৃশ্য লোড করা যায়নি। ইন্টারনেট চেক করে আবার চেষ্টা করুন।";
        generateBtn.disabled = false;
        return;
    }

    // ভিডিও রেকর্ডিং Canvas প্রস্তুত করা
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 404;
    const ctx = canvas.getContext("2d");
    resultDiv.appendChild(canvas);

    const canvasStream = canvas.captureStream(30);
    const ambientAudio = createAmbientAudioStream();

    const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...(ambientAudio ? ambientAudio.stream.getAudioTracks() : [])
    ]);

    const chunks = [];
    let recorder;
    try {
        recorder = new MediaRecorder(combinedStream, { mimeType: "video/webm" });
    } catch (e) {
        recorder = new MediaRecorder(combinedStream);
    }

    recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
        if (ambientAudio) ambientAudio.stop();
        window.speechSynthesis.cancel();
        scenes.forEach((s) => URL.revokeObjectURL(s.objectUrl));

        const videoBlob = new Blob(chunks, { type: "video/webm" });
        const videoUrl = URL.createObjectURL(videoBlob);

        resultDiv.innerHTML = "";
        const videoEl = document.createElement("video");
        videoEl.src = videoUrl;
        videoEl.controls = true;
        videoEl.autoplay = true;
        videoEl.loop = true;

        const downloadBtn = document.createElement("a");
        downloadBtn.href = videoUrl;
        downloadBtn.download = "ai-generated-video.webm";
        downloadBtn.className = "download-link";
        downloadBtn.textContent = "ভিডিও ডাউনলোড করুন (.webm)";

        resultDiv.appendChild(videoEl);
        resultDiv.appendChild(downloadBtn);
        statusDiv.textContent = "ভিডিও তৈরি সম্পন্ন! নিচে প্লে বা ডাউনলোড করুন।";
        generateBtn.disabled = false;
    };

    recorder.start();

    const sceneDuration = 3500; // প্রতি দৃশ্য ৩.৫ সেকেন্ড
    for (let sIndex = 0; sIndex < scenes.length; sIndex++) {
        const scene = scenes[sIndex];
        statusDiv.textContent = `ভিডিও রেন্ডার হচ্ছে: দৃশ্য ${sIndex + 1}/${scenes.length}...`;
        speakCaption(scene.text);

        const startTime = performance.now();
        await new Promise((resolve) => {
            function renderFrame(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / sceneDuration, 1);

                // ধীরে ধীরে জুম ইফেক্ট (1.0 থেকে 1.15)
                const scale = 1 + progress * 0.15;
                const drawW = canvas.width * scale;
                const drawH = canvas.height * scale;
                const offsetX = (canvas.width - drawW) / 2;
                const offsetY = (canvas.height - drawH) / 2;

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(scene.img, offsetX, offsetY, drawW, drawH);

                // নিচের ক্যাপশন ব্যাকগ্রাউন্ড ও অ্যানিমেটেড টেক্সট
                ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
                ctx.fillRect(0, canvas.height - 92, canvas.width, 92);

                ctx.font = "bold 22px 'Segoe UI', Arial, sans-serif";
                ctx.fillStyle = "#ffffff";
                ctx.textAlign = "center";

                // টাইপরাইটার/রিভিল ক্যাপশন ইফেক্ট
                const visibleChars = Math.max(1, Math.floor(scene.text.length * Math.min(progress * 1.6, 1)));
                const visibleText = scene.text.slice(0, visibleChars);
                const wrappedLines = wrapText(ctx, visibleText, canvas.width - 48);

                wrappedLines.slice(0, 2).forEach((lineText, idx) => {
                    ctx.fillText(lineText, canvas.width / 2, canvas.height - 52 + idx * 28);
                });

                if (progress < 1) {
                    requestAnimationFrame(renderFrame);
                } else {
                    resolve();
                }
            }
            requestAnimationFrame(renderFrame);
        });
    }

    recorder.stop();
});
