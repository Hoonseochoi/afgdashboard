#!/usr/bin/env python3
"""
데일리 업데이트 실행 스크립트 (직접 실행용)
- data/daily 폴더의 최신 MC_LIST 엑셀 기준으로 Supabase 반영
- .env.local 필요 (afg-dashboard 루트에 두고 실행)

사용: afg-dashboard 폴더에서
  python scripts/run-daily-update.py
또는 프로젝트 루트에서
  python afg-dashboard/scripts/run-daily-update.py
"""
import os
import subprocess
import sys

def main():
    # 스크립트 기준으로 afg-dashboard 루트 찾기
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dashboard_root = os.path.dirname(script_dir)
    os.chdir(dashboard_root)

    env_file = os.path.join(dashboard_root, ".env.local")
    if not os.path.isfile(env_file):
        print("[오류] .env.local 이 없습니다. 경로:", env_file)
        sys.exit(1)

    node_script = os.path.join(script_dir, "supabase-upload-daily.js")
    if not os.path.isfile(node_script):
        print("[오류] supabase-upload-daily.js 를 찾을 수 없습니다.")
        sys.exit(1)

    print("[데일리 업데이트] 실행 중... (node scripts/supabase-upload-daily.js)")
    result = subprocess.run(
        ["node", node_script],
        cwd=dashboard_root,
        shell=False,
    )
    if result.returncode != 0:
        print("[실패] 종료 코드:", result.returncode)
        sys.exit(result.returncode)
    print("[완료] 데일리 업데이트가 정상 종료되었습니다.")

if __name__ == "__main__":
    main()
