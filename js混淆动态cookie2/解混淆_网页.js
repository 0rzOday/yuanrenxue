const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const type = require('@babel/types');
const getValue = require("./解密函数_网页");
const fs = require("fs");
const js_code=fs.readFileSync("./网页静态混淆代码.js","utf-8");
const ast=parser.parse(js_code);
// 提取解密函数
/*
traverse(ast, {
      StringLiteral(path) {
          const node = path.node;
          if (node.extra && node.extra.raw) {
              delete node.extra.raw;
          }
      },
      Program(path) {
          const bodys = path.node.body;
          // 提取解密函数
          const decryptions = bodys.slice(0, 4);
          
          const decryptions_function=bodys[decryptions.length - 1];
          var decryptions_function_name=decryptions_function.declarations[0].id.name;
          // 添加导出语句
          const stmt = type.expressionStatement(
            type.assignmentExpression(
          '=',
          type.memberExpression(type.identifier('module'), type.identifier('exports')),
          type .identifier(decryptions_function_name)
        ));
          decryptions.push(stmt);
          // 包装成合法的 AST 节点
          const programNode = type.program(decryptions);
          const cecryptino = generate(programNode);
          fs.writeFileSync("./解密函数_网页.js", cecryptino.code, "utf-8");
      }
  })
*/
traverse(ast,{
    StringLiteral(path) {
          const node = path.node;
          if (node.extra && node.extra.raw) {
              delete node.extra.raw;
          }
      },
    CallExpression(path){
        const node=path.node;
        if (node.callee.name==="_0x56ae" && node.arguments.length===2){
            const left_node=node.arguments[0];
            const right_node=node.arguments[1];
            if (type.isStringLiteral(right_node) && type.isStringLiteral(left_node)){
                const left_value=left_node.value;
                const right_value=right_node.value;
                let value=getValue(left_value,right_value);
                path.replaceInline(type.valueToNode(value));
            } 
        }
    }
})
const clean_code=generate(ast);
fs.writeFileSync("net_page_claen_js_code.js",clean_code.code,"utf-8");
console.log("清洗完毕");