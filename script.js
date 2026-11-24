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

    statusDiv.textContent = "ভিজ্যুয়াল তৈরি হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন।";
    resultDiv.innerHTML = "";
    generateBtn.disabled = true;

    const encodedPrompt = encodeURIComponent(text);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}`;

    const img = document.createElement("img");
    img.alt = text;

    img.onload = () => {
        statusDiv.textContent = "রেজাল্ট তৈরি হয়েছে!";
        generateBtn.disabled = false;
    };

    img.onerror = () => {
        statusDiv.textContent = "রেজাল্ট লোড করা যায়নি। আবার চেষ্টা করুন।";
        generateBtn.disabled = false;
    };

    img.src = imageUrl;
    resultDiv.appendChild(img);
});
