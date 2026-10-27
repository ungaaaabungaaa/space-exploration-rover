function grid(){const rows=Array.from({length:12},()=>Array(16).fill('.'));for(let x=0;x<16;x++){rows[0][x]='#';rows[11][x]='#';}for(let row=0;row<12;row++){rows[row][0]='#';rows[row][15]='#';}return rows;}
function block(rows,x0,y0,x1,y1){for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)rows[11-y][x]='#';}
const rocks=grid();block(rocks,5,4,6,6);block(rocks,10,7,11,8);
const detour=grid();block(detour,8,1,8,8);
const blocked=grid();block(blocked,8,1,8,10);
export const SCENARIOS=Object.freeze({
 rocks:{name:'Rock field',description:'A route through an open field with two obstacle groups.',world:rocks.map(row=>row.join('')),start:[1.5,1.5],goal:[14.5,10.5],heading:0},
 detour:{name:'Wall detour',description:'Discover a wall and route through its northern opening.',world:detour.map(row=>row.join('')),start:[1.5,2.5],goal:[14.5,2.5],heading:0},
 blocked:{name:'Blocked passage',description:'A complete separator has no route to the goal.',world:blocked.map(row=>row.join('')),start:[1.5,2.5],goal:[14.5,2.5],heading:0}
});
export function scenarioConfig(name){if(!Object.hasOwn(SCENARIOS,name))throw Error('Unknown scenario.');const {world,start,goal,heading}=SCENARIOS[name];return {world,start,goal,heading};}
