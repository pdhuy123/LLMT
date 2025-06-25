let lastInput = '';
let lastOutput = '';
let lastAlternatives = [];
let lastSource = ''; // Thêm biến lưu trữ source

// OCR
const ocrFile = document.getElementById('ocrFile');
ocrFile.addEventListener('change', async function() {
    if (this.files.length === 0) return;
    const formData = new FormData();
    formData.append('file', this.files[0]);
    const res = await fetch('/api/ocr', { method: 'POST', body: formData });
    const data = await res.json();
    document.getElementById('inputText').value = data.text;
    this.value = '';
});

// Paste image to textarea (Ctrl+V)
document.getElementById('inputText').addEventListener('paste', async function(e) {
    if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
            const item = e.clipboardData.items[i];
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                const formData = new FormData();
                formData.append('file', file);
                const res = await fetch('/api/ocr', { method: 'POST', body: formData });
                const data = await res.json();
                document.getElementById('inputText').value = data.text;
                e.preventDefault();
                break;
            }
        }
    }
});

// Translate
async function translateText() {
    const translateBtn = document.querySelector('.btn-translate');
    const originalBtnText = translateBtn.textContent;
    translateBtn.textContent = 'Translating...';
    translateBtn.disabled = true;
    try {
        const text = document.getElementById('inputText').value.trim();
        if (!text) {
            document.getElementById('outputText').textContent = '';
            document.getElementById('altList').innerHTML = '';
            document.getElementById('editTranslation').value = '';
            document.getElementById('sourceText').textContent = '';
            translateBtn.textContent = originalBtnText;
            translateBtn.disabled = false;
            return;
        }
        const formData = new FormData();
        formData.append('text', text);
        const res = await fetch('/api/translate', { method: 'POST', body: formData });
        const data = await res.json();
        lastInput = text;
        lastOutput = data.result.translation.toUpperCase();
        lastAlternatives = data.result.alternatives;

        const glossaryRes = await fetch('/api/glossary');
        const glossary = await glossaryRes.json();
        const matchedEntry = glossary.find(entry => text.includes(entry.jp));
        lastSource = matchedEntry ? matchedEntry.src : '';
        document.getElementById('outputText').textContent = lastOutput;
        document.getElementById('editTranslation').value = lastOutput;
        document.getElementById('sourceText').textContent = `Source: ${lastSource}`;
        document.getElementById('editStatus').style.display = 'none';

        const altList = document.getElementById('altList');
        altList.innerHTML = '';
        lastAlternatives.forEach(alt => {
            const btn = document.createElement('button');
            btn.className = 'alt-btn';
            btn.innerHTML = `<span style="text-transform:uppercase;">${alt.toUpperCase()}</span>`;
            btn.onclick = () => {
                document.getElementById('outputText').textContent = alt.toUpperCase();
                document.getElementById('editTranslation').value = alt.toUpperCase();
                document.getElementById('editStatus').style.display = 'none';
            };
            altList.appendChild(btn);
        });
    } finally {
        translateBtn.textContent = originalBtnText;
        translateBtn.disabled = false;
    }
}

// Add glossary
const glossaryFile = document.getElementById('glossaryFile');
glossaryFile.addEventListener('change', async function() {
    if (this.files.length === 0) return;
    const file = this.files[0];
    if (file.name.endsWith('.txt')) {
        const text = await file.text();
        const formData = new FormData();
        formData.append('data', text);
        await fetch('/api/add_glossary_txt', { method: 'POST', body: formData });
        showToast('Glossary updated!');
    } else if (file.name.endsWith('.xlsx')) {
        const formData = new FormData();
        formData.append('file', file);
        await fetch('/api/add_glossary_xlsx', { method: 'POST', body: formData });
        showToast('Glossary updated!');
    }
    this.value = '';
});

// Cập nhật hàm addCurrentPairToGlossary để thêm source
async function addCurrentPairToGlossary() {
    const jp = document.getElementById('inputText').value.trim();
    const en = document.getElementById('outputText').textContent.trim();
    const source = lastSource || ''; // Sử dụng source nếu có, nếu không thì để trống
    if (jp && en) {
        const formData = new FormData();
        formData.append('data', `${jp}:${en}:${source}`);
        await fetch('/api/add_glossary_txt', { method: 'POST', body: formData });
        showToast('Đã thêm vào từ điển!');
    } else {
        showToast('Vui lòng nhập cả văn bản gốc và bản dịch!');
    }
}

function showToast(msg) {
    let toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.position = 'fixed';
    toast.style.bottom = '32px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = '#1967d2';
    toast.style.color = '#fff';
    toast.style.padding = '14px 32px';
    toast.style.borderRadius = '8px';
    toast.style.fontSize = '18px';
    toast.style.zIndex = 9999;
    toast.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 2000);
}

const imgInput = document.getElementById('imgInput');
const imgPreview = document.getElementById('imgPreview');
const ocrResult = document.getElementById('ocrResult');
const inputText = document.getElementById('inputText');

imgInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imgPreview.src = e.target.result;
            imgPreview.style.display = 'block';
            ocrResult.textContent = '';
        };
        reader.readAsDataURL(file);
    }
});

function dataURLtoFile(dataurl, filename) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

// Hàm vẽ lại ảnh đã xoay lên canvas và gửi lên backend để OCR (KHÔNG lưu ảnh về máy)
async function autoExtractText() {
    ocrResult.textContent = 'Đang nhận diện...';
    const angle = parseInt(rotateAngle.value) || 0;
    if (!imgPreview.src || imgPreview.style.display === 'none') {
        ocrResult.textContent = '(Chưa có ảnh)';
        return;
    }
    // Tạo canvas, vẽ lại ảnh đã xoay
    const img = imgPreview;
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    // Tạo ảnh tạm để lấy kích thước gốc
    const tempImg = new window.Image();
    tempImg.src = img.src;
    await new Promise(r => { tempImg.onload = r; });
    const w = tempImg.naturalWidth;
    const h = tempImg.naturalHeight;
    // Tính toán kích thước canvas mới sau khi xoay
    const rad = angle * Math.PI / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const newW = Math.round(w * cos + h * sin);
    const newH = Math.round(w * sin + h * cos);
    tempCanvas.width = newW;
    tempCanvas.height = newH;
    // Dịch tâm, xoay, vẽ lại ảnh
    ctx.translate(newW/2, newH/2);
    ctx.rotate(rad);
    ctx.drawImage(tempImg, -w/2, -h/2);
    // Lấy blob từ canvas và gửi trực tiếp lên backend (KHÔNG lưu về máy)
    tempCanvas.toBlob(async function(blob) {
        const formData = new FormData();
        formData.append('file', blob, 'rotated.png');
        const res = await fetch('/api/ocr', { method: 'POST', body: formData });
        const data = await res.json();
        ocrResult.textContent = data.text || '(Không nhận diện được text)';
        if (data.text) inputText.value = data.text;
    }, 'image/png');
}

const rotateSlider = document.getElementById('rotateSlider');
const rotateAngle = document.getElementById('rotateAngle');
rotateSlider.addEventListener('input', function() {
    rotateAngle.value = this.value;
    imgPreview.style.transform = `rotate(${this.value}deg)`;
});
rotateAngle.addEventListener('input', function() {
    let v = parseInt(this.value) || 0;
    if (v < 0) v = 0; if (v > 359) v = 359;
    this.value = v;
    rotateSlider.value = v;
    imgPreview.style.transform = `rotate(${v}deg)`;
});

imgPreview.addEventListener('load', function() {
    rotateSlider.value = 0;
    rotateAngle.value = 0;
    imgPreview.style.transform = 'rotate(0deg)';
});

// Cho phép sửa và lưu lại phần dịch
function saveEditedTranslation() {
    const val = document.getElementById('editTranslation').value.trim();
    document.getElementById('outputText').textContent = val;
    document.getElementById('editStatus').style.display = 'inline';
    setTimeout(() => {
        document.getElementById('editStatus').style.display = 'none';
    }, 1200);
}
