import pytesseract
from PIL import Image

from pytesseract import Output
from io import BytesIO

def extract_text(image_bytes:bytes):
    image=Image.open(
        BytesIO(image_bytes)
    )
    image=image.convert("RGB")
    text=pytesseract.image_to_string(
        image
    )
    data=pytesseract.image_to_data(
        image=image,
        output_type=Output.DICT
    )
    tokens=[]
    for i in range(len(data["text"])):
        word=data["text"][i].strip()
        if not word:
            continue
        config=float(data["conf"][i])
        tokens.append(
           {
            "text":word,
            "confidence":config,
            "bbox": {
                "x": data["left"][i],

                "y": data["top"][i],

                "width": data["width"][i],

                "height": data["height"][i]
            }}
        )
    return {
        "text":text,
        "token":tokens
    }