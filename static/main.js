// ===== グローバル変数 =====
const TOTAL_STEPS = 4;
let currentStep = 1;
let questionCount = 1;
let userName = "";
let questions = [];

// ===== DOMContentLoaded =====
document.addEventListener("DOMContentLoaded", () => {
    // create.htmlにはstart-pageがないので、存在チェックを追加
    const startPage = document.getElementById("start-page");
    const mainContent = document.getElementById("main-content");

    if (startPage) { // index.htmlの場合
        startPage.classList.remove("hidden");
        if (mainContent) {
            mainContent.classList.add("hidden");
        }
        setupStartButton(); // start-btnはindex.htmlにしかない
    } else if (mainContent) { // create.htmlの場合
        // main-contentは最初から表示されている想定
        updateProgress(1);
        toggleOnly("step1");
    }

    // 共通のイベントリスナー
    // mainContentが存在する場合のみセットアップ
    if (mainContent) {
        setupNameForm();
        setupSlider();
        setupInitialQuestionForm();
        setupCopyButton();
        setupRestartButton();
        setupSaveButton();
    }
});


// ===== ユーティリティ =====
function updateProgress(step) {
    const bar = document.getElementById("progress-bar");
    const label = document.getElementById("step-label");
    if (!bar || !label) return;
    const percent = (step / TOTAL_STEPS) * 100;
    bar.style.width = `${percent}%`;
    label.textContent = `ステップ ${step} / ${TOTAL_STEPS}`;
    currentStep = step;
}

function toggleOnly(showId) {
    const ids = ["step1", "step2", "step3", "step4", "result", "loading-spinner", "intro-loading-spinner"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        // d-noneクラスで表示を制御する
        if (id === showId) {
            el.classList.remove("hidden", "d-none");
        } else {
            el.classList.add("hidden", "d-none");
        }
    });
    // showIdがnullでない場合、親のmain-contentを表示
    if (showId) {
        document.getElementById('main-content')?.classList.remove('hidden', 'd-none');
    }
}


// ===== スタートボタンの処理 =====
function setupStartButton() {
    const startBtn = document.getElementById("start-btn");
    // create.htmlにはstart-btnがないので存在チェック
    if(startBtn) {
      startBtn.addEventListener("click", () => {
          document.getElementById("start-page").classList.add("hidden");
          document.getElementById("main-content").classList.remove("hidden");
          updateProgress(1);
          toggleOnly("step1");
      });
    }
}

// ===== ステップ1: 名前入力 =====
function setupNameForm() {
    const nameForm = document.getElementById("name-form");
    if (!nameForm) return;
    nameForm.addEventListener("submit", e => {
        e.preventDefault();
        userName = document.getElementById("name-input").value.trim();
        if (!userName) return;
        updateProgress(2);
        toggleOnly("step2");
    });
}


// ===== ステップ2: 質問入力 =====
function setupInitialQuestionForm() {
    const form = document.getElementById("initial-question-form");
    if (!form) return;

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

    form.addEventListener("submit", (e) => {
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
    if (!form) return;
    form.innerHTML = "";
    questions.forEach(q => {
        form.innerHTML += `<label class="form-label">${q}</label><input name="${q}" class="form-control my-2" required>`;
    });
    form.innerHTML += `<button class="btn btn-success mt-3">次へ</button>`;
    form.addEventListener("submit", handleAnswerSubmit);
}

async function handleAnswerSubmit(e) {
    e.preventDefault();
    const answers = Object.fromEntries(new FormData(e.target));
    const extraCount = parseInt(document.getElementById("extra-count").value);

    // スピナー表示
    toggleOnly("loading-spinner");

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
    }
}

// ===== ステップ4: 追加回答 & スタイル =====
function buildExtraAnswerForm(extraQuestions) {
    const form = document.getElementById("extra-answer-form");
    if (!form) return;
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
    const answerForm = document.getElementById("answer-form");
    if (!answerForm) return;

    let allAnswers = Object.fromEntries(new FormData(answerForm));
    const extraAnswers = Object.fromEntries(new FormData(e.target));
    Object.assign(allAnswers, extraAnswers);

    const style = document.getElementById("style-choice").value.trim();

    // スピナー表示
    toggleOnly("intro-loading-spinner");

    try {
        const res = await fetch("/generate_intro", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ answers: allAnswers, style, name: userName })
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        const introTextEl = document.getElementById("intro-text");
        if (introTextEl) {
          introTextEl.innerText = data.introduction;
        }
        toggleOnly("result");
    } catch (err) {
        alert("自己紹介の生成に失敗しました。");
        toggleOnly("step4");
    }
}


// ===== その他機能 =====
async function generate_question() {
    const suggestedBox = document.getElementById("suggested-question-box");
    const suggestedText = document.getElementById("suggested-question-text");
    const applyBtn = document.getElementById("apply-suggested-btn");
    const regenBtn = document.getElementById("regen-suggested-btn");

    if (!suggestedBox || !suggestedText || !applyBtn || !regenBtn) return;

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
                document.getElementById("add-question-btn")?.click();
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
    const copyBtn = document.getElementById("copy-btn");
    if (!copyBtn) return;
    copyBtn.addEventListener("click", () => {
        const text = document.getElementById("intro-text")?.innerText;
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            const original = copyBtn.innerText;
            copyBtn.innerText = "コピーしました！";
            copyBtn.disabled = true;
            setTimeout(() => {
                copyBtn.innerText = original;
                copyBtn.disabled = false;
            }, 1500);
        }).catch(() => alert("コピーに失敗しました。"));
    });
}

// ===== 保存機能 =====
function setupSaveButton() {
    const saveBtn = document.getElementById("save-btn");
    if (!saveBtn) return;
    saveBtn.addEventListener("click", () => {
        const introText = document.getElementById("intro-text")?.innerText;
        if (!introText) return;

        // 【修正点】自己紹介文(intro)と、自己紹介文中の名前(name)を送信する
        // 投稿者名はサーバー側で自動的に付与される
        const saveData = new URLSearchParams({
            intro: introText,
            name: userName // ステップ1で入力された「自己紹介文中の」名前
        });

        fetch("/local_save", {
            method: "POST",
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            body: saveData
        })
        .then(r => {
            if (!r.ok) {
                // ログインしていない場合などはここでエラーになる
                if (r.status === 401) { // Unauthorized
                    alert("保存するにはログインが必要です。");
                    window.location.href = "/login";
                }
                throw new Error(`Server responded with status ${r.status}`);
            }
            return r.json();
        })
        .then(data => {
            if (data.status === "success") {
                alert(data.message);
                // 保存成功したら掲示板ページに飛ばす
                window.location.href = "/board";
            } else {
                alert("保存に失敗しました: " + data.message);
            }
        })
        .catch(err => {
            console.error("保存処理中にエラーが発生しました: ", err);
        });
    });
}

function setupRestartButton() {
    const restartBtn = document.getElementById("restart-btn");
    if (!restartBtn) return;
    restartBtn.addEventListener("click", () => {
        // 最初からやり直すので、作成ページにリロード
        window.location.href = "/create";
    });
}