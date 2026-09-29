from fastapi import FastAPI,UploadFile,File
from fastapi.middleware.cors import CORSMiddleware

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
    return {
        "filename": image.filename,
        "size": len(data),
        "message": "Image received successfully"
    }