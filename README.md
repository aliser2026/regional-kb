# 辽陕区域知识库 · 检索站（GitHub Pages 静态版）

纯前端检索站，直接读取 `data.json`，无需 Python 后端，可一键部署到 GitHub Pages，团队用链接即可访问。

## 目录结构
```
index.html      # 检索页（纯前端，读取 ./data.json）
data.json       # 知识库数据（由 build.py 生成，需放入本目录）
build.py        # 本地重建 data.json（扫描区域知识库 .md 条目）
LICENSE
```

## 首次部署步骤
1. 在 GitHub 注册并新建一个**空仓库**（建议名 `regional-kb`，保持空仓库、不要勾 README）。
2. 把本目录（`regional-kb-pages/`）下的文件推上去：
   ```bash
   cd ~/Desktop/regional-kb-pages
   git init
   git add .
   git commit -m "init 区域知识库检索站"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/regional-kb.git
   git push -u origin main
   ```
3. 仓库 → Settings → Pages → Source 选 **Deploy from a branch** → Branch 选 **main** → 目录选 **/(root)** → Save。
4. 等待约 1 分钟，访问 `https://<你的用户名>.github.io/regional-kb/` 即可。

> 注意：`data.json` 必须先存在本目录再 push，否则页面会提示加载失败。
> 生成/更新 data.json（需本机已装 python 与 markdown 包）：
> ```bash
> python3 ~/Desktop/苹果电脑文件/03_工作文件/区域知识库/webapp/build.py
> cp ~/Desktop/苹果电脑文件/03_工作文件/区域知识库/webapp/static/data.json ~/Desktop/regional-kb-pages/data.json
> ```

## 以后新增条目
1. 复制 `区域知识库/0x-xxx/_模板.md` 填写，放到对应目录（01-区域发文 / 02-活动SOP / 03-问题对策）。
2. 本机运行上面两条命令重新生成并复制 `data.json`。
3. `git add data.json && git commit -m "更新条目" && git push`。
4. GitHub Pages 会自动更新（分支部署约 1 分钟生效）。

## 本地预览
直接用浏览器打开 `index.html` 即可（需同目录有 data.json）。
