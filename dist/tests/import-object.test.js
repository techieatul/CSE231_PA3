"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importObject = void 0;
var Type;
(function (Type) {
    Type[Type["Num"] = 0] = "Num";
    Type[Type["Bool"] = 1] = "Bool";
    Type[Type["None"] = 2] = "None";
})(Type || (Type = {}));
function stringify(typ, arg) {
    switch (typ) {
        case Type.Num:
            return arg.toString();
        case Type.Bool:
            return arg ? "True" : "False";
        case Type.None:
            return "None";
    }
}
function print(typ, arg) {
    exports.importObject.output += stringify(typ, arg);
    exports.importObject.output += "\n";
    return arg;
}
exports.importObject = {
    imports: {
        // we typically define print to mean logging to the console. To make testing
        // the compiler easier, we define print so it logs to a string object.
        //  We can then examine output to see what would have been printed in the
        //  console.
        print: function (arg) { return print(Type.Num, arg); },
        print_num: function (arg) { return print(Type.Num, arg); },
        print_bool: function (arg) { return print(Type.Bool, arg); },
        print_none: function (arg) { return print(Type.None, arg); },
        abs: Math.abs,
        min: Math.min,
        max: Math.max,
        pow: Math.pow,
    },
    output: "",
};
//# sourceMappingURL=import-object.test.js.map