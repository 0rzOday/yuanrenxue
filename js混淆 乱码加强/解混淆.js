const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const type = require('@babel/types');
const fs = require("fs");
const get_value=require("./解码函数.js")
const js_code=fs.readFileSync("./源码.js","utf-8");
const ast=parser.parse(js_code);

// str编码转化
traverse(ast,{
    StringLiteral(path){
        const node=path.node;
        if (node.extra.raw){
            const raw_path=path.get("extra").get("raw");
            raw_path.remove();
        }
    }
})
// 调用解密函数
traverse(ast,{
    CallExpression(path){
        const node=path.node;
        if (node.callee && node.callee.name==="_0x1383f7" && node.arguments.length===1){
            const value=get_value(node.arguments[0].value);
            path.replaceInline(type.valueToNode(value));
        }
    }
})

const clean_js_code=generate(ast);
fs.writeFileSync("./claen_js_code.js",clean_js_code.code,"utf-8")
console.log("解混淆完毕");