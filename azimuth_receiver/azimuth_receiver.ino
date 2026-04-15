/*
 * AZIMUTH GROUND RECEIVER
 * Heltec WiFi LoRa 32 V4 — receives LoRa packets and forwards to Pi via USB.
 * Board: Heltec WiFi LoRa 32 V4 (ESP32-S3 + SX1262)
 * Library: heltec_unofficial by ropg (uses RadioLib internally)
 *
 * Connect this Heltec to the Raspberry Pi via USB-C cable.
 * It acts as a LoRa-to-USB bridge.
 *
 * Serial Frame Protocol (sent to Pi):
 *   Byte 0:    0xAA  (sync)
 *   Byte 1:    0x55  (sync)
 *   Byte 2-3:  Payload length  (big-endian uint16)
 *   Byte 4-5:  RSSI × 10      (big-endian int16, e.g. -1205 = -120.5 dBm)
 *   Byte 6-7:  SNR × 10       (big-endian int16, e.g.    75 =    7.5 dB)
 *   Byte 8+:   Raw LoRa payload
 */

#include <heltec_unofficial.h>

// =====================================================================
// LoRa parameters — MUST match the transmitter exactly
// =====================================================================
#define LORA_FREQ      915.125  // MHz
#define LORA_BW        125.0    // kHz
#define LORA_SF        9        // Spreading Factor
#define LORA_CR        5        // Coding Rate 4/5
#define LORA_SYNC      0x12     // Sync word
#define LORA_POWER     22       // dBm
#define LORA_PREAMBLE  12       // symbols

// =====================================================================
// Interrupt flag
// =====================================================================
volatile bool rxFlag = false;
#if defined(ESP32)
  IRAM_ATTR
#endif
void rxISR(void) { rxFlag = true; }

uint32_t pktCount = 0;
float    lastRSSI = 0;
float    lastSNR  = 0;

void setup() {
  Serial.begin(115200);
  heltec_setup();

  // Force OLED power on (Vext) for V4
  pinMode(36, OUTPUT);
  digitalWrite(36, LOW);
  delay(100);
  display.init();
  display.setFont(ArialMT_Plain_10);

  display.clear();
  display.drawString(0, 0, "AZIMUTH RX BRIDGE");
  display.drawString(0, 14, "Configuring radio...");
  display.display();

  int state = radio.begin(LORA_FREQ, LORA_BW, LORA_SF, LORA_CR,
                           LORA_SYNC, LORA_POWER, LORA_PREAMBLE);
  if (state != RADIOLIB_ERR_NONE) {
    display.clear();
    display.drawString(0, 0, "Radio FAILED!");
    display.drawString(0, 14, "Error: " + String(state));
    display.display();
    while (true) { delay(1000); }
  }

  radio.setDio1Action(rxISR);
  radio.startReceive();

  display.clear();
  display.drawString(0, 0, "AZIMUTH RX BRIDGE");
  display.drawString(0, 14, "F:" + String(LORA_FREQ, 3) + " SF:" + String(LORA_SF));
  display.drawString(0, 28, "CR:4/" + String(LORA_CR) + " BW:" + String((int)LORA_BW));
  display.drawString(0, 42, "Waiting for packets...");
  display.display();
}

void loop() {
  heltec_loop();

  if (rxFlag) {
    rxFlag = false;
    uint8_t buf[256];
    int state = radio.readData(buf, 0);
    int pktLen = radio.getPacketLength();

    if (state == RADIOLIB_ERR_NONE && pktLen > 0) {
      lastRSSI = radio.getRSSI();
      lastSNR  = radio.getSNR();
      pktCount++;

      // === Send binary frame to Pi over USB Serial ===
      int16_t  rssi10 = (int16_t)(lastRSSI * 10);
      int16_t  snr10  = (int16_t)(lastSNR * 10);
      uint16_t len    = (uint16_t)pktLen;

      uint8_t header[8];
      header[0] = 0xAA;
      header[1] = 0x55;
      header[2] = (len >> 8) & 0xFF;
      header[3] = len & 0xFF;
      header[4] = (rssi10 >> 8) & 0xFF;
      header[5] = rssi10 & 0xFF;
      header[6] = (snr10 >> 8) & 0xFF;
      header[7] = snr10 & 0xFF;

      Serial.write(header, 8);
      Serial.write(buf, pktLen);
      Serial.flush();

      // === Update OLED ===
      String pktInfo = "";
      if (pktLen >= 4) {
        uint16_t pktId = (buf[0] << 8) | buf[1];
        uint16_t total = (buf[2] << 8) | buf[3];
        pktInfo = String(pktId + 1) + "/" + String(total);
      }

      display.clear();
      display.drawString(0, 0,  "AZIMUTH RX BRIDGE");
      display.drawString(0, 14, "Pkts rcvd: " + String(pktCount));
      display.drawString(0, 28, "RSSI: " + String(lastRSSI, 1) + " dBm");
      display.drawString(0, 42, "SNR:  " + String(lastSNR, 1) + " dB");
      if (pktInfo.length() > 0) {
        display.drawString(0, 56, "Img pkt: " + pktInfo);
      }
      display.display();
    }

    // Restart receive
    radio.startReceive();
    radio.setDio1Action(rxISR);
  }

  delay(1);
}
