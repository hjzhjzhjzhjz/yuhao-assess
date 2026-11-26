#!/usr/bin/env python3
"""把宇浩測評打包成一個可直接分享的 Windows exe（內嵌全部靜態資源）。"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "宇浩测评.exe"


def 找_bun() -> str:
    候选 = [
        shutil.which("bun"),
        str(Path.home() / ".bun" / "bin" / "bun.exe"),
        r"C:\Users\VEELA\.bun\bin\bun.exe",
    ]
    for 路径 in 候选:
        if 路径 and Path(路径).is_file():
            return 路径
    raise SystemExit("找不到 bun，請先安裝或把它加入 PATH")


def 运行(命令: list[str] | str, cwd: Path) -> None:
    print("→", 命令 if isinstance(命令, str) else " ".join(命令))
    subprocess.run(命令, cwd=cwd, check=True, shell=isinstance(命令, str))


def main() -> None:
    if not (ROOT / "dist" / "index.html").is_file():
        运行("pnpm build", ROOT)

    bun = 找_bun()
    命令 = [
        bun,
        "build",
        "--compile",
        # Bun 1.4.3+：預先編譯字節碼並用 ESM 模組圖，啟動時免去解析/編譯
        "--bytecode",
        "--format=esm",
        "--target=bun",
        "--asset=dist",
        "--asset-naming=[dir]/[name].[ext]",
        "--windows-title=宇浩測評",
        "--windows-description=宇浩漢字輸入法測評系統（離線單文件版）",
        "--windows-version=1.0.0.0",
        "--windows-copyright=yuhao-assess contributors",
        "--outfile",
        str(OUT),
        "打包/启动器.ts",
    ]
    运行(命令, ROOT)

    大小 = OUT.stat().st_size / 1024 / 1024
    print(f"\n完成：{OUT}（{大小:.1f} MB）")
    print("分享這一個 exe 即可；雙擊會自動啟動本地服務並打開系統瀏覽器。")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as 错:
        sys.exit(错.returncode)
