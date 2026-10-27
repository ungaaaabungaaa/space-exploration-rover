export const MAX_PWM=180;
export function crc8(text){let crc=0;for(const byte of new TextEncoder().encode(text)){crc^=byte;for(let bit=0;bit<8;bit++)crc=((crc&0x80)?(crc<<1)^0x07:crc<<1)&255;}return crc;}
const number=(text,min,max)=>{if(typeof text!=='string'||! /^-?(0|[1-9][0-9]*)$/.test(text))throw Error('Invalid decimal field.');const value=Number(text);if(!Number.isInteger(value)||value<min||value>max)throw Error('Field outside bounds.');return value;};
export function encodeCommand({sequence,command,left=0,right=0,lease=300}){
 if(!Number.isInteger(sequence)||sequence<0||sequence>65535||!['A','M','S'].includes(command)||![left,right].every(item=>Number.isInteger(item)&&Math.abs(item)<=MAX_PWM)||!Number.isInteger(lease)||lease<100||lease>500||(['A','S'].includes(command)&&(left!==0||right!==0)))throw Error('Invalid command fields.');
 const body=`R1,${sequence},${command},${left},${right},${lease}`;
 return `${body}*${crc8(body).toString(16).toUpperCase().padStart(2,'0')}\n`;
}
export function parseFrame(line,prefix='R1'){
 if(typeof line!=='string'||!line.endsWith('\n'))throw Error('A frame needs a newline.');
 let frame=line.slice(0,-1);if(frame.length>63)throw Error('Oversized frame.');if(frame.endsWith('\r'))frame=frame.slice(0,-1);
 if(frame.length>63||!/^[\x20-\x7e]+$/.test(frame))throw Error('Invalid or oversized frame.');
 const match=/^([^*]+)\*([0-9a-fA-F]{2})$/.exec(frame);if(!match||crc8(match[1])!==parseInt(match[2],16))throw Error('CRC mismatch.');
 const fields=match[1].split(',');if(fields.length!==6||fields[0]!==prefix)throw Error('Unknown frame type.');
 const sequence=number(fields[1],0,65535);
 if(prefix==='R1'){
  const command=fields[2],left=number(fields[3],-MAX_PWM,MAX_PWM),right=number(fields[4],-MAX_PWM,MAX_PWM),lease=number(fields[5],100,500);
  const result={sequence,command,left,right,lease};encodeCommand(result);return result;
 }
 if(prefix!=='T1'||!['A','D'].includes(fields[2]))throw Error('Unknown telemetry state.');
 return {sequence,state:fields[2],left:number(fields[3],-MAX_PWM,MAX_PWM),right:number(fields[4],-MAX_PWM,MAX_PWM),fault:number(fields[5],0,5)};
}
export function freshSequence(next,previous){return previous===null||(((next-previous)&65535)>0&&((next-previous)&65535)<=32767);}
