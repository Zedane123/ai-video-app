const promptInput = document.getElementById("promptInput");
const generateBtn = document.getElementById("generateBtn");
const statusDiv = document.getElementById("status");
const resultDiv = document.getElementById("result");

generateBtn.addEventListener("click", () => {
    const text = promptInput.value.trim();

    if (!text) {
        statusDiv.textContent = "আগে কিছু একটা লিখুন!";
        resultDiv.innerHTML = "";
        return;
    }

    statusDiv.textContent = "দৃশ্য তৈরি হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন।";
    resultDiv.innerHTML = "";
    generateBtn.disabled = true;

    const encodedPrompt = encodeURIComponent(text);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}`;

    const frame = document.createElement("div");
    frame.className = "scene-frame";

    const img = document.createElement("img");
    img.alt = text;

    const caption = document.createElement("div");
    caption.className = "scene-caption";
    caption.textContent = text;

    const controls = document.createElement("div");
    controls.className = "controls";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "secondary-btn";
    toggleBtn.textContent = "Pause Motion";

    toggleBtn.addEventListener("click", () => {
        const isPaused = frame.classList.toggle("paused");
        toggleBtn.textContent = isPaused ? "Play Motion" : "Pause Motion";
    });

    img.onload = () => {
        statusDiv.textContent = "রেজাল্ট তৈরি হয়েছে!";
        frame.appendChild(img);
        frame.appendChild(caption);
        controls.appendChild(toggleBtn);
        resultDiv.appendChild(frame);
        resultDiv.appendChild(controls);
        generateBtn.disabled = false;
    };

    img.onerror = () => {
        statusDiv.textContent = "রেজাল্ট লোড করা যায়নি। আবার চেষ্টা করুন।";
        resultDiv.innerHTML = "";
        generateBtn.disabled = false;
    };

    img.src = imageUrl;
});
