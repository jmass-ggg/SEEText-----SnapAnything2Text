import pytesseract
from PIL import Image

from io import BytesIO

def extract_text(image_bytes:bytes):
    image=Image.open(
        BytesIO(image_bytes)
    )
    image=image.convert("RGB")
    text=pytesseract.image_to_string(
        image
    )
    return text