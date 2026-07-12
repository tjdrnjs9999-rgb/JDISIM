# -*- coding: utf-8 -*-
"""
JDISIM — 플레이오토(EMP) 주문 수집 → 일별 매출 집계 → 어드민 업로드
================================================================
emp_sync 폴더에 넣고 config.json에 "playauto" 섹션 추가 후 사용.

[처음 1회]
1) config.json 에 아래 추가:
   "playauto": {
     "api_key": "발급받은_API_KEY",
     "auth_token": "관리자페이지에서_발급한_JWT_토큰",
     "admin_token": "프록시_ADMIN_TOKEN(Vercel 환경변수와 동일)",
     "profit_api": "https://jdisim-proxy.vercel.app/api/profit"
   }
2) 백필(6월~오늘): python playauto_profit.py --from 2026-06-01

[매일 자동 1회] (관리자 명령창)
   schtasks /create /tn "JDISIM_profit" /tr "python C:\\emp_sync\\playauto_profit.py" /sc daily /st 23:30

동작:
- POST https://openapi.playauto.io/api/orders (결제일 기준, 3000건 페이지네이션, 350ms 딜레이)
- 상품명에 '유심/usim' 포함 → 제외 (eSIM만 집계. '이심'은 안 걸림)
- 상태에 취소/반품/환불/미결제 포함 → 제외
- uniq 기준 중복 제거, playauto_daily.json 에 일별 누적 병합
- 최근 60일 series를 /api/profit 에 POST → 어드민 매출 페이지에 표시
- 옵션: --dry (업로드 없이 집계만) / --from YYYY-MM-DD (백필)
"""
import json, sys, time, os
from datetime import date, datetime, timedelta
try:
    import requests
except ImportError:
    print("pip install requests 먼저 실행"); sys.exit(1)

BASE = os.path.dirname(os.path.abspath(__file__))
CFG_FILE = os.path.join(BASE, "config.json")
STATE_FILE = os.path.join(BASE, "playauto_daily.json")   # {"2026-06-01": {"orders":n,"qty":n,"revenue":n,"uniqs":[...]}}
API_URL = "https://openapi.playauto.io/api/orders"

EXCLUDE_NAME = ("유심", "usim", "USIM", "Usim")           # 상품명 제외 키워드 (eSIM만)
EXCLUDE_STATUS = ("취소", "반품", "환불", "미결제", "결제대기")

def load_cfg():
    cfg = json.load(open(CFG_FILE, encoding="utf-8"))
    p = cfg.get("playauto") or {}
    if not p.get("api_key") or not p.get("auth_token"):
        print("❌ config.json 의 playauto.api_key / auth_token 을 채워주세요 (파일 상단 설명 참고)")
        sys.exit(1)
    return p

def load_state():
    try: return json.load(open(STATE_FILE, encoding="utf-8"))
    except Exception: return {}

def save_state(st):
    json.dump(st, open(STATE_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

def extract_rows(js):
    """응답에서 주문 배열 추출 — 응답 키가 문서에 명시가 없어 흔한 케이스 전부 대응"""
    if isinstance(js, list): return js
    for k in ("results", "rows", "data", "list", "orders", "result"):
        v = js.get(k)
        if isinstance(v, list): return v
        if isinstance(v, dict):
            for k2 in ("rows", "list", "data"):
                if isinstance(v.get(k2), list): return v[k2]
    return []

def total_count(js, fallback):
    for k in ("recordsTotal", "total", "totalCount", "records_total"):
        if isinstance(js.get(k), int): return js[k]
    return fallback

def fetch_orders(p, sdate, edate):
    """기간 내 전체 주문 수집 (페이지네이션 + 레이트리밋 대응)"""
    headers = {"x-api-key": p["api_key"], "Authorization": "Token " + p["auth_token"],
               "Content-Type": "application/json"}
    out, start, length = [], 0, 3000
    while True:
        body = {"start": start, "length": length, "date_type": "pay_time",
                "sdate": sdate, "edate": edate, "status": ["ALL"],
                "orderby": "pay_time asc", "bundle_yn": False}
        r = requests.post(API_URL, headers=headers, json=body, timeout=30)
        if r.status_code == 429:
            print("  ⏳ 레이트리밋 — 1초 대기 후 재시도"); time.sleep(1.2); continue
        if r.status_code == 401:
            print("❌ 401: 토큰 만료. 플레이오토 관리자 페이지에서 Authorization 토큰 재발급 후 config.json 갱신")
            sys.exit(1)
        r.raise_for_status()
        js = r.json()
        rows = extract_rows(js)
        out.extend(rows)
        tot = total_count(js, len(out))
        print(f"  {sdate}~{edate}: {len(out)}/{tot}건 수집")
        if len(rows) < length or len(out) >= tot: break
        start += length
        time.sleep(0.35)   # 초당 3회 제한
    return out

def field(row, *names, default=""):
    for n in names:
        if n in row and row[n] not in (None, ""): return row[n]
    return default

def aggregate(rows, state):
    added, skipped_usim, skipped_cancel = 0, 0, 0
    for r in rows:
        uniq = str(field(r, "uniq", "uniq_no", "id"))
        name = str(field(r, "shop_sale_name", "sale_name", "prod_name"))
        status = str(field(r, "ord_status", "status"))
        pay_t = str(field(r, "pay_time", "ord_time", "wdate"))[:10]
        amt = field(r, "pay_amt", "sales", "pay_amount", default=0)
        qty = field(r, "sale_cnt", "qty", default=1)
        try: amt = int(float(amt))
        except Exception: amt = 0
        try: qty = int(qty)
        except Exception: qty = 1

        if any(k in name for k in EXCLUDE_NAME): skipped_usim += 1; continue
        if any(k in status for k in EXCLUDE_STATUS): skipped_cancel += 1; continue
        if not pay_t or len(pay_t) != 10: continue

        d = state.setdefault(pay_t, {"orders": 0, "qty": 0, "revenue": 0, "uniqs": []})
        if uniq and uniq in d["uniqs"]: continue      # 재수집 중복 방지
        if uniq: d["uniqs"].append(uniq)
        d["orders"] += 1; d["qty"] += qty; d["revenue"] += amt
        added += 1
    return added, skipped_usim, skipped_cancel

def month_chunks(start, end):
    """월 단위로 쪼개서 요청 (한 번에 너무 긴 기간 요청 방지)"""
    cur = start
    while cur <= end:
        nxt = (cur.replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        yield cur.isoformat(), min(nxt, end).isoformat()
        cur = nxt + timedelta(days=1)

def upload(p, state, dry):
    days = sorted(state.keys())[-60:]
    series = [{"d": d, "orders": state[d]["orders"], "qty": state[d]["qty"],
               "revenue": state[d]["revenue"]} for d in days]
    if dry:
        print("\n(--dry: 업로드 생략)"); return
    if not p.get("admin_token"):
        print("\n⚠️ playauto.admin_token 미설정 — 어드민 업로드 생략 (로컬 집계는 저장됨)"); return
    r = requests.post(p.get("profit_api", "https://jdisim-proxy.vercel.app/api/profit"),
                      headers={"Authorization": "Bearer " + p["admin_token"],
                               "Content-Type": "application/json"},
                      json={"series": series, "at": datetime.now().isoformat()}, timeout=20)
    print("\n✅ 어드민 업로드:", r.status_code, r.text[:120])

def main():
    args = sys.argv[1:]
    dry = "--dry" in args
    today = date.today()
    if "--from" in args:
        start = date.fromisoformat(args[args.index("--from") + 1])
    else:
        start = today - timedelta(days=3)   # 매일 실행: 최근 3일 롤링(지연결제·상태변경 보정)

    p = load_cfg()
    state = load_state()
    print(f"■ 플레이오토 주문 수집: {start} ~ {today} (유심 제외, eSIM만)")

    tot_add = tot_usim = tot_cxl = 0
    for s, e in month_chunks(start, today):
        rows = fetch_orders(p, s, e)
        a, u, c = aggregate(rows, state)
        tot_add += a; tot_usim += u; tot_cxl += c

    save_state(state)

    # 요약 출력
    days = sorted(k for k in state if k >= start.isoformat())
    rev = sum(state[d]["revenue"] for d in days)
    cnt = sum(state[d]["orders"] for d in days)
    print(f"\n■ 집계 결과 ({start}~{today})")
    print(f"  주문 {cnt}건 · 매출 {rev:,}원   (신규반영 {tot_add} / 유심제외 {tot_usim} / 취소제외 {tot_cxl})")
    by_month = {}
    for d in days:
        by_month.setdefault(d[:7], [0, 0])
        by_month[d[:7]][0] += state[d]["orders"]; by_month[d[:7]][1] += state[d]["revenue"]
    for m, (o, v) in sorted(by_month.items()):
        print(f"  {m}: {o}건 · {v:,}원")

    upload(p, state, dry)

if __name__ == "__main__":
    main()
