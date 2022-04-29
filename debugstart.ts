import { parseProgram } from "./parser";
import { stringifyTree } from "./treeprinter";
import {compile,run} from "./compiler"
import {parser} from "lezer-python";
import {TreeCursor} from "lezer-tree";
import {tcProgram} from "./tc"

// var importObject = {
//     imports: {
//       print_num: (arg : any) => {
//         console.log("Logging from WASM: ", arg);
//         //display(String(arg));
//         return arg;
//       },
//       print_bool: (arg : any) => {
//         if(arg === 0) { //display("False"); 
//         }
//         else {// display("True"); 
//         }
//         return arg;
//       },
//       print_none: (arg: any) => {
//        // display("None");
//         return arg;
//       }
//     },
//   };

//var source:string = "x:int = 1\nif x==2:\n\tprint(2)\nelif x==1:\n print(31)\nelif x==8:\n\tprint(100)\nelse:print(3)";
// var source:string = "def f(x:int)->int:\n\tif x>=0:\n\t\treturn 1\n\tx=x-1\n\tf(x)\nf(2)"
// var tree = stringifyTree(source);
// let source = `
// class Rat(object):
//     n:int = 0

// r:Rat = None
// r.n = 1
// `
let source = `
class Rat(object):
      def __init__(self:Rat):
          pass

r1:Rat = None
r2:Rat = None

if r1==r2:
   pass
`
var c = parseProgram(source);
var ast = tcProgram(c)
var wat = compile(source);
const t = parser.parse(source);
//var tree = stringifyTree(t.cursor(),source,1);
//console.log("Hello");
//const result = run(c,importObject);

//console.log(JSON.stringify(ast, null, 2));
