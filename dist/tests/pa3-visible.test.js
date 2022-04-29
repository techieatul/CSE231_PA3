"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var asserts_test_1 = require("./asserts.test");
var helpers_test_1 = require("./helpers.test");
describe("PA3 visible tests", function () {
    // 1
    (0, asserts_test_1.assertPrint)("literal-int-ops", "print(100 + 20 + 3)", ["123"]);
    // 2
    (0, asserts_test_1.assertPrint)("literal-bool", "print(True)", ["True"]);
    // 3
    (0, asserts_test_1.assertPrint)("print-int-print-bool", "\nprint(0)\nprint(False)", ["0", "False"]);
    // 4
    (0, asserts_test_1.assertPrint)("basic-global", "\nx : int = 0\nx = -1 * -1\nprint(x)", ["1"]);
    // 5
    (0, asserts_test_1.assertPrint)("basic-if", "\nx : int = 0\nif True:\n  x = 5\nelse:\n  x = 3\nprint(x)", ["5"]);
    // 6
    (0, asserts_test_1.assertPrint)("basic-class-lookup", "\nclass C(object):\n  x : int = 123\n\nc : C = None\nc = C()\nprint(c.x) ", ["123"]);
    // 7
    (0, asserts_test_1.assertPrint)("basic-class-field-assign", "\nclass C(object):\n  x : int = 123\n  \nc : C = None\nc = C()\nc.x = 42\nprint(c.x)", ["42"]);
    // 8
    (0, asserts_test_1.assertPrint)("basic-class-method", "\nclass C(object):\n  x : int = 123\n  def getX(self: C) -> int:\n    return self.x\n  def setX(self: C, x: int):\n    self.x = x\n\nc : C = None\nc = C()\nprint(c.getX())\nc.setX(42)\nprint(c.getX())", ["123", "42"]);
    // 9
    (0, asserts_test_1.assertPrint)("multi-class", "\nclass C(object):\n  x : int = 1\n  y : int = 2\n\nclass D(object):\n  y : int = 3\n  x : int = 4\nc : C = None\nd : D = None\nc = C()\nd = D()\nprint(c.x)\nprint(d.x)", ["1", "4"]);
    // 10
    (0, asserts_test_1.assertPrint)("alias-obj", "\nclass C(object):\n  x : int = 1\n\nc1 : C = None\nc2 : C = None\n\nc1 = C()\nc2 = c1\nc1.x = 123\nprint(c2.x)\n", ["123"]),
        // 11
        (0, asserts_test_1.assertPrint)("chained-method-calls", "\nclass C(object):\n  x : int = 123\n  def new(self: C, x: int) -> C:\n    print(self.x)\n    self.x = x\n    print(self.x)\n    return self\n  def clear(self: C) -> C:\n    return self.new(123)\n\nC().new(42).clear()", ["123", "42", "42", "123"]);
    // 12
    (0, asserts_test_1.assertFail)("no-fields-for-none", "\nclass C(object):\n  x : int = 0\n  \nc : C = None\nc.x");
    // 13
    (0, asserts_test_1.assertFail)("no-fields-for-none", "\nclass C(object):\n  x : int = 0\n  def abc(self:C):\n      pass\n  \nc : C = None\nc.abc()");
    // 13
    (0, asserts_test_1.assertPrint)("constructor-non-none", "\nclass C(object):\n  x : int = 0\nprint(not (C() is None))", ["True"]);
    // 14
    (0, asserts_test_1.assertTC)("non-literal-condition", "\nx : int = 1\ny : int = 2\nif x < y:\n  pass\nelse:\n  x = -x\nx", helpers_test_1.NUM);
    // 15
    (0, asserts_test_1.assertTC)("tc-two-classes", "\nclass C(object):\n  d : D = None\n  \nclass D(object):\n  c : C = None\nc : C = None\nc.d\n  ", (0, helpers_test_1.CLASS)("D"));
    // 16
    (0, asserts_test_1.assertTC)("tc-two-classes-methods", "\nclass C(object):\n  d : D = None\n  def new(self: C, d : D) -> C:\n    self.d = d\n    return self\n    \nclass D(object):\n  c : C = None\n  def new(self: D, c: C) -> D:\n    self.c = c\n    return self\n    \nc : C = None\nd : D = None\nc = C().new(d)\nc.d.c", (0, helpers_test_1.CLASS)("C"));
    // 17
    (0, asserts_test_1.assertTC)("none-assignable-to-object", "\nclass C(object):\n  x : int = 1\n  def clear(self: C) -> C:\n    return None\n\nc : C = None\nc = C().clear()\nc", (0, helpers_test_1.CLASS)("C"));
    // 18
    (0, asserts_test_1.assertTC)("constructor-type", "\nclass C(object):\n  x : int = 0\n  \nC()", (0, helpers_test_1.CLASS)("C"));
    // 19
    (0, asserts_test_1.assertTCFail)("tc-literal", "\nx : int = None");
    // 20
    (0, asserts_test_1.assertTC)("assign-none", "\nclass C(object):\n  x : int = 0\nc : C = None\nc = None", helpers_test_1.NONE);
});
//# sourceMappingURL=pa3-visible.test.js.map