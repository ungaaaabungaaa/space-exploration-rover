#ifndef ROVER_CONTROLLER_H
#define ROVER_CONTROLLER_H
#include <stdint.h>
#include <string.h>

class RoverController {
 public:
  RoverController(): length_(0),discard_(false),armed_(false),hasSequence_(false),sequence_(0),lease_(300),lastCommand_(0),lastSlew_(0),left_(0),right_(0),targetLeft_(0),targetRight_(0),fault_(0) { buffer_[0]='\0'; }
  static uint8_t crc8(const char* text) {
    uint8_t crc=0;
    for(size_t i=0;text[i];i++){crc^=static_cast<uint8_t>(text[i]);for(uint8_t bit=0;bit<8;bit++)crc=static_cast<uint8_t>((crc&0x80)?(crc<<1)^0x07:crc<<1);}
    return crc;
  }
  bool feed(char byte,uint32_t now) {
    update(now);
    if(byte=='\n'){
      if(discard_){length_=0;discard_=false;return true;}
      if(length_&&buffer_[length_-1]=='\r')length_--;
      buffer_[length_]='\0';length_=0;parse(now);return true;
    }
    if(discard_)return false;
    const uint8_t value=static_cast<uint8_t>(byte);
    if((value<32&&byte!='\r')||value>126){neutral(1);discard_=true;length_=0;return false;}
    if(length_>=63){neutral(4);discard_=true;length_=0;return false;}
    buffer_[length_++]=byte;return false;
  }
  void update(uint32_t now) {
    if(armed_&&static_cast<uint32_t>(now-lastCommand_)>=lease_){neutral(3);return;}
    if(static_cast<uint32_t>(now-lastSlew_)>=20){lastSlew_=now;left_=slew(left_,targetLeft_);right_=slew(right_,targetRight_);}
  }
  bool armed() const {return armed_;}
  int16_t left() const {return left_;}
  int16_t right() const {return right_;}
  uint16_t sequence() const {return sequence_;}
  uint8_t fault() const {return fault_;}
 private:
  char buffer_[64];uint8_t length_;bool discard_,armed_,hasSequence_;uint16_t sequence_,lease_;uint32_t lastCommand_,lastSlew_;int16_t left_,right_,targetLeft_,targetRight_;uint8_t fault_;
  void neutral(uint8_t fault){armed_=false;left_=right_=targetLeft_=targetRight_=0;fault_=fault;}
  static int16_t slew(int16_t current,int16_t target){
    if((current>0&&target<0)||(current<0&&target>0))target=0;
    if(target>current)return static_cast<int16_t>(current+((target-current)>20?20:target-current));
    if(target<current)return static_cast<int16_t>(current-((current-target)>20?20:current-target));
    return current;
  }
  static int8_t hex(char c){if(c>='0'&&c<='9')return c-'0';if(c>='A'&&c<='F')return c-'A'+10;if(c>='a'&&c<='f')return c-'a'+10;return -1;}
  static bool decimal(const char* text,int32_t minimum,int32_t maximum,int32_t& output){
    bool negative=false;if(*text=='-'){negative=true;text++;}if(!*text)return false;
    if(text[0]=='0'&&text[1])return false;
    int32_t value=0;
    for(uint8_t i=0;text[i];i++){if(i>=6||text[i]<'0'||text[i]>'9')return false;value=value*10+text[i]-'0';if(value>65535)return false;}
    if(negative) { value=-value; }
    if(value<minimum||value>maximum) { return false; }
    output=value;
    return true;
  }
  void parse(uint32_t now){
    char* star=strchr(buffer_,'*');if(!star||strlen(star)!=3||hex(star[1])<0||hex(star[2])<0){neutral(1);return;}
    const uint8_t expected=static_cast<uint8_t>(hex(star[1])*16+hex(star[2]));*star='\0';if(crc8(buffer_)!=expected){neutral(1);return;}
    char* fields[6];uint8_t count=1;fields[0]=buffer_;
    for(char* cursor=buffer_;*cursor;cursor++)if(*cursor==','){*cursor='\0';if(count>=6){neutral(1);return;}fields[count++]=cursor+1;}
    if(count!=6||strcmp(fields[0],"R1")!=0||strlen(fields[2])!=1){neutral(1);return;}
    int32_t sequence,left,right,lease;
    if(!decimal(fields[1],0,65535,sequence)||!decimal(fields[3],-180,180,left)||!decimal(fields[4],-180,180,right)||!decimal(fields[5],100,500,lease)){neutral(1);return;}
    const char command=fields[2][0];if((command!='A'&&command!='M'&&command!='S')||((command=='A'||command=='S')&&(left!=0||right!=0))){neutral(1);return;}
    const uint16_t delta=static_cast<uint16_t>(static_cast<uint16_t>(sequence)-sequence_);
    if(hasSequence_&&(delta==0||delta>32767)){neutral(2);return;}
    if(command=='M'&&!armed_){neutral(5);return;}
    sequence_=static_cast<uint16_t>(sequence);hasSequence_=true;lease_=static_cast<uint16_t>(lease);lastCommand_=now;fault_=0;
    if(command=='A'){left_=right_=targetLeft_=targetRight_=0;armed_=true;lastSlew_=now;}
    else if(command=='S')neutral(0);
    else{targetLeft_=static_cast<int16_t>(left);targetRight_=static_cast<int16_t>(right);}
  }
};
#endif
