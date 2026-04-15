# Azimuth Satellite Transmitter — ESP32 Setup Guide

## Heltec WiFi LoRa 32 V4 (ESP32-S3 + SX1262)

---

## IMPORTANT: Compatibility Warning

Your two devices talk to the SX1262 in fundamentally different ways:

| | Raspberry Pi (Waveshare HAT) | ESP32 (Heltec V4) |
|---|---|---|
| **Interface** | UART (serial) | SPI (direct) |
| **Driver** | Waveshare `sx126x.py` talks to an embedded E22 module MCU | RadioLib talks directly to the SX1262 chip |
| **Protocol** | E22 proprietary framing | Raw LoRa PHY |

They **CAN** communicate, but only if the RadioLib parameters on the ESP32 **exactly match** the E22 module's internal LoRa settings on the Waveshare HAT. This guide configures both sides to match.

---

## STEP 1: What You Need

| Item | Notes |
|---|---|
| Heltec WiFi LoRa 32 V4 | ESP32-S3 + SX1262, with onboard OLED |
| USB-C cable | For programming and power |
| Antenna (915 MHz) | **MUST be attached before transmitting** |
| A computer | With Arduino IDE installed |
| A small JPEG image | 5-15 KB recommended for fast transmission |

---

## STEP 2: Understand the Heltec V4 Pinout (Internal)

The SX1262 is wired to the ESP32-S3 internally — you don't connect anything. For reference:

| SX1262 Pin | ESP32-S3 GPIO |
|---|---|
| NSS (CS) | GPIO 8 |
| SCK | GPIO 9 |
| MOSI | GPIO 10 |
| MISO | GPIO 11 |
| RST | GPIO 12 |
| BUSY | GPIO 13 |
| DIO1 | GPIO 14 |

| OLED Display | ESP32-S3 GPIO |
|---|---|
| SDA | GPIO 17 |
| SCL | GPIO 18 |
| RST | GPIO 21 |

| Button | GPIO |
|---|---|
| PRG (User Button) | GPIO 0 |

The `heltec_unofficial` library handles all of this automatically.

---

## STEP 3: Install Arduino IDE + Board Support

### 3a. Install Arduino IDE

Download from [arduino.cc](https://www.arduino.cc/en/software) if you haven't already.

### 3b. Add Heltec Board Manager URL

1. Open Arduino IDE
2. Go to **File → Preferences**
3. In **Additional Boards Manager URLs**, add:

```
https://resource.heltec.cn/download/package_heltec_esp32_index.json
```

4. Click **OK**

### 3c. Install the Heltec ESP32 Board Package

1. Go to **Tools → Board → Boards Manager**
2. Search for **"Heltec ESP32"**
3. Install **"Heltec ESP32 Series Dev-boards"** (latest version)

### 3d. Install the Unofficial Heltec Library (includes RadioLib)

1. Go to **Sketch → Include Library → Manage Libraries**
2. Search for **"heltec esp32 lora v3"**
3. Install **"Heltec ESP32 LoRa v3"** by **ropg** (works for V3 and V4)
4. When prompted, also install the **RadioLib** dependency

### 3e. Select Your Board

1. Go to **Tools → Board → Heltec ESP32 Series Dev-boards**
2. Select **"WiFi LoRa 32 (V3)"** (also works for V4 — same pinout)
3. Set **Tools → USB CDC On Boot → Enabled**
4. Set **Tools → Upload Speed → 921600**

---

## STEP 4: Convert Your Image to a C Header

The JPEG will be embedded directly in the ESP32's flash memory.

On your computer (not the Pi), save this Python script and run it:

```bash
cd ~/Desktop/azimuth
python3 convert_image.py your_photo.jpg
```

This generates `image_data.h` — copy it into the `azimuth_transmitter/` folder next to the `.ino` file.

> **Image size tip:** Keep it under 15 KB. A 10 KB JPEG at 196 bytes/chunk = ~51 packets. At ~1.2 seconds per packet, that's about 1 minute of transmission.

---

## STEP 5: Upload the Sketch

1. Connect the Heltec V4 via USB-C
2. Open `azimuth_transmitter/azimuth_transmitter.ino` in Arduino IDE
3. Make sure `image_data.h` is in the same folder
4. Click **Upload**
5. Open **Serial Monitor** (115200 baud) to see debug output

---

## STEP 6: Transmit

1. **Attach the antenna** to the Heltec board
2. After upload, the OLED shows **"AZIMUTH TX — READY"**
3. **Press the PRG button** (GPIO 0) to start transmitting
4. The OLED shows packet progress in real-time
5. On the Pi, run `python3 azimuth_station.py` — you should see packets arrive
6. **Press PRG again** to retransmit (for filling gaps)

---

## STEP 7: LoRa Parameter Matching (The Critical Part)

For the two devices to communicate, these parameters must be identical:

| Parameter | ESP32 (RadioLib) | Waveshare HAT (E22 default) |
|---|---|---|
| **Frequency** | 915.0 MHz | 915 MHz (`freq=915`) |
| **Bandwidth** | 125.0 kHz | 125 kHz (at 2.4kbps air rate) |
| **Spreading Factor** | 9 | 9 (at 2.4kbps air rate) |
| **Coding Rate** | 4/5 | 4/5 |
| **Sync Word** | 0x12 | 0x12 (private LoRa) |
| **Preamble** | 12 symbols | 12 symbols |
| **TX Power** | 22 dBm | 22 dBm |

These are set in `azimuth_transmitter.ino` as `#define` constants. If reception doesn't work, see the Troubleshooting section below.

---

## How the Data Flows

```
ESP32 (RadioLib)                    Raspberry Pi (Waveshare HAT)
================                    ============================

1. Build packet:
   [PKT_ID][TOTAL][JPEG_DATA]

2. radio.transmit(buffer)
   → SX1262 modulates LoRa      →  E22 module demodulates LoRa
   → 915 MHz over the air       →  Outputs payload on UART
                                    + appends RSSI byte (rssi=True)

                                 3. Python reads UART:
                                    node.ser.in_waiting > 0
                                    raw = node.receive()

                                 4. Strip RSSI byte (last byte)
                                    Parse header → store chunk

                                 5. Assemble JPEG → display on screen
```

---

## Troubleshooting

### No packets received at all

The most likely cause is a **sync word mismatch**. The E22 module's sync word varies by firmware version. Try changing `LORA_SYNC` in the Arduino sketch:

```cpp
// Try these one at a time:
#define LORA_SYNC  0x12   // Most common (private network)
#define LORA_SYNC  0x14   // Some E22 variants
#define LORA_SYNC  0x34   // Public/LoRaWAN network
```

### Packets received but garbled / wrong data

- Verify **spreading factor** matches. The Waveshare HAT's air data rate setting determines SF:

| HAT Air Speed | Spreading Factor | Bandwidth |
|---|---|---|
| 300 bps | 11 | 125 kHz |
| 1200 bps | 10 | 125 kHz |
| **2400 bps (default)** | **9** | **125 kHz** |
| 4800 bps | 8 | 125 kHz |
| 9600 bps | 7 | 125 kHz |
| 19200 bps | 7 | 250 kHz |
| 38400 bps | 7 | 500 kHz |

- Check that both antennas are firmly attached
- Ensure both devices are on the **same frequency** (915 MHz)

### Frequency offset

The E22 module uses: `actual_freq = 850.125 + freq_setting * 1.0 MHz`. So `freq=915` might mean 915.0 MHz or 915.125 MHz depending on the driver. If nothing works, try:

```cpp
#define LORA_FREQ  915.125  // Try with 0.125 MHz offset
```

### "RADIOLIB_ERR_SPI_CMD_FAILED" on ESP32

- Check antenna is connected
- Try a lower upload speed (Tools → Upload Speed → 460800)
- Power cycle the Heltec board

### PRG button doesn't trigger

On some V4 boards, the button GPIO may differ. Check with:
```cpp
Serial.println(digitalRead(0));  // Should print 0 when pressed
```

---

## References

- [Heltec WiFi LoRa 32 V4 Product Page](https://heltec.org/project/wifi-lora-32-v4/)
- [ropg/heltec_esp32_lora_v3 Library (GitHub)](https://github.com/ropg/heltec_esp32_lora_v3)
- [RadioLib SX1262 Documentation](https://github.com/jgromes/RadioLib)
- [Waveshare SX1262 915M LoRa HAT Wiki](https://www.waveshare.com/wiki/SX1262_915M_LoRa_HAT)
- [EBYTE E22 Series Datasheet](https://www.cdebyte.com/pdf-down.aspx?id=2179)
