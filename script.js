const promptInput = document.getElementById("promptInput");
const generateBtn = document.getElementById("generateBtn");
const statusDiv = document.getElementById("status");
const resultDiv = document.getElementById("result");

let slideTimer = null;

function clearSlideTimer() {
    if (slideTimer) {
        clearInterval(slideTimer);
        slideTimer = null;
    }
}

generateBtn.addEventListener("click", async () => {
    clearSlideTimer();

    const lines = promptInput.value
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (lines.length === 0) {
        statusDiv.textContent = "আগে কিছু একটা লিখুন!";
        resultDiv.innerHTML = "";
        return;
    }

    statusDiv.textContent = `${lines.length}টি দৃশ্য লোড হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন।`;
    resultDiv.innerHTML = "";
    generateBtn.disabled = true;

    const loadedScenes = [];

    for (const line of lines) {
        const encoded = encodeURIComponent(line);
        const url = `https://image.pollinations.ai/prompt/${encoded}`;

        try {
            await new Promise((resolve, reject) => {
                const tempImg = new Image();
                tempImg.onload = () => resolve(url);
                tempImg.onerror = () => reject(new Error("লোড ব্যর্থ"));
                tempImg.src = url;
            });
            loadedScenes.push({ text: line, url });
        } catch (e) {
            // কোনো একটি লাইন লোড না হলে বাকিগুলো নিয়ে এগোবে
        }
    }

    if (loadedScenes.length === 0) {
        statusDiv.textContent = "কোনো দৃশ্য লোড করা যায়নি। আবার চেষ্টা করুন।";
        generateBtn.disabled = false;
        return;
    }

    let currentIndex = 0;
    let isPaused = false;

    const frame = document.createElement("div");
    frame.className = "scene-frame";

    const img = document.createElement("img");

    const badge = document.createElement("div");
    badge.className = "scene-badge";

    const caption = document.createElement("div");
    caption.className = "scene-caption";

    const controls = document.createElement("div");
    controls.className = "controls";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "secondary-btn";
    toggleBtn.textContent = "Pause Motion";

    const renderScene = (index) => {
        const scene = loadedScenes[index];
        img.src = scene.url;
        img.alt = scene.text;
        caption.textContent = scene.text;
        badge.textContent = `Scene ${index + 1} / ${loadedScenes.length}`;
    };

    const startLoop = () => {
        clearSlideTimer();
        if (loadedScenes.length > 1 && !isPaused) {
            slideTimer = setInterval(() => {
                currentIndex = (currentIndex + 1) % loadedScenes.length;
                renderScene(currentIndex);
            }, 4000);
        }
    };

    toggleBtn.addEventListener("click", () => {
        isPaused = !isPaused;
        frame.classList.toggle("paused", isPaused);
        toggleBtn.textContent = isPaused ? "Play Motion" : "Pause Motion";
        if (isPaused) {
            clearSlideTimer();
        } else {
            startLoop();
        }
    });

    renderScene(0);
    frame.appendChild(img);
    frame.appendChild(badge);
    frame.appendChild(caption);
    controls.appendChild(toggleBtn);
    resultDiv.appendChild(frame);
    resultDiv.appendChild(controls);

    statusDiv.textContent = `রেজাল্ট তৈরি হয়েছে! (${loadedScenes.length}টি দৃশ্য চালু আছে)`;
    generateBtn.disabled = false;
    startLoop();
});
