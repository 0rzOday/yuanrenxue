import os
import json
import sys
import requests
import subprocess

# Windows GBK 终端兼容
sys.stdout.reconfigure(encoding='utf-8') if hasattr(sys.stdout, 'reconfigure') else None


def call_js_function(js_file_path, function_name, *args):
    # 1. 读取 JS 源文件（UTF-8）
    with open(js_file_path, 'r', encoding='utf-8') as f:
        js_code = f.read()

    # 2. 构造调用代码（原JS文件末尾已调用函数输出结果，直接传参运行）
    args_json = json.dumps(args)

    # 3. 写临时文件，避免命令行过长（WinError 206）
    wrapper = f"""\
{js_code}
var result = {function_name}.apply(null, {args_json});
console.log(JSON.stringify(result));
"""
    import tempfile
    fd, tmp_path = tempfile.mkstemp(suffix='.js', prefix='js_wrapper_', text=True)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(wrapper)

        # 4. 调用 Node 执行临时文件
        proc = subprocess.run(
            ['node', tmp_path],
            capture_output=True,
            text=True,
            encoding='utf-8',
            timeout=30
        )
    finally:
        os.unlink(tmp_path)  # 清理临时文件

    # 5. 检查错误
    if proc.returncode != 0:
        raise RuntimeError(f"Node 执行失败：\n{proc.stderr}")

    # 6. 检查 stdout 是否为空
    if not proc.stdout or not proc.stdout.strip():
        raise RuntimeError(f"Node stdout 为空，stderr 内容：{proc.stderr}")

    # 7. 取最后一行解析（原文件可能已有 console.log，wrapper 也输出了一行）
    last_line = proc.stdout.strip().split('\n')[-1]
    return json.loads(last_line)


# ===== 主流程 =====

BASE_URL = "https://match.yuanrenxue.cn/api/question/2"
HEADERS = {
    'User-Agent': 'yuanrenxue',
    "cookie": "Hm_lvt_f80b2b389f44bbfb3bfe1704817d44e0=1782389128,1782696986,1782893783,1782972041; HMACCOUNT=2D3B949E3607E1FF; sessionid=yhjw09vv8iwpkab1xsvx1rxdmdbi3krt; Hm_lpvt_f80b2b389f44bbfb3bfe1704817d44e0=1782972069;"
}
TOTAL_PAGES = 5  # 猿人学通常 5 页

# 1. 请求第一页获取混淆源码（每页返回的 JS 相同）
print("=== 第1步：获取混淆源码 ===")
response = requests.get(url=f"{BASE_URL}?page=1&pageSize=10", headers=HEADERS)
js_code = response.json().get("data")
if not js_code:
    raise RuntimeError(f"API 返回异常：{response.text}")

with open("./源码.js", "w", encoding="utf-8") as f:
    f.write(js_code)
print("  → 已保存 源码.js")

# 2. 运行解混淆脚本
print("\n=== 第2步：解混淆 ===")
proc = subprocess.run(
    ['node', '解混淆.js'],
    capture_output=True,
    text=True,
    encoding='utf-8',
    timeout=60,
    cwd=os.path.dirname(os.path.abspath(__file__))
)
if proc.returncode != 0:
    raise RuntimeError(f"解混淆执行失败：\n{proc.stderr}")
print("  → 已生成 clean_code.js")

# 3. 分页请求真实数据
print("\n=== 第3步：分页获取数据 ===")
all_numbers = []

for page in range(1, TOTAL_PAGES + 1):
    # 每页生成一次动态 cookie
    cookie_m = call_js_function("./clean_code.js", "get_cookie")
    headers_with_cookie = HEADERS.copy()
    headers_with_cookie["cookie"] += cookie_m

    resp = requests.get(
        url=f"{BASE_URL}?page={page}&pageSize=10",
        headers=headers_with_cookie
    )
    resp_json = resp.json()
    # 检查是否返回了预期格式
    if "data" not in resp_json:
        print(f"  ⚠ 第{page}页响应异常: {resp.text[:200]}")
        continue
    data = resp_json["data"]
    # 确保数据是列表且每个元素是数字
    if not isinstance(data, list) or len(data) != 10:
        print(f"  ⚠ 第{page}页数据格式异常: {len(data)} 条, 内容: {str(data)[:200]}")
        continue
    # 转成整数（保险起见）
    data = [int(x) for x in data]
    all_numbers.extend(data)
    print(f"  第{page}页 → {len(data)} 条: {data}")

# 4. 求和
total = sum(all_numbers)
print(f"\n{'='*40}")
print(f"数据总数: {len(all_numbers)}")
print(f"数据: {all_numbers}")
print(f"总和: {total}")
print(f"{'='*40}")