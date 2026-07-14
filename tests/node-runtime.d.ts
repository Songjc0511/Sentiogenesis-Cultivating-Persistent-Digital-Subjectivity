declare module 'node:child_process' {
  export function execFileSync(command:string,args:string[],options:{input:string;encoding:'utf8';maxBuffer?:number}):string
}
