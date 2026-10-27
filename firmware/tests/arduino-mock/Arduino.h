#ifndef MOCK_ARDUINO_H
#define MOCK_ARDUINO_H
#include <stdint.h>
#include <stddef.h>
#include <stdlib.h>
#define LOW 0
#define HIGH 1
#define OUTPUT 1
#define LED_BUILTIN 13
void digitalWrite(uint8_t,int);
void analogWrite(uint8_t,int);
void pinMode(uint8_t,int);
uint32_t millis();
struct MockSerial {
  void begin(unsigned long) {}
  int available() { return 0; }
  int read() { return -1; }
  int availableForWrite() { return 64; }
  size_t write(const uint8_t*,size_t size) { return size; }
};
extern MockSerial Serial;
#endif
