import json
import re
    
GLOSSARY_PATH = "data/glossary.json"
def parse_translation_output(raw_output):
    """
    Parse kết quả trả về từ mô hình LLM sang dict.
    Tham số:
        raw_output (str): Chuỗi kết quả trả về từ LLM.
    Trả về:
        dict: Kết quả dịch và các phương án thay thế.
    """
    try:
        json_text = re.search(r"\{.*?\}", raw_output, re.DOTALL).group(0)
        return json.loads(json_text)
    except:
        return {
            "translation": raw_output.strip(),
            "alternatives": []
        }

def load_glossary():
    """
    Đọc file glossary.json và trả về từ điển các cặp từ vựng Nhật-Anh.
    Trả về:
        list: Danh sách các mục glossary từ file JSON.
    """
    with open(GLOSSARY_PATH, "r", encoding="utf-8") as f:
        glossary_list = json.load(f)
    return glossary_list

def extract_relevant_terms(text, glossary):
    """
    Lọc ra các mục glossary có từ vựng xuất hiện trong text.
    Tham số:
        text (str): Câu tiếng Nhật cần dịch.
        glossary (list): Danh sách glossary từ file JSON.
    Trả về:
        list: Danh sách các mục glossary liên quan.
    """
    relevant_terms = []
    for entry in glossary:
        if entry["jp"] in text:
            relevant_terms.append(entry)
    return relevant_terms
