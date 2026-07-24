import requests
import json
import subprocess
import re
import time

session = requests.session()
session.headers = {"User-Agent": "yuanrenxue"}


def get_m_cookie() -> str:
    """获取动态 m cookie"""
    # 第一步：请求接口获取混淆 JS 代码
    url = "https://match.yuanrenxue.cn/api/question/9?page=1&pageSize=10&kw= "
    resp = session.get(url)
    js_code = resp.json().get("data", "")
    if not js_code:
        raise Exception("未获取到混淆 JS 代码")

    with open("服务器混淆代码.js", "w", encoding="utf-8") as f:
        f.write(js_code)

    # 第二步：解混淆生成 js_code.js
    result = subprocess.run(
        ["node", "解混淆.js"],
        capture_output=True, text=True, encoding="utf-8"
    )
    if result.returncode != 0:
        raise Exception(f"解混淆失败:\n{result.stderr}")

    # 第三步：末尾追加打印 cookie（用模块顶部保存的 print = console.log）
    with open("js_code.js", "a", encoding="utf-8") as f:
        f.write("\nprint(document.cookie);\n")

    # 第四步：运行 js_code.js 获取 cookie
    result = subprocess.run(
        ["node", "js_code.js"],
        capture_output=True, text=True, timeout=30, encoding="utf-8"
    )
    if result.returncode != 0:
        raise Exception(f"执行 js_code.js 失败:\n{result.stderr}")

    output = result.stdout.strip()
    match = re.search(r'm=([^;]+)', output)
    if not match:
        raise Exception(f"未提取到 m cookie, 输出: {output}")
    m_value = match.group(1)
    # 将第一个字符转为 int 后 +1 放回
    first_char = m_value[0]
    if first_char.isdigit():
        new_first = str(int(first_char) + 1)
        m_value = new_first + m_value[1:]
    return m_value


def fetch_page(page: int, m_cookie: str) -> list:
    """请求指定页的数据"""
    url = f"https://match.yuanrenxue.cn/api/question/9?page={page}&pageSize=10"
    session.cookies.set("m", m_cookie)
    # 需要重新请求时带 kw= 参数（部分题目要求）
    resp = session.get(url)
    data = resp.json()
    print(f"  page {page}: {data}")
    print(m_cookie)
    
    return data.get("data", [])


def main():
    # 获取 m cookie
    print(">>> 获取动态 m cookie...")
    m_cookie = get_m_cookie()
    print(f"m_cookie: {m_cookie}")

    # 分页获取数据（题目通常 1-5 页）
    print(">>> 开始爬取数据...")
    all_data = []
    for page in range(1, 6):
        items = fetch_page(page, m_cookie)
        all_data.extend(items)
        time.sleep(0.5)

    # 提取数值并求和
    values = [item.get("value", 0) for item in all_data if item]
    total = sum(values)
    print(f"\n共计 {len(values)} 条数据")
    print(f"求和结果: {total}")


if __name__ == "__main__":
    main()
