// ===== グローバル変数 =====
const TOTAL_STEPS = 4;      // 1〜4
let currentStep = 1;        // いま表示しているステップ
let questionCount = 1;      // 質問数
let userName = "";          // 名前
let questions = [];         // 質問配列

// ===== DOMContentLoaded =====
document.addEventListener("DOMContentLoaded", () => {
    // 最初は step1 だけ表示
    toggleOnly("step1");
    updateProgress(1);
    setupNameForm();
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
    ["step1", "step2", "step3", "step4", "result"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === showId) el.classList.remove("hidden");
    else el.classList.add("hidden");
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

    // 質問追加ボタン
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

    // AIによる質問提案ボタン
    document.getElementById("suggest-question-btn").addEventListener("click", generate_question);


    // 削除ボタンのイベント（動的追加にも対応）
    questionInputs.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-question-btn")) {
        e.target.closest(".question-item").remove();
    }
    });

    // フォーム送信
    document.getElementById("initial-question-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    questions = Array.from(formData.values()).filter(q => q.trim());
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
    form.innerHTML += `<label>${q}</label><input name="${q}" class="form-control my-2" required>`;
    });
    form.innerHTML += `<button class="btn btn-success mt-3">次へ</button>`;

    form.addEventListener("submit", handleAnswerSubmit);
}

async function handleAnswerSubmit(e) {
    e.preventDefault();
    const answers = {};
    const formData = new FormData(e.target);
    formData.forEach((v, k) => answers[k] = v);
    const extraCount = parseInt(document.getElementById("extra-count").value);

    document.getElementById("loading-spinner").classList.remove("d-none");
    const res = await fetch("/generate_extra_questions", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ answers, extra_count: extraCount })
    });
    const data = await res.json();
    document.getElementById("loading-spinner").classList.add("d-none");

    buildExtraAnswerForm(data.extra_questions);
    updateProgress(4);
    toggleOnly("step4");
}

// ===== ステップ4: 追加回答 & スタイル =====
function buildExtraAnswerForm(extraQuestions) {
    const form = document.getElementById("extra-answer-form");
    form.innerHTML = "";
    extraQuestions.forEach(q => {
    form.innerHTML += `<label>${q}</label><input name="${q}" class="form-control my-2" required>`;
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
    const answers = {};
    const formData = new FormData(e.target);
    formData.forEach((v, k) => answers[k] = v);
    const style = document.getElementById("style-choice").value.trim();

    document.getElementById("intro-loading-spinner").classList.remove("d-none");
    const res = await fetch("/generate_intro", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ answers, style, name: userName })
    });
    const data = await res.json();
    document.getElementById("intro-loading-spinner").classList.add("d-none");

    document.getElementById("intro-text").innerText = data.introduction;
    toggleOnly("result");
}

async function generate_question() {
    const suggestedBox = document.getElementById("suggested-question-box");
    const suggestedText = document.getElementById("suggested-question-text");
    const applyBtn = document.getElementById("apply-suggested-btn");
    const regenBtn = document.getElementById("regen-suggested-btn");

    try {
        const res = await fetch("/suggest_question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
        });

        if (!res.ok) throw new Error("サーバーエラー");

        const data = await res.json();
        const suggested = data.question;

        // 一旦表示して判断させる
        suggestedText.textContent = suggested;
        suggestedBox.classList.remove("d-none");

        // ボタンイベント（初回のみ）
        applyBtn.onclick = () => {
            const inputs = document.querySelectorAll("#question-inputs input");
            let filled = false;
            for (const input of inputs) {
                if (!input.value.trim()) {
                    input.value = suggested;
                    filled = true;
                    break;
                }
            }
            if (!filled) {
                questionCount++;
                const div = document.createElement("div");
                div.className = "d-flex align-items-center my-2 question-item";
                div.innerHTML = `
                    <input class="form-control me-2" name="question${questionCount}" required value="${suggested}" placeholder="質問 ${questionCount}">
                    <button type="button" class="btn btn-outline-danger btn-sm remove-question-btn">✕</button>
                `;
                document.getElementById("question-inputs").appendChild(div);
            }
            suggestedBox.classList.add("d-none");
        };

        regenBtn.onclick = () => {
            generate_question(); // 再帰的に再生成
        };
    } catch (err) {
        alert("質問の提案に失敗しました: " + err.message);
    }
}




// ===== コピー機能 =====
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
    fetch("/local_save", {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body: new URLSearchParams({ intro: introText })
    })
    .then(r => r.json())
    .then(data => alert(data.message || "保存しました！"))
    .catch(err => alert("保存に失敗しました: " + err));
    });
}

// ===== リスタート =====
function setupRestartButton() {
    document.getElementById("restart-btn").addEventListener("click", () => {
    // 状態リセット
    questionCount = 1;
    userName = "";
    questions = [];
    document.getElementById("name-input").value = "";
    document.getElementById("question-inputs").innerHTML = `<input class="form-control my-2" name="question1" required placeholder="質問 1">`;
    document.getElementById("answer-form").innerHTML = "";
    document.getElementById("extra-answer-form").innerHTML = "";
    document.getElementById("intro-text").innerText = "";
    document.getElementById("loading-spinner").classList.add("d-none");
    document.getElementById("intro-loading-spinner").classList.add("d-none");
    updateProgress(1);
    toggleOnly("step1");
    });
}