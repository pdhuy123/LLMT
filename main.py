from fastapi import FastAPI, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from llm_handler import translate_with_llm, get_llm
from glossary_handler import load_glossary, extract_relevant_terms
from history_handler import save_translation_history
from data import add_to_json_file, add_xlsx_to_json
import easyocr
import numpy as np
import cv2
from PIL import Image
import io
import os
import uvicorn
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")
model = get_llm()
reader = easyocr.Reader(['ja', 'en'], gpu=False)

@app.post("/api/ocr")
def ocr_image(file: UploadFile = File(...)):
    contents = file.file.read()
    np_array = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
    h, w = img.shape[:2]
    if h > w:
        img = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
    result = reader.readtext(img, detail=0)
    return {"text": "\n".join(result)}

@app.post("/api/translate")
def translate(text: str = Form(...)):
    glossary = load_glossary()
    relevant_glossary = extract_relevant_terms(text, glossary)
    result = translate_with_llm(text, relevant_glossary, model)
    save_translation_history(text, result, relevant_glossary)
    return result  

@app.post("/api/add_glossary_txt")
def add_glossary_txt(data: str = Form(...)):
    """
    API thêm hoặc cập nhật các cặp từ vựng Nhật-Anh vào file JSON glossary.
    """
    file_path = './data/glossary.json'
    try:
        add_to_json_file(file_path, data)
        return {"status": "ok"}
    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)

@app.post("/api/add_glossary_xlsx")
def add_glossary_xlsx(file: UploadFile = File(...)):
    """
    API thêm hoặc cập nhật các cặp từ vựng từ file Excel vào file JSON glossary.
    """
    file_path = './data/glossary.json'
    temp_path = f"temp_{file.filename}"
    try:
        with open(temp_path, "wb") as f:
            f.write(file.file.read())
        add_xlsx_to_json(file_path, temp_path)
        os.remove(temp_path)
        return {"status": "ok"}
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)

@app.get("/api/glossary")
def get_glossary():
    """
    API trả về danh sách glossary từ file JSON.
    """
    try:
        glossary = load_glossary()
        return glossary
    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)

@app.get("/")
def root():
    return FileResponse("static/index.html")

if __name__ == "__main__":
    """
    Chạy server FastAPI ở chế độ reload cho phát triển.
    """
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
