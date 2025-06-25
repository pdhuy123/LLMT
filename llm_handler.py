from llama_cpp import Llama
from glossary_handler import parse_translation_output
import time
import os

llm = None
def get_llm():
    """
    Khởi tạo mô hình LLM với cấu hình tối ưu cho CPU.
    Sử dụng mô hình với định dạng GGUF.
    Trả về:
        Llama: Đối tượng mô hình LLM đã khởi tạo.
    """
    global llm
    if llm is not None:
        return llm

    print("Loading model...")
    llm = Llama(
            model_path="./model/mistral-7b-instruct-v0.2.Q4_K_M.gguf",
            n_threads=6,
            n_batch=256,
            n_ctx=4096,
            seed=42,
            f16_kv=False,       
            logits_all=False,
            verbose=False,
            use_mlock=True    
        )
    return llm

def build_prompt(text, glossary):
    """
    Xây dựng prompt cho mô hình LLM để dịch tiếng Nhật sang tiếng Anh.
    Sử dụng các cặp từ vựng Nhật-Anh trong glossary để ưu tiên dịch thuật ngữ chuyên ngành.
    Tham số:
        text (str): Câu tiếng Nhật cần dịch.
        glossary (list): Danh sách các mục glossary từ file JSON.
    Trả về:
        str: Prompt dạng chuỗi cho mô hình LLM.
    """
    glossary_text = "\n".join([f"{entry['jp']} = {entry['en']}" for entry in glossary])
    return f"""Translate the following Japanese sentence to English.
    Pay attention to numbers in the text, they should be kept as is.
    Use these preferred translations if these terms appear in the text:
    {glossary_text}

    Japanese: {text}

    Then suggest 2-3 very short alternative technical translations.
    Return result in JSON format with two keys only 'translation' and 'alternatives'."""

def translate_with_llm(text, glossary, model):
    """
    Dịch thuật sử dụng mô hình LLM.
    Tham số:
        text (str): Câu tiếng Nhật cần dịch.
        glossary (dict): Từ điển các cặp từ vựng Nhật-Anh liên quan.
    Trả về:
        dict: Kết quả dịch và các phương án thay thế.
    """
    prompt = build_prompt(text, glossary)
    print("Starting translation (stream)...")
    start = time.time()
    output = ""
    for token in model(prompt, max_tokens=256, stream=True, stop=["}"]):
        output += token["choices"][0]["text"]
        if "}" in output:
            break  
    end = time.time()
    if not output.strip().endswith("}"):
        output += "}"
    result = parse_translation_output(output)
    print(result)
    print(f"Translation completed in {end - start:.2f} seconds.")
    return {"result": result}

