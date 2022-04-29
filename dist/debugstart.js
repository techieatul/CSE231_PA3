"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var parser_1 = require("./parser");
var compiler_1 = require("./compiler");
var lezer_python_1 = require("lezer-python");
var tc_1 = require("./tc");
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
var source = "\nclass Rat(object):\n      def __init__(self:Rat):\n          pass\n\nr1:Rat = None\nr2:Rat = None\n\nif r1==r2:\n   pass\n";
var c = (0, parser_1.parseProgram)(source);
var ast = (0, tc_1.tcProgram)(c);
var wat = (0, compiler_1.compile)(source);
var t = lezer_python_1.parser.parse(source);
//var tree = stringifyTree(t.cursor(),source,1);
//console.log("Hello");
//const result = run(c,importObject);
//console.log(JSON.stringify(ast, null, 2));
//# sourceMappingURL=debugstart.js.map