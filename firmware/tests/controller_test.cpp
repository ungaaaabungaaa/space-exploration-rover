#include <assert.h>
#include <stdio.h>
#include <string.h>
#include "../rover/RoverController.h"

static int groups=0;
static void send(RoverController& controller, uint16_t sequence, char command, int left, int right, int lease, uint32_t now) {
  char body[64], frame[72];
  snprintf(body,sizeof(body),"R1,%u,%c,%d,%d,%d",static_cast<unsigned>(sequence),command,left,right,lease);
  snprintf(frame,sizeof(frame),"%s*%02X\n",body,RoverController::crc8(body));
  for(size_t i=0;i<strlen(frame);i++)controller.feed(frame[i],now);
}
int main() {
  assert(RoverController::crc8("123456789")==0xF4);
  {RoverController c;assert(!c.armed());assert(c.left()==0&&c.right()==0);send(c,1,'M',100,100,300,0);assert(!c.armed()&&c.fault()==5);groups++;}
  {RoverController c;send(c,1,'A',0,0,300,0);assert(c.armed());send(c,2,'M',180,180,300,1);c.update(20);assert(c.left()==20&&c.right()==20);c.update(40);assert(c.left()==40);send(c,3,'S',0,0,300,41);assert(!c.armed()&&c.left()==0);groups++;}
  {RoverController c;send(c,1,'A',0,0,100,0);send(c,2,'M',100,100,100,1);c.update(80);assert(c.left()==20);c.update(101);assert(!c.armed()&&c.left()==0&&c.fault()==3);groups++;}
  {RoverController c;send(c,65535,'A',0,0,300,0);send(c,0,'M',100,100,300,1);assert(c.armed());send(c,0,'M',100,100,300,2);assert(!c.armed()&&c.fault()==2);groups++;}
  {RoverController c;send(c,1,'A',0,0,300,0);const char* bad="R1,2,M,100,100,300*00\n";for(size_t i=0;i<strlen(bad);i++)c.feed(bad[i],1);assert(!c.armed()&&c.left()==0&&c.fault()==1);groups++;}
  {RoverController c;send(c,1,'A',0,0,300,0);for(int i=0;i<100;i++)c.feed('1',1);assert(!c.armed()&&c.fault()==4);c.feed('\n',1);send(c,2,'M',50,50,300,2);assert(!c.armed());groups++;}
  {RoverController c;send(c,1,'A',0,0,300,0);send(c,2,'M',40,40,300,1);c.update(20);c.update(40);assert(c.left()==40);send(c,3,'M',-40,-40,300,41);c.update(60);assert(c.left()==20);c.update(80);assert(c.left()==0);c.update(100);assert(c.left()==-20);groups++;}
  {RoverController c;const uint32_t start=0xFFFFFFF0u;send(c,1,'A',0,0,100,start);send(c,2,'M',50,50,100,start);c.update(0x00000030u);assert(c.armed());c.update(0x00000060u);assert(!c.armed()&&c.left()==0);groups++;}
  {RoverController c;send(c,1,'A',1,0,300,0);assert(!c.armed());send(c,2,'A',0,0,99,0);assert(!c.armed());send(c,3,'A',0,0,300,0);send(c,4,'M',181,0,300,1);assert(!c.armed());groups++;}
  {RoverController c;send(c,1,'A',0,0,300,0);for(int i=0;i<10000;i++){c.feed(static_cast<char>((i*73)%256),static_cast<uint32_t>(i));c.update(static_cast<uint32_t>(i));}assert(c.left()==0&&c.right()==0);groups++;}
  {RoverController c;send(c,1,'A',0,0,100,0);send(c,2,'M',100,100,100,101);assert(!c.armed()&&c.left()==0);groups++;}
  printf("Native controller: %d behavior groups passed; CRC, boot, arm/stop, slew, watchdog, rollover, sequence and malformed input checked.\n",groups);
}
