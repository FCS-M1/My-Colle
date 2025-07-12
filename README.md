# 構成内容
```{copy=False}
📂 project-root/
┣ーー 📂 .myvenv -------- 仮想環境(後述するコマンドを実行して作成)
┣ーー 📂 static/ 
┃ ┣ー📜 style.css ---------- cssファイル 
┃ ┣ー📜 borad.js ---------- Javascriptファイル(掲示板側) 
┃ ┗ー📜 main.js ---------- JavaScriptファイル(メイン側)
┃
┣ーー📂 templates/
┃ ┣ー 📜 base.html ---------- メイン部分
┃ ┣ー 📜 board.html ---------- メイン部分
┃ ┣ー 📜 create.html ---------- 自己紹介作成部分
┃ ┣ー 📜 login.html ---------- ログイン部分
┃ ┣ー 📜 register.html ---------- 登録部分
┃ ┗ー 📜 index.html ---------- トップページ
┃
┣ーー📜 .env ---------- 環境変数を入れているファイル(要gitignore)
┣ーー📜 .gitignore
┣ーー📜 app.py ----------- バックエンド部分(PythonのFlaskを使用)
┣ーー📜 README.md
┣ーー📜 saved_intros.json ------------- 自己紹介を記録しておくためのjsonファイル(要gitignore)
┣ーー📜 users.json ------------- ユーザのログインIDと暗号化したパスワードを補完しておくためのjsonファイル(要gitignore)
┗ーー📜 requirements.txt----------- pythonのパッケージ管理
```

# 事前準備
### 1. GeminiのAPIキーの取得を済ませておく
### 2. .envファイルに以下を記載
```
GEMINI_API_KEY="（自分のAPIキー）"
```

# pythonの仮想環境の構築
Windows版を想定

myvenvというPythonの仮想環境を構築
```{copy=True}
python -m venv myvenv
```

アクティベーションをする
```{copy=True}
.\myvenv\Scripts\activate
```

パッケージインストール
```{copy=True}
pip install -r requirements.txt
```

立ち上げ
```{copy=True}
python app.py
```

# 動作
