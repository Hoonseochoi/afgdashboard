#!/usr/bin/env python3
"""
데일리 업데이트 실행 스크립트 (직접 실행용)
1. data/daily 최신 MC_LIST 엑셀 → Supabase (실적·주차·config·agent-order)
2. data/daily 최신 PRIZE_SUM 엑셀 → 1주차 상품 실적 (product_week1, weekly.productWeek1)
- .env.local 필요 (afg-dashboard 루트에 두고 실행)

사용: afg-dashboard 폴더에서
  python scripts/run-daily-update.py
"""
import os
import subprocess
import sys

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dashboard_root = os.path.dirname(script_dir)
    os.chdir(dashboard_root)

    env_file = os.path.join(dashboard_root, ".env.local")
    if not os.path.isfile(env_file):
        print("[오류] .env.local 이 없습니다. 경로:", env_file)
        sys.exit(1)

    daily_script = os.path.join(script_dir, "supabase-upload-daily.js")
    if not os.path.isfile(daily_script):
        print("[오류] supabase-upload-daily.js 를 찾을 수 없습니다.")
        sys.exit(1)

    print("[데일리 업데이트] 1/2 MC_LIST 업로드...")
    result = subprocess.run(
        ["node", daily_script],
        cwd=dashboard_root,
        shell=False,
    )
    if result.returncode != 0:
        print("[실패] MC_LIST 종료 코드:", result.returncode)
        sys.exit(result.returncode)
    print("[완료] MC_LIST 반영 완료.")

    product_script = os.path.join(script_dir, "supabase-upload-march-product-week1.js")
    if os.path.isfile(product_script):
        print("[데일리 업데이트] 2/2 1주차 상품(PRIZE_SUM) 업로드...")
        r2 = subprocess.run(
            ["node", product_script],
            cwd=dashboard_root,
            shell=False,
        )
        if r2.returncode != 0:
            print("[경고] 1주차 상품 스크립트 종료 코드:", r2.returncode, "(파일 없으면 생략됨)")
        else:
            print("[완료] 1주차 상품 반영 완료.")
    else:
        print("[건너뜀] supabase-upload-march-product-week1.js 없음.")

    print("[완료] 데일리 업데이트가 정상 종료되었습니다.")

if __name__ == "__main__":
    main()
