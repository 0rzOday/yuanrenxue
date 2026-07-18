const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const type = require('@babel/types');
const fs = require("fs");
const code=fs.readFileSync("./颜文字混淆解码.js","utf-8");
const ast=parser.parse(code);
var map=new Map();
// 递归查找最右边值
function find_last_right_value(path){
    const node=path.node;
    if (type.isAssignmentExpression(node.right)){
        const value=find_last_right_value(path.get("right"))
    }
}
traverse(ast,{
    AssignmentExpression(path){
        const node=path.node;
        if (node.operator==="="){
            find_last_right_Value(path)
        }
    }
})
const clean_code=generate(ast);
fs.writeFileSync("./clean_code.js",clean_code.code,"utf-8");