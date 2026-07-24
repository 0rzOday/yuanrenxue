const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const type = require('@babel/types');
const fs = require("fs");

const js_code=fs.readFileSync("./服务器混淆代码.js","utf-8");
const ast=parser.parse(js_code);
// 清理定时器（变量声明 + 独立语句）
const timerVarNames = new Set();
traverse(ast, {
    // 处理 var t = setInterval(...)
    VariableDeclarator(path) {
        const node = path.node;
        if (node.init && type.isCallExpression(node.init) &&
            !type.isMemberExpression(node.init.callee) &&
            type.isIdentifier(node.init.callee)) {
            const name = node.init.callee.name;
            if (["setTimeout", "setInterval", "setImmediate"].includes(name)) {
                if (type.isIdentifier(node.id)) {
                    timerVarNames.add(node.id.name);
                }
                // 如果这个变量声明是 var 声明中的唯一一项，删除整个声明
                const parentDecl = path.findParent(p => p.isVariableDeclaration());
                if (parentDecl && parentDecl.node.declarations.length === 1) {
                    parentDecl.remove();
                } else {
                    path.remove();
                }
            }
        }
    },
    // 处理独立的定时器语句: setInterval(function() { $c(); }, 0xfa0);
    ExpressionStatement(path) {
        const node = path.node;
        if (type.isCallExpression(node.expression) &&
            !type.isMemberExpression(node.expression.callee) &&
            type.isIdentifier(node.expression.callee)) {
            const name = node.expression.callee.name;
            if (["setTimeout", "setInterval", "setImmediate", "clearTimeout", "clearInterval"].includes(name)) {
                path.remove();
            }
        }
    }
});
// 提取解密函数
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
          const decryptions = bodys.splice(0, 3);

          const decryptions_function=decryptions[decryptions.length - 1];
          var decryptions_function_name=decryptions_function.declarations[0].id.name;
          // 添加导出语句
          const stmt = type.expressionStatement(
            type.assignmentExpression(
          '=',
          type.memberExpression(type.identifier('module'), type.identifier('exports')),
          type .identifier(decryptions_function_name)
        ));
          decryptions.push(stmt);
          const programNode = type.program(decryptions);
          const cecryptino = generate(programNode);
          fs.writeFileSync("./解密函数.js", cecryptino.code, "utf-8");
      }
  })
// 清理解密函数中的非法函数
const decryptions_js_code=fs.readFileSync("解密函数.js","utf-8");
const decryptions_js_ast=parser.parse(decryptions_js_code);
traverse(decryptions_js_ast,{
    // 删除改变内存爆破逻辑
    IfStatement(path){
        const node=path.node;
        if (type.isUnaryExpression(node.test) && node.test.operator==="!" && node.test.argument.name==="j"){
            const real_pd=node.alternate.consequent.body;
            path.replaceInline(real_pd);
        }
    },
    // 删除无限递归 (不写死方法名，匹配 new f($b)['任意方法名']() 的模式)
    ExpressionStatement(path){
        const node=path.node;
        if (type.isCallExpression(node.expression)
            && type.isMemberExpression(node.expression.callee)
            && type.isStringLiteral(node.expression.callee.property)
            && node.expression.callee.object
            && type.isNewExpression(node.expression.callee.object)) {
            path.remove();
        }
    }
});
const clean_decryptions_js_code=generate(decryptions_js_ast);
fs.writeFileSync("./解密函数.js",clean_decryptions_js_code.code,"utf-8");
const getValue=require("./解密函数");

// 调用解密函数并且简化二元运算
traverse(ast,{
    CallExpression(path){
        const node=path.node;
        if (node.callee.name==="$b" && node.arguments.length===2){
            const left_node=node.arguments[0];
            const right_node=node.arguments[1];
            if (type.isStringLiteral(left_node) && type.isStringLiteral(right_node)){
                const left_value=left_node.value;
                const right_value=right_node.value;
                const value=getValue(left_value,right_value);
                path.replaceInline(type.valueToNode(value));

            }

        }
    }
})

// 第二遍：收集所有可计算的二元/一元表达式，遍历结束后统一替换
const replaceQueue = [];
traverse(ast, {
    "BinaryExpression|UnaryExpression": {
        enter(path) {
            const result = path.evaluate();
            if (result.confident) {
                replaceQueue.push({ path, value: result.value });
            }
        }
    }
})
// 遍历结束后，统一替换（从后往前避免节点偏移问题）
for (let i = replaceQueue.length - 1; i >= 0; i--) {
    const { path, value } = replaceQueue[i];
    if (path.node) {  // 检查节点是否未被之前的替换影响
        path.replaceWith(type.valueToNode(value));
    }
}

// 替换爆破函数
traverse(ast, {
      VariableDeclaration(path) {
          const node = path.node;
          if (node.kind === "var" && node.declarations[0] &&
              type.isVariableDeclarator(node.declarations[0])) {
              if (node.declarations[0].id && node.declarations[0].id.name === "h") {
                  if (node.declarations[0].init && type.isCallExpression(node.declarations[0].init)) {
                      let target_path = path.getNextSibling();
                      if (target_path && target_path.toString().includes("h")) {
                          target_path.remove();
                      }
                  }
              }
          }
      },
  });

// 清理 window = new Array()
traverse(ast, {
    ExpressionStatement(path) {
        const node = path.node;
        if (type.isAssignmentExpression(node.expression) &&
            type.isIdentifier(node.expression.left) &&
            node.expression.left.name === "window" &&
            type.isNewExpression(node.expression.right) &&
            type.isIdentifier(node.expression.right.callee) &&
            node.expression.right.callee.name === "Array") {
            path.remove();
        }
    }
});



const clean_code=generate(ast);
fs.writeFileSync("./clean_code.js",clean_code.code,"utf-8");
console.log("清理完毕！")


const front_code=fs.readFileSync("./前插代码.js","utf-8");
const cookie_code=fs.readFileSync("./clean_code.js","utf-8");
const behind_code=fs.readFileSync("./后插代码.js","utf-8");
const basic_code=fs.readFileSync("./net_page_claen_js_code.js","utf-8");

const basic_ast=parser.parse(basic_code);
const front_ast=parser.parse(front_code);
const cookie_ast=parser.parse(cookie_code);
const behind_ast=parser.parse(behind_code);


basic_ast.program.body.unshift(...front_ast.program.body);
basic_ast.program.body.push(...cookie_ast.program.body);
basic_ast.program.body.push(...behind_ast.program.body);

const already_code=generate(basic_ast);

fs.writeFileSync("./js_code.js",already_code.code,"utf-8");
console.log("运行完毕!");



