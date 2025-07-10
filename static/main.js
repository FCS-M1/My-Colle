// ===== グローバル変数 =====
const TOTAL_STEPS = 4;
let currentStep = 1;
let questionCount = 1;
let userName = "";
let questions = [];

// ===== DOMContentLoaded =====
document.addEventListener("DOMContentLoaded", () => {
    // 初期状態：トップページのみを表示し、メインコンテンツは隠す
    document.getElementById("start-page").classList.remove("hidden");
    document.getElementById("main-content").classList.add("hidden");

    // 全てのイベントリスナーをセットアップ
    setupStartButton();
    setupNameForm();
    setupSlider();
    setupInitialQuestionForm();
    setupCopyButton();
    setupRestartButton();
    setupSaveButton();
});

// ===== ユーティリティ =====
function updateProgress(step) {
    const bar = document.getElementById("progress-bar");
    const label = document.getElementById("step-label");
    const percent = (step / TOTAL_STEPS) * 100;
    bar.style.width = `${percent}%`;
    label.textContent = `ステップ ${step} / ${TOTAL_STEPS}`;
    currentStep = step;
}

function toggleOnly(showId) {
    const ids = ["step1", "step2", "step3", "step4", "result"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle("hidden", id !== showId);
    });
}

// ===== スタートボタンの処理 =====
function setupStartButton() {
    document.getElementById("start-btn").addEventListener("click", () => {
        document.getElementById("start-page").classList.add("hidden");
        document.getElementById("main-content").classList.remove("hidden");
        updateProgress(1);
        toggleOnly("step1"); 
    });
}

// ===== ステップ1: 名前入力 =====
function setupNameForm() {
    document.getElementById("name-form").addEventListener("submit", e => {
        e.preventDefault();
        userName = document.getElementById("name-input").value.trim();
        if (!userName) return;
        updateProgress(2);
        toggleOnly("step2");
    });
}

// ===== ステップ2: 質問入力 =====
function setupInitialQuestionForm() {
    const questionInputs = document.getElementById("question-inputs");
    document.getElementById("add-question-btn").addEventListener("click", () => {
        questionCount++;
        const div = document.createElement("div");
        div.className = "d-flex align-items-center my-2 question-item";
        div.innerHTML = `
            <input class="form-control me-2" name="question${questionCount}" required placeholder="質問 ${questionCount}">
            <button type="button" class="btn btn-outline-danger btn-sm remove-question-btn">✕</button>
        `;
        questionInputs.appendChild(div);
    });

    document.getElementById("suggest-question-btn").addEventListener("click", generate_question);
    questionInputs.addEventListener("click", (e) => {
        if (e.target.classList.contains("remove-question-btn")) {
            e.target.closest(".question-item").remove();
        }
    });

    document.getElementById("initial-question-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        questions = Array.from(formData.values()).filter(q => q && q.trim());
        if (questions.length === 0) return;
        buildAnswerForm();
        updateProgress(3);
        toggleOnly("step3");
    });
}

// ===== ステップ3: 回答入力 =====
function buildAnswerForm() {
    const form = document.getElementById("answer-form");
    form.innerHTML = "";
    questions.forEach(q => {
        form.innerHTML += `<label class="form-label">${q}</label><input name="${q}" class="form-control my-2" required>`;
    });
    form.innerHTML += `<button class="btn btn-success mt-3">次へ</button>`;
    form.addEventListener("submit", handleAnswerSubmit);
}

//スピナー表示のロジックを修正
async function handleAnswerSubmit(e) {
    e.preventDefault();
    const answers = Object.fromEntries(new FormData(e.target));
    const extraCount = parseInt(document.getElementById("extra-count").value);
    
    const step3Div = document.getElementById("step3");
    const spinner = document.getElementById("loading-spinner");

    // スピナーを表示し、フォームを非表示に
    step3Div.classList.add("hidden");
    spinner.classList.remove("d-none");

    try {
        const res = await fetch("/generate_extra_questions", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ answers, extra_count: extraCount })
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        buildExtraAnswerForm(data.extra_questions);
        updateProgress(4);
        toggleOnly("step4");
    } catch (err) {
        alert("追加質問の生成に失敗しました。");
        toggleOnly("step3"); // エラー時はステップ3に戻す
    } finally {
        spinner.classList.add("d-none");
    }
}

// ===== ステップ4: 追加回答 & スタイル =====
function buildExtraAnswerForm(extraQuestions) {
    const form = document.getElementById("extra-answer-form");
    form.innerHTML = "";
    extraQuestions.forEach(q => {
        form.innerHTML += `<label class="form-label">${q}</label><input name="${q}" class="form-control my-2" required>`;
    });
    form.innerHTML += `
    <div class="mt-4">
        <h5>どのようなスタイルの自己紹介にしますか？</h5>
        <input id="style-choice" class="form-control mt-2" placeholder="例: 関西弁でおもしろく / 小泉構文風に など">
    </div>
    <div class="text-center">
        <button class="btn btn-info mt-4">自己紹介を生成</button>
    </div>
    `;
    form.addEventListener("submit", handleIntroGenerate);
}

async function handleIntroGenerate(e) {
    e.preventDefault();
    let allAnswers = Object.fromEntries(new FormData(document.getElementById("answer-form")));
    const extraAnswers = Object.fromEntries(new FormData(e.target));
    Object.assign(allAnswers, extraAnswers);

    const style = document.getElementById("style-choice").value.trim();
    const step4Div = document.getElementById("step4");
    const spinner = document.getElementById("intro-loading-spinner");

    step4Div.classList.add("hidden");
    spinner.classList.remove("d-none");

    try {
        const res = await fetch("/generate_intro", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ answers: allAnswers, style, name: userName })
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        document.getElementById("intro-text").innerText = data.introduction;
        toggleOnly("result");
    } catch (err) {
        alert("自己紹介の生成に失敗しました。");
        toggleOnly("step4");
    } finally {
        spinner.classList.add("d-none");
    }
}

// ===== その他機能 =====
async function generate_question() {
    const suggestedBox = document.getElementById("suggested-question-box");
    const suggestedText = document.getElementById("suggested-question-text");
    const applyBtn = document.getElementById("apply-suggested-btn");
    const regenBtn = document.getElementById("regen-suggested-btn");
    try {
        const res = await fetch("/suggest_question", { method: "POST", headers: { "Content-Type": "application/json" } });
        if (!res.ok) throw new Error("サーバーエラー");
        const data = await res.json();
        suggestedText.textContent = data.question;
        suggestedBox.classList.remove("d-none");
        applyBtn.onclick = () => {
            const emptyInput = document.querySelector("#question-inputs input:placeholder-shown");
            if (emptyInput) {
                emptyInput.value = data.question;
            } else {
                document.getElementById("add-question-btn").click();
                const allInputs = document.querySelectorAll("#question-inputs input");
                allInputs[allInputs.length - 1].value = data.question;
            }
            suggestedBox.classList.add("d-none");
        };
        regenBtn.onclick = generate_question;
    } catch (err) {
        alert("質問の提案に失敗しました: " + err.message);
    }
}

function setupSlider() {
    const slider = document.getElementById("extra-count");
    const sliderValue = document.getElementById("extra-count-value");
    if (slider && sliderValue) {
        slider.addEventListener("input", () => {
            sliderValue.textContent = slider.value;
        });
    }
}

function setupCopyButton() {
    document.getElementById("copy-btn").addEventListener("click", () => {
        const text = document.getElementById("intro-text").innerText;
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById("copy-btn");
            const original = btn.innerText;
            btn.innerText = "コピーしました！";
            btn.disabled = true;
            setTimeout(() => {
                btn.innerText = original;
                btn.disabled = false;
            }, 1500);
        }).catch(() => alert("コピーに失敗しました。"));
    });
}

// ===== 保存機能 =====
function setupSaveButton() {
    document.getElementById("save-btn").addEventListener("click", () => {
        const introText = document.getElementById("intro-text").innerText;

        //【修正点】自己紹介文(intro)に加えて、名前(name)も送信する
        const saveData = new URLSearchParams({
            intro: introText,
            name: userName // ステップ1で入力された名前
        });

        fetch("/local_save", {
            method: "POST",
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            body: saveData
        })
        .then(r => r.json())
        .then(data => {
            if (data.status === "success") {
                alert(data.message);
            } else {
                alert("保存に失敗しました: " + data.message);
            }
        })
        .catch(err => alert("保存処理中にエラーが発生しました: " + err));
    });
}

function setupRestartButton() {
    document.getElementById("restart-btn").addEventListener("click", () => {
        questionCount = 1;
        userName = "";
        questions = [];
        document.getElementById("name-form").reset();
        document.getElementById("initial-question-form").reset();
        document.getElementById("question-inputs").innerHTML = `<input class="form-control my-2" name="question1" required placeholder="質問 1">`;
        document.getElementById("answer-form").innerHTML = "";
        document.getElementById("extra-answer-form").innerHTML = "";
        document.getElementById("intro-text").innerText = "";
        document.getElementById("start-page").classList.remove("hidden");
        document.getElementById("main-content").classList.add("hidden");
    });
}