import subprocess
import random
import requests

def mouse(page):
    """生成鼠标轨迹明文"""
    basic_value_x = 300
    basic_value_y = 650 + random.randint(1, 100)
    result_x = [basic_value_x + random.randint(1, 150)]
    for _ in range(3):
        pd = random.randint(1, 10)
        add_value = random.randint(1, 15)
        if (pd % 2 or result_x[_] - add_value < 300):
            value = result_x[_] + add_value
        else:
            value = result_x[_] - add_value
        result_x.append(value)
    result = []
    for _ in result_x:
        result_item = str(_) + "m" + str(basic_value_y)
        result.append(result_item)
    d_value = result[-1].replace("m", "d")
    u_value = result[-1].replace("m", "u")
    result.append(d_value)
    result.append(u_value)
    result = ",".join(result)
    return str(page) + "|" + result

def encrypt_by_ts(ts, plaintext):
    """调用 Node.js 进行 AES 加密"""
    result = subprocess.run(
        ['node', 'jsvmp.js', str(ts), plaintext],
        capture_output=True,
        text=True,
        check=True
    )
    return result.stdout.strip()

headers = {
    "cookie": "sessionid=pm32m1zkr6j777tkaxtq4w1tsgthsoac; Hm_lvt_f80b2b389f44bbfb3bfe1704817d44e0=1783668706,1783700899,1783747110,1783831980; HMACCOUNT=2D3B949E3607E1FF; Hm_lpvt_f80b2b389f44bbfb3bfe1704817d44e0=1783853550",
    "user-agent":"yuanrenxue"
}
flag=0
for page_number in range(1, 6):
    plaintext = mouse(page_number)
    resp = requests.get("https://match.yuanrenxue.cn/api/getTime", headers=headers)
    ts = int(resp.text[:10])          # 确保是整数
    cipher = encrypt_by_ts(ts, plaintext)
    print(f"Page {page_number}: cipher = {cipher}")
    
    
    response=requests.get(f"https://match.yuanrenxue.cn/api/v/question/18data?page={page_number}&t={ts}&v={cipher}",headers=headers)
    flag+=sum(response.json().get("data"))
    
print(flag)