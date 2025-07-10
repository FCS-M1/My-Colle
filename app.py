from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
import os
from dotenv import load_dotenv
import json
import uuid

load_dotenv()

app = Flask(__name__)
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

SAVE_FILE = "saved_intros.json"

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/suggest_question", methods=["POST"])
def suggest_question():
    prompt = "自己紹介でよく使われる面白い質問を1つだけ、日本語で提案してください。\n"
    prompt += "質問は数字または単語で答えられるようなものにしてください。\n"
    prompt += "その際に「了解」などの前置き・後書き・説明は一切不要です。\n"
    prompt += "出力は質問文のみ、余計なものは書かないでください。\n"

    response = model.generate_content(prompt)
    question = response.text.strip()

    cleaned = question.strip(" 1234567890.（）[]・-").strip()
    return jsonify({"question": cleaned})


@app.route("/generate_extra_questions", methods=["POST"])
def generate_extra():
    data = request.json
    answers = data.get("answers", {})
    count = max(2, int(data.get("extra_count", 3)))

    prompt = f"以下の質問と回答を元に、さらに深く知るための追加質問を{count}つ, 日本語で生成してください。\n"
    prompt += "その際に「了解」等の返答や補足や説明は一切不要で、追加質問文のみを出力すること。\n"
    for q, a in answers.items():
        prompt += f"Q: {q}\nA: {a}\n"
    prompt += "\n追加質問:"

    response = model.generate_content(prompt)
    extra_questions = [line.strip(" 1234567890.").strip() for line in response.text.strip().splitlines() if line.strip()]
    return jsonify({"extra_questions": extra_questions})

@app.route("/generate_intro", methods=["POST"])
def generate_intro():
    data = request.json
    answers = data.get("answers", {})
    style = data.get("style", "").strip()
    name = data.get("name", "名無し")

    if style:
        prompt = f"以下の質問と回答をもとに、{style} 自己紹介文を日本語で作成してください。"
    else:
        prompt = "以下の質問と回答をもとに、ユニークで魅力的な自己紹介文を日本語で作成してください。"

    prompt += f"対象の名前は{name}です\n"
    prompt += "出力に「了解」等の返答や補足や説明は一切不要で, 300字以内の自己紹介文章のみを出力すること。\n"
    for q, a in answers.items():
        prompt += f"Q: {q}\nA: {a}\n"
    prompt += "\n自己紹介文:"

    response = model.generate_content(prompt)
    return jsonify({"introduction": response.text.strip()})

@app.route("/local_save", methods=["POST"])
def local_save():
    name = request.form.get("name")
    intro_text = request.form.get("intro")

    if not intro_text or not name:
        return jsonify({"status": "error", "message": "データが不足しています"}), 400

    new_entry = {
        "id": str(uuid.uuid4()),
        "name": name,
        "intro": intro_text
    }

    try:
        try:
            with open(SAVE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            data = []
        
        data.insert(0, new_entry)

        with open(SAVE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)

        return jsonify({"status": "success", "message": "自己紹介を保存しました"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)