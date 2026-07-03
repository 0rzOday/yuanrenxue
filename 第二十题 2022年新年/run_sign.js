/**
 * 猿人学第20题 - sign 函数调用脚本
 * 加载 WASM + 胶水代码，直接调用 sign()
 */

const fs = require('fs');
const path = require('path');

// ========== 1. 加载 WASM 二进制 ==========
const wasmBuffer = fs.readFileSync(path.join(__dirname, 'rust代码.wasm'));

// ========== 2. 定义 WASM 需要的导入函数 ==========
// WASM 会反过来调这些 JS 函数（操作 DOM 等）（胶水代码中的函数）
let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

const heap = new Array(32).fill(undefined);
heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

function _assertBoolean(n) {
    if (typeof(n) !== 'boolean') {
        throw new Error('expected a boolean argument');
    }
}

let heap_next = heap.length;

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];
    if (typeof(heap_next) !== 'number') throw new Error('corrupt heap');
    heap[idx] = obj;
    return idx;
}

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

// ========== 2.5 创建 mock 浏览器环境 ==========
// WASM 需要 window/location 等信息参与签名计算
const mockLocation = {
    href: "https://match.yuanrenxue.cn/match/20",
    origin: "https://match.yuanrenxue.cn",
    protocol: "https:",
    host: "match.yuanrenxue.cn",
    hostname: "match.yuanrenxue.cn",
    port: "",
    pathname: "/match/20",
    search: "",
    hash: ""
};

const mockDocument = {
    body: {},
    documentElement: {},
    cookie: "",
    createElement: () => ({}),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    readyState: "complete"
};

// mock 一个 window 对象，包含真实网页的信息
const mockWindow = {
    window: undefined,  // 自身引用，下面会修正
    self: undefined,
    globalThis: undefined,
    document: mockDocument,
    location: mockLocation,
    navigator: {
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        platform: "Win32",
    },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    fetch: () => Promise.resolve(),
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    screen: { width: 1920, height: 1080 },
    innerWidth: 1920,
    innerHeight: 1080,
    Math: Math,
    Date: Date,
    JSON: JSON,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Function: Function,
    RegExp: RegExp,
    Error: Error,
    Promise: Promise,
    atob: atob,
    btoa: btoa,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    isFinite: isFinite,
    encodeURI: encodeURI,
    decodeURI: decodeURI,
    encodeURIComponent: encodeURIComponent,
    decodeURIComponent: decodeURIComponent,
};
mockWindow.window = mockWindow;
mockWindow.self = mockWindow;
mockWindow.globalThis = mockWindow;

// 创建一个共享的 mock global 对象
let sharedGlobalObj = mockWindow;

// WASM 导入对象(胶水函数中引入的依赖)
const wasmImports = {
    "./index_bg.js": {
        __wbg_instanceof_Window_434ce1849eb4e0fc(arg0) {
            var ret = getObject(arg0) instanceof Object;
            _assertBoolean(ret);
            return ret;
        },
        __wbg_document_5edd43643d1060d9(arg0) {
            var ret = getObject(arg0).document;
            return (ret === undefined || ret === null) ? 0 : addHeapObject(ret);
        },
        __wbg_body_7538539844356c1c(arg0) {
            var ret = getObject(arg0).body;
            return (ret === undefined || ret === null) ? 0 : addHeapObject(ret);
        },
        __wbg_newnoargs_f579424187aa1717(arg0, arg1) {
            let str = '';
            const uint8 = new Uint8Array(wasmExports.memory.buffer);
            for (let i = 0; i < arg1; i++) {
                str += String.fromCharCode(uint8[arg0 + i]);
            }
            var ret = new Function(str);
            return addHeapObject(ret);
        },
        __wbg_call_89558c3e96703ca1(arg0, arg1) {
            try {
                var ret = getObject(arg0).call(getObject(arg1));
                return addHeapObject(ret);
            } catch(e) {
                wasmExports.__wbindgen_exn_store(addHeapObject(e));
            }
        },
        __wbg_globalThis_d61b1f48a57191ae() {
            try {
                return addHeapObject(sharedGlobalObj);
            } catch(e) {
                wasmExports.__wbindgen_exn_store(addHeapObject(e));
            }
        },
        __wbg_self_e23d74ae45fb17d1() {
            try {
                return addHeapObject(sharedGlobalObj);
            } catch(e) {
                wasmExports.__wbindgen_exn_store(addHeapObject(e));
            }
        },
        __wbg_window_b4be7f48b24ac56e() {
            try {
                return addHeapObject(sharedGlobalObj);
            } catch(e) {
                wasmExports.__wbindgen_exn_store(addHeapObject(e));
            }
        },
        __wbg_global_e7669da72fd7f239() {
            try {
                return addHeapObject(sharedGlobalObj);
            } catch(e) {
                wasmExports.__wbindgen_exn_store(addHeapObject(e));
            }
        },
        __wbindgen_is_undefined(arg0) {
            var ret = getObject(arg0) === undefined;
            _assertBoolean(ret);
            return ret;
        },
        __wbindgen_object_clone_ref(arg0) {
            var ret = getObject(arg0);
            return addHeapObject(ret);
        },
        __wbindgen_object_drop_ref(arg0) {
            takeObject(arg0);
        },
        __wbindgen_throw(arg0, arg1) {
            let str = '';
            const uint8 = new Uint8Array(wasmExports.memory.buffer);
            for (let i = 0; i < arg1; i++) {
                str += String.fromCharCode(uint8[arg0 + i]);
            }
            throw new Error(str);
        }
    }
};

// ========== 3. 实例化 WASM ==========
const wasmModule = new WebAssembly.Module(wasmBuffer);
const wasmInstance = new WebAssembly.Instance(wasmModule, wasmImports);
const wasmExports = wasmInstance.exports;

// ========== 4. 胶水函数（从 胶水函数.js 提取，替换 webpack 引用为 wasmExports（原引用为_index_bg_wasm__WEBPACK_IMPORTED_MODULE_0__））==========

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasmExports.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasmExports.memory.buffer);
    }
    return cachegetUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

let cachedTextEncoder = new TextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
        return cachedTextEncoder.encodeInto(arg, view);
    }
    : function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return { read: arg.length, written: buf.length };
    }
);

function passStringToWasm0(arg, malloc, realloc) {
    if (typeof(arg) !== 'string') throw new Error('expected a string argument');
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }
    let len = arg.length;
    let ptr = malloc(len);
    const mem = getUint8Memory0();
    let offset = 0;
    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);
        if (ret.read !== arg.length) throw new Error('failed to pass whole string');
        offset += ret.written;
    }
    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasmExports.memory.buffer) {
        cachegetInt32Memory0 = new Int32Array(wasmExports.memory.buffer);
    }
    return cachegetInt32Memory0;
}

// ========== 5. sign 函数（核心）（wasmExports为wasm模块中rust代码的导出）==========
function sign(content) {
    try {
        const retptr = wasmExports["__wbindgen_add_to_stack_pointer"](-16);
        var ptr0 = passStringToWasm0(content, wasmExports["__wbindgen_malloc"], wasmExports["__wbindgen_realloc"]);
        var len0 = WASM_VECTOR_LEN;
        wasmExports["sign"](retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        return getStringFromWasm0(r0, r1);
    } finally {
        wasmExports["__wbindgen_add_to_stack_pointer"](16);
        wasmExports["__wbindgen_free"](r0, r1);
    }
}

// ========== 6. 导出 + CLI 模式 ==========
module.exports = { sign, wasmExports };

// 如果作为命令行执行，读取参数并输出结果
if (require.main === module) {
    const input = process.argv[2];
    if (!input) {
        console.error("用法: node run_sign.js <要签名的字符串>");
        process.exit(1);
    }
    const result = sign(input);
    // 只输出结果，方便 Python 解析
    console.log(result);
}
