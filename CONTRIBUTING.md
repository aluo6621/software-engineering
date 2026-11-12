# 小组协作

以 GitHub 的 `main` 为共同基线，应用入口是 `业务系统/`。团队沿用原生 HTML/CSS/JavaScript、Node.js 24 和内置 SQLite。每人使用自己的本地配置和数据库。提交前检查暂存区，避免带入 .env、数据库、运行日志、缓存和真实身份资料。

## 从任务分支发起 PR

首次在新目录克隆仓库。每项任务从最新 main 建一个分支，以下命令适用于 macOS 和 Windows PowerShell。

```sh
git clone https://github.com/haha042/software-engineering.git
cd software-engineering
git fetch origin
git switch -c codex/product-review origin/main
```

实现后在 `业务系统/` 运行 `npm test`，Windows PowerShell 可使用 `npm.cmd test`。使用 `git add <文件路径>` 逐项暂存，运行 `git diff --cached` 审核，提交后将任务分支推到 GitHub。

```sh
git push -u origin codex/product-review
```

向 `main` 提 PR，说明关联任务、业务变化、接口或数据库影响和测试结果。由另一位成员审阅，待 macOS 和 Windows 检查通过后由维护者合并。当前私有仓库尚无服务端分支保护，有写权限的成员须遵守仅向任务分支推送的约定。

## 模块边界

任务可以按账号与认证、商品与审核、订单与履约、私信四块认领。在 Issue 中记录负责人、审阅人、接口与测试。当前多个模块共享前后端的 `app.js`，数据库结构也由各模块共用。涉及共享入口、权限、状态或迁移的任务，由相关模块负责人先约定字段、错误和事务边界。需要提取模块时先提交小型重构 PR，让相关成员从合并后的 main 开始各自的功能任务。
