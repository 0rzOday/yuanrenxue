import requests
import json
import subprocess
import time
import random


def call_js_all():
    """一次调用 JS 获取全部 5 页的加密参数"""
    proc = subprocess.run(
    ['node', '解码、.js'],
    capture_output=True, text=True, encoding='utf-8', check=True)
    return json.loads(proc.stdout)


def spider():
    sum_value = 0
    header = {
        "cookie": "sessionid=nicfzqmgwsqfzfyozdw8e4cbnogk63eg; Hm_lvt_f80b2b389f44bbfb3bfe1704817d44e0=1783831980,1783907784,1784168943,1784252665; HMACCOUNT=2D3B949E3607E1FF; Hm_lpvt_f80b2b389f44bbfb3bfe1704817d44e0=1784257236",
        "user-agent": "yuanrenxue"
    }

    # 一次获取所有加密参数（共享 RC4 状态）
    all_data = call_js_all()
    q_data = ""

    for page, data in enumerate(all_data, 1):
        q = "1-" + data.get("q") + "|"
        q_data += q
        m_data = data.get("m")
        params = {
            "page": page,
            "m": m_data,
            "q": q_data
        }

        time.sleep(0.2)
        response = requests.get("https://match.yuanrenxue.cn/api/question/6", params=params, headers=header)
        print(f"Page {page}: {response.text[:200]}")
        print(f"  q_data: {q_data}")
        print(f"  m: {m_data[:50]}...")

        if "风控" in response.text:
            print("触发风控！")
            break

        try:
            sum_value += sum(response.json().get("data", []))
        except:
            pass

    return sum_value


print(spider())
