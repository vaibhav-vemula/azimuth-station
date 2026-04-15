#!/usr/bin/env python3
"""
Convert a JPEG file to a C header file for embedding in the
Azimuth ESP32 transmitter sketch.

Usage:
    python3 convert_image.py <input.jpg> [output.h]

Output defaults to image_data.h in the current directory.
Copy the output file into the azimuth_transmitter/ folder.
"""

import sys
import os


def convert(input_path, output_path):
    with open(input_path, "rb") as f:
        data = f.read()

    size = len(data)
    name = os.path.basename(input_path)

    with open(output_path, "w") as f:
        f.write(f"// Auto-generated from {name} ({size} bytes)\n")
        f.write(f"// Chunk count at 251 B/pkt: {(size + 250) // 251} packets\n\n")
        f.write("#ifndef IMAGE_DATA_H\n")
        f.write("#define IMAGE_DATA_H\n\n")
        f.write("#include <Arduino.h>\n\n")
        f.write(f"const uint32_t IMAGE_SIZE = {size};\n\n")
        f.write("const uint8_t IMAGE_DATA[] PROGMEM = {\n")

        for i in range(0, size, 16):
            chunk = data[i : i + 16]
            line = ", ".join(f"0x{b:02X}" for b in chunk)
            comma = "," if i + 16 < size else ""
            f.write(f"  {line}{comma}\n")

        f.write("};\n\n")
        f.write("#endif\n")

    print(f"Converted: {name}")
    print(f"  Size:    {size} bytes")
    print(f"  Packets: {(size + 250) // 251} (at 251 bytes/chunk)")
    print(f"  Output:  {output_path}")
    print()
    print(f"Copy {output_path} into azimuth_transmitter/ and re-upload the sketch.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 convert_image.py <image.jpg> [output.h]")
        sys.exit(1)

    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else "image_data.h"
    convert(src, dst)
