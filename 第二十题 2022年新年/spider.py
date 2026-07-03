import requests
import subprocess
import json
import os

# Node.js sign 脚本路径
SIGN_SCRIPT = os.path.join(os.path.dirname(__file__), "run_sign.js")

def sign(content: str) -> str:
    """调用 Node.js WASM 模块生成 sign"""
    result = subprocess.run(
        ["node", SIGN_SCRIPT, content],
        capture_output=True,
        text=True,
        cwd=os.path.dirname(__file__)
    )
    if result.returncode != 0:
        raise RuntimeError(f"sign 调用失败: {result.stderr}")
    return result.stdout.strip()

headers = {
    "User-Agent": "yuanrenxue",
    "cookie": "sessionid=yhjw09vv8iwpkab1xsvx1rxdmdbi3krt; Hm_lvt_f80b2b389f44bbfb3bfe1704817d44e0=1782696986,1782893783,1782972041,1783043783; HMACCOUNT=2D3B949E3607E1FF; Hm_lpvt_f80b2b389f44bbfb3bfe1704817d44e0=1783044325"
}

def get_t_value():
    """获取时间戳"""
    url = "https://match.yuanrenxue.cn/api/getTime"
    res = requests.get(url, headers=headers)
    print(res.text)
    return res.text




if __name__ == "__main__":
    sum_value=0
    for i in range(1, 6):
        t_value = get_t_value()
        sign_value = sign(str(i)+"|"+str(t_value))
        print(f"t: {t_value}, sign: {sign_value}")
        response= requests.get(f"https://match.yuanrenxue.cn/api/question/20?sign={sign_value}&t={t_value}&page={i}", headers=headers)
        result=response.json()
        sum_value+=sum(result.get("data", []))
    print(f"总和: {sum_value}")
