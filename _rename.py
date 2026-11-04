# -*- coding: utf-8 -*-
"""把插件 id / npm 包名从 dsh-store-market 改成 dsh-apps。
不动的：GitHub 仓库名（repository.url）、Pages 数据源 URL（…/dsh-store/…）、
路由前缀 /dsh-store/*（那是 URL，不是包名）。"""
import io
import json

def rw(path, pairs):
    s = io.open(path, encoding="utf-8", newline="").read().replace("\r\n", "\n")
    for old, new, n in pairs:
        c = s.count(old)
        assert c == n, (path, old[:60], c, n)
        s = s.replace(old, new)
    io.open(path, "w", encoding="utf-8", newline="").write(s.replace("\n", "\r\n"))
    print("改好", path)

rw("package.json", [
    ('"name": "dsh-store-market",', '"name": "dsh-apps",', 1),
    # 发布瘦身：不再把 20MB 快照打进包里，数据走回源 + ~/.dsh/store-data 缓存
    ('"files": [\n    "index.js",\n    "site",\n    "client",',
     '"files": [\n    "index.js",\n    "site/index.html",\n    "client",', 1),
])

rw("index.js", [
    (" * dsh-store-market — DSH 插件商店（宿主版）", " * dsh-apps — DSH 插件商店（宿主版）", 1),
    ("export const name = 'dsh-store-market'", "export const name = 'dsh-apps'", 1),
    ("name: 'dsh-store-market',", "name: 'dsh-apps',", 1),
    ("'[dsh-store-market] 数据缓存刷新失败", "'[dsh-apps] 数据缓存刷新失败", 1),
    ("'[dsh-store-market] gzip failed", "'[dsh-apps] gzip failed", 1),
])

rw("client-src/index.js", [
    (" * dsh-store-market client bundle", " * dsh-apps client bundle", 1),
    ("export const name = 'dsh-store-market'", "export const name = 'dsh-apps'", 1),
    ("const NS = 'dsh-store-market'", "const NS = 'dsh-apps'", 1),
    ("'[dsh-store-market] slot register failed", "'[dsh-apps] slot register failed", 1),
    ("'dsh-store-market: dictionaries'", "'dsh-apps: dictionaries'", 1),
    ("'[dsh-store-market] client mount failed", "'[dsh-apps] client mount failed", 1),
])

rw("client/client.js", [
    ('id: "dsh-store-market"', 'id: "dsh-apps"', 1),
    ('var name = "dsh-store-market";', 'var name = "dsh-apps";', 1),
    ('var NS = "dsh-store-market";', 'var NS = "dsh-apps";', 1),
    ('"[dsh-store-market] slot register failed"', '"[dsh-apps] slot register failed"', 1),
    ('"dsh-store-market: dictionaries"', '"dsh-apps: dictionaries"', 1),
    ('"[dsh-store-market] client mount failed"', '"[dsh-apps] client mount failed"', 1),
])

rw("cordis.patch.yml", [
    ("- id: dsh-store-market", "- id: dsh-apps", 1),
    ("name: 'dsh-store-market'", "name: 'dsh-apps'", 1),
])

rw("package-lock.json", [('"name": "dsh-store-market",', '"name": "dsh-apps",', 1)])

# README：安装命令与包名说法换掉，仓库地址不动
s = io.open("README.md", encoding="utf-8", newline="").read().replace("\r\n", "\n")
before = s.count("dsh-store-market")
s = s.replace("dsh plugin add dsh-store-market", "dsh plugin add dsh-apps")
s = s.replace("dsh plugin add github:qianyumeng0228/dsh-store-market", "dsh plugin add github:qianyumeng0228/dsh-store-market")
s = s.replace("`dsh-store-market`", "`dsh-apps`")
s = s.replace("安装 `dsh-store-market`", "安装 `dsh-apps`")
io.open("README.md", "w", encoding="utf-8", newline="").write(s.replace("\n", "\r\n"))
print("README 里 dsh-store-market 出现次数", before, "→ 剩余", s.count("dsh-store-market"), "（应只剩仓库地址类引用）")

# 站点文案里提到的插件名
p = "../dsh-store/site/index.html"
s2 = io.open(p, encoding="utf-8", newline="").read().replace("\r\n", "\n")
n2 = s2.count("安装 <code>dsh-store-market</code>") + s2.count("安装 dsh-store-market")
s2 = s2.replace("安装 <code>dsh-store-market</code>", "安装 <code>dsh-apps</code>")
s2 = s2.replace("安装 dsh-store-market", "安装 dsh-apps")
io.open(p, "w", encoding="utf-8", newline="").write(s2.replace("\n", "\r\n"))
print("站点文案替换", n2, "处")
