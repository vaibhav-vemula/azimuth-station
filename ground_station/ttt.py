#!/usr/bin/env python3
"""
AZIMUTH GROUND STATION
LoRa image receiver with sci-fi dashboard.
Receives JPEG packets from ESP32 satellite via Heltec LoRa receiver bridge (USB).

Controls:
    R     — Reset and wait for new image
    ESC/Q — Quit

Usage:
    python3 azimuth_station.py                  # auto-detect USB serial port
    python3 azimuth_station.py /dev/ttyACM0     # specify port manually
"""

import sys
import time
import struct
import io
import os
import random
import glob as glob_mod

import pygame
import serial
from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True

# ---------------------------------------------------------------------------
# Serial configuration
# ---------------------------------------------------------------------------
SERIAL_BAUD = 115200

# Frame protocol constants (must match azimuth_receiver.ino)
SYNC_0 = 0xAA
SYNC_1 = 0x55
FRAME_HEADER_SIZE = 8   # sync(2) + len(2) + rssi(2) + snr(2)
MAX_PAYLOAD = 256


def find_serial_port():
    """Auto-detect the Heltec USB serial port on the Pi."""
    candidates = [
        "/dev/ttyACM0", "/dev/ttyACM1",
        "/dev/ttyUSB0", "/dev/ttyUSB1",
    ]
    for port in candidates:
        if os.path.exists(port):
            return port
    ports = sorted(glob_mod.glob("/dev/ttyACM*")) + sorted(glob_mod.glob("/dev/ttyUSB*"))
    if ports:
        return ports[0]
    return None


def find_sync_marker(buf):
    """Return index of first 0xAA 0x55 sync marker in buffer, or -1."""
    for i in range(len(buf) - 1):
        if buf[i] == SYNC_0 and buf[i + 1] == SYNC_1:
            return i
    return -1


# ---------------------------------------------------------------------------
# Colour palette
# ---------------------------------------------------------------------------
BG = (5, 5, 15)
GRID_DARK = (15, 25, 20)
GRID_LIT = (0, 255, 100)
NEON = (0, 255, 120)
NEON_DIM = (0, 160, 80)
CYAN = (0, 220, 255)
AMBER = (255, 180, 0)
RED = (255, 50, 50)
WHITE = (200, 210, 200)
BORDER = (0, 200, 90)
SCANLINE_ALPHA = 18


# ---------------------------------------------------------------------------
# Helper: draw text with optional glow
# ---------------------------------------------------------------------------
def draw_text(surface, text, font, colour, pos, anchor="topleft"):
    rendered = font.render(text, True, colour)
    rect = rendered.get_rect(**{anchor: pos})
    surface.blit(rendered, rect)
    return rect


def draw_text_glow(surface, text, font, colour, pos, anchor="topleft"):
    glow_colour = (colour[0] // 3, colour[1] // 3, colour[2] // 3)
    glow = font.render(text, True, glow_colour)
    rect = glow.get_rect(**{anchor: pos})
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        surface.blit(glow, rect.move(dx, dy))
    return draw_text(surface, text, font, colour, pos, anchor)


# ---------------------------------------------------------------------------
# Progress grid
# ---------------------------------------------------------------------------
class ProgressGrid:
    def __init__(self, x, y, cols, cell, gap):
        self.x = x
        self.y = y
        self.cols = cols
        self.cell = cell
        self.gap = gap

    def draw(self, surface, received_set, total):
        if total <= 0:
            return
        rows = (total + self.cols - 1) // self.cols
        for idx in range(total):
            r, c = divmod(idx, self.cols)
            cx = self.x + c * (self.cell + self.gap)
            cy = self.y + r * (self.cell + self.gap)
            if idx in received_set:
                colour = GRID_LIT
            else:
                colour = GRID_DARK
            pygame.draw.rect(surface, colour, (cx, cy, self.cell, self.cell))
        w = self.cols * (self.cell + self.gap) - self.gap
        h = rows * (self.cell + self.gap) - self.gap
        pygame.draw.rect(surface, BORDER, (self.x - 2, self.y - 2, w + 4, h + 4), 1)


# ---------------------------------------------------------------------------
# Scanline overlay for CRT look
# ---------------------------------------------------------------------------
def make_scanline_overlay(width, height):
    overlay = pygame.Surface((width, height), pygame.SRCALPHA)
    for y in range(0, height, 3):
        pygame.draw.line(overlay, (0, 0, 0, SCANLINE_ALPHA), (0, y), (width, y))
    return overlay


# ---------------------------------------------------------------------------
# Generate a tiled noise surface (static / no-signal look)
# ---------------------------------------------------------------------------
def make_noise_tile(tw=128, th=128):
    tile = pygame.Surface((tw, th))
    tile.fill((2, 3, 5))
    for _ in range(tw * th // 5):
        nx = random.randint(0, tw - 1)
        ny = random.randint(0, th - 1)
        v = random.randint(6, 28)
        tile.set_at((nx, ny), (v // 2, v, v // 2 + 3))
    return tile


def blit_noise(surface, noise_tile, rect):
    """Tile noise_tile across the given rect area, clipped."""
    tw, th = noise_tile.get_size()
    clip = surface.get_clip()
    surface.set_clip(rect)
    for ty in range(rect.y, rect.y + rect.h, th):
        for tx in range(rect.x, rect.x + rect.w, tw):
            surface.blit(noise_tile, (tx, ty))
    surface.set_clip(clip)


# ---------------------------------------------------------------------------
# Assemble partial image from received chunks
# ---------------------------------------------------------------------------
def assemble_image(chunks, total, target_w, target_h):
    """Stitch contiguous chunks from start, decode JPEG.
    Returns (pygame.Surface or None, fraction_decoded 0.0-1.0)."""
    if not chunks or total <= 0:
        return None, 0.0

    contiguous = 0
    for i in range(total):
        if i in chunks:
            contiguous += 1
        else:
            break

    if contiguous == 0:
        return None, 0.0

    fraction = contiguous / total

    blob = bytearray()
    for i in range(contiguous):
        blob.extend(chunks[i])

    if len(blob) < 4:
        return None, 0.0

    try:
        img = Image.open(io.BytesIO(bytes(blob)))
        img.load()
        img.thumbnail((target_w, target_h), Image.LANCZOS)
        mode = img.mode
        size = img.size
        data = img.tobytes()
        return pygame.image.fromstring(data, size, mode), fraction
    except Exception:
        return None, 0.0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    # ---- Serial init -------------------------------------------------------
    port = None
    if len(sys.argv) > 1:
        port = sys.argv[1]
    else:
        port = find_serial_port()

    if port is None:
        print("[AZIMUTH] ERROR: No USB serial port found.")
        print("[AZIMUTH] Connect the Heltec receiver via USB and try again.")
        print("[AZIMUTH] Or specify: python3 azimuth_station.py /dev/ttyACM0")
        sys.exit(1)

    print(f"[AZIMUTH] Opening serial port: {port}")
    ser = serial.Serial(port, SERIAL_BAUD, timeout=0)
    ser.reset_input_buffer()
    print("[AZIMUTH] Serial online. Waiting for packets...")

    # ---- Pygame init ------------------------------------------------------
    pygame.init()
    info = pygame.display.Info()
    WIDTH, HEIGHT = info.current_w, info.current_h
    screen = pygame.display.set_mode((WIDTH, HEIGHT), pygame.FULLSCREEN)
    pygame.display.set_caption("AZIMUTH GROUND STATION")
    clock = pygame.time.Clock()

    font_lg = pygame.font.SysFont("consolas", 36, bold=True)
    font_md = pygame.font.SysFont("consolas", 22)
    font_sm = pygame.font.SysFont("consolas", 16)
    font_xs = pygame.font.SysFont("consolas", 13)

    scanlines = make_scanline_overlay(WIDTH, HEIGHT)
    noise_tile = make_noise_tile()

    # ---- State ------------------------------------------------------------
    chunks = {}
    total_packets = 0
    last_rssi = None
    last_snr = None
    status = "SEARCHING"
    last_rx_time = 0.0
    image_surface = None
    decode_fraction = 0.0
    image_dirty = False
    frame_count = 0
    rx_buf = bytearray()

    # Layout constants
    MARGIN = 30
    PANEL_W = 380
    IMG_X = MARGIN + PANEL_W + MARGIN
    IMG_Y = 100
    IMG_W = WIDTH - IMG_X - MARGIN
    IMG_H = HEIGHT - IMG_Y - MARGIN

    grid = ProgressGrid(x=MARGIN + 10, y=340, cols=20, cell=8, gap=3)

    running = True
    while running:
        dt = clock.tick(30)
        frame_count += 1
        now = time.time()

        # ---- Events -------------------------------------------------------
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key in (pygame.K_ESCAPE, pygame.K_q):
                    running = False
                elif event.key == pygame.K_r:
                    # ---- RESET ----
                    chunks.clear()
                    total_packets = 0
                    last_rssi = None
                    last_snr = None
                    status = "SEARCHING"
                    image_surface = None
                    decode_fraction = 0.0
                    image_dirty = False
                    rx_buf.clear()
                    ser.reset_input_buffer()
                    # Regenerate noise for visual variety
                    noise_tile = make_noise_tile()
                    print("[AZIMUTH] Reset — ready for new image.")

        # ---- Serial RX (binary frame protocol) ----------------------------
        try:
            waiting = ser.in_waiting
            if waiting > 0:
                rx_buf.extend(ser.read(waiting))

            while len(rx_buf) >= FRAME_HEADER_SIZE:
                idx = find_sync_marker(rx_buf)
                if idx < 0:
                    if len(rx_buf) > 1:
                        del rx_buf[:-1]
                    break
                if idx > 0:
                    del rx_buf[:idx]
                if len(rx_buf) < FRAME_HEADER_SIZE:
                    break

                payload_len = (rx_buf[2] << 8) | rx_buf[3]
                if payload_len == 0 or payload_len > MAX_PAYLOAD:
                    del rx_buf[:2]
                    continue

                total_frame_size = FRAME_HEADER_SIZE + payload_len
                if len(rx_buf) < total_frame_size:
                    break

                frame = bytes(rx_buf[:total_frame_size])
                del rx_buf[:total_frame_size]

                rssi_raw = struct.unpack(">h", frame[4:6])[0]
                snr_raw = struct.unpack(">h", frame[6:8])[0]
                rssi_val = rssi_raw / 10.0
                snr_val = snr_raw / 10.0
                payload = frame[8:]

                if len(payload) >= 4:
                    packet_id = struct.unpack(">H", payload[0:2])[0]
                    total_p = struct.unpack(">H", payload[2:4])[0]
                    jpeg_data = payload[4:]

                    if total_p > 0:
                        total_packets = total_p

                    chunks[packet_id] = jpeg_data
                    last_rx_time = now
                    last_rssi = rssi_val
                    last_snr = snr_val
                    image_dirty = True

                    if len(chunks) >= total_packets and total_packets > 0:
                        status = "COMPLETE"
                    else:
                        status = "RECEIVING"

                    print(f"[RX] Pkt {packet_id+1}/{total_p} "
                          f"({len(jpeg_data)}B) "
                          f"RSSI:{rssi_val:.1f} SNR:{snr_val:.1f}")

        except Exception as e:
            print(f"[RX ERR] {e}")

        # Timeout back to SEARCHING
        if status == "RECEIVING" and now - last_rx_time > 10:
            status = "SEARCHING"

        # ---- Rebuild image on new packet ----------------------------------
        if image_dirty and total_packets > 0:
            surf, frac = assemble_image(chunks, total_packets, IMG_W, IMG_H)
            if surf is not None:
                image_surface = surf
                decode_fraction = frac
            image_dirty = False

        # ---- Draw ---------------------------------------------------------
        screen.fill(BG)

        # Title bar
        draw_text_glow(screen, "AZIMUTH GROUND STATION", font_lg, NEON, (MARGIN, 20))
        draw_text(screen, "SX1262  //  915 MHz  //  LoRa  //  USB BRIDGE", font_sm, NEON_DIM, (MARGIN, 62))
        pygame.draw.line(screen, BORDER, (MARGIN, 90), (WIDTH - MARGIN, 90), 1)

        # ---- Left panel: stats --------------------------------------------
        py = 110
        draw_text(screen, "[ TELEMETRY ]", font_md, CYAN, (MARGIN, py))
        py += 36

        status_colour = {
            "SEARCHING": AMBER,
            "RECEIVING": NEON,
            "COMPLETE": CYAN,
        }.get(status, WHITE)
        draw_text(screen, f"STATUS    {status}", font_md, status_colour, (MARGIN + 10, py))
        py += 30

        rssi_str = f"{last_rssi:.1f} dBm" if last_rssi is not None else "---"
        draw_text(screen, f"RSSI      {rssi_str}", font_md, WHITE, (MARGIN + 10, py))
        py += 30

        snr_str = f"{last_snr:.1f} dB" if last_snr is not None else "---"
        draw_text(screen, f"SNR       {snr_str}", font_md, WHITE, (MARGIN + 10, py))
        py += 30

        pkt_str = f"{len(chunks)} / {total_packets}" if total_packets > 0 else "0 / ?"
        draw_text(screen, f"PACKETS   {pkt_str}", font_md, WHITE, (MARGIN + 10, py))
        py += 30

        pct = (len(chunks) / total_packets * 100) if total_packets > 0 else 0
        draw_text(screen, f"PROGRESS  {pct:.1f}%", font_md, NEON, (MARGIN + 10, py))
        py += 40

        # Progress bar
        bar_x, bar_y, bar_w, bar_h = MARGIN + 10, py, PANEL_W - 20, 18
        pygame.draw.rect(screen, GRID_DARK, (bar_x, bar_y, bar_w, bar_h))
        fill_w = int(bar_w * pct / 100)
        if fill_w > 0:
            pygame.draw.rect(screen, NEON, (bar_x, bar_y, fill_w, bar_h))
        pygame.draw.rect(screen, BORDER, (bar_x, bar_y, bar_w, bar_h), 1)
        py += 40

        # ---- Progress grid ------------------------------------------------
        draw_text(screen, "[ PACKET MAP ]", font_md, CYAN, (MARGIN, py))
        py += 30
        grid.y = py
        max_cols = (PANEL_W - 20) // (grid.cell + grid.gap)
        grid.cols = min(max_cols, max(total_packets, 1))
        grid.draw(screen, set(chunks.keys()), total_packets if total_packets > 0 else 0)

        # ---- Right panel: image preview -----------------------------------
        pygame.draw.rect(screen, BORDER, (IMG_X - 2, IMG_Y - 2, IMG_W + 4, IMG_H + 4), 1)
        pygame.draw.rect(screen, (0, 0, 0), (IMG_X, IMG_Y, IMG_W, IMG_H))

        if image_surface is not None:
            # Draw the decoded image (top portion is real, bottom is PIL gray fill)
            iw, ih = image_surface.get_size()
            ix = IMG_X + (IMG_W - iw) // 2
            iy = IMG_Y + (IMG_H - ih) // 2

            screen.blit(image_surface, (ix, iy))

            # Overlay noise on the undecoded portion
            if decode_fraction < 1.0:
                # Estimate where decoded data ends
                decoded_h = int(ih * decode_fraction)
                noise_top = iy + decoded_h
                noise_bottom = iy + ih
                noise_h = noise_bottom - noise_top

                if noise_h > 0:
                    # Black out the PIL gray-fill region
                    black_rect = pygame.Rect(ix, noise_top, iw, noise_h)
                    pygame.draw.rect(screen, (0, 0, 0), black_rect)

                    # Draw static noise over the missing region
                    blit_noise(screen, noise_tile, black_rect)

                    # Scan line at the boundary (neon glow effect)
                    scan_y = noise_top
                    glow_surf = pygame.Surface((iw, 1), pygame.SRCALPHA)
                    for offset, alpha in [(-3, 10), (-2, 20), (-1, 40),
                                          (0, 255), (1, 40), (2, 20), (3, 10)]:
                        glow_surf.fill((0, 255, 120, alpha))
                        screen.blit(glow_surf, (ix, scan_y + offset))

                    # "NO SIGNAL" text in the noise region
                    if noise_h > 30:
                        msg_y = noise_top + noise_h // 2
                        if (frame_count // 15) % 2 == 0:
                            draw_text(screen, "NO DATA", font_sm, (30, 60, 40),
                                      (ix + iw // 2, msg_y), anchor="center")

        elif status == "RECEIVING" and total_packets > 0:
            # We have packets but can't decode yet (e.g. packet 0 missing)
            # Show full noise with info
            noise_rect = pygame.Rect(IMG_X, IMG_Y, IMG_W, IMG_H)
            blit_noise(screen, noise_tile, noise_rect)
            draw_text(screen, "BUFFERING ...", font_md, AMBER,
                      (IMG_X + IMG_W // 2, IMG_Y + IMG_H // 2), anchor="center")

        elif status == "SEARCHING":
            msg = "AWAITING SIGNAL ..."
            if (frame_count // 20) % 2 == 0:
                draw_text(screen, msg, font_md, AMBER,
                          (IMG_X + IMG_W // 2, IMG_Y + IMG_H // 2), anchor="center")
        else:
            draw_text(screen, "ASSEMBLING IMAGE ...", font_md, NEON,
                      (IMG_X + IMG_W // 2, IMG_Y + IMG_H // 2), anchor="center")

        draw_text(screen, "[ LIVE PREVIEW ]", font_sm, CYAN, (IMG_X, IMG_Y - 20))

        # ---- Decorative footer --------------------------------------------
        ts = time.strftime("%Y-%m-%d  %H:%M:%S", time.localtime())
        draw_text(screen, f"UTC-LOCAL {ts}", font_xs, NEON_DIM, (MARGIN, HEIGHT - 25))
        draw_text(screen, "[R] RESET    [ESC] QUIT", font_xs, (50, 80, 60),
                  (WIDTH // 2, HEIGHT - 25), anchor="center")
        draw_text(screen, "AZIMUTH v2.0", font_xs, NEON_DIM,
                  (WIDTH - MARGIN, HEIGHT - 25), anchor="topright")

        # Scanline CRT overlay
        screen.blit(scanlines, (0, 0))

        pygame.display.flip()

    # ---- Cleanup ----------------------------------------------------------
    ser.close()
    pygame.quit()
    print("[AZIMUTH] Station offline.")


if __name__ == "__main__":
    main()
