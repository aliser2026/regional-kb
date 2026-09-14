#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
构建静态站点：扫描 区域知识库/ 下 01/02/03 目录的 .md 条目，
渲染 Markdown 为 HTML，提取标题/标签/分类/摘要/纯文本，
输出到 static/data.json。前端 index.html 直接加载此 JSON 做检索。
（纯静态，无需后端，可直接部署到 GitHub Pages 等静态托管。）
"""
import os
import re
import json
import shutil
import markdown

KB_ROOT = "/Users/lifanxue/Desktop/苹果电脑文件/03_工作文件/区域知识库"
OUT_DIR = os.path.join(os.path.dirname(__file__), "static")
CATEGORY_MAP = {
    "01-区域发文": "区域发文",
    "02-活动SOP": "活动SOP",
    "03-问题对策": "问题对策",
}
FILES_SRC = os.path.join(KB_ROOT, "files")
FILES_DST = os.path.join(OUT_DIR, "files")
APPROVED_FILE = os.path.join(FILES_SRC, "approved.txt")


def parse_title(text, fb):
    m = re.search(r'^#\s+(.*)$', text, re.M)
    if m:
        return re.sub(r'^【[^】]*】', '', m.group(1).strip()).strip()
    return fb


def parse_tags(text):
    m = re.search(r'标签[：:]\s*(.+)', text)
    if not m:
        return []
    return [p.strip() for p in re.split(r'[/／]', m.group(1)) if p.strip()]


def parse_summary(text):
    for line in text.splitlines():
        s = line.strip()
        if s and not s.startswith('#') and not s.startswith('>'):
            return s[:120]
    return ""


def parse_files(text):
    m = re.search(r'附件[：:]\s*(.+)', text)
    if not m:
        return []
    return [p.strip() for p in re.split(r'[/／]', m.group(1)) if p.strip()]


def main():
    approved_set = set()
    if os.path.isfile(APPROVED_FILE):
        with open(APPROVED_FILE, encoding="utf-8") as f:
            approved_set = {l.strip() for l in f if l.strip()}

    if os.path.isdir(FILES_DST):
        shutil.rmtree(FILES_DST)

    entries = []
    for cat_dir, cat_name in CATEGORY_MAP.items():
        full = os.path.join(KB_ROOT, cat_dir)
        if not os.path.isdir(full):
            continue
        for fn in sorted(os.listdir(full)):
            if not fn.endswith(".md") or fn.startswith("_"):
                continue
            path = os.path.join(full, fn)
            try:
                text = open(path, encoding="utf-8").read()
            except Exception:
                continue
            html = markdown.markdown(text, extensions=["tables", "fenced_code"])
            plain = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', html)).strip()
            file_objs = []
            for fname in parse_files(text):
                src = os.path.join(FILES_SRC, fname)
                if not os.path.isfile(src):
                    file_objs.append({"name": fname, "approved": False, "missing": True})
                    continue
                ok = fname in approved_set
                if ok:
                    os.makedirs(FILES_DST, exist_ok=True)
                    shutil.copy(src, os.path.join(FILES_DST, fname))
                file_objs.append({"name": fname, "approved": ok})
            entries.append({
                "id": f"{cat_dir}/{fn}",
                "title": parse_title(text, fn),
                "category": cat_name,
                "tags": parse_tags(text),
                "summary": parse_summary(text),
                "html": html,
                "text": plain,
                "files": file_objs,
            })
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, "data.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"categories": list(CATEGORY_MAP.values()), "entries": entries},
                  f, ensure_ascii=False)
    print(f"已生成 {out}，共 {len(entries)} 条条目；已批准可下载附件 {sum(1 for e in entries for x in e['files'] if x.get('approved'))} 个。")


if __name__ == "__main__":
    main()
