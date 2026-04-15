# Azimuth Ground Station — Hardware Setup Guide

## Waveshare SX1262 LoRa HAT + Raspberry Pi (Bookworm)

---

## STEP 0: What You Need

| Item | Notes |
|---|---|
| Raspberry Pi 3B/4/5 | Running **Raspberry Pi OS Bookworm** |
| Waveshare SX1262 915M LoRa HAT | The 40-pin GPIO HAT version |
| SMA Antenna (915 MHz) | **MUST be attached before powering on** — transmitting without an antenna can damage the SX1262 |
| MicroSD card (16 GB+) | Flashed with Raspberry Pi OS |
| Power supply | Official Pi PSU recommended |

---

## STEP 1: Understand the HAT's Pinout

The HAT plugs directly onto the Pi's 40-pin GPIO header. The critical connections it makes are:

| HAT Function | Pi Pin (Board) | Pi GPIO (BCM) |
|---|---|---|
| **TX** (HAT → Pi RX) | Pin 10 | GPIO 15 (RXD) |
| **RX** (Pi TX → HAT) | Pin 8 | GPIO 14 (TXD) |
| **M0** (Mode select) | Pin 15 | **GPIO 22** |
| **M1** (Mode select) | Pin 13 | **GPIO 27** |
| **AUX** (Busy flag) | — | — |
| **3.3V Power** | Pin 1 | 3V3 |
| **GND** | Pin 6 | GND |

You don't wire anything. The 40-pin header carries all of this.

---

## STEP 2: Set the Jumpers on the HAT (BEFORE Mounting)

The board has two sets of jumper caps. Set them **before** you seat the HAT.

### 2a. UART Selection Jumpers — Set to `B`

There are two two-pin jumpers near the label "UART SEL." They have three marked positions:

| Position | Meaning |
|---|---|
| **A** | LoRa controlled via the onboard USB-to-UART (CP2102) |
| **B** | LoRa controlled via the **Raspberry Pi's UART** |
| **C** | Pi's serial console exposed over USB |

**You want position B.** Place both jumper caps so they bridge the **B** pads. This routes the HAT's TX/RX to the Pi's GPIO 14/15.

### 2b. Mode Jumpers (M0 / M1) — REMOVE Both

Two more jumper caps labeled M0 and M1 control the operating mode:

| M0 | M1 | Mode |
|---|---|---|
| LOW | LOW | Transmission Mode (normal operation) |
| LOW | HIGH | Configuration Mode |
| HIGH | LOW | WOR (Wake-on-Radio) |
| HIGH | HIGH | Deep Sleep |

**REMOVE both M0 and M1 jumper caps.** The Python `sx126x.py` driver controls M0/M1 via GPIO (BCM22 and BCM27) at runtime. It toggles into Configuration Mode at startup to write settings (frequency, address, power), then switches back to Transmission Mode automatically.

> **WARNING:** If you leave the jumper caps on, they short the pins to GND and override the GPIO. The driver cannot enter Configuration Mode, the config write fails ("setting fail"), and the module stays on its factory-default frequency — NOT the frequency you specified in code.

---

## STEP 3: Mount the HAT

1. **Power off** the Pi completely.
2. Screw the antenna onto the SMA connector on the HAT.
3. Align the HAT's 40-pin female header with the Pi's 40-pin male header.
4. Press down firmly and evenly until fully seated.

---

## STEP 4: Configure the Raspberry Pi's Serial Port

Boot the Pi and open a terminal.

### 4a. Disable the Serial Login Shell, Enable Serial Hardware

```bash
sudo raspi-config
```

Navigate: **Interface Options → Serial Port**

You'll be asked two questions:

| Question | Answer |
|---|---|
| "Would you like a login shell to be accessible over serial?" | **No** |
| "Would you like the serial port hardware to be enabled?" | **Yes** |

Select **Finish** but **don't reboot yet**.

### 4b. Disable Bluetooth to Free `/dev/ttyAMA0`

On the Pi, Bluetooth normally occupies the high-quality PL011 UART (`/dev/ttyAMA0`), leaving only the mini-UART (`/dev/ttyS0`) for GPIO. The mini-UART is clock-dependent and unreliable. You want the PL011.

Edit the boot config:

```bash
sudo nano /boot/firmware/config.txt
```

> **Bookworm note:** The file is at `/boot/firmware/config.txt`, not `/boot/config.txt`.

Add these lines at the bottom of the `[all]` section:

```
dtoverlay=disable-bt
enable_uart=1
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

### 4c. Disable the Bluetooth Service

```bash
sudo systemctl disable hciuart
```

### 4d. Reboot

```bash
sudo reboot
```

### 4e. Verify

After reboot, confirm the serial port mapping:

```bash
ls -l /dev/serial0
```

Expected output:

```
lrwxrwxrwx 1 root root 7 ... /dev/serial0 -> ttyAMA0
```

This confirms `/dev/ttyAMA0` is now your GPIO serial port — the one the HAT is wired to.

---

## STEP 5: Fix GPIO for Raspberry Pi 5 (CRITICAL)

The Pi 5 uses a new RP1 I/O controller. The old `RPi.GPIO` library shipped with Bookworm **cannot detect it** and will crash with:

```
RuntimeError: Cannot determine SOC peripheral base address
```

The Waveshare `sx126x.py` driver uses `RPi.GPIO` internally, so you **must** swap it for the compatible drop-in replacement:

```bash
sudo apt remove python3-rpi.gpio
sudo apt install python3-rpi-lgpio
```

`rpi-lgpio` provides the same `import RPi.GPIO as GPIO` API — no code changes needed.

> **Pi 3B/4B users:** You may not hit this error, but installing `rpi-lgpio` is still safe and recommended on Bookworm.

---

## STEP 6: Install Software Dependencies

```bash
sudo apt update
sudo apt install -y python3-pip python3-pygame python3-pil python3-serial
```

If `pip` packages are needed outside the system packages:

```bash
pip3 install pyserial pygame Pillow --break-system-packages
```

---

## STEP 7: Get the Waveshare Driver

Download the official Waveshare example code, which contains `sx126x.py`:

```bash
cd ~/Desktop/azimuth
wget https://files.waveshare.com/wiki/SX1262_915M_LoRa_HAT/SX126X_LoRa_HAT_Code.zip
unzip SX126X_LoRa_HAT_Code.zip
cp SX126X_LoRa_HAT_Code/python/sx126x.py .
```

The driver file `sx126x.py` must live in the **same directory** as `azimuth_station.py`.

---

## STEP 8: Quick Sanity Test

Before running the full dashboard, verify the radio responds:

```bash
cd ~/Desktop/azimuth
python3 -c "
import sx126x
node = sx126x.sx126x(serial_num='/dev/ttyAMA0', freq=915, addr=0, power=22, rssi=True)
print('Radio initialized OK')
"
```

If this prints `Radio initialized OK` with no errors — your hardware and software are correctly connected.

---

## STEP 9: Run Azimuth

```bash
cd ~/Desktop/azimuth
python3 azimuth_station.py
```

Press **Esc** or **Q** to exit.

---

## Troubleshooting Quick Reference

| Symptom | Fix |
|---|---|
| `Cannot determine SOC peripheral base address` | **Pi 5 users:** `sudo apt remove python3-rpi.gpio && sudo apt install python3-rpi-lgpio` then reboot |
| `Permission denied: /dev/ttyAMA0` | `sudo usermod -aG dialout $USER` then log out and back in |
| `/dev/serial0 -> ttyS0` (wrong) | Double-check `dtoverlay=disable-bt` is in config.txt and `hciuart` is disabled |
| `No module named 'sx126x'` | Ensure `sx126x.py` is in the same folder as your script |
| Radio init crashes with unexpected kwargs | Do NOT pass `mode`, `net_id`, `buffer_size`, or `crypt` — only `serial_num`, `freq`, `addr`, `power`, `rssi` |
| No data received | Check both M0 and M1 jumpers are **shorted** (Transmission Mode) and UART jumpers are on **B** |
| Garbled data | Ensure both ESP32 sender and Pi receiver use the **same frequency, address, and air data rate** |

---

## References

- [Waveshare SX1262 915M LoRa HAT Wiki](https://www.waveshare.com/wiki/SX1262_915M_LoRa_HAT)
- [Waveshare SX1262 868M LoRa HAT Wiki](https://www.waveshare.com/wiki/SX1262_868M_LoRa_HAT)
- [Raspberry Pi Serial Port Configuration (AB Electronics)](https://www.abelectronics.co.uk/kb/article/1035/serial-port-setup-in-raspberry-pi-os)
- [Raspberry Pi Official Configuration Documentation](https://www.raspberrypi.com/documentation/computers/configuration.html)
- [Disabling Bluetooth on Raspberry Pi](https://di-marco.net/blog/it/2020-04-18-tips-disabling_bluetooth_on_raspberry_pi/)
