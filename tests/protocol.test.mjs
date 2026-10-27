import test from 'node:test';import assert from 'node:assert/strict';
import {crc8,encodeCommand,parseFrame,freshSequence} from '../src/protocol.mjs';
test('CRC8 command roundtrip and standard check vector',()=>{assert.equal(crc8('123456789'),0xF4);const input={sequence:65535,command:'M',left:-180,right:180,lease:500};assert.deepEqual(parseFrame(encodeCommand(input)),input);assert.deepEqual(parseFrame(encodeCommand(input).replace('\n','\r\n')),input);});
test('protocol rejects corrupt, oversized, stale fields and movement in arm frame',()=>{
 const valid=encodeCommand({sequence:1,command:'A'});for(const line of [valid.replace('*','X*'),valid.replace('R1','R2'),valid.slice(0,-1),`R1,${'1'.repeat(80)}\n`,valid.replace(',0,',',-1,'),valid.replace('*','\0*')])assert.throws(()=>parseFrame(line));
 for(const fields of [{sequence:-1,command:'M'},{sequence:1,command:'A',left:1},{sequence:1,command:'M',right:181},{sequence:1,command:'M',lease:501},{sequence:1,command:'X'}])assert.throws(()=>encodeCommand(fields));
 assert.equal(freshSequence(0,65535),true);assert.equal(freshSequence(5,5),false);assert.equal(freshSequence(3,5),false);assert.equal(freshSequence(65535,null),true);
});
test('telemetry parsing retains signed current PWM and fault state',()=>{
 const body='T1,8,D,-20,0,3';const line=`${body}*${crc8(body).toString(16).padStart(2,'0')}\n`;assert.deepEqual(parseFrame(line,'T1'),{sequence:8,state:'D',left:-20,right:0,fault:3});assert.throws(()=>parseFrame(line,'R1'));
});
