const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const type = require('@babel/types');
const fs = require("fs");
// 读取文件
const code=fs.readFileSync("源码.js","utf-8");
const ast=parser.parse(code);
// 保存大数组名称
var big_array=undefined;
var big_array_name=undefined;
// 解密三个path
var big_array_path=undefined;
var init_function_path=undefined;
var decryption_function_path=undefined;
// 保存解密函数的名称
var decryption_function_name=undefined;
// 删除指定path下的node节点
function delTargetNode(path,node){
    path.traverse({
        enter(p){
            if (p.node===node){
                p.remove();
                p.stop();
            }
        }
    })
}
// 捕获解密数组，初始化自执行函数，解密函数
traverse(ast,{
    Program(path){
        const node=path.node;
        const bodyPaths=path.get('body');
        // 提取大数组
        for (let bodyPath of bodyPaths){
            const body=bodyPath.node;
            if (type.isVariableDeclaration(body) && type.isVariableDeclarator(body.declarations[0])){
                const varValue=body.declarations[0];
                if (type.isArrayExpression(varValue.init) && varValue.init.elements.length>1000){
                    big_array=varValue.init.elements;
                    big_array_name=body.declarations[0].id.name;
                    big_array_path=bodyPath;
                    
                }
            }
        }
        
        // 捕获初始化自执行函数
        for (let bodyPath of bodyPaths){
            const body=bodyPath.node;
            if (type.isExpressionStatement(body) && type.isCallExpression(body.expression)){
                const argumentValues=body.expression.arguments;
                // 判断是否满足解密函数的要求
                if (argumentValues.length===2 && type.isIdentifier(argumentValues[0]) && type.isNumericLiteral(argumentValues[1]) && argumentValues[0].name===big_array_name){
                    // 处理if函数这里if函数中if与else前者会产生内存爆破后者return dev无法初始化大数组
                    bodyPath.traverse({
                        IfStatement(chil_path){
                            const chil_node=chil_path.node;
                            if (type.isIfStatement(chil_node.alternate)){
                                if (type.isBlockStatement(chil_node.alternate.alternate)){
                                const consequent_value=chil_node.alternate.consequent;
                                const expression_value=consequent_value.body[0];
                                if (type.isExpressionStatement(expression_value)){
                                  chil_path.replaceInline(expression_value);
                                }
                                }
                            }
                            
                        }
                    })
                    init_function_path=bodyPath;
                }
            }
        }
        // 捕获解密函数
        for (let bodyPath of bodyPaths){
            const body=bodyPath.node;
            if (type.isVariableDeclaration(body) && type.isVariableDeclarator(body.declarations[0])){
                const varValue=body.declarations[0];
                if (type.isFunctionExpression(varValue.init) && varValue.init.params.length===2){
                    // 获取这里的语句是否调用了大数组
                    const bodyValue=varValue.init.body.body[1];
                    if (bodyValue.declarations[0].init.object.name===big_array_name){
                        // 将内存爆破代码清除
                        bodyPath.traverse({
                            ExpressionStatement(chil_path){
                                const chil_node=chil_path.node;
                                if (type.isAssignmentExpression(chil_node.expression)){
                                    const left=chil_node.expression.left;
                                    const right=chil_node.expression.right;
                                    if (type.isMemberExpression(left) && type.isFunctionExpression(right)){
                                        if (type.isMemberExpression(left.object) && left.object.property.value==="prototype"){
                                            if (type.isBlockStatement(right.body) && type.isForStatement(right.body.body[0])){
                                                const for_value=right.body.body[0];
                                                // 判断这段for中是否有爆破关键字(大致匹配)
                                                const for_code=generate(for_value).code.toString();
                                                if (for_code.includes("push") || for_code.includes("random") || for_code.includes('round')){
                                                    delTargetNode(chil_path,right.body.body[0]);
                                                    delTargetNode(chil_path,right.body.body[1]);
                                                }
                                            }
                                            if (type.isBlockStatement(right.body) && type.isReturnStatement(right.body.body[0])){
                                                delTargetNode(chil_path,right.body.body[0]);
                                                delTargetNode(chil_path,right.body.body[1]);
                                            }
                                        }
                                    }
                                }
                            }
                        })
                        decryption_function_path=bodyPath;
                        decryption_function_name=body.declarations[0].id.name;
                    }  
                }
            }
        }

        // 删除setInterval
        for (let bodyPath of bodyPaths){
            const node=bodyPath.node;
            if (type.isCallExpression(node.expression) && type.isIdentifier(node.expression.callee) && node.expression.callee.name==="setInterval"){
                bodyPath.remove();
            }
        }
    }
})

const decryption_code_list=[
    generate(big_array_path.node).code,
    generate(init_function_path.node).code,
    generate(decryption_function_path.node).code,
    // 增加导出语句便于调用
    "module.exports ="+decryption_function_name
]

const decryption_code=decryption_code_list.join("\n\n");
// 写入解码函数
fs.writeFileSync("./解码函数.js",decryption_code,"utf-8");
const decoding_function=require("./解码函数.js")
// 删除源文件中的解码函数
big_array_path.remove();
init_function_path.remove();
decryption_function_path.remove();
// 调用解码函数解ob混淆
traverse(ast,{
    CallExpression(path){
        const node=path.node;
        if (type.isIdentifier(node.callee) && node.callee.name===decryption_function_name && node.arguments.length===2){
            const arguments1=node.arguments[0];
            const arguments2=node.arguments[1];
            if (type.isStringLiteral(arguments1) && type.isStringLiteral(arguments2)){
                console.log("左参数："+arguments1.value,"，右边参数："+arguments2.value);
                const result_value=decoding_function(arguments1.value,arguments2.value);
                path.replaceInline(type.valueToNode(result_value));
                console.log("左参数："+arguments1.value,"，右边参数："+arguments2.value,",结果:"+result_value);
            }
            
        }
    }
})
// 将所有可静态计算的表达式求值简化（如 "constr" + "uct" + '\x6f\x72' → "constructor"）
traverse(ast,{
    BinaryExpression(path){
        const node=path.node;
        // 跳过涉及变量的运算，只处理纯字面量运算
        if (!type.isStringLiteral(node.left) && !type.isNumericLiteral(node.left) &&
            !type.isStringLiteral(node.right) && !type.isNumericLiteral(node.right) &&
            !type.isBinaryExpression(node.left) && !type.isBinaryExpression(node.right)) return;
        const {confident,value}=path.evaluate();
        if (confident){
            path.replaceInline(type.valueToNode(value));
        }
    }
})
// ************************************dp v4 flash************************************************
/* 
a={
 "bc":"ac"
}
a["bc"]这种数据转为ac
// 第一次循环建立Map
*/
const VarMap=new Map();
traverse(ast,{
    BlockStatement(path) {
        
      const node = path.node;
      if (!VarMap.has(path.scope)) {
          VarMap.set(path.scope,new Map());
      }
      path.traverse({
        VariableDeclarator(chil_path){
            const scopeMap=VarMap.get(path.scope);
            if (type.isIdentifier(chil_path.node.id)) {
                // 处理别名：var x = y; 则 x 共享 y 的 Map
                if (type.isIdentifier(chil_path.node.init) && scopeMap.has(chil_path.node.init.name)) {
                    scopeMap.set(chil_path.node.id.name, scopeMap.get(chil_path.node.init.name));
                } else {
                    scopeMap.set(chil_path.node.id.name, new Map());
                }
            }
        }
      });
      if (!type.isVariableDeclaration(node.body[0]) || node.body[0].kind !== "var") return;

      // 关键：用 path.get('body') 得到 Path 数组
      const bodyPaths = path.get('body');

      for (const exprPath of bodyPaths) {
          if (exprPath.isExpressionStatement()) {
              const expression = exprPath.node.expression;
              if (!type.isAssignmentExpression(expression)) continue;
              const left = expression.left;
              const right = expression.right;
              if (!type.isMemberExpression(left)) continue;
              const object_name=left.object.name;
              const midMap = VarMap.get(path.scope);
              const objectMap=midMap.get(object_name);
              if (!objectMap) continue;
              if (type.isStringLiteral(right)) {
                  objectMap.set(left.property.value, right.value);
              } else if (type.isBinaryExpression(right)) {
                  const rightPath = exprPath.get('expression.right');
                  const {confident, value} = rightPath.evaluate();
                  if (confident) {
                      objectMap.set(left.property.value, value);
                  }
              } else if (type.isFunctionExpression(right)) {
                  objectMap.set(left.property.value, right);
              } else if (type.isMemberExpression(right) && type.isIdentifier(right.object) && type.isStringLiteral(right.property)) {
                  // 右值是属性访问：_0x210aa1["prop"] = _0x44d417["AVgNk"]
                  const val = fin_top_value(path.scope, right.object.name, right.property.value);
                  if (val !== undefined) {
                      objectMap.set(left.property.value, val);
                  }
              }
          }
      }
  }
})
function fin_top_value(curr_scope,object_name,name){
    while (curr_scope){
        const scopeMap=VarMap.get(curr_scope);
        if (!scopeMap){
            curr_scope=curr_scope.parent;
            continue;
        }
        const objectMap=scopeMap.get(object_name);
        if (!objectMap){
            curr_scope=curr_scope.parent;
            continue;
        }
        const value=objectMap.get(name);
        if (!value){
            curr_scope=curr_scope.parent;
            continue;
        }
        return value;
        
    }
}
traverse(ast,{
    CallExpression(path){
        const node = path.node;
        // 检查是否是我们跟踪的函数调用 obj["prop"](args)
        if (!type.isMemberExpression(node.callee)) return;
        const callee = node.callee;
        if (!type.isIdentifier(callee.object)) return;
        let prop_name = type.isStringLiteral(callee.property) ? callee.property.value : undefined;
        if (!prop_name) return;
        const func = fin_top_value(path.scope, callee.object.name, prop_name);
        if (!func || !type.isFunctionExpression(func)) return;

        // 只处理简单 return expr 的函数
        const bodyStmts = func.body.body;
        if (bodyStmts.length !== 1 || !type.isReturnStatement(bodyStmts[0])) return;

        // 克隆返回值表达式，将形参替换为实参
        let result = type.cloneNode(bodyStmts[0].argument);
        const params = func.params;
        const args = node.arguments;

        // 建立形参名 → 实参表达式的映射
        const paramReplacements = new Map();
        for (let i = 0; i < params.length && i < args.length; i++) {
            if (type.isIdentifier(params[i])) {
                paramReplacements.set(params[i].name, args[i]);
            }
        }

        // 递归替换形参标识符
        function doReplace(n) {
            if (!n || typeof n !== 'object') return n;
            if (type.isIdentifier(n) && paramReplacements.has(n.name)) {
                return type.cloneNode(paramReplacements.get(n.name));
            }
            for (const key of Object.keys(n)) {
                if (['type', 'start', 'end', 'loc', 'leadingComments', 'trailingComments', 'innerComments', 'extra'].includes(key)) continue;
                const val = n[key];
                if (Array.isArray(val)) {
                    for (let i = 0; i < val.length; i++) {
                        if (val[i] && typeof val[i] === 'object' && val[i].type) {
                            n[key][i] = doReplace(val[i]);
                        }
                    }
                } else if (val && typeof val === 'object' && val.type) {
                    n[key] = doReplace(val);
                }
            }
            return n;
        }

        result = doReplace(result);
        path.replaceInline(result);
    },
    MemberExpression(path){
        const node=path.node;
        // 跳过赋值语句左侧（写操作），只替换读操作
        if (type.isAssignmentExpression(path.parent) && path.parent.left === node) return;
        // 跳过非简单对象名（如 a.b.c 中的 a.b）
        if (!type.isIdentifier(node.object)) return;
        const object_name=node.object.name;
        let name=undefined;
        if (type.isStringLiteral(node.property)){
            name=node.property.value;
        }
        const value=fin_top_value(path.scope,object_name,name);
        if (value !== undefined){
            // 函数值不在这里处理（交给上面的 CallExpression）
            if (!type.isFunctionExpression(value)) {
                path.replaceInline(type.valueToNode(value));
            }
        }
    }
})
// 删除死代码（if 常量分支、三元表达式、逻辑表达式）
traverse(ast, {
    IfStatement(path) {
        const {confident, value} = path.get('test').evaluate();
        if (!confident) return;

        if (value) {
            // 恒真：保留 consequent，删除 alternate
            if (type.isBlockStatement(path.node.consequent)) {
                path.replaceInline(path.node.consequent.body);
            } else {
                path.replaceInline(path.node.consequent);
            }
        } else {
            // 恒假：保留 alternate（else 分支），否则删除整个 if
            if (path.node.alternate) {
                if (type.isBlockStatement(path.node.alternate)) {
                    path.replaceInline(path.node.alternate.body);
                } else {
                    path.replaceInline(path.node.alternate);
                }
            } else {
                path.remove();
            }
        }
    },
    ConditionalExpression(path) {
        const {confident, value} = path.get('test').evaluate();
        if (!confident) return;
        path.replaceInline(value ? path.node.consequent : path.node.alternate);
    },
    LogicalExpression(path) {
        const {confident, value} = path.get('left').evaluate();
        if (!confident) return;
        if (path.node.operator === '&&') {
            path.replaceInline(value ? path.node.right : type.valueToNode(value));
        } else if (path.node.operator === '||') {
            path.replaceInline(value ? type.valueToNode(value) : path.node.right);
        }
    }
})
// ************************************dp v4 flash************************************************
// 删除setInterval与eval
traverse(ast,{
    ExpressionStatement(path){
        const node=path.node;
        if (type.isCallExpression(node.expression) && type.isIdentifier(node.expression.callee) && node.expression.callee.name==="setInterval"){
            path.remove();
        }else if (type.isCallExpression(node.expression) && type.isIdentifier(node.expression.callee) && node.expression.callee.name==="eval"){
            path.remove();
        }
    }
}
)
// 删除反调试代码：匹配 无参函数调用 + 自执行函数 + 无参函数调用 的三连结构
traverse(ast, {
  BlockStatement(path) {
    const bodyPaths = path.get('body');
    if (bodyPaths.length < 3) return;

    for (let i = 0; i <= bodyPaths.length - 3; i++) {
      const stmt0 = bodyPaths[i].node;
      const stmt1 = bodyPaths[i + 1].node;
      const stmt2 = bodyPaths[i + 2].node;

      // 模式1: 无参函数调用 X()
      const isSimpleCall = (n) =>
        type.isExpressionStatement(n) &&
        type.isCallExpression(n.expression) &&
        type.isIdentifier(n.expression.callee) &&
        n.expression.arguments.length === 0;

      // 模式2: 自执行函数 (function(){...})()
      const isSelfExec = (n) =>
        type.isExpressionStatement(n) &&
        type.isCallExpression(n.expression) &&
        type.isFunctionExpression(n.expression.callee);

      if (isSimpleCall(stmt0) && isSelfExec(stmt1) && isSimpleCall(stmt2)) {
        console.log("[反调试] 删除三连结构: " + stmt0.expression.callee.name + "() + (function(){})() + " + stmt2.expression.callee.name + "()");
        bodyPaths[i + 2].remove();
        bodyPaths[i + 1].remove();
        bodyPaths[i].remove();
        i += 2; // 跳过已删除的位置
      }
    }
  }
});

// 删除try catch中反调试语句
traverse(ast, {
    TryStatement(path) {
      path.remove();
    }
});

traverse(ast, {
    Program(path) {
        const function_code="function get_cookie(){return document.cookie.split('undefined=').join('=');}";
        const function_ast=parser.parse(function_code);
        path.unshiftContainer('body', function_ast.program.body[0]);
        const document_code="var document={};";
        const document_ast=parser.parse(document_code);
        path.unshiftContainer('body', document_ast.program.body[0]);
    }

})




const clean_code=generate(ast);
fs.writeFileSync("./clean_code.js",clean_code.code,"utf-8");


