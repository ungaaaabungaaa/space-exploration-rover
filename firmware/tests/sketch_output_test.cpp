#include <assert.h>
#include <stdio.h>
#include <string.h>
#include "arduino-mock/Arduino.h"
MockSerial Serial;
static int pwm[20]={0},direction[20]={0};
static uint32_t clockNow=0;
static int zeroWrites=0;
void analogWrite(uint8_t pin,int value) { assert(value>=0&&value<=180);if(value==0)zeroWrites++;pwm[pin]=value; }
void digitalWrite(uint8_t pin,int value) {
  if(pin==7&&direction[pin]!=value)assert(pwm[5]==0);
  if(pin==8&&direction[pin]!=value)assert(pwm[6]==0);
  direction[pin]=value;
}
void pinMode(uint8_t,int) {}
uint32_t millis() {return clockNow;}
#include "../rover/rover.ino"
static void frame(uint16_t seq,char command,int left,int right,uint32_t now){
 char body[48],line[56];snprintf(body,sizeof(body),"R1,%u,%c,%d,%d,300",static_cast<unsigned>(seq),command,left,right);snprintf(line,sizeof(line),"%s*%02X\n",body,RoverController::crc8(body));for(size_t i=0;i<strlen(line);i++)controller.feed(line[i],now);
}
int main(){
 setup();assert(pwm[5]==0&&pwm[6]==0);
 frame(1,'A',0,0,0);frame(2,'M',-40,-40,1);controller.update(20);applyOutputs();assert(pwm[5]==20&&pwm[6]==20);
 const int beforeRepeat=zeroWrites;applyOutputs();assert(zeroWrites==beforeRepeat);
 frame(3,'S',0,0,21);applyOutputs();assert(pwm[5]==0&&pwm[6]==0);
 puts("Sketch output regression passed: boot neutral and PWM zero before direction changes.");
}
