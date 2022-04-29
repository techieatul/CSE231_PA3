"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinBoolOpMap = exports.BinOpMap = exports.UniOpMap = exports.TypeMap = exports.VarType = exports.UniOp = exports.BinaryOP = void 0;
var BinaryOP;
(function (BinaryOP) {
    BinaryOP["Add"] = "+";
    BinaryOP["Sub"] = "-";
    BinaryOP["Mul"] = "*";
    BinaryOP["Gt"] = ">";
    BinaryOP["Gte"] = ">=";
    BinaryOP["Lt"] = "<";
    BinaryOP["Lte"] = "<=";
    BinaryOP["Int_Div"] = "//";
    BinaryOP["Mod"] = "%";
    BinaryOP["Eq"] = "==";
    BinaryOP["Neq"] = "!=";
    BinaryOP["Is"] = "is";
})(BinaryOP = exports.BinaryOP || (exports.BinaryOP = {}));
var UniOp;
(function (UniOp) {
    UniOp["Not"] = "not";
    UniOp["Minus"] = "-";
})(UniOp = exports.UniOp || (exports.UniOp = {}));
var VarType;
(function (VarType) {
    VarType["int"] = "int";
    VarType["bool"] = "bool";
    VarType["none"] = "none";
})(VarType = exports.VarType || (exports.VarType = {}));
// export const TypeMap = new Map<string, VarType>([
//   ["int", VarType.int],
//   ["bool", VarType.bool],
//   ["none", VarType.none],
// ]);
exports.TypeMap = new Map([
    ["int", { tag: "int", value: VarType.int }],
    ["bool", { tag: "bool", value: VarType.bool }],
    ["none", { tag: "none", value: VarType.none }],
]);
exports.UniOpMap = new Map([
    ["not", UniOp.Not],
    ["-", UniOp.Minus],
]);
exports.BinOpMap = new Map([
    ["+", BinaryOP.Add],
    ["-", BinaryOP.Sub],
    ["*", BinaryOP.Mul],
    [">", BinaryOP.Gt],
    ["<", BinaryOP.Lt],
    [">=", BinaryOP.Gte],
    ["<=", BinaryOP.Lte],
    ["//", BinaryOP.Int_Div],
    ["%", BinaryOP.Mod],
    ["==", BinaryOP.Eq],
    ["!=", BinaryOP.Neq],
    ["is", BinaryOP.Is],
]);
exports.BinBoolOpMap = new Map([
    [">", BinaryOP.Gt],
    ["<", BinaryOP.Lt],
    [">=", BinaryOP.Gte],
    ["<=", BinaryOP.Lte],
    ["==", BinaryOP.Eq],
    ["!=", BinaryOP.Neq],
    ["is", BinaryOP.Is],
]);
//# sourceMappingURL=ast.js.map