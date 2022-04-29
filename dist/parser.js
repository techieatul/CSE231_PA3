"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseProgram = exports.traverse = exports.traverseStmt = exports.checkElif = exports.traverseParameters = exports.traverseType = exports.traverseTypeDef = exports.isExpression = exports.traverseLiteral = exports.traverseExpr = exports.traverseMemberExpr = void 0;
var lezer_python_1 = require("lezer-python");
var ast_1 = require("./ast");
var mySet = new Set();
var myClassName = new Set();
var currClassName = [];
var seen = false;
function traverseMemberExpr(c, s, insideClass) {
    // At MemberExpression Level
    c.firstChild(); // At variable Name level or expr level
    var lval = traverseExpr(c, s, insideClass);
    c.nextSibling(); // At .
    c.nextSibling(); // At method name
    var rval = s.substring(c.from, c.to);
    c.parent(); // At memberExpr level
    c.nextSibling(); // At ArgList level
    c.firstChild(); // Goto (
    c.nextSibling(); //Goto params
    var arg_arr = [];
    while (c.node.type.name != ")") {
        arg_arr.push(traverseExpr(c, s, insideClass));
        c.nextSibling(); // Goto comma
        c.nextSibling(); // Skip comma
    }
    c.parent(); // go to ArgList
    c.parent(); // At CallExpression Level
    return { tag: "method", lvalue: lval, name: rval, args: arg_arr };
}
exports.traverseMemberExpr = traverseMemberExpr;
function traverseExpr(c, s, insideClass) {
    //console.log(c.type.name)
    switch (c.type.name) {
        case "MemberExpression":
            c.firstChild(); //goto left name
            var lval = traverseExpr(c, s, insideClass);
            c.nextSibling();
            c.nextSibling();
            var rval = s.substring(c.from, c.to);
            //var rval = traverseExpr(c,s,insideClass);
            c.parent();
            return { tag: "getField", lvalue: lval, rvalue: rval };
        case "Number":
            var myLitVal = s.substring(c.from, c.to);
            var myLit = traverseLiteral(c, s, myLitVal, insideClass);
            return {
                tag: "literal",
                literal: myLit
            };
        case "None":
            return {
                tag: "literal",
                literal: { tag: "none", value: null, type: { tag: "none", value: ast_1.VarType.none } }
            };
        case "Boolean": {
            var myBoolName = s.substring(c.from, c.to);
            var myBoolLit = traverseLiteral(c, s, myBoolName, insideClass);
            return {
                tag: "literal",
                literal: myBoolLit
            };
        }
        case "VariableName":
            var rightVal = s.substring(c.from, c.to);
            // if(!mySet.has(rightVal)){
            //   throw new Error("ReferenceError: Variable " + rightVal + " not defined");
            // }
            return {
                tag: "id",
                name: rightVal
            };
        case "CallExpression": // may be any func call
            c.firstChild(); // Name of the function
            if (String(c.type.name) === "MemberExpression") {
                return traverseMemberExpr(c, s, insideClass);
            }
            var callName = s.substring(c.from, c.to);
            c.nextSibling(); // Goto ArgList
            c.firstChild(); // Goto (
            c.nextSibling(); //Goto params
            var arg_arr = [];
            while (c.node.type.name != ")") {
                arg_arr.push(traverseExpr(c, s, insideClass));
                c.nextSibling(); // Goto comma
                c.nextSibling(); // Skip comma
            }
            c.parent(); // Goto Arglist
            c.parent(); // Goto CallExpression
            return { tag: "funcall", name: callName, args: arg_arr };
        case "BinaryExpression":
            //console.log("Here");
            c.firstChild(); // First expr
            var left_expr = traverseExpr(c, s, insideClass);
            //console.log(left_expr);
            c.nextSibling(); // goTo BinaryOperator
            var op = s.substring(c.from, c.to);
            if (!ast_1.BinOpMap.has(op)) {
                c.parent(); // Got back to BinaryExpression level
                throw new Error("PARSE ERROR: Binary Operator ".concat(op, " not supported"));
            }
            //console.log(op);
            c.nextSibling();
            var right_expr = traverseExpr(c, s, insideClass);
            //console.log(right_expr);
            c.parent(); // return to BinaryExpr level
            return {
                tag: "binOperator",
                left_opr: left_expr,
                opr: ast_1.BinOpMap.get(op),
                right_opr: right_expr
            };
        case "ParenthesizedExpression":
            c.firstChild(); //goto (
            c.nextSibling();
            var innerArg = traverseExpr(c, s, insideClass);
            c.nextSibling(); // Solve for inner expr
            c.nextSibling(); // goto ) -> Not required but good to have for debug
            c.parent(); // goto parent level
            return {
                tag: "paran",
                inner: innerArg
            };
        case "UnaryExpression":
            //console.log("Here");
            c.firstChild(); // In unaryOp
            var unary_op = s.substring(c.from, c.to);
            if (!ast_1.UniOpMap.has(unary_op)) {
                c.parent();
                throw new Error("PARSE ERROR: Invalid unary operator ".concat(unary_op));
            }
            c.nextSibling(); // goto expr
            var UniOpExpr = traverseExpr(c, s, insideClass);
            c.parent();
            return { tag: "UniOperator", opr: ast_1.UniOpMap.get(unary_op), right: UniOpExpr };
        default:
            throw new Error("PARSE ERROR: Could not parse expr at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
    }
}
exports.traverseExpr = traverseExpr;
function traverseLiteral(c, s, value, insideClass, type) {
    switch (String(c.node.type.name)) {
        case "Number":
            return { tag: "num", value: Number(value), type: { tag: "int", value: ast_1.VarType.int } };
        case "Boolean":
            if (value == "True") {
                return { tag: "bool", value: true, type: { tag: "bool", value: ast_1.VarType.bool } };
            }
            if (value == "False") {
                return { tag: "bool", value: false, type: { tag: "bool", value: ast_1.VarType.bool } };
            }
            break;
        case "None":
            return { tag: "none", value: null, type: { tag: "none", value: ast_1.VarType.none } };
        default:
            // Here check if its an expression and handle accordingly
            throw new Error("TYPE ERROR: Expected `".concat(type.value, "`; but got `").concat(String(c.node.type.name), "`"));
    }
}
exports.traverseLiteral = traverseLiteral;
function isExpression(e) {
    var exprStatements = ["ExpressionStatement", "BinaryExpression", "UnaryExpression", "ParenthesizedExpression", "CallExpression"];
    return exprStatements.includes(e);
}
exports.isExpression = isExpression;
function traverseTypeDef(c, s, name, insideClass) {
    // Todo: Need to add checker for x:int = <expr> 
    // PA3: Added code x:<name> = <literal>
    switch (c.node.type.name) {
        case "TypeDef":
            c.firstChild(); // goto :
            c.nextSibling(); // goto type
            var t = s.substring(c.from, c.to);
            var t_check = t;
            if (t_check.toLowerCase() === "none") {
                throw new Error("TYPE ERROR: None as a type is not allowed");
            }
            if (ast_1.TypeMap.has(t) || insideClass || myClassName.has(t)) {
                var type;
                if (ast_1.TypeMap.has(t)) {
                    type = ast_1.TypeMap.get(t);
                }
                else {
                    type = { tag: "object", value: t };
                }
                c.parent(); //goto TypeDef
                c.nextSibling(); // goto =
                c.nextSibling(); // goto literal or right val. It cannot be another expression. Need to add that checker
                // check if it's an expression or variable name
                // const checkExpr = isExpression(String(c.node.type.name)) // Need to enhance this
                var value = s.substring(c.from, c.to);
                var myLit = traverseLiteral(c, s, value, insideClass, type);
                return { name: name, type: type, value: myLit };
            }
            else {
                throw new Error("REFERENCE ERROR: Invalid type annotation; there is no class named: ".concat(t));
            }
    }
}
exports.traverseTypeDef = traverseTypeDef;
function traverseType(s, t, insideClass) {
    switch (t.type.name) {
        case "VariableName":
            var name_1 = s.substring(t.from, t.to);
            var name_check = name_1;
            if (name_check.toLowerCase() === "none") {
                throw new Error("TYPE ERROR: Type none is not allowed");
            }
            if (!ast_1.TypeMap.has(name_1) && !insideClass && !myClassName.has(name_1)) {
                throw new Error("TYPE ERROR: Type ".concat(name_1, " not allowed"));
            }
            if (ast_1.TypeMap.has(name_1)) {
                return ast_1.TypeMap.get(name_1);
            }
            return { tag: "object", value: name_1 };
        default:
            throw new Error("TYPE ERROR: Unknown type " + t.type.name);
    }
}
exports.traverseType = traverseType;
function traverseParameters(s, t, insideClass) {
    t.firstChild(); // Focuses on open paren
    var parameters = [];
    t.nextSibling(); // Focuses on a VariableName
    while (t.type.name !== ")") {
        var name_2 = s.substring(t.from, t.to);
        t.nextSibling(); // Focuses on "TypeDef", hopefully, or "," if mistake
        var nextTagName = t.type.name; // NOTE(joe): a bit of a hack so the next line doesn't if-split
        // && (name!=="self" || !insideClass)
        if (nextTagName !== "TypeDef") {
            throw new Error("PARSE ERROR: Missed type annotation for parameter " + name_2);
        }
        // if(name==="self" && nextTagName !== "TypeDef" ) {
        //   var typevar:TypedVar = {name: "self", type: {tag:"object",value:"self"}};
        //   parameters.push(typevar);
        //   t.nextSibling();
        //   continue;
        // }
        t.firstChild(); // Enter TypeDef // goto :
        t.nextSibling(); // Focuses on type itself
        var typ = traverseType(s, t, insideClass);
        t.parent();
        t.nextSibling(); // Move on to comma or ")"
        parameters.push({ name: name_2, type: typ });
        t.nextSibling(); // Focuses on a VariableName
    }
    t.parent(); // Pop to ParamList
    return parameters;
}
exports.traverseParameters = traverseParameters;
function checkElif(c, s, ElifArray, insideClass) {
    if (c.type.name != "elif") {
        return;
    }
    // Means we have elif
    c.nextSibling();
    var elifcond = traverseExpr(c, s, insideClass);
    c.nextSibling(); // Body
    c.firstChild(); // goto :
    var elifbody = [];
    while (c.nextSibling()) {
        elifbody.push(traverseStmt(c, s, insideClass));
    }
    if (elifbody.length == 0) {
        throw new Error("PARSE ERROR: Empty elif body");
    }
    c.parent(); // go back to body
    ElifArray.push({ cond: elifcond, body: elifbody });
    c.nextSibling(); // Again check for elif
    checkElif(c, s, ElifArray, insideClass);
    return;
}
exports.checkElif = checkElif;
function traverseStmt(c, s, insideClass) {
    switch (c.node.type.name) {
        case "ClassDefinition":
            // Check if we have seen some assignment before class definition
            if (seen) {
                throw new Error("PARSE ERROR: Parse error near token CLASS: class");
            }
            var isSeen = seen;
            seen = false;
            c.firstChild(); // goto class
            c.nextSibling(); //goto className
            var className_1 = s.substring(c.from, c.to);
            currClassName.push(className_1);
            //Add this class to class Set
            myClassName.add(className_1);
            ////////////////////////////
            c.nextSibling(); // goto ArgList
            c.firstChild(); // goto (
            c.nextSibling();
            var parentName = s.substring(c.from, c.to);
            c.parent(); // go back to ArgList level
            c.nextSibling(); // goto Body
            c.firstChild(); // goto :
            var classBody = [];
            while (c.nextSibling()) {
                classBody.push(traverseStmt(c, s, true));
            }
            c.parent(); // goto Body
            c.parent(); // go to ClassDefinition
            var classField = [];
            var classMethod = [];
            classBody.forEach(function (f) {
                var tag = f.tag;
                if (tag !== "varInit" && tag !== "FuncDef") {
                    throw new Error("PARSE ERROR: Parse Error near ".concat(tag));
                }
                if (f.tag === "varInit") {
                    classField.push(f.value);
                }
                if (f.tag === "FuncDef") {
                    f.params.forEach(function (p, i) {
                        if (p.name === "self") {
                            //f.params[i].name = className;
                            f.params[i].type = { tag: "object", value: className_1 };
                        }
                    });
                    classMethod.push(f);
                }
            });
            currClassName.pop();
            seen = isSeen;
            return { tag: "class", name: className_1, parent: parentName, fields: classField, methods: classMethod };
        // add member expression code here
        case "AssignStatement":
            c.firstChild(); // go to name
            if (c.type.name === "VariableName") {
                var name_3 = s.substring(c.from, c.to);
                c.nextSibling(); // goto Typedef or =
                if (String(c.node.type.name) === "TypeDef") {
                    if (seen) {
                        throw new Error("PARSE ERROR: Parse error near token COLON:");
                    }
                    var typeDef = traverseTypeDef(c, s, name_3, insideClass);
                    c.parent(); // goto AssignStatement level
                    return { tag: "varInit", name: name_3, value: typeDef };
                }
                else {
                    // Means it is =
                    seen = true;
                    c.nextSibling(); // go to right expr
                    var rexpr_1 = traverseExpr(c, s, insideClass);
                    c.parent(); // got to assignment level
                    return { tag: "assign", name: name_3, value: rexpr_1 };
                }
            }
            // If above not work, then its a memberExression
            if (String(c.node.type.name) === "MemberExpression") {
                c.firstChild(); //goto leftName
                var lexpr = traverseExpr(c, s, insideClass);
                c.nextSibling(); //goto .
                c.nextSibling(); // goto right val 
                var rval = s.substring(c.from, c.to);
                c.parent(); // goto MemberExpression
                c.nextSibling(); // goto =
                c.nextSibling(); // goto rightVal
                var rexpr = traverseExpr(c, s, insideClass);
                c.parent(); // Goto AssignStatement
                return { tag: "memberAssign", lvalue: lexpr, rvalue: rval, value: rexpr };
            }
            break;
        case "ExpressionStatement":
            //console.log("Here");
            seen = true;
            c.firstChild();
            var expr = traverseExpr(c, s, insideClass);
            c.parent(); // pop going into stmt
            return { tag: "expr", expr: expr };
        case "IfStatement":
            seen = true;
            c.firstChild(); // goto if
            c.nextSibling(); // goto cond expr
            var ifCondExpr = traverseExpr(c, s, insideClass);
            c.nextSibling(); // Body
            c.firstChild(); // goto :
            //Multiple stataments inside if body
            var ifBodyStmt = [];
            while (c.nextSibling()) {
                ifBodyStmt.push(traverseStmt(c, s, insideClass));
            }
            if (ifBodyStmt.length == 0) {
                throw new Error("PARSE ERROR: Empty if body\n");
            }
            // Does the ifbody has return statement?
            // Should check in parser or typechecker?
            c.parent(); //Go back to if body
            //check if we have elif
            c.nextSibling(); //-> Here we are at elif or else or body ends
            var myLocalElifArr = [];
            // recursive function to gather all elif as we can have multiple elif
            checkElif(c, s, myLocalElifArr, insideClass);
            var elifSeen = 0;
            if (myLocalElifArr.length >= 1) {
                elifSeen += 1;
            }
            // Not needed
            // if(myLocalElifArr.length>=1 && c.type.name!="else"){
            //   throw new Error("ParseError: Expected else after elif");
            // }
            // c.nextSibling(); // May be else or body end. Actualy it must have else if we have elif
            var elseSeen = false;
            // array to hold elsebody statements
            var elsebody = [];
            if (c.type.name == "else") {
                elseSeen = true;
                c.nextSibling(); // body
                //var elsecondexpr = traverseExpr(c,s);
                //c.nextSibling(); // Body
                c.firstChild(); //goto :
                while (c.nextSibling()) {
                    elsebody.push(traverseStmt(c, s, insideClass));
                }
                if (elsebody.length == 0) {
                    throw new Error("PARSE ERROR: Empty else body\n");
                }
                c.parent();
            }
            c.parent(); // go back to IfStatement
            var myElse;
            if (elseSeen) {
                myElse = { body: elsebody };
            }
            if (elifSeen && !elseSeen) {
                return { tag: "if", cond: ifCondExpr, ifbody: ifBodyStmt, elif: myLocalElifArr };
            }
            if (elifSeen && elseSeen) {
                return { tag: "if", cond: ifCondExpr, ifbody: ifBodyStmt, elif: myLocalElifArr, else: myElse };
            }
            if (elseSeen) {
                return { tag: "if", cond: ifCondExpr, ifbody: ifBodyStmt, else: myElse };
            }
            return { tag: "if", cond: ifCondExpr, ifbody: ifBodyStmt };
        case "WhileStatement":
            // how to do?? Same as if??
            seen = true;
            c.firstChild(); // goto while
            c.nextSibling(); // condexpr
            var whileExpr = traverseExpr(c, s, insideClass);
            c.nextSibling(); //goto body
            c.firstChild(); // goto :
            var mywhilebody = [];
            while (c.nextSibling()) {
                mywhilebody.push(traverseStmt(c, s, insideClass));
            }
            c.parent(); // goback to body
            c.parent(); // goback to whileStatement
            return { tag: "while", cond: whileExpr, body: mywhilebody };
        case "FunctionDefinition":
            if (seen) {
                throw new Error("PARSE ERROR: Parse error near token DEF: def");
            }
            var FuncSeen = seen;
            seen = false;
            c.firstChild(); // Focus on def
            c.nextSibling(); // Focus on name of function
            var funname_1 = s.substring(c.from, c.to);
            c.nextSibling(); // Focus on ParamList
            var params = traverseParameters(s, c, insideClass);
            var filteredParams = [];
            if (insideClass) {
                if (params.length === 0) {
                    throw new Error("PARSE ERROR: First parameter of the following method must be of enclosing class: ".concat(funname_1));
                }
                if (params[0].name !== "self") {
                    throw new Error("PARSE ERROR: First parameter of the following method must be of enclosing class: ".concat(funname_1));
                }
                params.forEach(function (e) {
                    // check if type on self is className
                    if (e.name === "self") {
                        if (e.type.value !== currClassName[currClassName.length - 1]) {
                            throw new Error("PARSE ERROR: First parameter of the following method must be of enclosing class: ".concat(funname_1));
                        }
                    }
                    //if(e.name!=="self"){
                    filteredParams.push(e);
                    //}
                });
            }
            else {
                filteredParams = params;
            }
            c.nextSibling(); // Focus on Body or TypeDef
            var ret = { tag: "none", value: ast_1.VarType.none };
            var maybeTD = c;
            if (maybeTD.type.name === "TypeDef") {
                c.firstChild();
                ret = traverseType(s, c, insideClass);
                c.parent();
                c.nextSibling();
            }
            // Focus on Body
            c.firstChild(); // Focus on :
            var body = [];
            while (c.nextSibling()) {
                body.push(traverseStmt(c, s, insideClass));
            }
            var varInit_1 = [];
            // For VarInit field in FuncDef
            body.forEach(function (b) {
                if (b.tag == "varInit") {
                    varInit_1.push(b.value);
                }
            });
            c.parent(); // Pop to Body
            c.parent(); // Pop to FunctionDefinition
            seen = FuncSeen;
            return {
                tag: "FuncDef",
                name: funname_1,
                params: filteredParams, init: varInit_1, body: body, ret: ret
            };
        case "ReturnStatement":
            seen = true;
            c.firstChild(); // On return
            c.nextSibling(); // Go to expr
            // mean func has return; and not like return <expr>. In such case assign the type to none
            // n.nextSibling will not change if we have only return
            if (c.type.name == "return") {
                c.parent();
                return { tag: "return" };
            }
            var returnExpr = traverseExpr(c, s, insideClass);
            c.parent(); // Go back to parent level
            return { tag: "return", return: returnExpr };
        case "PassStatement":
            return { tag: "pass" };
        default:
            throw new Error("PARSE ERROR: Could not parse stmt at " + c.node.from + " " + c.node.to + ": " + s.substring(c.from, c.to));
    }
}
exports.traverseStmt = traverseStmt;
function traverse(c, s) {
    switch (c.node.type.name) {
        case "Script":
            var stmts = [];
            c.firstChild();
            do {
                stmts.push(traverseStmt(c, s, false));
            } while (c.nextSibling());
            console.log("traversed " + stmts.length + " statements ", stmts, "stopped at ", c.node);
            return stmts;
        default:
            throw new Error("PARSE ERROR: Could not parse program at " + c.node.from + " " + c.node.to);
    }
}
exports.traverse = traverse;
function parseProgram(source) {
    seen = false;
    var t = lezer_python_1.parser.parse(source);
    return traverse(t.cursor(), source);
}
exports.parseProgram = parseProgram;
//# sourceMappingURL=parser.js.map