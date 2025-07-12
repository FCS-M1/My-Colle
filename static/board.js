document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("intros-container");
    const loadingMessage = document.getElementById("loading-message");
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
        card.dataset.introId = intro.id;

        const commentFormHTML = IS_LOGGED_IN ? `
            <form class="comment-form mt-2">
                <div class="input-group">
                    <input type="text" class="form-control form-control-sm" placeholder="リプライを追加..." required>
                    <button class="btn btn-outline-primary btn-sm" type="submit">送信</button>
                </div>
            </form>
        ` : '';
        
        //  BootstrapのCollapseを制御するためのユニークなIDを生成
        const collapseId = `comments-collapse-${intro.id}`;

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
            <div class="card-footer comments-footer">
                <button class="btn btn-link btn-sm p-0 text-decoration-none" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                    コメント (<span class="comments-count">${intro.comments ? intro.comments.length : 0}</span>)
                </button>
                <div class="collapse mt-2" id="${collapseId}">
                    <div class="comments-container">
                    </div>
                </div>
                ${commentFormHTML}
            </div>
        `;

        const reactionFooter = card.querySelector('.reaction-footer');
        updateReactions(reactionFooter, intro.id, intro.reactions || {});
        
        const commentsContainer = card.querySelector('.comments-container');
        renderComments(commentsContainer, intro.comments || []);
        
        return card;
    }
    
    // --- リプライ表示を更新する関数 ---
    function renderComments(container, comments) {
        container.innerHTML = '';
        if (comments.length === 0) {
            container.innerHTML = '<p class="text-muted small mb-0">まだリプライはありません。</p>';
            return;
        }

        const list = document.createElement('div');
        list.className = 'list-group list-group-flush';
        
        comments.slice().reverse().forEach(comment => {
            const item = document.createElement('div');
            item.className = 'list-group-item px-0 py-1';
            item.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <p class="mb-1 comment-text">${escapeHTML(comment.text)}</p>
                </div>
                <small class="text-muted">by ${escapeHTML(comment.author)}</small>
            `;
            list.appendChild(item);
        });

        container.appendChild(list);
    }

    // --- リアクション部分の更新関数 ---
    function updateReactions(footerElement, introId, reactions) {
        const REACTION_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '😍'];
      
        let reactionsHTML = '<div class="d-flex align-items-center gap-2">';

        REACTION_OPTIONS.forEach(emoji => {
            const userList = reactions[emoji] || [];
            const count = userList.length;
            const userHasReacted = IS_LOGGED_IN && userList.includes("{{ current_user.username }}");
            const buttonClass = userHasReacted ? 'btn-primary' : 'btn-outline-secondary';

            if (IS_LOGGED_IN) {
                reactionsHTML += `
                    <button class="btn btn-sm reaction-btn ${buttonClass}" data-emoji="${emoji}" data-intro-id="${introId}">
                        ${emoji} <span class="badge bg-light text-dark">${count}</span>
                    </button>
                `;
            } else {
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

    container.addEventListener('submit', function(event) {
        const form = event.target.closest('.comment-form');
        if (form) {
            event.preventDefault();
            handleCommentSubmit(form);
        }
    });

    // --- リアクションクリック処理 ---
    async function handleReactionClick(button) {
        const introId = button.dataset.introId;
        const emoji = button.dataset.emoji;

        try {
            const response = await fetch(`/react/${introId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reaction: emoji }),
            });

            if (response.status === 401) {
                alert("リアクションするにはログインが必要です。");
                window.location.href = "/login";
                return;
            }
            if (!response.ok) throw new Error('リアクションに失敗しました。');

            const result = await response.json();
            
            const cardToUpdate = container.querySelector(`.card[data-intro-id="${introId}"]`);
            if (cardToUpdate) {
                const footer = cardToUpdate.querySelector('.reaction-footer');
                updateReactions(footer, introId, result.reactions);
            }

        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }

    // --- リプライ送信処理 ---
    async function handleCommentSubmit(form) {
        const introId = form.closest('.card').dataset.introId;
        const input = form.querySelector('input[type="text"]');
        const commentText = input.value.trim();
        const submitButton = form.querySelector('button[type="submit"]');

        if (!commentText) return;

        // 🔒 ボタンを無効化（送信中）
        submitButton.disabled = true;

        try {
            const response = await fetch(`/comment/${introId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: commentText }),
            });

            if (response.status === 401) {
                alert("リプライするにはログインが必要です。");
                window.location.href = "/login";
                return;
            }
            if (!response.ok) throw new Error('リプライの投稿に失敗しました。');

            const result = await response.json();

            const cardToUpdate = container.querySelector(`.card[data-intro-id="${introId}"]`);
            if (cardToUpdate) {
                const commentsContainer = cardToUpdate.querySelector('.comments-container');
                const commentsCountSpan = cardToUpdate.querySelector('.comments-count');

                renderComments(commentsContainer, result.comments);
                commentsCountSpan.textContent = result.comments.length;
                input.value = '';

                // コメント欄を開く
                const collapseElement = cardToUpdate.querySelector('.collapse');
                if (collapseElement && !collapseElement.classList.contains('show')) {
                    const bsCollapse = new bootstrap.Collapse(collapseElement);
                    bsCollapse.show();
                }
            }
        } catch (error) {
            console.error(error);
            alert(error.message);
        } finally {
            setTimeout(() => {
                submitButton.disabled = false;
            }, 1000 * 60);
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