import { ConvertSInt32ToFloat32 } from 'binaryen';
import { endianness, loadavg, type } from 'os';
import { env } from 'process';
import { isJSDocNamepathType, parseCommandLine } from 'typescript';
import {VarType,BinBoolOpMap,Stmt,Expr,BinaryOP,Var,FuncDef,TypedVar,Literal,Elif,Else, UniOp,varType} from './ast'

type idMap = {
    vars: Map<string,varType>,
    func: Map<string,[varType[],varType]>,
    class: Map<string,[string,Array<string>,Array<string>]>,
    classMethod: Map<string,[varType[],varType]>,
    classFields: Map<string,varType>;
    // class Name -> parent, [Map<varName,type>,Map<funName,[params_type[],retType]>]
    ret: varType
};



export function tcProgram(p : Stmt<any>[]) : Stmt<varType>[] {
    //const functions = new Map<string, [VarType[], VarType]>();
    //const globals = new Map<string, VarType>();
    const EnvMaps:idMap = {} as idMap;
    EnvMaps.vars = new Map<string, varType>();
    EnvMaps.func = new Map<string,[varType[],varType]>();
    EnvMaps.class = new Map<string,[string,Array<string>,Array<string>]>();
    EnvMaps.classFields = new Map<string,varType>();
    EnvMaps.classMethod = new Map<string,[varType[],varType]>();
    EnvMaps.ret = {tag:"none",value:VarType.none};

    var start_ret:varType = {tag:"none",value:VarType.none};
    p.forEach(s => {
      if(s.tag === "FuncDef") {
        EnvMaps.func.set(s.name, [s.params.map(p => p.type), s.ret]);
      }
      if(s.tag==="class"){
          EnvMaps.class.set(s.name,[s.parent,s.fields.map(p=>p.name),s.methods.map(p => p.name)]);
          // Populate Field class
          let className = s.name;
          s.methods.forEach((m)=>{
              let fun_name = m.name;
              let classmethodName = className + "." + fun_name;
              EnvMaps.classMethod.set(classmethodName,[m.params.map(a=>a.type),m.ret]);

          });

          s.fields.forEach((d)=>{
              let fieldname = d.name;
              let classFieldName = className + "." + fieldname;
              EnvMaps.classFields.set(classFieldName,d.type);
              
          })

      }
    });

   
    p.forEach(s=>{
        if(s.tag==="varInit"&& EnvMaps.class.has(s.name)){
            throw new Error("REFERENCE ERROR: Duplicate decalaration of identifier in the same scope :" + s.name);
        }
        if(s.tag==="FuncDef" && EnvMaps.class.has(s.name)){
            throw new Error("REFERENCE ERROR: Duplicate decalaration of identifier in the same scope :" + s.name);
        }

    });
    return p.map(s => {
          var insideFunc:boolean = false;
          var insideClass:boolean = false;
          if(s.tag==="FuncDef"){insideFunc=true;}
          if(s.tag==="class"){insideClass=true;}
          const res = tcStmt(s, EnvMaps,start_ret,insideFunc,insideClass);
          return res;
      });

    // return p.map(s => {
    //   if(s.tag === "assign") {
    //     const rhs = tcExpr(s.value,EnvMaps);
    //     EnvMaps.vars.set(s.name, rhs.a);
    //     return { ...s, value: rhs };
    //   }
    //   else {
    //     const res = tcStmt(s, EnvMaps,VarType.none);
    //     return res;
    //   }
    // });
  }
   
  export function tcElif(s:Elif<any>,localEnv:idMap,currentReturn:varType,insideFunc:boolean,insideClass:boolean){
      var myElifCond = tcExpr(s.cond,localEnv,insideFunc,insideClass);
      if(myElifCond.a.value !== VarType.bool){
        throw new Error(`TYPE ERROR: Condition expression cannot be of type ${myElifCond.a.value}`);
    }
      var myElifBody:Stmt<any>[] =[];
      s.body.forEach((b)=>{
          myElifBody.push(tcStmt(b,localEnv,currentReturn,insideFunc,insideClass));
      });

      return {...s,cond:myElifCond,body:myElifBody};
  }


  export function tcElse(s:Else<any>,localEnv:idMap,currentReturn:varType,insideFunc:boolean,insideClass:boolean){
      var myElseBody:Stmt<any>[] =[];
      s.body.forEach((b)=>{
          myElseBody.push(tcStmt(b,localEnv,currentReturn,insideFunc,insideClass));
      })

      return {...s,body:myElseBody};
  }

  export function tcVarInit(s:Var<any>): Var<varType>{

    var myLit = tcLiteral(s.value);

    if(s.type.tag==="object" && myLit.tag!=="none"){
        throw new Error(`TYPE ERROR: Expected ${s.type.value}; but got ${myLit.a.value}`);
    }
    if((s.type.value!=myLit.a.value) && (s.type.tag!=="object")){
        throw new Error(`TYPE ERROR: Expected ${s.type.value}; but got ${myLit.a.value}`);
    }
    if(s.type.tag==="object"){
        return {...s,a:s.type,value:myLit};
    }
    return {...s,a:myLit.type,value:myLit};

  }

  
  export function tcStmt(s : Stmt<any>, localEnv:idMap, currentReturn : varType, insideFunc:boolean,insideClass:boolean) : Stmt<varType> {

    switch(s.tag) {
      case "varInit":{
        
        var myVar = tcVarInit(s.value);
        localEnv.vars.set(s.name,myVar.type);
        return {...s,a:myVar.a, value:myVar};
      }

      case "FuncDef": {
        var FuncEnvMaps:idMap = {} as idMap;
        var bodyvars = new Map<string, varType>(localEnv.vars.entries());
        var funcvars = new Map<string,[varType[],varType]>(localEnv.func.entries());
        var classNames = new Map<string,[string,Array<string>,Array<string>]>(localEnv.class.entries());
        var classF = new Map<string,varType>(localEnv.classFields.entries());
        var classM = new Map<string,[varType[],varType]>(localEnv.classMethod.entries());
        s.params.forEach(p => { bodyvars.set(p.name, p.type)});
        FuncEnvMaps.vars = bodyvars;
        FuncEnvMaps.func = funcvars; 
        FuncEnvMaps.class = classNames;
        FuncEnvMaps.classFields = classF;
        FuncEnvMaps.classMethod = classM;
        const newStmts = s.body.map(bs => tcStmt(bs, FuncEnvMaps, s.ret,true,insideClass));
        var ret:any;
        var retSeen:boolean=false;
        newStmts.forEach((n)=>{
            if(n.tag==="return"){
                retSeen = true;
                if(n.a.tag==="object"){
                    ret = {tag:"object",value:n.a.value}
                }else{
                    ret = n.a;
                }
            }
        });
        if(retSeen && s.ret.tag==="object" && ret.value===VarType.none){
            return {...s,body:newStmts,a:s.ret};
        }
        if(retSeen && ret.value!==s.ret.value){
            throw new Error(`TYPE ERROR: Expected ${s.ret.value}, but got ${ret.value}`);
        }
        if(!retSeen && s.ret.value!==VarType.none){
            throw new Error(`TYPE ERROR: Expected ${s.ret.value}, but got None`);
        }
        // Go through the statements and check if we have return statement



        return {...s,body:newStmts,a:s.ret};
        

      }

      case "class":{
          var myClassname = s.name;
          var parentName = s.parent;
          if(parentName!=="object" && !localEnv.class.has(parentName)){
              throw new Error(`REFERENCE ERROR: Super class not defined: ${parentName}`);
          }
          var ClassEnv:idMap = {} as idMap;
          // Skip class varInit as global var not valid inside class, 
          // class functions for this class, all others stay the same
          var classBodyVars = new Map<string, varType>();
          var funcVars = new Map<string,[varType[],varType]>();
          // Populate function var related to this class
          s.methods.forEach((m)=>{
              funcVars.set(m.name,[m.params.map(g=>g.type),m.ret]);
          })
          var classNames = new Map<string,[string,Array<string>,Array<string>]>(localEnv.class.entries());
          var classF = new Map<string,varType>(localEnv.classFields.entries());
          var classM = new Map<string,[varType[],varType]>(localEnv.classMethod.entries());
          ClassEnv.vars = classBodyVars;
          ClassEnv.class = classNames;
          ClassEnv.classFields = classF;
          ClassEnv.classMethod = classM;
          ClassEnv.func = funcVars;

          var fields:Var<any>[] = [];
          s.fields.forEach((f)=>{
              
              let myLit = tcLiteral(f.value);
              
              fields.push({...f,a:f.type,value:myLit});
          })
          var myFunc:FuncDef<any>[] = [];
          s.methods.forEach((m)=>{
              let myfuncStmt = tcStmt(m,ClassEnv,m.ret,true,true);
              if(myfuncStmt.tag==="FuncDef"){
                  let myfunc:FuncDef<any> = {a:myfuncStmt.ret,tag: "FuncDef",name: myfuncStmt.name,params:myfuncStmt.params,ret:myfuncStmt.ret,init:myfuncStmt.init,body:myfuncStmt.body};
                  myFunc.push(myfunc);
              }
                  
              });
          
          return {...s,fields:fields,methods:myFunc,a:{tag:"object",value:s.name}}
      }

      case "memberAssign":{
          var lval = tcExpr(s.lvalue,localEnv,insideFunc,insideClass);
          var rval = tcExpr(s.value,localEnv,insideFunc,insideClass);
          var myClassName = lval.a.value;
          var myFieldName = myClassName + "." + s.rvalue;
          if(!localEnv.classFields.has(myFieldName)){
              throw new Error(`REFERENCE ERROR: There is no attribute named ${s.rvalue} in class ${myClassName}`);
          }
          if(localEnv.classFields.get(myFieldName).value!==rval.a.value){
              throw new Error(`TYPE ERROR: Expected ${localEnv.classFields.get(myFieldName).value} but got ${rval.a.value}`);
          }
          return {...s,lvalue:lval,value:rval,a:lval.a}
          
      }
      case "assign": {
        //console.log("Here")
        const rhs = tcExpr(s.value,localEnv,insideFunc,insideClass);
        //console.log(localEnv.vars.has(s.name))
        if(!localEnv.vars.has(s.name)){
            throw new Error(`TYPE ERROR: Not a variable ${s.name}`);
        }
        if((localEnv.vars.get(s.name).value !== rhs.a.value) && !(localEnv.vars.get(s.name).tag==="object" && rhs.a.value==VarType.none)) {
          throw new Error(`TYPE ERROR: Expected \`${localEnv.vars.get(s.name).value}\`; but got ${rhs.a.value}`);
        }
        else {
          if(localEnv.vars.get(s.name).tag==="object"){
            localEnv.vars.set(s.name, {tag:"object",value:localEnv.vars.get(s.name).value});
            return { ...s, value: rhs, a:localEnv.vars.get(s.name)};
          }else{
          localEnv.vars.set(s.name, rhs.a);
          }
        }
        return { ...s, value: rhs, a:rhs.a};
      }
    

      case "if":{
          var myIfCond = tcExpr(s.cond,localEnv,insideFunc,insideClass);
          if(myIfCond.a.value !== VarType.bool){
            throw new Error(`TYPE ERROR: Condition expression cannot be of type ${myIfCond.a.value}`);
          }
          var myIfBody:Stmt<any>[] = [];
          s.ifbody.forEach((b)=>{
            myIfBody.push(tcStmt(b,localEnv,currentReturn,insideFunc,insideClass));
          })
          var elifSeen = false;
          var elseSeen = false;
          var myElifArr:Array<Elif<any>> = [];
          if(typeof s.elif !== 'undefined'){
            elifSeen=true;
            s.elif.forEach((e)=>{
                myElifArr.push(tcElif(e,localEnv,currentReturn,insideFunc,insideClass));
            })
          }
          
          var myElse:Else<any> = {} as Else<any>;

          if(typeof s.else !== 'undefined'){
              elseSeen=true
              myElse = tcElse(s.else,localEnv,currentReturn,insideFunc,insideClass);
          }
          if(elifSeen && elseSeen){
              return {...s,cond:myIfCond,ifbody:myIfBody,elif:myElifArr,else:myElse};
          }
          if(elseSeen){
            return {...s,cond:myIfCond,ifbody:myIfBody,else:myElse};
          }

          return {...s,cond:myIfCond,ifbody:myIfBody};
          

      }

      case "while":{
          var myWhileBody:Stmt<any>[] = [];
          s.body.forEach((b)=>{
              myWhileBody.push(tcStmt(b,localEnv,currentReturn,insideFunc,insideClass));
          })

          var myWhileCond = tcExpr(s.cond,localEnv,insideFunc,insideClass);
          if(myWhileCond.a.value!==VarType.bool){
              throw new Error(`TYPE ERROR: Condition expression be ${myWhileCond.a}`);
          }
          return {...s,cond:myWhileCond,body:myWhileBody}
      }
      case "expr": {
        const ret = tcExpr(s.expr, localEnv,insideFunc,insideClass);
        return { ...s, expr: ret , a:ret.a};
      }
      
      case "pass": {
          return {...s,a:{tag:"none",value:VarType.none}};
      }

      case "return": {
        if(!insideFunc){
            throw new Error(`PARSE ERROR: Return statement cannot appear at top level`);
        }
        if(typeof s.return != 'undefined'){
            const valTyp = tcExpr(s.return, localEnv,insideFunc,insideClass);
            // Added to support None returned for object
            if(currentReturn.tag==="object" && valTyp.a.value===VarType.none){
                return {...s,return:valTyp,a:valTyp.a}

            }

            if(valTyp.a.value !== currentReturn.value) {
               throw new Error(`TYPE ERROR: ${valTyp.a.value} returned but ${currentReturn.value} expected.`);
            }
            return { ...s, return: valTyp,a:valTyp.a};
        }
        if(currentReturn.value!=VarType.none){
            throw new Error(`TYPE ERROR: Expected ${currentReturn}; but got None`);
        }
        return {...s,a:{tag:"none",value:VarType.none}};
        
      }
    }
  }


export function tcExpr(expr: Expr<any>, localenv:idMap,insideFunc:boolean,insideClass:boolean): Expr<varType>{
    switch(expr.tag){
        case "id":
            if(!localenv.vars.has(expr.name)){
                throw new Error(`TYPE ERROR: Not a variable ${expr.name}`);
            }
            return {...expr, a:localenv.vars.get(expr.name)};

        case "getField":{
            var lexpr = tcExpr(expr.lvalue,localenv,insideFunc,insideClass);
            var fname = expr.rvalue;
            var lookupname = lexpr.a.value + "." + fname;
            if(!localenv.classFields.has(lookupname)){
                throw new Error(`REFERENCE ERROR: There is no attribute named ${fname} in class ${lexpr.a.value}`);
            }
            var retType = localenv.classFields.get(lookupname);
            return {...expr,a:retType,lvalue:lexpr}
        
        }

        case "method":{
            let leftMethod = tcExpr(expr.lvalue,localenv,insideFunc,insideClass);
            let className = leftMethod.a.value;
            let funName = expr.name;
            let classFunName = className + "." + funName;
            if(!localenv.classMethod.has(classFunName)){
                throw new Error(`REFERENCE ERROR: There is no method names ${funName} in class ${className}`);
            }
            let [methodArg,methodRetVal] = localenv.classMethod.get(classFunName);
            if(expr.args.length!==methodArg.length-1){
                throw new Error(`REFERENCE ERROR: Expected ${methodArg.length} arguments but got ${expr.args.length}`);
            }
            var mynewArgs:Expr<varType>[] = [];
            for (let i = 1; i < methodArg.length; i++) {
                let argtyp = tcExpr(expr.args[i-1], localenv,insideFunc,insideClass);
                if(argtyp.a.value!==methodArg[i].value){
                    throw new Error(`TYPE ERROR: Got ${argtyp.a.value}, but expected ${methodArg[i].value}`);
                }
                mynewArgs.push(argtyp);
            }

            // let newArgs = methodArg.map((a,i)=>{
            //     let argtyp = tcExpr(expr.args[i-1], localenv,insideFunc,insideClass);
            //     if(argtyp.a.value!==a.value){
            //         throw new Error(`Got ${argtyp.a.value}, but expected ${a.value}`);
            //     }
            //     return argtyp;
            // });
            return {...expr,lvalue:leftMethod,a:methodRetVal,args:mynewArgs}
        }
        case "funcall":
            if(expr.name === "print") {
                if(expr.args.length !== 1) { throw new Error("TYPE ERROR: print expects a single argument"); }
                const newArgs = [tcExpr(expr.args[0], localenv,insideFunc,insideClass)];
                const res : Expr<varType> = { ...expr, a: {tag:"none",value:VarType.none}, args: newArgs } ;
                return res;
              }
              if(localenv.class.has(expr.name)){
                  // Means its a class call
                  return {...expr,a:{tag:"object",value:expr.name}};
              }
              if(!localenv.func.has(expr.name)) {
                throw new Error(`REFERENCE ERROR: Not a function or class ${expr.name}`);
              }
        
              const [args, ret] = localenv.func.get(expr.name);
              if(args.length !== expr.args.length) {
                throw new Error(`REFERENCE ERROR: Expected ${args.length} arguments but got ${expr.args.length}`);
              }
        
              const newArgs = args.map((a, i) => {
                const argtyp = tcExpr(expr.args[i], localenv,insideFunc,insideClass);
                if(a.value !== argtyp.a.value) { throw new Error(`TYPE ERROR: Got ${argtyp.a.value} as argument ${i + 1}, expected ${a.value}`); }
                return argtyp
              });
        
              return { ...expr, a: ret, args: newArgs };
        

    
        case "literal":
            const litType = tcLiteral(expr.literal);
            return {...expr,a:litType.a,literal:litType};

        case "binOperator":
            var left = tcExpr(expr.left_opr,localenv,insideFunc,insideClass);
            var right = tcExpr(expr.right_opr,localenv,insideFunc,insideClass);
            var opr = expr.opr;
            if(checkOpInt(opr)){
                if(left.a.value==VarType.int && right.a.value==VarType.int){
                    if(opr===BinaryOP.Gt || opr===BinaryOP.Lt || opr===BinaryOP.Gte || opr===BinaryOP.Lte || opr===BinaryOP.Eq || opr===BinaryOP.Neq){
                        return {...expr,left_opr:left, right_opr:right,a:{tag:"bool",value:VarType.bool}};
                    }
                    return {...expr,left_opr:left, right_opr:right,a:{tag:"int",value:VarType.int}};
                }
                throw new Error(`TYPE ERROR: Cannot apply operator \`${opr}\` on types \`${left.a.value}\` and ${right.a.value}`);

            }
            if (checkOpBoth(opr)){
                if((left.a.value===right.a.value) && (left.a.tag!=="object" && right.a.tag!=="object"))
                {
                    if(opr===BinaryOP.Gt || opr===BinaryOP.Lt || opr===BinaryOP.Gte || opr===BinaryOP.Lte || opr===BinaryOP.Eq || opr===BinaryOP.Neq){
                        return {...expr,left_opr:left, right_opr:right,a:{tag:"bool",value:VarType.bool}};
                    }
                    
                    return {...expr,left_opr:left,right_opr:right,a:left.a};

                }else{
                    throw new Error(`TYPE ERROR: Cannot apply operator \`${opr}\` on types \`${left.a.value}\` and ${right.a.value}`);
                }
            } 
            if(checkOpNone(opr)){
                if((left.a.tag===right.a.tag) || (left.a.tag==="object" && right.a.value===VarType.none) || (right.a.tag==="object" && left.a.value===VarType.none)){
                    return {...expr,left_opr:left, right_opr:right,a:{tag:"bool",value:VarType.bool}};
                }else{
                    throw new Error(`TYPE ERROR: Cannot apply operator \`${opr}\` on types \`${left.a.value}\` and ${right.a.value}`);
                }
            }
            break;
        
        case "UniOperator":
            var myOpr = expr.opr;
            var myUniExpr = tcExpr(expr.right,localenv,insideFunc,insideClass);
            if(myOpr===UniOp.Not){
                if(myUniExpr.a.value == VarType.bool){
                    return {...expr,right:myUniExpr,a:{tag:"bool",value:VarType.bool}};
                }else{
                    throw new Error(`TYPE ERROR: Cannot apply operator \`not\` on type \`int\``);
                }

            }else{
                if(myUniExpr.a.value==VarType.int){
                    return {...expr,right:myUniExpr,a:{tag:"int",value:VarType.int}};
                }else{
                    throw new Error(`TYPE ERROR: Cannot apply operator \`-\` on type \`bool\``);
                }

            }
        
        case "paran":
            var myInnerExpr = tcExpr(expr.inner,localenv,insideFunc,insideClass);
            return {...expr,inner:myInnerExpr,a:myInnerExpr.a};
        
        case "literal":
            var myLit = tcLiteral(expr.literal);
            return {...expr,literal:myLit,a:myLit.a}


        
    }
}


export function tcLiteral(literal: Literal<any>): Literal<varType> {

    switch(literal.tag){
        case "num":
            return {...literal,a:{tag:"int",value:VarType.int}};
        case "bool":
            return {...literal,a:{tag:"bool",value:VarType.bool}};
        case "none":
            return {...literal,a:{tag:"none",value:VarType.none}};
        default:
            throw new Error(`TYPE ERROR: Invalid type annotation`);
    }

}

// export function tcVars(va: Var<null>[], env: idMap): Var<Type>[]{
//     const typedVar:Var<Type>[] = [];
//     va.forEach((v) => {
//         const litType = tcLiteral(v.value);
//         if(litType.a == v.type){
//             env.vars.set(v.name,v.type);
//             typedVar.push({...v,a:litType.a,value:litType});
//         }else{
//             throw new Error(`Expected type " + \`${v.type}\`, but got \`${litType.a}\``);
//         }

//     })
//     return typedVar;
// }


// export function tcFunction(func: FuncDef<null>[], env:idMap): FuncDef<idMap>[]{


// }

// export function tcStatements(smts: Stmt<null>[], env: idMap): Stmt<Type>[]{
//     const typedSmts:Stmt<Type>[] = [];
//     smts.forEach((smt) => {
//         switch(smt.tag){
//             case "assign":
//                 const typedRightVal = tcExpr(smt.value,env);
//                 if(!env.vars.has(smt.name)){
//                     throw new Error(`Not a variable ${smt.name}`);
//                 }
//                 if(typedRightVal.a!=env.vars.get(smt.name)){
//                     throw new Error(`Expected type \`${env.vars.get(smt.name)}\`; but got \`${typedRightVal.a}\``);
//                 }
//                 typedSmts.push({...smt,value:typedRightVal,a:Type.none});
//                 break;
//             case "return":
//                 if(env.ret==Type.none){
//                     throw new Error(`Return statement cannot appear at the top level`);
//                 }
//                 const typeRet = tcExpr(smt.return,env);
//                 if(env.ret!=typeRet.a){
//                     throw new Error(`Expected \`${env.ret}\`; but got ${typeRet.a}\`\``);
//                 }
//                 typedSmts.push({...smt,return:typeRet,a:typeRet.a});
//                 break;
//             case "pass":
//                 typedSmts.push({...smt,a:Type.none});
//                 break;
//             case "expr":
//                 const expTc = tcExpr(smt.expr,env);
//                 typedSmts.push({...smt,expr:expTc,a:expTc.a})
//                 break;
//         }
//     })

//     return typedSmts;

// }

// export function tcParams(params: TypedVar<null>[]):TypedVar<Type>[]{
//     return params.map((param) =>{
//         return {...param,a:param.type};
//     })
// }

export function checkOpInt(op: BinaryOP): boolean {

    if(op==BinaryOP.Add || op==BinaryOP.Mul || op==BinaryOP.Sub || op==BinaryOP.Gt || op==BinaryOP.Lt || op==BinaryOP.Gte || op==BinaryOP.Lte || op==BinaryOP.Int_Div || op==BinaryOP.Mod){
        return true;
    }

    return false;

}

export function checkOpNone(op:BinaryOP):boolean {
    if(op===BinaryOP.Is){
        return true;
    }
    return false;
}

export function checkOpBoth(op: BinaryOP): boolean {

    if(op==BinaryOP.Eq || op == BinaryOP.Neq){
        return true;
    }

    return false;

}



