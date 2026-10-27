#!/usr/bin/env node
import {writeFile} from 'node:fs/promises';
import {simulate} from './navigation.mjs';import {SCENARIOS,scenarioConfig} from './scenarios.mjs';import {encodeCommand} from './protocol.mjs';
const help=`Space Rover Lab\n\nnode src/cli.mjs run [options]\n  --scenario rocks|detour|blocked   (rocks)\n  --speed 0.1..1                    Maximum side speed, m/s (0.6)\n  --steps 1..3000                   Accepted-step budget (2000)\n  --range 1..8                      Ideal sensor range, m (4)\n  --beams 8..64                     Range beams (24)\n  --dt 0.02..0.2                    Tick time, s (0.1)\n  --out NEW_FILE                    Full replay; refuses overwrite\n  --json                           Metrics as JSON\n\nnode src/cli.mjs packet --command A|M|S --sequence N [--left N --right N --lease N]\n  Print a bounded bench frame only; never opens a serial device.\n\nNo physical rover, ROS, or hardware safety validation is implied.\n`;
try{
 const args=process.argv.slice(2);if(!args.length||args.includes('--help'))process.stdout.write(help);
 else{
  const command=args.shift();if(!['run','packet'].includes(command))throw Error('Expected run or packet; use --help.');
  const options={},seen=new Set();const allowed=command==='run'?['scenario','speed','steps','range','beams','dt','out','json']:['command','sequence','left','right','lease'];
  while(args.length){const flag=args.shift();if(!flag.startsWith('--')||!allowed.includes(flag.slice(2))||seen.has(flag))throw Error('Unknown or repeated option.');seen.add(flag);const key=flag.slice(2);if(key==='json'){options.json=true;continue;}const value=args.shift();if(value===undefined||value.startsWith('--'))throw Error(`Missing ${flag} value.`);options[key]=value;}
  if(command==='packet'){
   if(options.command===undefined||options.sequence===undefined)throw Error('Packet command and sequence are required.');
   for(const key of ['sequence','left','right','lease'])if(options[key]!==undefined&&(options[key].trim()===''||!Number.isFinite(Number(options[key]))))throw Error(`Invalid ${key}.`);
   const fields={command:options.command,sequence:Number(options.sequence)};for(const key of ['left','right','lease'])if(options[key]!==undefined)fields[key]=Number(options[key]);process.stdout.write(encodeCommand(fields));
  }else{
   const scenario=options.scenario??'rocks';const config=scenarioConfig(scenario);for(const[key,field]of [['speed','maxSpeed'],['steps','steps'],['range','sensorRange'],['beams','beams'],['dt','dt']])if(options[key]!==undefined){if(options[key].trim()===''||!Number.isFinite(Number(options[key])))throw Error(`Invalid ${key}.`);config[field]=Number(options[key]);}
   const report=simulate(config);if(options.out)await writeFile(options.out,JSON.stringify(report)+'\n',{flag:'wx'});
   if(options.json)process.stdout.write(JSON.stringify({schemaVersion:1,scenario,...report.metrics})+'\n');else process.stdout.write(`${SCENARIOS[scenario].name}: ${report.metrics.outcome}\n${report.metrics.timeSeconds.toFixed(1)} simulated seconds · ${report.metrics.distanceM.toFixed(2)} m · ${report.metrics.replans} plans · ${report.metrics.rejectedMotions} rejected unsafe motions\nFinal goal distance ${report.metrics.finalGoalDistance.toFixed(3)} m. Full swept-path checks protect the simulation, not physical hardware.\n`);
  }
 }
}catch(error){process.stderr.write(`Error: ${error.code==='EEXIST'?'Output already exists; choose a new file.':error.message}\n`);process.exitCode=1;}
