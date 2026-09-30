from fastapi import FastAPI,UploadFile,File
from fastapi.middleware.cors import CORSMiddleware
from backend.app.ocr.service import extract_text
from backend.app.layout.service import reconstruct_layout
app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.post("/extract")
async def extract_image(
    image:UploadFile=File(...)
):
    data=await image.read()
    result=extract_text(data)
    structured_text = (
        reconstruct_layout(
            result["tokens"]
        )
    )
    return {
        "filename": image.filename,
        "size": len(data),
        "image text":result["text"],
        "tokens":result["token"],
        
    }