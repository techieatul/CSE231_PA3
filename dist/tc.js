"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOpBoth = exports.checkOpNone = exports.checkOpInt = exports.tcLiteral = exports.tcExpr = exports.tcStmt = exports.tcVarInit = exports.tcElse = exports.tcElif = exports.tcProgram = void 0;
var ast_1 = require("./ast");
function tcProgram(p) {
    //const functions = new Map<string, [VarType[], VarType]>();
    //const globals = new Map<string, VarType>();
    var EnvMaps = {};
    EnvMaps.vars = new Map();
    EnvMaps.func = new Map();
    EnvMaps.class = new Map();
    EnvMaps.classFields = new Map();
    EnvMaps.classMethod = new Map();
    EnvMaps.ret = { tag: "none", value: ast_1.VarType.none };
    var start_ret = { tag: "none", value: ast_1.VarType.none };
    p.forEach(function (s) {
        if (s.tag === "FuncDef") {
            EnvMaps.func.set(s.name, [s.params.map(function (p) { return p.type; }), s.ret]);
        }
        if (s.tag === "class") {
            EnvMaps.class.set(s.name, [s.parent, s.fields.map(function (p) { return p.name; }), s.methods.map(function (p) { return p.name; })]);
            // Populate Field class
            var className_1 = s.name;
            s.methods.forEach(function (m) {
                var fun_name = m.name;
                var classmethodName = className_1 + "." + fun_name;
                EnvMaps.classMethod.set(classmethodName, [m.params.map(function (a) { return a.type; }), m.ret]);
            });
            s.fields.forEach(function (d) {
                var fieldname = d.name;
                var classFieldName = className_1 + "." + fieldname;
                EnvMaps.classFields.set(classFieldName, d.type);
            });
        }
    });
    p.forEach(function (s) {
        if (s.tag === "varInit" && EnvMaps.class.has(s.name)) {
            throw new Error("REFERENCE ERROR: Duplicate decalaration of identifier in the same scope :" + s.name);
        }
        if (s.tag === "FuncDef" && EnvMaps.class.has(s.name)) {
            throw new Error("REFERENCE ERROR: Duplicate decalaration of identifier in the same scope :" + s.name);
        }
    });
    return p.map(function (s) {
        var insideFunc = false;
        var insideClass = false;
        if (s.tag === "FuncDef") {
            insideFunc = true;
        }
        if (s.tag === "class") {
            insideClass = true;
        }
        var res = tcStmt(s, EnvMaps, start_ret, insideFunc, insideClass);
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
exports.tcProgram = tcProgram;
function tcElif(s, localEnv, currentReturn, insideFunc, insideClass) {
    var myElifCond = tcExpr(s.cond, localEnv, insideFunc, insideClass);
    if (myElifCond.a.value !== ast_1.VarType.bool) {
        throw new Error("TYPE ERROR: Condition expression cannot be of type ".concat(myElifCond.a.value));
    }
    var myElifBody = [];
    s.body.forEach(function (b) {
        myElifBody.push(tcStmt(b, localEnv, currentReturn, insideFunc, insideClass));
    });
    return __assign(__assign({}, s), { cond: myElifCond, body: myElifBody });
}
exports.tcElif = tcElif;
function tcElse(s, localEnv, currentReturn, insideFunc, insideClass) {
    var myElseBody = [];
    s.body.forEach(function (b) {
        myElseBody.push(tcStmt(b, localEnv, currentReturn, insideFunc, insideClass));
    });
    return __assign(__assign({}, s), { body: myElseBody });
}
exports.tcElse = tcElse;
function tcVarInit(s) {
    var myLit = tcLiteral(s.value);
    if (s.type.tag === "object" && myLit.tag !== "none") {
        throw new Error("TYPE ERROR: Expected ".concat(s.type.value, "; but got ").concat(myLit.a.value));
    }
    if ((s.type.value != myLit.a.value) && (s.type.tag !== "object")) {
        throw new Error("TYPE ERROR: Expected ".concat(s.type.value, "; but got ").concat(myLit.a.value));
    }
    if (s.type.tag === "object") {
        return __assign(__assign({}, s), { a: s.type, value: myLit });
    }
    return __assign(__assign({}, s), { a: myLit.type, value: myLit });
}
exports.tcVarInit = tcVarInit;
function tcStmt(s, localEnv, currentReturn, insideFunc, insideClass) {
    switch (s.tag) {
        case "varInit": {
            var myVar = tcVarInit(s.value);
            localEnv.vars.set(s.name, myVar.type);
            return __assign(__assign({}, s), { a: myVar.a, value: myVar });
        }
        case "FuncDef": {
            var FuncEnvMaps = {};
            var bodyvars = new Map(localEnv.vars.entries());
            var funcvars = new Map(localEnv.func.entries());
            var classNames = new Map(localEnv.class.entries());
            var classF = new Map(localEnv.classFields.entries());
            var classM = new Map(localEnv.classMethod.entries());
            s.params.forEach(function (p) { bodyvars.set(p.name, p.type); });
            FuncEnvMaps.vars = bodyvars;
            FuncEnvMaps.func = funcvars;
            FuncEnvMaps.class = classNames;
            FuncEnvMaps.classFields = classF;
            FuncEnvMaps.classMethod = classM;
            var newStmts = s.body.map(function (bs) { return tcStmt(bs, FuncEnvMaps, s.ret, true, insideClass); });
            var ret;
            var retSeen = false;
            newStmts.forEach(function (n) {
                if (n.tag === "return") {
                    retSeen = true;
                    if (n.a.tag === "object") {
                        ret = { tag: "object", value: n.a.value };
                    }
                    else {
                        ret = n.a;
                    }
                }
            });
            if (retSeen && s.ret.tag === "object" && ret.value === ast_1.VarType.none) {
                return __assign(__assign({}, s), { body: newStmts, a: s.ret });
            }
            if (retSeen && ret.value !== s.ret.value) {
                throw new Error("TYPE ERROR: Expected ".concat(s.ret.value, ", but got ").concat(ret.value));
            }
            if (!retSeen && s.ret.value !== ast_1.VarType.none) {
                throw new Error("TYPE ERROR: Expected ".concat(s.ret.value, ", but got None"));
            }
            // Go through the statements and check if we have return statement
            return __assign(__assign({}, s), { body: newStmts, a: s.ret });
        }
        case "class": {
            var myClassname = s.name;
            var parentName = s.parent;
            if (parentName !== "object" && !localEnv.class.has(parentName)) {
                throw new Error("REFERENCE ERROR: Super class not defined: ".concat(parentName));
            }
            var ClassEnv = {};
            // Skip class varInit as global var not valid inside class, 
            // class functions for this class, all others stay the same
            var classBodyVars = new Map();
            var funcVars = new Map();
            // Populate function var related to this class
            s.methods.forEach(function (m) {
                funcVars.set(m.name, [m.params.map(function (g) { return g.type; }), m.ret]);
            });
            var classNames = new Map(localEnv.class.entries());
            var classF = new Map(localEnv.classFields.entries());
            var classM = new Map(localEnv.classMethod.entries());
            ClassEnv.vars = classBodyVars;
            ClassEnv.class = classNames;
            ClassEnv.classFields = classF;
            ClassEnv.classMethod = classM;
            ClassEnv.func = funcVars;
            var fields = [];
            s.fields.forEach(function (f) {
                var myLit = tcLiteral(f.value);
                fields.push(__assign(__assign({}, f), { a: f.type, value: myLit }));
            });
            var myFunc = [];
            s.methods.forEach(function (m) {
                var myfuncStmt = tcStmt(m, ClassEnv, m.ret, true, true);
                if (myfuncStmt.tag === "FuncDef") {
                    var myfunc = { a: myfuncStmt.ret, tag: "FuncDef", name: myfuncStmt.name, params: myfuncStmt.params, ret: myfuncStmt.ret, init: myfuncStmt.init, body: myfuncStmt.body };
                    myFunc.push(myfunc);
                }
            });
            return __assign(__assign({}, s), { fields: fields, methods: myFunc, a: { tag: "object", value: s.name } });
        }
        case "memberAssign": {
            var lval = tcExpr(s.lvalue, localEnv, insideFunc, insideClass);
            var rval = tcExpr(s.value, localEnv, insideFunc, insideClass);
            var myClassName = lval.a.value;
            var myFieldName = myClassName + "." + s.rvalue;
            if (!localEnv.classFields.has(myFieldName)) {
                throw new Error("REFERENCE ERROR: There is no attribute named ".concat(s.rvalue, " in class ").concat(myClassName));
            }
            if ((localEnv.classFields.get(myFieldName).value !== rval.a.value) && !(localEnv.classFields.get(myFieldName).tag === "object" && rval.a.value == ast_1.VarType.none)) {
                throw new Error("TYPE ERROR: Expected ".concat(localEnv.classFields.get(myFieldName).value, " but got ").concat(rval.a.value));
            }
            // return {...s,lvalue:lval,value:rval,a:lval.a}
            return __assign(__assign({}, s), { lvalue: lval, value: rval, a: localEnv.classFields.get(myFieldName) });
        }
        case "assign": {
            //console.log("Here")
            var rhs = tcExpr(s.value, localEnv, insideFunc, insideClass);
            //console.log(localEnv.vars.has(s.name))
            if (!localEnv.vars.has(s.name)) {
                throw new Error("TYPE ERROR: Not a variable ".concat(s.name));
            }
            if ((localEnv.vars.get(s.name).value !== rhs.a.value) && !(localEnv.vars.get(s.name).tag === "object" && rhs.a.value == ast_1.VarType.none)) {
                throw new Error("TYPE ERROR: Expected `".concat(localEnv.vars.get(s.name).value, "`; but got ").concat(rhs.a.value));
            }
            else {
                if (localEnv.vars.get(s.name).tag === "object") {
                    localEnv.vars.set(s.name, { tag: "object", value: localEnv.vars.get(s.name).value });
                    return __assign(__assign({}, s), { value: rhs, a: localEnv.vars.get(s.name) });
                }
                else {
                    localEnv.vars.set(s.name, rhs.a);
                }
            }
            return __assign(__assign({}, s), { value: rhs, a: rhs.a });
        }
        case "if": {
            var myIfCond = tcExpr(s.cond, localEnv, insideFunc, insideClass);
            if (myIfCond.a.value !== ast_1.VarType.bool) {
                throw new Error("TYPE ERROR: Condition expression cannot be of type ".concat(myIfCond.a.value));
            }
            var myIfBody = [];
            s.ifbody.forEach(function (b) {
                myIfBody.push(tcStmt(b, localEnv, currentReturn, insideFunc, insideClass));
            });
            var elifSeen = false;
            var elseSeen = false;
            var myElifArr = [];
            if (typeof s.elif !== 'undefined') {
                elifSeen = true;
                s.elif.forEach(function (e) {
                    myElifArr.push(tcElif(e, localEnv, currentReturn, insideFunc, insideClass));
                });
            }
            var myElse = {};
            if (typeof s.else !== 'undefined') {
                elseSeen = true;
                myElse = tcElse(s.else, localEnv, currentReturn, insideFunc, insideClass);
            }
            if (elifSeen && elseSeen) {
                return __assign(__assign({}, s), { cond: myIfCond, ifbody: myIfBody, elif: myElifArr, else: myElse });
            }
            if (elseSeen) {
                return __assign(__assign({}, s), { cond: myIfCond, ifbody: myIfBody, else: myElse });
            }
            return __assign(__assign({}, s), { cond: myIfCond, ifbody: myIfBody });
        }
        case "while": {
            var myWhileBody = [];
            s.body.forEach(function (b) {
                myWhileBody.push(tcStmt(b, localEnv, currentReturn, insideFunc, insideClass));
            });
            var myWhileCond = tcExpr(s.cond, localEnv, insideFunc, insideClass);
            if (myWhileCond.a.value !== ast_1.VarType.bool) {
                throw new Error("TYPE ERROR: Condition expression be ".concat(myWhileCond.a));
            }
            return __assign(__assign({}, s), { cond: myWhileCond, body: myWhileBody });
        }
        case "expr": {
            var ret_1 = tcExpr(s.expr, localEnv, insideFunc, insideClass);
            return __assign(__assign({}, s), { expr: ret_1, a: ret_1.a });
        }
        case "pass": {
            return __assign(__assign({}, s), { a: { tag: "none", value: ast_1.VarType.none } });
        }
        case "return": {
            if (!insideFunc) {
                throw new Error("PARSE ERROR: Return statement cannot appear at top level");
            }
            if (typeof s.return != 'undefined') {
                var valTyp = tcExpr(s.return, localEnv, insideFunc, insideClass);
                // Added to support None returned for object
                if (currentReturn.tag === "object" && valTyp.a.value === ast_1.VarType.none) {
                    return __assign(__assign({}, s), { return: valTyp, a: valTyp.a });
                }
                if (valTyp.a.value !== currentReturn.value) {
                    throw new Error("TYPE ERROR: ".concat(valTyp.a.value, " returned but ").concat(currentReturn.value, " expected."));
                }
                return __assign(__assign({}, s), { return: valTyp, a: valTyp.a });
            }
            if (currentReturn.value != ast_1.VarType.none) {
                throw new Error("TYPE ERROR: Expected ".concat(currentReturn, "; but got None"));
            }
            return __assign(__assign({}, s), { a: { tag: "none", value: ast_1.VarType.none } });
        }
    }
}
exports.tcStmt = tcStmt;
function tcExpr(expr, localenv, insideFunc, insideClass) {
    switch (expr.tag) {
        case "id":
            if (!localenv.vars.has(expr.name)) {
                throw new Error("TYPE ERROR: Not a variable ".concat(expr.name));
            }
            return __assign(__assign({}, expr), { a: localenv.vars.get(expr.name) });
        case "getField": {
            var lexpr = tcExpr(expr.lvalue, localenv, insideFunc, insideClass);
            var fname = expr.rvalue;
            var lookupname = lexpr.a.value + "." + fname;
            if (!localenv.classFields.has(lookupname)) {
                throw new Error("REFERENCE ERROR: There is no attribute named ".concat(fname, " in class ").concat(lexpr.a.value));
            }
            var retType = localenv.classFields.get(lookupname);
            return __assign(__assign({}, expr), { a: retType, lvalue: lexpr });
        }
        case "method": {
            var leftMethod = tcExpr(expr.lvalue, localenv, insideFunc, insideClass);
            var className = leftMethod.a.value;
            var funName = expr.name;
            var classFunName = className + "." + funName;
            if (!localenv.classMethod.has(classFunName)) {
                throw new Error("REFERENCE ERROR: There is no method names ".concat(funName, " in class ").concat(className));
            }
            var _a = localenv.classMethod.get(classFunName), methodArg = _a[0], methodRetVal = _a[1];
            if (expr.args.length !== methodArg.length - 1) {
                throw new Error("REFERENCE ERROR: Expected ".concat(methodArg.length, " arguments but got ").concat(expr.args.length));
            }
            var mynewArgs = [];
            for (var i = 1; i < methodArg.length; i++) {
                var argtyp = tcExpr(expr.args[i - 1], localenv, insideFunc, insideClass);
                if ((argtyp.a.value !== methodArg[i].value) && !(argtyp.a.value === ast_1.VarType.none && methodArg[i].tag === "object")) {
                    throw new Error("TYPE ERROR: Got ".concat(argtyp.a.value, ", but expected ").concat(methodArg[i].value));
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
            return __assign(__assign({}, expr), { lvalue: leftMethod, a: methodRetVal, args: mynewArgs });
        }
        case "funcall":
            if (expr.name === "print") {
                if (expr.args.length !== 1) {
                    throw new Error("TYPE ERROR: print expects a single argument");
                }
                var newArgs_1 = [tcExpr(expr.args[0], localenv, insideFunc, insideClass)];
                var res = __assign(__assign({}, expr), { a: { tag: "none", value: ast_1.VarType.none }, args: newArgs_1 });
                return res;
            }
            if (localenv.class.has(expr.name)) {
                // Means its a class call
                return __assign(__assign({}, expr), { a: { tag: "object", value: expr.name } });
            }
            if (!localenv.func.has(expr.name)) {
                throw new Error("REFERENCE ERROR: Not a function or class ".concat(expr.name));
            }
            var _b = localenv.func.get(expr.name), args = _b[0], ret = _b[1];
            if (args.length !== expr.args.length) {
                throw new Error("REFERENCE ERROR: Expected ".concat(args.length, " arguments but got ").concat(expr.args.length));
            }
            var newArgs = args.map(function (a, i) {
                var argtyp = tcExpr(expr.args[i], localenv, insideFunc, insideClass);
                if (a.value !== argtyp.a.value) {
                    throw new Error("TYPE ERROR: Got ".concat(argtyp.a.value, " as argument ").concat(i + 1, ", expected ").concat(a.value));
                }
                return argtyp;
            });
            return __assign(__assign({}, expr), { a: ret, args: newArgs });
        case "literal":
            var litType = tcLiteral(expr.literal);
            return __assign(__assign({}, expr), { a: litType.a, literal: litType });
        case "binOperator":
            var left = tcExpr(expr.left_opr, localenv, insideFunc, insideClass);
            var right = tcExpr(expr.right_opr, localenv, insideFunc, insideClass);
            var opr = expr.opr;
            if (checkOpInt(opr)) {
                if (left.a.value == ast_1.VarType.int && right.a.value == ast_1.VarType.int) {
                    if (opr === ast_1.BinaryOP.Gt || opr === ast_1.BinaryOP.Lt || opr === ast_1.BinaryOP.Gte || opr === ast_1.BinaryOP.Lte || opr === ast_1.BinaryOP.Eq || opr === ast_1.BinaryOP.Neq) {
                        return __assign(__assign({}, expr), { left_opr: left, right_opr: right, a: { tag: "bool", value: ast_1.VarType.bool } });
                    }
                    return __assign(__assign({}, expr), { left_opr: left, right_opr: right, a: { tag: "int", value: ast_1.VarType.int } });
                }
                throw new Error("TYPE ERROR: Cannot apply operator `".concat(opr, "` on types `").concat(left.a.value, "` and ").concat(right.a.value));
            }
            if (checkOpBoth(opr)) {
                if ((left.a.value === right.a.value) && (left.a.tag !== "object" && right.a.tag !== "object")) {
                    if (opr === ast_1.BinaryOP.Gt || opr === ast_1.BinaryOP.Lt || opr === ast_1.BinaryOP.Gte || opr === ast_1.BinaryOP.Lte || opr === ast_1.BinaryOP.Eq || opr === ast_1.BinaryOP.Neq) {
                        return __assign(__assign({}, expr), { left_opr: left, right_opr: right, a: { tag: "bool", value: ast_1.VarType.bool } });
                    }
                    return __assign(__assign({}, expr), { left_opr: left, right_opr: right, a: left.a });
                }
                else {
                    throw new Error("TYPE ERROR: Cannot apply operator `".concat(opr, "` on types `").concat(left.a.value, "` and ").concat(right.a.value));
                }
            }
            if (checkOpNone(opr)) {
                if ((left.a.tag === "object" && right.a.tag === "object") || (left.a.tag === "object" && right.a.value === ast_1.VarType.none) || (right.a.tag === "object" && left.a.value === ast_1.VarType.none) || (left.a.value === ast_1.VarType.none && right.a.value === ast_1.VarType.none)) {
                    return __assign(__assign({}, expr), { left_opr: left, right_opr: right, a: { tag: "bool", value: ast_1.VarType.bool } });
                }
                else {
                    throw new Error("TYPE ERROR: Cannot apply operator `".concat(opr, "` on types `").concat(left.a.value, "` and ").concat(right.a.value));
                }
            }
            break;
        case "UniOperator":
            var myOpr = expr.opr;
            var myUniExpr = tcExpr(expr.right, localenv, insideFunc, insideClass);
            if (myOpr === ast_1.UniOp.Not) {
                if (myUniExpr.a.value == ast_1.VarType.bool) {
                    return __assign(__assign({}, expr), { right: myUniExpr, a: { tag: "bool", value: ast_1.VarType.bool } });
                }
                else {
                    throw new Error("TYPE ERROR: Cannot apply operator `not` on type `int`");
                }
            }
            else {
                if (myUniExpr.a.value == ast_1.VarType.int) {
                    return __assign(__assign({}, expr), { right: myUniExpr, a: { tag: "int", value: ast_1.VarType.int } });
                }
                else {
                    throw new Error("TYPE ERROR: Cannot apply operator `-` on type `bool`");
                }
            }
        case "paran":
            var myInnerExpr = tcExpr(expr.inner, localenv, insideFunc, insideClass);
            return __assign(__assign({}, expr), { inner: myInnerExpr, a: myInnerExpr.a });
        case "literal":
            var myLit = tcLiteral(expr.literal);
            return __assign(__assign({}, expr), { literal: myLit, a: myLit.a });
    }
}
exports.tcExpr = tcExpr;
function tcLiteral(literal) {
    switch (literal.tag) {
        case "num":
            return __assign(__assign({}, literal), { a: { tag: "int", value: ast_1.VarType.int } });
        case "bool":
            return __assign(__assign({}, literal), { a: { tag: "bool", value: ast_1.VarType.bool } });
        case "none":
            return __assign(__assign({}, literal), { a: { tag: "none", value: ast_1.VarType.none } });
        default:
            throw new Error("TYPE ERROR: Invalid type annotation");
    }
}
exports.tcLiteral = tcLiteral;
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
function checkOpInt(op) {
    if (op == ast_1.BinaryOP.Add || op == ast_1.BinaryOP.Mul || op == ast_1.BinaryOP.Sub || op == ast_1.BinaryOP.Gt || op == ast_1.BinaryOP.Lt || op == ast_1.BinaryOP.Gte || op == ast_1.BinaryOP.Lte || op == ast_1.BinaryOP.Int_Div || op == ast_1.BinaryOP.Mod) {
        return true;
    }
    return false;
}
exports.checkOpInt = checkOpInt;
function checkOpNone(op) {
    if (op === ast_1.BinaryOP.Is) {
        return true;
    }
    return false;
}
exports.checkOpNone = checkOpNone;
function checkOpBoth(op) {
    if (op == ast_1.BinaryOP.Eq || op == ast_1.BinaryOP.Neq) {
        return true;
    }
    return false;
}
exports.checkOpBoth = checkOpBoth;
//# sourceMappingURL=tc.js.map