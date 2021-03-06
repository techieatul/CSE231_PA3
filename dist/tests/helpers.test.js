"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLASS = exports.NONE = exports.BOOL = exports.NUM = exports.run = exports.typeCheck = void 0;
var import_object_test_1 = require("./import-object.test");
var compiler_1 = require("../compiler");
var parser_1 = require("../parser");
var tc_1 = require("../tc");
var wabt_1 = __importDefault(require("wabt"));
// Modify typeCheck to return a `Type` as we have specified below
function typeCheck(source) {
    var ast = (0, parser_1.parseProgram)(source);
    var tcAst = (0, tc_1.tcProgram)(ast);
    var lastStmnt = tcAst[tcAst.length - 1];
    if (lastStmnt.tag == "expr") {
        switch (lastStmnt.a.tag) {
            case "int":
                return "int";
            case "bool":
                return "bool";
            case "none":
                return "none";
            case "object":
                return { tag: "object", class: lastStmnt.a.value };
        }
    }
    return "none";
}
exports.typeCheck = typeCheck;
// Modify run to use `importObject` (imported above) to use for printing
// You can modify `importObject` to have any new fields you need here, or
// within another function in your compiler, for example if you need other
// JavaScript-side helpers
function run(source) {
    return __awaiter(this, void 0, void 0, function () {
        var memory, wat, wabtApi, parsed, binary, wasmModule;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    memory = new WebAssembly.Memory({ initial: 10, maximum: 100 });
                    import_object_test_1.importObject.imports.mem = memory;
                    import_object_test_1.importObject.imports.throw_none_exception = function () {
                        throw new Error("RUNTIME ERROR: Operation on None");
                    };
                    wat = (0, compiler_1.compile)(source);
                    return [4 /*yield*/, (0, wabt_1.default)()];
                case 1:
                    wabtApi = _a.sent();
                    parsed = wabtApi.parseWat("example", wat);
                    binary = parsed.toBinary({});
                    return [4 /*yield*/, WebAssembly.instantiate(binary.buffer, import_object_test_1.importObject)];
                case 2:
                    wasmModule = _a.sent();
                    return [2 /*return*/, wasmModule.instance.exports._start()];
            }
        });
    });
}
exports.run = run;
exports.NUM = "int";
exports.BOOL = "bool";
exports.NONE = "none";
function CLASS(name) {
    return { tag: "object", class: name };
}
exports.CLASS = CLASS;
;
//# sourceMappingURL=helpers.test.js.map