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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeGenStmt = exports.codeGenClassMethod = exports.codeGenLit = exports.compile = exports.codeGenExpr = exports.codeGenException = exports.BinopStmts = exports.run = void 0;
var wabt_1 = __importDefault(require("wabt"));
var ast_1 = require("./ast");
var parser_1 = require("./parser");
var tc_1 = require("./tc");
var loop_count = 0;
function variableNames(stmts) {
    var vars = [];
    var initEnv = new Map();
    stmts.forEach(function (stmt) {
        //if(stmt.tag === "assign" || stmt.tag==="varInit") { vars.push(stmt.name); }
        if (stmt.tag === "varInit") {
            if (initEnv.has(stmt.name)) {
                throw new Error("REFERENCE ERROR: Duplicate decalaration inside same scope");
            }
            vars.push(stmt.name);
            initEnv.set(stmt.name, true);
        }
    });
    return vars;
}
function funs(stmts) {
    return stmts.filter(function (stmt) { return stmt.tag === "FuncDef"; });
}
function nonFuns(stmts) {
    return stmts.filter(function (stmt) { return stmt.tag !== "FuncDef"; });
}
function classNames(stmts) {
    return stmts.filter(function (stmt) { return stmt.tag == "class"; });
}
function varsFunsStmts(stmts) {
    return [variableNames(stmts), funs(stmts), nonFuns(stmts), classNames(stmts)];
}
function run(watSource, config) {
    return __awaiter(this, void 0, void 0, function () {
        var wabtApi, parsed, binary, wasmModule;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, wabt_1.default)()];
                case 1:
                    wabtApi = _a.sent();
                    parsed = wabtApi.parseWat("example", watSource);
                    binary = parsed.toBinary({});
                    return [4 /*yield*/, WebAssembly.instantiate(binary.buffer, config)];
                case 2:
                    wasmModule = _a.sent();
                    return [2 /*return*/, wasmModule.instance.exports._start()];
            }
        });
    });
}
exports.run = run;
function BinopStmts(op) {
    switch (op) {
        case "+": return ["i32.add"];
        case "-": return ["i32.sub"];
        case ">": return ["i32.gt_s"];
        case ">=": return ["i32.ge_s"];
        case "<": return ["i32.lt_s"];
        case "<=": return ["i32.le_s"];
        case "*": return ["i32.mul"];
        case "//": return ["i32.div_s"];
        case "%": return ["i32.rem_s"];
        case "==": return ["i32.eq"];
        case "!=": return ["i32.ne"];
        case "is": return ["i32.eq"];
        default:
            throw new Error("PARSE ERROR: Unhandled or unknown op: ".concat(op));
    }
}
exports.BinopStmts = BinopStmts;
// To handle unary Op
function codeGenException() {
    return ["(local.set $scratch)\n           (local.get $scratch)\n           (local.get $scratch)\n           (i32.eqz)\n           (if\n            (then\n              call $throw_none_exception\n\n            )\n\n           )\n           "];
}
exports.codeGenException = codeGenException;
function codeGenExpr(expr, locals) {
    switch (expr.tag) {
        case "method": {
            // {a?:A,tag:"method",lvalue:Expr<A>,name:string,args:Expr<A>[]}
            var lexprMethod = codeGenExpr(expr.lvalue, locals);
            var exceptionMethod = codeGenException().flat().join("\n");
            lexprMethod.push(exceptionMethod);
            var argsMethod = expr.args.map(function (e) { return codeGenExpr(e, locals); }).flat().join("\n");
            lexprMethod.push(argsMethod);
            var methodName = "$" + expr.lvalue.a.value + "$" + expr.name;
            lexprMethod.push("(call $".concat(methodName, ")"));
            return lexprMethod;
        }
        case "getField":
            var lexpr = codeGenExpr(expr.lvalue, locals);
            // check if the class points to None, by checking its value to 0
            var exceptionCode = codeGenException().flat().join("\n");
            lexpr.push(exceptionCode);
            var fieldName = expr.rvalue;
            var className = expr.lvalue.a.value;
            var offset = locals.classFieldEnv.get(className + "." + fieldName)[0];
            var mem = offset * 4;
            var loadString = "(i32.const ".concat(mem, ")\n(i32.add)\n(i32.load)");
            lexpr.push(loadString);
            return lexpr;
            // need to load
            break;
        case "literal":
            switch (expr.literal.tag) {
                case "num": return ["(i32.const ".concat(expr.literal.value, ")")];
                case "bool":
                    switch (expr.literal.value) {
                        case true: return ["(i32.const 1)"];
                        case false: return ["(i32.const 0)"];
                    }
                case "none": return ["(i32.const 0)"];
            }
            break;
        case "paran":
            var innerExpr = codeGenExpr(expr.inner, locals);
            return __spreadArray([], innerExpr, true);
        case "UniOperator":
            var myUniExpr = codeGenExpr(expr.right, locals);
            if (expr.opr === ast_1.UniOp.Minus) {
                return __spreadArray(__spreadArray(["(i32.const 0)"], myUniExpr, true), ["(i32.sub)"], false);
            }
            else {
                return __spreadArray(__spreadArray(["(i32.const 1)"], myUniExpr, true), ["(i32.xor)"], false);
            }
        case "id":
            // Since we type-checked for making sure all variable exist, here we
            // just check if it's a local variable and assume it is global if not
            if (locals.emptyEnv.has(expr.name)) {
                return ["(local.get $".concat(expr.name, ")")];
            }
            else {
                return ["(global.get $".concat(expr.name, ")")];
            }
        case "binOperator": {
            var lhsExprs = codeGenExpr(expr.left_opr, locals);
            var rhsExprs = codeGenExpr(expr.right_opr, locals);
            var opstmts = BinopStmts(expr.opr);
            return __spreadArray(__spreadArray(__spreadArray([], lhsExprs, true), rhsExprs, true), opstmts, true);
        }
        case "funcall":
            if (locals.classNames.has(expr.name)) {
                // do something
                // Generate code for class and then call __init__ method
                return codeGenClass(expr, locals);
            }
            var valStmts = expr.args.map(function (e) { return codeGenExpr(e, locals); }).flat();
            var toCall = expr.name;
            if (expr.name === "print") {
                switch (expr.args[0].a.tag) {
                    case "bool":
                        toCall = "print_bool";
                        break;
                    case "int":
                        toCall = "print_num";
                        break;
                    case "none":
                        toCall = "print_none";
                        break;
                }
            }
            valStmts.push("(call $".concat(toCall, ")"));
            return valStmts;
    }
}
exports.codeGenExpr = codeGenExpr;
function codeGenClass(expr, locals) {
    if (expr.tag === "funcall") {
        var initvals = [];
        var classInfo = locals.classData.get(expr.name);
        if (classInfo.tag === "class") {
            classInfo.fields.forEach(function (c, i) {
                var offset = i * 4;
                initvals = __spreadArray(__spreadArray(__spreadArray(__spreadArray([], initvals, true), [
                    "(i32.add (global.get $heap) (i32.const ".concat(offset, "))")
                ], false), codeGenLit(c.value), true), [
                    "(i32.store)"
                ], false);
            });
            var methodInit = "$" + classInfo.name + "$" + "__init__";
            var initFound = false;
            classInfo.methods.forEach(function (f) {
                if (f.name === "__init__") {
                    initFound = true;
                }
            });
            if (initFound) {
                initvals = __spreadArray(__spreadArray([], initvals, true), ["(global.get $heap)"], false);
            }
            initvals = __spreadArray(__spreadArray([], initvals, true), [
                "(global.get $heap)",
                "(global.set $heap (i32.add (global.get $heap) (i32.const ".concat(classInfo.fields.length * 4, ")))"),
            ], false);
            if (initFound) {
                initvals = __spreadArray(__spreadArray([], initvals, true), ["(local.set $scratch (call $".concat(methodInit, "))")], false);
            }
        }
    }
    return initvals;
}
function popClassEnv(stmt, localEnv) {
    stmt.forEach(function (s) {
        if (s.tag === "class") {
            var name = s.name;
            localEnv.classNames.set(name, true);
            localEnv.classData.set(name, s);
            s.fields.forEach(function (f, i) {
                var fname = f.name;
                var classFname = name + "." + fname;
                var fieldType = f.type;
                localEnv.classFieldEnv.set(classFname, [i, fieldType]);
            });
        }
    });
}
function compile(source) {
    var ast = (0, parser_1.parseProgram)(source);
    ast = (0, tc_1.tcProgram)(ast);
    var emptyEnv = {};
    emptyEnv.emptyEnv = new Map();
    emptyEnv.classFieldEnv = new Map();
    emptyEnv.classNames = new Map();
    emptyEnv.classData = new Map();
    //new Map<string, boolean>();
    var _a = varsFunsStmts(ast), vars = _a[0], funs = _a[1], stmts = _a[2], classDef = _a[3];
    // To store the index of classFields within a class
    popClassEnv(classDef, emptyEnv);
    ////////////////////
    var funsCode = funs.map(function (f) { return codeGenStmt(f, emptyEnv); }).map(function (f) { return f.join("\n"); });
    var classFuncCode = classDef.map(function (f) { return codeGenClassMethod(f, emptyEnv); }).map(function (f) { return f.join("\n"); });
    var allClassMethod = classFuncCode.join("\n\n");
    var allFuns = funsCode.join("\n\n");
    var varDecls = vars.map(function (v) { return "(global $".concat(v, " (mut i32) (i32.const 0))"); }).join("\n");
    var allStmts = stmts.map(function (s) { return codeGenStmt(s, emptyEnv); }).flat();
    var main = __spreadArray(["(local $scratch i32)"], allStmts, true).join("\n");
    var lastStmt = ast[ast.length - 1];
    var isExpr = lastStmt.tag === "expr";
    var retType = "";
    var retVal = "";
    if (isExpr) {
        retType = "(result i32)";
        retVal = "(local.get $scratch)";
    }
    //;;(func $print_bool (import "imports" "print_bool") (param i32) (result i32))
    return "\n    (module\n      (func $print_num (import \"imports\" \"print_num\") (param i32) (result i32))\n      (func $throw_none_exception (import \"imports\" \"throw_none_exception\"))\n      (func $print_bool (import \"imports\" \"print_bool\") (param i32) (result i32))\n      (func $print_none (import \"imports\" \"print_none\") (param i32) (result i32))\n      (memory (import \"imports\" \"mem\") 1)\n      ".concat(varDecls, "\n      (global $heap (mut i32) (i32.const 4))\n      ").concat(allFuns, "\n      ").concat(allClassMethod, "\n      (func (export \"_start\") ").concat(retType, "\n        ").concat(main, "\n        ").concat(retVal, "\n      )\n    ) \n  ");
}
exports.compile = compile;
function codeGenLit(l) {
    switch (l.tag) {
        case "num":
            return ["(i32.const ".concat(l.value, ")")];
        case "bool":
            if (l.value) {
                return ["(i32.const 1)"];
            }
            if (!l.value) {
                return ["(i32.const 0)"];
            }
        case "none":
            return ["(i32.const 0)"];
    }
}
exports.codeGenLit = codeGenLit;
function classFields(varName) {
    var classVars = [];
    varName.forEach(function (v) {
        classVars.push(v.name);
    });
    return classVars;
}
function codeGenClassMethod(func, locals) {
    switch (func.tag) {
        case "class": {
            var classMethod = func.methods;
            // var ClassParamsAndVariables:LocalEnv = {} as LocalEnv; 
            // ClassParamsAndVariables.emptyEnv= new Map<string, boolean>(locals.emptyEnv.entries());
            // ClassParamsAndVariables.classFieldEnv = new Map<string, [number,varType]>(locals.classFieldEnv.entries());
            var classvar = classFields(func.fields);
            // classvar.forEach(v=>ClassParamsAndVariables.emptyEnv.set(v,true));
            var classMethodArr = [];
            func.methods.forEach(function (v) {
                //setup local method environment
                var ClassParamsAndVariables = {};
                ClassParamsAndVariables.classNames = new Map(locals.classNames.entries());
                ClassParamsAndVariables.emptyEnv = new Map();
                ClassParamsAndVariables.classFieldEnv = new Map(locals.classFieldEnv.entries());
                ClassParamsAndVariables.classData = new Map(locals.classData.entries());
                classvar.forEach(function (v) { return ClassParamsAndVariables.emptyEnv.set(v, true); });
                v.params.forEach(function (p) {
                    ClassParamsAndVariables.emptyEnv.set(p.name, true);
                });
                var variables = variableNames(v.body);
                variables.forEach(function (v) { return ClassParamsAndVariables.emptyEnv.set(v, true); });
                //end of local method env setup
                var funName = "$" + func.name + "$" + v.name;
                //var selfParam = `(param $self i32)`;
                var params = v.params.map(function (p) { return "(param $".concat(p.name, " i32)"); }).join(" ");
                //params = selfParam + " " + params;
                var varDecls = variables.map(function (v) { return "(local $".concat(v, " i32)"); }).join("\n");
                var stmts = v.body.map(function (s) { return codeGenStmt(s, ClassParamsAndVariables); }).flat();
                var stmtsBody = stmts.join("\n");
                var allStmt = "(func $".concat(funName, " ").concat(params, " (result i32)\n        (local $scratch i32)\n        ").concat(varDecls, "\n        ").concat(stmtsBody, "\n        (i32.const 0))");
                classMethodArr.push(allStmt);
            });
            return classMethodArr;
        }
    }
}
exports.codeGenClassMethod = codeGenClassMethod;
function codeGenStmt(stmt, locals) {
    switch (stmt.tag) {
        case "FuncDef":
            var withParamsAndVariables_1 = {};
            withParamsAndVariables_1.emptyEnv = new Map(locals.emptyEnv.entries());
            withParamsAndVariables_1.classFieldEnv = new Map(locals.classFieldEnv.entries());
            // Construct the environment for the function body
            var variables = variableNames(stmt.body);
            variables.forEach(function (v) { return withParamsAndVariables_1.emptyEnv.set(v, true); });
            stmt.params.forEach(function (p) { return withParamsAndVariables_1.emptyEnv.set(p.name, true); });
            // Construct the code for params and variable declarations in the body
            var params = stmt.params.map(function (p) { return "(param $".concat(p.name, " i32)"); }).join(" ");
            var varDecls = variables.map(function (v) { return "(local $".concat(v, " i32)"); }).join("\n");
            var stmts = stmt.body.map(function (s) { return codeGenStmt(s, withParamsAndVariables_1); }).flat();
            var stmtsBody = stmts.join("\n");
            return ["(func $".concat(stmt.name, " ").concat(params, " (result i32)\n        (local $scratch i32)\n        ").concat(varDecls, "\n        ").concat(stmtsBody, "\n        (i32.const 0))")];
        case "return":
            if (typeof stmt.return != 'undefined') {
                var valStmts = codeGenExpr(stmt.return, locals);
                valStmts.push("return");
                return valStmts;
            }
            break;
        case "assign":
            var valStmts = codeGenExpr(stmt.value, locals);
            if (locals.emptyEnv.has(stmt.name)) {
                valStmts.push("(local.set $".concat(stmt.name, ")"));
            }
            else {
                valStmts.push("(global.set $".concat(stmt.name, ")"));
            }
            return valStmts;
        case "memberAssign":
            var leftStmt = codeGenExpr(stmt.lvalue, locals);
            // Check for exception
            var exceptionCode = codeGenException().flat().join("\n");
            leftStmt.push(exceptionCode);
            ////////
            var fieldName = stmt.rvalue;
            var rightExpr = codeGenExpr(stmt.value, locals).flat().join("\n");
            var className = stmt.lvalue.a.value;
            var _a = locals.classFieldEnv.get(className + "." + fieldName), offset = _a[0], vtype = _a[1];
            var fieldMem = offset * 4;
            var mem = "(i32.const ".concat(fieldMem, ")\n(i32.add)\n");
            leftStmt.push(mem);
            leftStmt.push(rightExpr);
            leftStmt.push("i32.store");
            return leftStmt;
        case "varInit":
            var myLit = codeGenLit(stmt.value.value);
            if (locals.emptyEnv.has(stmt.name)) {
                myLit.push("(local.set $".concat(stmt.name, ")"));
            }
            else {
                myLit.push("(global.set $".concat(stmt.name, ")"));
            }
            return myLit;
        case "expr":
            var result = codeGenExpr(stmt.expr, locals);
            result.push("(local.set $scratch)");
            return result;
        case "pass":
            break;
        case "while":
            var whileCond = codeGenExpr(stmt.cond, locals).flat().join("\n");
            var whileBody = stmt.body.flatMap(function (b) {
                if (b.tag == "varInit") {
                    throw new Error("PARSE ERROR: Variable Initialization not allowed inside while");
                }
                return codeGenStmt(b, locals);
            }).join('\n');
            //var whileCode = [`(loop $loop_${loop_count} ${whileBody} ${whileCond} br_if $loop_${loop_count})`
            //];
            var whileCode = ["(block $loop_".concat(loop_count, "end\n                           (loop $loop_").concat(loop_count, "\n                            ").concat(whileCond, " \n                            (i32.eqz)\n                            (br_if $loop_").concat(loop_count, "end)\n                            ").concat(whileBody, "\n                            (br $loop_").concat(loop_count, ")\n\n                            )\n                        )\n                    ")];
            loop_count++;
            return whileCode;
        case "if":
            var ifCond = codeGenExpr(stmt.cond, locals).flat().join('\n');
            var ifBody = stmt.ifbody.flatMap(function (b) {
                if (b.tag == "varInit") {
                    throw new Error("PARSE ERROR: Variable Initialization not allowed inside If");
                }
                return codeGenStmt(b, locals);
            }).join('\n');
            if (typeof stmt.elif != 'undefined') {
                var elif = stmt.elif.pop();
                var elifCond = elif.cond;
                var elifbody = elif.body;
                if (stmt.elif.length == 0) {
                    stmt.elif = undefined; // doing this is important as after popping from array, we should
                    // not enter the elif loop again
                }
                // using recursion idea here. The elif body and cond become the if's new body and cond, so that 
                // we have if() else(if() else()....) like this
                return ["".concat(ifCond, "\n        (if\n          ( then\n            ").concat(ifBody, "\n          )\n          (else\n            ").concat(codeGenStmt(__assign(__assign({}, stmt), { ifbody: elifbody, cond: elifCond }), locals), "\n          )\n\n        )\n        \n        ")];
            }
            else if (typeof stmt.else !== 'undefined') {
                var elseBody = stmt.else.body.flatMap(function (b) {
                    if (b.tag == "varInit") {
                        throw new Error("PARSE ERROR: Variable Initialization not allowed inside else body");
                    }
                    return codeGenStmt(b, locals);
                }).join('\n');
                return ["".concat(ifCond, "\n                (if\n                  (then\n                    ").concat(ifBody, "\n\n                  )\n                  (else\n                    ").concat(elseBody, "\n\n                  )\n                \n\n                )\n        \n              ")];
            }
            else {
                return ["".concat(ifCond, "\n               (if\n                (then\n                  ").concat(ifBody, "\n                )\n               )\n               ")];
            }
    }
}
exports.codeGenStmt = codeGenStmt;
//# sourceMappingURL=compiler.js.map