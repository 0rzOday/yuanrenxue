import requests
import json
import os
import subprocess



def call_js_code():
    proc = subprocess.run(
    ['node', 'result.js'],
    capture_output=True, text=True, check=True)
    data = json.loads(proc.stdout)
    return data


def spider():
    sum_value=0
    data=call_js_code()
    header={
        "cookie":f"sessionid=srdjudlkefp21md2d9p9s5trq4xpzy4h;Hm_lvt_f80b2b389f44bbfb3bfe1704817d44e0=1782972041,1783043783,1783301959,1783388643; HMACCOUNT=2D3B949E3607E1FF;Hm_lpvt_f80b2b389f44bbfb3bfe1704817d44e0=1783402686; m={data.get("cookie_m")}; RM4hZBv0dDon443M={data.get("RM4hZBv0dDon443M")}",
        "user-agent":"yuanrenxue"
        }
   
    for page in range(1,6):
        params={
            "page":page,
            "m":data.get("url_m"),
            "f":data.get("url_f")
        }
        response=requests.get("https://match.yuanrenxue.cn/api/question/5",params=params,headers=header)
        sum_value+=sum(response.json().get("data"))
    return sum_value

        

print(spider())
