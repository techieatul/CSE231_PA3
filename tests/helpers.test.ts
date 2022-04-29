import { importObject } from "./import-object.test";
import {compile} from "../compiler";
import { parseProgram } from "../parser";
import { tcProgram } from "../tc";
import wabt from 'wabt';
// Modify typeCheck to return a `Type` as we have specified below
export function typeCheck(source: string) : Type {
  const ast = parseProgram(source);
  const tcAst = tcProgram(ast);
  const lastStmnt = tcAst[tcAst.length-1]
  if(lastStmnt.tag=="expr"){
    switch (lastStmnt.a.tag) {
      case "int":
        return "int";
      case "bool":
        return "bool";
      case "none":
        return "none";
      case "object":
        return {tag:"object",class:lastStmnt.a.value};

    }
  }
  return "none";
}

// Modify run to use `importObject` (imported above) to use for printing
// You can modify `importObject` to have any new fields you need here, or
// within another function in your compiler, for example if you need other
// JavaScript-side helpers
export async function run(source: string): Promise<number> {
  var memory = new WebAssembly.Memory({initial:10, maximum:100});
  (importObject.imports as any).mem = memory;
  (importObject.imports as any).throw_none_exception = () => {
     throw new Error("RUNTIME ERROR: Operation on None");
   }
  const wat = compile(source);
  const wabtApi = await wabt();
  const parsed = wabtApi.parseWat("example", wat);
  const binary = parsed.toBinary({});
  const wasmModule = await WebAssembly.instantiate(binary.buffer, importObject as any);
  return (wasmModule.instance.exports as any)._start();
}

type Type =
  | "int"
  | "bool"
  | "none"
  | { tag: "object", class: string }

export const NUM : Type = "int";
export const BOOL : Type = "bool";
export const NONE : Type = "none";
export function CLASS(name : string) : Type { 
  return { tag: "object", class: name }
};
