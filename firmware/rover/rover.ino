#include <Arduino.h>
#include <stdio.h>
#include "RoverController.h"

const uint8_t LEFT_PWM=5,RIGHT_PWM=6,LEFT_DIR=7,RIGHT_DIR=8,ARM_LED=LED_BUILTIN;
RoverController controller;
uint32_t lastTelemetry=0;
bool leftNegative=false,rightNegative=false;

void writeSide(uint8_t pwmPin,uint8_t directionPin,int16_t command,bool& wasNegative){
  const bool negative=command<0;
  if(command==0||negative!=wasNegative)analogWrite(pwmPin,0);
  digitalWrite(directionPin,negative?LOW:HIGH);
  if(command!=0)analogWrite(pwmPin,abs(command));
  wasNegative=negative;
}
void applyOutputs(){
  writeSide(LEFT_PWM,LEFT_DIR,controller.left(),leftNegative);
  writeSide(RIGHT_PWM,RIGHT_DIR,controller.right(),rightNegative);
  digitalWrite(ARM_LED,controller.armed()?HIGH:LOW);
}
void telemetry(){
  char body[48],frame[56];
  snprintf(body,sizeof(body),"T1,%u,%c,%d,%d,%u",controller.sequence(),controller.armed()?'A':'D',controller.left(),controller.right(),controller.fault());
  const int length=snprintf(frame,sizeof(frame),"%s*%02X\n",body,RoverController::crc8(body));
  if(length>0&&length<static_cast<int>(sizeof(frame))&&Serial.availableForWrite()>=length)Serial.write(reinterpret_cast<const uint8_t*>(frame),static_cast<size_t>(length));
}
void setup(){
  digitalWrite(LEFT_PWM,LOW);digitalWrite(RIGHT_PWM,LOW);
  pinMode(LEFT_PWM,OUTPUT);pinMode(RIGHT_PWM,OUTPUT);pinMode(LEFT_DIR,OUTPUT);pinMode(RIGHT_DIR,OUTPUT);pinMode(ARM_LED,OUTPUT);
  applyOutputs();Serial.begin(115200);
}
void loop(){
  controller.update(millis());
  for(uint8_t count=0;count<32&&Serial.available()>0;count++)if(controller.feed(static_cast<char>(Serial.read()),millis()))telemetry();
  controller.update(millis());applyOutputs();
  const uint32_t now=millis();if(static_cast<uint32_t>(now-lastTelemetry)>=250){lastTelemetry=now;telemetry();}
}
