# WASM 反爬逆向完整流程

## 背景
Rust 代码通过 `wasm-pack` 编译成 WASM 二进制，配合自动生成的 JS 胶水代码，在浏览器/Node.js 中运行。相比传统 JS 混淆，WASM 二进制不可读，内部逻辑完全黑盒。

---

## 核心概念

```
┌──────────────────────────────────────────────┐
│                  JS 环境                      │
│                                              │
│  ┌─────────────────┐  ┌──────────────────┐   │
│  │   胶水函数.js    │  │   WASM 实例      │   │
│  │                 │  │                  │   │
│  │ passStringToWasm0│  │  sign()          │   │
│  │ getStringFromWasm0│◄┤  __wbindgen_malloc│   │
│  │ getInt32Memory0  │  │  __wbindgen_free │   │
│  │ getUint8Memory0  │  │  memory          │   │
│  │ WASM_VECTOR_LEN  │  └──────┬───────────┘   │
│  │                 │         │                │
│  │ __wbg_window_xxx│◄────────┘ import 声明    │
│  │ __wbg_doc_xxx   │◄──── 需要 JS 提供       │
│  │ __wbindgen_throw│◄──── 这些函数            │
│  └─────────────────┘                         │
└──────────────────────────────────────────────┘
```

### 三个角色

| 角色 | 来源 | 特征 |
|------|------|------|
| **WASM 二进制** (`.wasm`) | Rust 编译产物 | 二进制不可读，内部逻辑黑盒 |
| **胶水函数** (`index_bg.js`) | wasm-pack 自动生成 | 包含 JS↔WASM 转换 + import 依赖实现 |
| **webpack 包装** | 网站构建工具 | 把以上两者打包在一起，无关紧要 |

---

## 逆向流程

### 第 1 步：定位并下载 WASM 文件

**浏览器 DevTools → Network 面板**
- 刷新页面，过滤 `.wasm` 或搜索 `wasm`
- 右键 → Save as 下载

**或者从 JS bundle 中查找**
- 搜索 `__webpack_require__.w`、`WebAssembly.instantiate`
- 内联的 WASM 可能以 base64 或 `new Uint8Array([...])` 形式存在

### 第 2 步：定位并下载胶水函数

在 Sources 面板的大 JS bundle 中搜索：
- `passStringToWasm0`
- `getStringFromWasm0`
- `getInt32Memory0`
- `addHeapObject`

整段复制下来，去掉 webpack 包装（`__webpack_require__` 相关代码）。

### 第 3 步：分析 WASM 的 import 依赖

WASM 实例化时需要外部传入的函数，来源有二：

#### 方式 A：反编译 WAT 查看
```
wasm2wat rust代码.wasm > dump.wat
```
搜索 `(import` 关键字，得到清单：
```wat
(import "./index_bg.js" "__wbg_window_xxx")   → 需要 window 对象
(import "./index_bg.js" "__wbg_document_xxx") → 需要 document 对象
(import "./index_bg.js" "__wbindgen_throw")   → 抛异常函数
...
```

#### 方式 B：从胶水函数反推
胶水函数中 export 的所有 `__wbg_*` 函数，就是 WASM 需要的。

### 第 4 步：补全环境（mock）

根据 import 清单，逐一提供 mock 函数：

```js
const wasmImports = {
    "./index_bg.js": {
        __wbg_window_b4be7f48b24ac56e() {
            return addHeapObject(mockWindow);
        },
        __wbg_document_5edd43643d1060d9(arg0) {
            var ret = getObject(arg0).document;
            return ret ? addHeapObject(ret) : 0;
        },
        __wbindgen_throw(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        // ... 逐个补齐
    }
};
```

不需要精准实现逻辑，只需要：
- **返回正确类型**（WASM 不崩溃即可）
- **关键参数和真实网页一致**（`location.href`、`cookie` 等）

### 第 5 步：提取关键函数及其依赖链

从胶水函数中提取目标函数（如 `sign`），以及它依赖的所有函数：

```js
sign()
├── wasmExports.__wbindgen_add_to_stack_pointer   ← WASM 导出
├── passStringToWasm0                             ← 胶水函数
│     ├── getUint8Memory0                         ← 胶水函数（缓存 WASM 内存视图）
│     ├── cachedTextEncoder                       ← 文本编码
│     └── encodeString                            ← 编码函数
├── WASM_VECTOR_LEN                               ← 全局变量
├── wasmExports.sign                              ← WASM 导出（核心运算）
├── getInt32Memory0                               ← 胶水函数（读取结果指针）
└── getStringFromWasm0                            ← 胶水函数（读回字符串）
      └── getUint8Memory0                         ← 复用的依赖
```

> 注意：将胶水函数中 `_index_bg_wasm__WEBPACK_IMPORTED_MODULE_0__` 全部替换为 `wasmExports`

### 第 6 步：加载 WASM 并实例化

```js
const fs = require('fs');

// 1. 读取 WASM 二进制
const wasmBuffer = fs.readFileSync('rust代码.wasm');

// 2. 编译 + 实例化（传入 import 函数）
const wasmModule = new WebAssembly.Module(wasmBuffer);
const wasmInstance = new WebAssembly.Instance(wasmModule, wasmImports);
const wasmExports = wasmInstance.exports;

// 3. 调用目标函数
const result = sign("要签名/加密的内容");
console.log(result);
```

### 第 7 步：验证结果一致性

| 环境 | 操作方法 |
|------|----------|
| 浏览器 Console | 在页面断点处手动调 `sign("xxx")` |
| 本地 Node.js | `node run_sign.js "xxx"` |

**两个结果必须完全一致。** 如果不一致，回到第 4 步调整 mock 环境。

---

## 环境依赖分类

WASM 的 import 分为三类，对应不同的补环境策略：

| 分类 | 来源 | 例子 | 补环境难度 |
|------|------|------|-----------|
| **`web-sys`** | 浏览器 API | `window`、`document`、`location` | ⭐⭐ 需要 mock 对象结构 |
| **`js-sys`** | JS 内置对象 | `Function`、`globalThis`、`self` | ⭐ 简单返回全局对象 |
| **`wasm-bindgen`** | 数据转换工具 | `throw`、`is_undefined`、`clone_ref` | ⭐ 直接抄胶水函数实现 |

---

## 常见问题

### Q: 为什么 WASM 还要依赖浏览器 API？
Rust 源码中可能调用了浏览器 API（如 `web_sys::window().unwrap()`），编译后自动生成 import 声明。即使核心算法是纯计算，也可能附带环境检查。

### Q: 需要读懂 WASM 内部逻辑吗？
不需要。WASM 当作黑盒处理，只需保证输入参数正确、mock 环境一致，直接调用即可。

### Q: 胶水函数和 WASM import 是什么关系？
一一对应的关系。WASM 声明 `import "./index_bg.js" "__wbg_xxx"`，胶水函数中就必须 `export` 同名函数作为实现。

---

## 完整示例

见本目录下的 `run_sign.js`：
- 加载 `rust代码.wasm`
- 提供 mock 的 `window`、`document` 等环境
- 提取胶水函数中的 `sign` 及其依赖
- 导出供 Python 等外部程序调用
