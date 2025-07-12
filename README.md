# 構成内容
```
📂 project-root/
┣ーー 📂 myvenv -------- 仮想環境(後述するコマンドを実行して作成)
┣ーー 📂 static/ 
┃ ┗ー 📜 style.css ---------- cssファイル 
┃ ┗ー 📜 main.js ---------- JavaScriptファイル
┣ーー📂 templates/
┃ ┗ー 📜 index.html ---------- フロント部分
┣ーー📜 .env ---------- 環境変数を入れている(要gitignore)
┣ーー📜 .gitignore
┣ーー📜 app.py ----------- バック部分(PythonのFlaskを使用)
┣ーー📜 README.md
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
