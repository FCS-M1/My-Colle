document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("intros-container");
    const loadingMessage = document.getElementById("loading-message");
    // ★ ログイン状態とユーザー情報を取得
    const userInfoDiv = document.getElementById("user-info");
    const IS_LOGGED_IN = userInfoDiv.getAttribute('data-logged-in').toLowerCase() === 'true';

    if (!container || !loadingMessage) return;

    // --- メインの処理 ---
    fetch('/api/intros')
        .then(response => {
            if (!response.ok) throw new Error('ネットワークの応答が正しくありませんでした。');
            return response.json();
        })
        .then(intros => {
            loadingMessage.remove();
            if (intros.length === 0) {
                container.innerHTML = '<p class="text-center">まだ自己紹介がありません。一番乗りになろう！</p>';
                return;
            }
            intros.forEach(intro => {
                const card = createIntroCard(intro);
                container.appendChild(card);
            });
        })
        .catch(error => {
            console.error('自己紹介の読み込みに失敗しました:', error);
            loadingMessage.textContent = '読み込みに失敗しました。ページを再読み込みしてください。';
            loadingMessage.style.color = 'red';
        });

    // --- カード生成関数 ---
    function createIntroCard(intro) {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.dataset.introId = intro.id; // カードにIDを持たせる

        card.innerHTML = `
            <div class="card-header">
                投稿者: ${escapeHTML(intro.author)}
            </div>
            <div class="card-body">
                <h5 class="card-title">${escapeHTML(intro.name)}さんの自己紹介</h5>
                <p class="card-text" style="white-space: pre-wrap;">${escapeHTML(intro.intro)}</p>
            </div>
            <div class="card-footer reaction-footer">
                </div>
        `;

        // リアクション部分を生成してフッターに追加
        const reactionFooter = card.querySelector('.reaction-footer');
        updateReactions(reactionFooter, intro.id, intro.reactions || {});

        return card;
    }

    // --- リアクション部分の更新関数 ---
    function updateReactions(footerElement, introId, reactions) {
        // 使用可能なリアクションの絵文字
        const REACTION_OPTIONS = ['👍', '❤️', '😂', '😮', '😢'];
        
        let reactionsHTML = '<div class="d-flex align-items-center gap-2">';

        REACTION_OPTIONS.forEach(emoji => {
            const userList = reactions[emoji] || [];
            const count = userList.length;
            // ★ ログイン中ユーザーがリアクション済みか判定
            const userHasReacted = IS_LOGGED_IN && userList.includes("{{ current_user.username }}"); // テンプレートエンジンはJSでは使えないので、サーバーから取得した情報を使う
            const buttonClass = userHasReacted ? 'btn-primary' : 'btn-outline-secondary';

            if (IS_LOGGED_IN) {
                 // ログインユーザーにはボタンを表示
                reactionsHTML += `
                    <button class="btn btn-sm reaction-btn ${buttonClass}" data-emoji="${emoji}" data-intro-id="${introId}">
                        ${emoji} <span class="badge bg-light text-dark">${count}</span>
                    </button>
                `;
            } else {
                // 未ログインユーザーにはテキストのみ表示
                 if (count > 0) {
                    reactionsHTML += `<span class="reaction-display">${emoji} ${count}</span>`;
                 }
            }
        });
        reactionsHTML += '</div>';

        footerElement.innerHTML = reactionsHTML;
    }
    
    // --- イベントリスナー（イベント委任） ---
    container.addEventListener('click', function(event) {
        const target = event.target.closest('.reaction-btn');
        if (target) {
            handleReactionClick(target);
        }
    });

    // --- リアクションクリック処理 ---
    async function handleReactionClick(button) {
        const introId = button.dataset.introId;
        const emoji = button.dataset.emoji;

        try {
            const response = await fetch(`/react/${introId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reaction: emoji }),
            });

            if (response.status === 401) { // Unauthorized
                alert("リアクションするにはログインが必要です。");
                window.location.href = "/login";
                return;
            }
            if (!response.ok) {
                throw new Error('リアクションに失敗しました。');
            }

            const result = await response.json();
            
            // 対応するカードのフッターを見つけて更新
            const cardToUpdate = container.querySelector(`.card[data-intro-id="${introId}"]`);
            if (cardToUpdate) {
                const footer = cardToUpdate.querySelector('.reaction-footer');
                // サーバーからの最新のリアクション情報で表示を更新
                updateReactions(footer, introId, result.reactions);
            }

        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }
});

// --- HTMLエスケープ関数 ---
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(match) {
        return {
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[match];
    });
}