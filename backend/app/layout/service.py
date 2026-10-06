def reconstruct_layout(tokens):

    if not tokens:
        return ""

    lines = {}

    # Group words belonging to the same OCR line
    for token in tokens:

        line_key = (
            token["block_num"],
            token["par_num"],
            token["line_num"]
        )

        if line_key not in lines:
            lines[line_key] = []

        lines[line_key].append(token)

    # Find the left-most text position
    min_x = min(
        token["bbox"]["x"]
        for token in tokens
    )

    reconstructed_lines = []

    for line_tokens in lines.values():

        line_tokens.sort(
            key=lambda token:
                token["bbox"]["x"]
        )

        line_x = (
            line_tokens[0]["bbox"]["x"]
        )

        indent_pixels = (
            line_x - min_x
        )

        indent_spaces = round(
            indent_pixels / 10
        )

        indentation = (
            " " * indent_spaces
        )

        line_text = " ".join(
            token["text"]
            for token in line_tokens
        )

        reconstructed_lines.append(
            indentation + line_text
        )

    return "\n".join(
        reconstructed_lines
    )