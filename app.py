from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/generate_extra_questions", methods=["POST"])
def generate_extra():
    answers = request.json.get("answers", {})
    prompt = "以下の質問と回答を元に、さらに深く知るための追加質問を3つ日本語で生成してください。その際に「了解」等の返答や補足や説明は一切不要で, 追加質問文のみを出力すること。\n"
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

    if style:
        prompt = f"以下の質問と回答をもとに、{style} 自己紹介文を日本語で作成してください。"
    else:
        prompt = "以下の質問と回答をもとに、ユニークで魅力的な自己紹介文を日本語で作成してください。"

    prompt += "その際に「了解」等の返答や補足や説明は一切不要で, 自己紹介文章のみを出力すること。\n"
    for q, a in answers.items():
        prompt += f"Q: {q}\nA: {a}\n"

    prompt += "\n自己紹介文:"
    response = model.generate_content(prompt)
    return jsonify({"introduction": response.text.strip()})

if __name__ == "__main__":
    app.run(debug=True)
