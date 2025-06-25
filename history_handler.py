import json
from datetime import datetime
import os
HISTORY_PATH = "hist/translation_history.json"

def save_translation_history(text, result, source_text):
    """
    Lưu lịch sử dịch thuật vào file JSON.
    Tham số:
        text (str): Câu tiếng Nhật gốc.
        result (dict): Kết quả dịch trả về từ LLM.
        source_text (dict): Glossary đã sử dụng cho lần dịch này.
    """
    history = []
    if os.path.exists(HISTORY_PATH):
        with open(HISTORY_PATH, "r", encoding="utf-8") as f:
            try:
                history = json.load(f)
            except json.JSONDecodeError:
                pass

    history.append({
        "timestamp": datetime.now().isoformat(),
        "jp_text": text,
        "glossary": source_text,
        "result": result['result'],
    })

    with open(HISTORY_PATH, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)
