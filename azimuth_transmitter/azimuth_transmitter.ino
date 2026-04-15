/*
 * AZIMUTH SATELLITE TRANSMITTER
 * Sends a JPEG image packet-by-packet over LoRa.
 * Board: Heltec WiFi LoRa 32 V4 (ESP32-S3 + SX1262)
 * Library: heltec_unofficial by ropg (uses RadioLib internally)
 *
 * Protocol:
 *   Byte 0-1: Packet ID     (big-endian uint16)
 *   Byte 2-3: Total Packets (big-endian uint16)
 *   Byte 4+:  JPEG payload
 */

#include <heltec_unofficial.h>
#include "image_data.h"

// =====================================================================
// LoRa parameters — MUST match the Waveshare HAT's E22 module defaults
// =====================================================================
#define LORA_FREQ      915.125 // MHz — E22 base offset: 850.125 + 65
#define LORA_BW        125.0   // kHz — E22 default at 2.4kbps air rate
#define LORA_SF        9       // Spreading Factor 9 (E22 @ 2.4kbps)
#define LORA_CR        5       // Coding Rate 4/5
#define LORA_SYNC      0x12    // Private LoRa sync word
#define LORA_POWER     22      // dBm
#define LORA_PREAMBLE  12      // symbols

// =====================================================================
// Transmission settings
// =====================================================================
#define CHUNK_SIZE     251     // JPEG bytes per packet (+ 4 header = 255 max)
#define TX_DELAY_MS    100     // Delay between packets (ms)
#define BUTTON_PIN     0       // PRG button on Heltec V4

// =====================================================================
// State
// =====================================================================
uint16_t totalPackets = 0;
bool     transmitting = false;

void setup() {
  Serial.begin(115200);
  heltec_setup();

  // --- Force OLED power on (Vext) and reinit display for V4 ---
  pinMode(36, OUTPUT);
  digitalWrite(36, LOW);
  delay(100);
  display.init();
  display.setFont(ArialMT_Plain_10);
  display.clear();
  display.display();

  pinMode(BUTTON_PIN, INPUT_PULLUP);

  // --- Configure LoRa radio ---
  display.clear();
  display.drawString(0, 0, "AZIMUTH TX");
  display.drawString(0, 12, "Configuring...");
  display.display();

  int state = radio.begin(LORA_FREQ, LORA_BW, LORA_SF, LORA_CR,
                           LORA_SYNC, LORA_POWER, LORA_PREAMBLE);
  if (state != RADIOLIB_ERR_NONE) {
    display.clear();
    display.drawString(0, 0, "Radio FAILED!");
    display.drawString(0, 12, "Error: " + String(state));
    display.display();
    Serial.printf("[FATAL] radio.begin() failed: %d\n", state);
    while (true) { delay(1000); }
  }

  // Calculate packet count
  totalPackets = (IMAGE_SIZE + CHUNK_SIZE - 1) / CHUNK_SIZE;

  Serial.printf("[AZIMUTH] Radio OK. Image: %lu bytes, %u packets\n",
                (unsigned long)IMAGE_SIZE, totalPackets);

  showReady();
}

void loop() {
  heltec_loop();

  // Wait for button press
  if (!transmitting && digitalRead(BUTTON_PIN) == LOW) {
    delay(50); // debounce
    if (digitalRead(BUTTON_PIN) == LOW) {
      transmitImage();
      showReady();
      // Wait for button release
      while (digitalRead(BUTTON_PIN) == LOW) { delay(10); }
    }
  }
}

// =====================================================================
// Transmit all packets
// =====================================================================
void transmitImage() {
  transmitting = true;
  uint8_t buffer[4 + CHUNK_SIZE];

  Serial.println("[TX] Starting transmission...");

  for (uint16_t i = 0; i < totalPackets; i++) {
    uint32_t offset = (uint32_t)i * CHUNK_SIZE;
    uint16_t len = CHUNK_SIZE;
    if (offset + len > IMAGE_SIZE) {
      len = IMAGE_SIZE - offset;
    }

    // --- Build packet header (big-endian) ---
    buffer[0] = (i >> 8) & 0xFF;
    buffer[1] = i & 0xFF;
    buffer[2] = (totalPackets >> 8) & 0xFF;
    buffer[3] = totalPackets & 0xFF;

    // --- Copy JPEG chunk from PROGMEM ---
    memcpy_P(buffer + 4, IMAGE_DATA + offset, len);

    // --- Transmit ---
    int state = radio.transmit(buffer, len + 4);

    // --- Serial debug ---
    Serial.printf("[TX] Packet %u/%u (%u bytes) — %s\n",
                  i + 1, totalPackets, len + 4,
                  state == RADIOLIB_ERR_NONE ? "OK" : "FAIL");

    // --- OLED update ---
    uint8_t pct = (uint8_t)((uint32_t)(i + 1) * 100 / totalPackets);
    display.clear();
    display.drawString(0, 0, "AZIMUTH TX");
    display.drawString(0, 14, "Pkt: " + String(i + 1) + "/" + String(totalPackets));
    display.drawString(0, 28, state == RADIOLIB_ERR_NONE ? "Status: OK" : "Status: ERR");
    display.drawString(0, 42, "Progress: " + String(pct) + "%");

    // Draw progress bar
    int barY = 56;
    int barW = 120;
    int fillW = (int)((uint32_t)barW * (i + 1) / totalPackets);
    display.drawRect(3, barY, barW, 8);
    display.fillRect(3, barY, fillW, 8);
    display.display();

    delay(TX_DELAY_MS);
  }

  // --- Done ---
  display.clear();
  display.drawString(0, 0, "AZIMUTH TX");
  display.drawString(0, 16, "TX COMPLETE!");
  display.drawString(0, 32, String(totalPackets) + " packets sent");
  display.drawString(0, 48, "Press PRG to resend");
  display.display();

  Serial.println("[TX] Transmission complete.");
  transmitting = false;
}

// =====================================================================
// Show ready screen
// =====================================================================
void showReady() {
  display.clear();
  display.drawString(0, 0, "AZIMUTH TX");
  display.drawString(0, 14, "Img: " + String((unsigned long)IMAGE_SIZE) + " bytes");
  display.drawString(0, 28, "Packets: " + String(totalPackets));
  display.drawString(0, 42, "Chunk: " + String(CHUNK_SIZE) + " bytes");
  display.drawString(0, 56, "Press PRG to send");
  display.display();
}
