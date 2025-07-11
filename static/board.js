document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("intros-container");
    const loadingMessage = document.getElementById("loading-message");

    // サーバーに自己紹介データを問い合わせる
    fetch('/api/intros')
        .then(response => {
            if (!response.ok) {
                throw new Error('ネットワークの応答が正しくありませんでした。');
            }
            return response.json();
        })
        .then(intros => {
            // ローディングメッセージを削除
            loadingMessage.remove();

            // データが1件もなければメッセージ表示
            if (intros.length === 0) {
                container.innerHTML = '<p class="text-center">まだ自己紹介がありません。一番乗りになろう！</p>';
                return;
            }

            // 受け取ったデータからカードを作成してページに追加
            intros.forEach(intro => {
                const card = document.createElement('div');
                card.className = 'card mb-3'; // Bootstrapの基本的なカードスタイル
                
                card.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">${escapeHTML(intro.name)}さんの自己紹介</h5>
                        <p class="card-text" style="white-space: pre-wrap;">${escapeHTML(intro.intro)}</p>
                    </div>
                `;
                container.appendChild(card);
            });
        })
        .catch(error => {
            console.error('自己紹介の読み込みに失敗しました:', error);
            loadingMessage.textContent = '読み込みに失敗しました。ページを再読み込みしてください。';
            loadingMessage.style.color = 'red';
        });
});

/**
 * クロスサイトスクリプティング(XSS)対策としてHTMLエスケープを行う関数
 * @param {string} str エスケープする文字列
 * @returns {string} エスケープされた安全な文字列
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(match) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match];
    });
}