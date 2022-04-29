import { join } from 'path';
import { idText, isLiteralExpression } from 'typescript';
import wabt from 'wabt';
import {Stmt, Expr, VarType, BinaryOP,UniOp,Literal,varType, FuncDef,Var} from './ast';
import {parseProgram} from './parser';
import { tcProgram } from './tc';


type LocalEnv = {
  emptyEnv: Map<string, boolean>,
  classFieldEnv: Map<string,[number,varType]>,
  classNames: Map<string,boolean>
  classData : Map<string,Stmt<varType>>,
}
var loop_count = 0;
function variableNames(stmts: Stmt<varType>[]) : string[] {
  const vars : Array<string> = [];
  var initEnv : Map<string, boolean> = new Map();
  stmts.forEach((stmt) => {
    //if(stmt.tag === "assign" || stmt.tag==="varInit") { vars.push(stmt.name); }
    if(stmt.tag==="varInit") { 
      if(initEnv.has(stmt.name)){
        throw new Error("REFERENCE ERROR: Duplicate decalaration inside same scope");
      }
      vars.push(stmt.name); 
      initEnv.set(stmt.name,true);
    }
  });
  return vars;
}

function funs(stmts: Stmt<varType>[]) : Stmt<varType>[] {
  return stmts.filter(stmt => stmt.tag === "FuncDef");
}

function nonFuns(stmts: Stmt<varType>[]) : Stmt<varType>[] {
  return stmts.filter(stmt => stmt.tag !== "FuncDef");
}

function classNames(stmts: Stmt<varType>[]) : Stmt<varType>[] {
  return stmts.filter(stmt => stmt.tag == "class");
}

function varsFunsStmts(stmts: Stmt<varType>[]) : [string[], Stmt<varType>[], Stmt<varType>[],Stmt<varType>[]] {
  return [variableNames(stmts), funs(stmts), nonFuns(stmts),classNames(stmts)];
}


export async function run(watSource : string, config: any) : Promise<number> {
  const wabtApi = await wabt();

  const parsed = wabtApi.parseWat("example", watSource);
  const binary = parsed.toBinary({});
  const wasmModule = await WebAssembly.instantiate(binary.buffer, config);
  return (wasmModule.instance.exports as any)._start();
}

export function BinopStmts(op : BinaryOP) {
  switch(op) {
    case "+": return [`i32.add`];
    case "-": return [`i32.sub`];
    case ">": return [`i32.gt_s`];
    case ">=": return [`i32.ge_s`];
    case "<" : return [`i32.lt_s`];
    case "<=" : return [`i32.le_s`];
    case "*" : return [`i32.mul`];
    case "//" : return [`i32.div_s`];
    case "%" : return [`i32.rem_s`];
    case "==" : return [`i32.eq`];
    case "!=" : return [`i32.ne`];
    case "is" : return [`i32.eq`];

    default:
      throw new Error(`PARSE ERROR: Unhandled or unknown op: ${op}`);
  }
}

// To handle unary Op
export function codeGenException():Array<string>{
  return [`(local.set $scratch)
           (local.get $scratch)
           (local.get $scratch)
           (i32.eqz)
           (if
            (then
              call $throw_none_exception

            )

           )
           `];
}

export function codeGenExpr(expr : Expr<varType>, locals : LocalEnv) : Array<string> {
  switch(expr.tag) {
    case "method":{
      // {a?:A,tag:"method",lvalue:Expr<A>,name:string,args:Expr<A>[]}
      var lexprMethod = codeGenExpr(expr.lvalue,locals);
      var exceptionMethod = codeGenException().flat().join("\n");
      lexprMethod.push(exceptionMethod);
      var argsMethod = expr.args.map(e => codeGenExpr(e, locals)).flat().join("\n");
      lexprMethod.push(argsMethod);
      var methodName = "$" + expr.lvalue.a.value + "$" + expr.name;
      lexprMethod.push(`(call $${methodName})`);
      return lexprMethod;
    }

    case "getField":
      var lexpr = codeGenExpr(expr.lvalue,locals);
      // check if the class points to None, by checking its value to 0
      var exceptionCode = codeGenException().flat().join("\n");
      lexpr.push(exceptionCode);
      var fieldName = expr.rvalue;
      var className = expr.lvalue.a.value;
      var offset = locals.classFieldEnv.get(className+"."+fieldName)[0];
      var mem = offset*4;
      var loadString = `(i32.const ${mem})\n(i32.add)\n(i32.load)`;
      lexpr.push(loadString);
      return lexpr;
      // need to load
      break;
    case "literal": 
         switch(expr.literal.tag){
           case "num": return [`(i32.const ${expr.literal.value})`];
           case "bool":
                 switch(expr.literal.value){
                       case true: return [`(i32.const 1)`];
                       case false: return [`(i32.const 0)`];
                 }
            case "none":return [`(i32.const 0)`];

         }
         
         break;

    
    case "paran":
      var innerExpr = codeGenExpr(expr.inner,locals);
      return [...innerExpr];
    
    case "UniOperator":
      var myUniExpr = codeGenExpr(expr.right,locals);
      if(expr.opr===UniOp.Minus){
        return [`(i32.const 0)`,...myUniExpr,`(i32.sub)`];
      }else{
        return [`(i32.const 1)`,...myUniExpr,`(i32.xor)`];

      }

    case "id":
      // Since we type-checked for making sure all variable exist, here we
      // just check if it's a local variable and assume it is global if not
      if(locals.emptyEnv.has(expr.name)) { return [`(local.get $${expr.name})`]; }
      else { return [`(global.get $${expr.name})`]; }

    case "binOperator": {
      const lhsExprs = codeGenExpr(expr.left_opr, locals);
      const rhsExprs = codeGenExpr(expr.right_opr, locals);
      const opstmts = BinopStmts(expr.opr);
      return [...lhsExprs, ...rhsExprs, ...opstmts];
    }

    case "funcall":
      if(locals.classNames.has(expr.name)){
        // do something
        // Generate code for class and then call __init__ method
        return codeGenClass(expr,locals);
      }
      const valStmts = expr.args.map(e => codeGenExpr(e, locals)).flat();
      let toCall = expr.name;
      if(expr.name === "print") {
        switch(expr.args[0].a.tag) {
          case "bool": toCall = "print_bool"; break;
          case "int": toCall = "print_num"; break;
          case "none": toCall = "print_none"; break;
        }
      }
      valStmts.push(`(call $${toCall})`);
      return valStmts;
  }
}

function codeGenClass(expr : Expr<varType>, locals : LocalEnv) : Array<string> {
  
  if(expr.tag==="funcall"){
    
    var initvals:Array<string> = [];
    var classInfo = locals.classData.get(expr.name);
    
    if(classInfo.tag==="class"){
      classInfo.fields.forEach((c,i)=>{
        var offset = i*4;
        initvals = [
          ...initvals,
          `(i32.add (global.get $heap) (i32.const ${offset}))`,
          ...codeGenLit(c.value),
          `(i32.store)`
        ];
      });

      var methodInit = "$" + classInfo.name + "$" + "__init__";
      var initFound = false;
      classInfo.methods.forEach((f)=>{
        if(f.name==="__init__"){
          initFound = true;
        }
      });
      if(initFound){
        initvals = [...initvals,`(global.get $heap)`]
      }

      initvals= [
        ...initvals,
        `(global.get $heap)`,
        `(global.set $heap (i32.add (global.get $heap) (i32.const ${classInfo.fields.length * 4})))`,
      ];
      

      if(initFound){
        initvals = [...initvals,`(local.set $scratch (call $${methodInit}))`];
      }

    }

    

  }

  return initvals;
  

  
}

type CompileResult = {
  wasmSource: string,
};

function popClassEnv(stmt:Stmt<any>[],localEnv:LocalEnv){
  stmt.forEach((s)=>{
    if(s.tag==="class"){
      var name = s.name;
      localEnv.classNames.set(name,true);
      localEnv.classData.set(name,s);
      s.fields.forEach((f,i)=>{
        var fname = f.name;
        var classFname = name + "." + fname;
        var fieldType = f.type;
        localEnv.classFieldEnv.set(classFname,[i,fieldType]);

      })
    }
  })

}

export function compile(source : string) : string {
  let ast = parseProgram(source);
  ast = tcProgram(ast);

  const emptyEnv:LocalEnv = {} as LocalEnv;
  emptyEnv.emptyEnv = new Map<string,boolean>();
  emptyEnv.classFieldEnv =  new Map<string,[number,varType]>();
  emptyEnv.classNames = new Map<string,boolean>();
  emptyEnv.classData = new Map<string,Stmt<varType>>();
  //new Map<string, boolean>();
  const [vars, funs, stmts,classDef] = varsFunsStmts(ast);
  // To store the index of classFields within a class
  popClassEnv(classDef,emptyEnv);
  ////////////////////
  const funsCode : string[] = funs.map(f => codeGenStmt(f, emptyEnv)).map(f => f.join("\n"));
  const classFuncCode : string[] = classDef.map(f => codeGenClassMethod(f,emptyEnv)).map(f=>f.join("\n"));
  const allClassMethod = classFuncCode.join("\n\n");
  const allFuns = funsCode.join("\n\n");
  const varDecls = vars.map(v => `(global $${v} (mut i32) (i32.const 0))`).join("\n");

  const allStmts = stmts.map(s => codeGenStmt(s, emptyEnv)).flat();

  const main = [`(local $scratch i32)`, ...allStmts].join("\n");

  const lastStmt = ast[ast.length - 1];
  const isExpr = lastStmt.tag === "expr";
  var retType = "";
  var retVal = "";
  if(isExpr) {
    retType = "(result i32)";
    retVal = "(local.get $scratch)"
  }
//;;(func $print_bool (import "imports" "print_bool") (param i32) (result i32))
  return `
    (module
      (func $print_num (import "imports" "print_num") (param i32) (result i32))
      (func $throw_none_exception (import "imports" "throw_none_exception"))
      (func $print_bool (import "imports" "print_bool") (param i32) (result i32))
      (func $print_none (import "imports" "print_none") (param i32) (result i32))
      (memory (import "imports" "mem") 1)
      ${varDecls}
      (global $heap (mut i32) (i32.const 4))
      ${allFuns}
      ${allClassMethod}
      (func (export "_start") ${retType}
        ${main}
        ${retVal}
      )
    ) 
  `;
}

export function codeGenLit(l:Literal<varType>){
  switch(l.tag){
    case "num":
      return [`(i32.const ${l.value})`]
    case "bool":
      if(l.value) {return [`(i32.const 1)`]}
      if(!l.value) {return [`(i32.const 0)`]}
    case "none":
      return [`(i32.const 0)`];
  }
}

function classFields(varName:Var<varType>[]):Array<string>{
  var classVars:Array<string> = [];
  varName.forEach((v)=>{
    classVars.push(v.name);
  });
  return classVars;

}

export function codeGenClassMethod(func:Stmt<varType>, locals : LocalEnv): Array<string>{
  
  switch(func.tag){
    case "class":{
      var classMethod:FuncDef<varType>[] = func.methods;
      // var ClassParamsAndVariables:LocalEnv = {} as LocalEnv; 
      // ClassParamsAndVariables.emptyEnv= new Map<string, boolean>(locals.emptyEnv.entries());
      // ClassParamsAndVariables.classFieldEnv = new Map<string, [number,varType]>(locals.classFieldEnv.entries());
      var classvar = classFields(func.fields);
      // classvar.forEach(v=>ClassParamsAndVariables.emptyEnv.set(v,true));
      var classMethodArr:Array<string> = [];
      func.methods.forEach((v)=>{
        //setup local method environment
        var ClassParamsAndVariables:LocalEnv = {} as LocalEnv;
        ClassParamsAndVariables.classNames = new Map<string, boolean>(locals.classNames.entries());
        ClassParamsAndVariables.emptyEnv= new Map<string, boolean>();
        ClassParamsAndVariables.classFieldEnv = new Map<string, [number,varType]>(locals.classFieldEnv.entries());
        ClassParamsAndVariables.classData = new Map<string,Stmt<varType>>(locals.classData.entries());
        classvar.forEach(v=>ClassParamsAndVariables.emptyEnv.set(v,true));

        v.params.forEach((p)=>{
          ClassParamsAndVariables.emptyEnv.set(p.name,true);
        });
        var variables = variableNames(v.body);
        variables.forEach(v => ClassParamsAndVariables.emptyEnv.set(v, true));
        //end of local method env setup
        var funName = "$" + func.name + "$" + v.name;
        //var selfParam = `(param $self i32)`;
        var params = v.params.map(p => `(param $${p.name} i32)`).join(" ");
        //params = selfParam + " " + params;
        var varDecls = variables.map(v => `(local $${v} i32)`).join("\n");
        var stmts = v.body.map(s => codeGenStmt(s, ClassParamsAndVariables)).flat();
        var stmtsBody = stmts.join("\n");
        var allStmt = `(func $${funName} ${params} (result i32)
        (local $scratch i32)
        ${varDecls}
        ${stmtsBody}
        (i32.const 0))`
        classMethodArr.push(allStmt);   
      });

      return classMethodArr;

    }
  }

  

}



export function codeGenStmt(stmt : Stmt<varType>, locals : LocalEnv) : Array<string> {
  switch(stmt.tag) {
    case "FuncDef":
      const withParamsAndVariables:LocalEnv = {} as LocalEnv; 
      withParamsAndVariables.emptyEnv= new Map<string, boolean>(locals.emptyEnv.entries());
      withParamsAndVariables.classFieldEnv = new Map<string, [number,varType]>(locals.classFieldEnv.entries());
      // Construct the environment for the function body
      const variables = variableNames(stmt.body);
      variables.forEach(v => withParamsAndVariables.emptyEnv.set(v, true));
      stmt.params.forEach(p => withParamsAndVariables.emptyEnv.set(p.name, true));

      // Construct the code for params and variable declarations in the body
      const params = stmt.params.map(p => `(param $${p.name} i32)`).join(" ");
      const varDecls = variables.map(v => `(local $${v} i32)`).join("\n");

      const stmts = stmt.body.map(s => codeGenStmt(s, withParamsAndVariables)).flat();
      const stmtsBody = stmts.join("\n");
      return [`(func $${stmt.name} ${params} (result i32)
        (local $scratch i32)
        ${varDecls}
        ${stmtsBody}
        (i32.const 0))`];

    case "return":
      if(typeof stmt.return!='undefined'){
        var valStmts = codeGenExpr(stmt.return, locals);
        valStmts.push("return");
        return valStmts;
      }
      break;
      
      
      
    case "assign":
      var valStmts = codeGenExpr(stmt.value, locals);
      if(locals.emptyEnv.has(stmt.name)) { valStmts.push(`(local.set $${stmt.name})`); }
      else { valStmts.push(`(global.set $${stmt.name})`); }
      return valStmts;
    case "memberAssign":
      var leftStmt = codeGenExpr(stmt.lvalue,locals);
      // Check for exception
      var exceptionCode = codeGenException().flat().join("\n");
      leftStmt.push(exceptionCode);
      ////////
      var fieldName = stmt.rvalue;
      var rightExpr = codeGenExpr(stmt.value,locals).flat().join("\n");
      var className = stmt.lvalue.a.value;
      var [offset,vtype] = locals.classFieldEnv.get(className + "." + fieldName);
      var fieldMem = offset*4;
      var mem = `(i32.const ${fieldMem})\n(i32.add)\n`;
      leftStmt.push(mem);
      leftStmt.push(rightExpr);
      leftStmt.push(`i32.store`);
      return leftStmt;
      
      
    case "varInit":
      var myLit = codeGenLit(stmt.value.value);
      if(locals.emptyEnv.has(stmt.name)) {myLit.push(`(local.set $${stmt.name})`);}
      else { myLit.push(`(global.set $${stmt.name})`); }
      return myLit;
    
    case "expr":
      const result = codeGenExpr(stmt.expr, locals);
      result.push("(local.set $scratch)");
      return result;
    
    case "pass":
      break;
    
    case "while":
      var whileCond = codeGenExpr(stmt.cond,locals).flat().join("\n");
      var whileBody = stmt.body.flatMap((b)=>{
        if(b.tag=="varInit"){
          throw new Error("PARSE ERROR: Variable Initialization not allowed inside while");
        }
        return codeGenStmt(b,locals)
      }).join('\n');
      //var whileCode = [`(loop $loop_${loop_count} ${whileBody} ${whileCond} br_if $loop_${loop_count})`
                      //];
      var whileCode = [`(block $loop_${loop_count}end
                           (loop $loop_${loop_count}
                            ${whileCond} 
                            (i32.eqz)
                            (br_if $loop_${loop_count}end)
                            ${whileBody}
                            (br $loop_${loop_count})

                            )
                        )
                    `];      
      loop_count++;
      return whileCode;

    case "if":
      var ifCond = codeGenExpr(stmt.cond,locals).flat().join('\n');
      
      var ifBody = stmt.ifbody.flatMap((b)=>{
        if(b.tag=="varInit"){
          throw new Error("PARSE ERROR: Variable Initialization not allowed inside If");
        }
        return codeGenStmt(b,locals);
      }).join('\n');

      if(typeof stmt.elif != 'undefined'){
        var elif = stmt.elif.pop()
        var elifCond = elif.cond;
        var elifbody = elif.body;
        if(stmt.elif.length==0){
          stmt.elif = undefined; // doing this is important as after popping from array, we should
                                 // not enter the elif loop again
        }
        // using recursion idea here. The elif body and cond become the if's new body and cond, so that 
        // we have if() else(if() else()....) like this

        return [`${ifCond}
        (if
          ( then
            ${ifBody}
          )
          (else
            ${codeGenStmt({...stmt,ifbody:elifbody,cond:elifCond},locals)}
          )

        )
        
        `]
      }else if(typeof stmt.else !=='undefined'){
        var elseBody = stmt.else.body.flatMap((b)=>{
          if(b.tag=="varInit"){
            throw new Error("PARSE ERROR: Variable Initialization not allowed inside else body");
          }
          return codeGenStmt(b,locals);
        }).join('\n');

        return [`${ifCond}
                (if
                  (then
                    ${ifBody}

                  )
                  (else
                    ${elseBody}

                  )
                

                )
        
              `]
      }else{
        return [`${ifCond}
               (if
                (then
                  ${ifBody}
                )
               )
               `]
      }

  }
}







