# 项目协作约束

- 团队同时使用macOS与Windows，所有后续代码、脚本和提交须兼顾两者。
- 保留原生HTML/CSS/JavaScript、Node.js和SQLite；技术栈变更先由用户决定。
- npm脚本优先调用Node.js脚本；禁止依赖rm/cp/export等仅适合Unix的命令。示例需覆盖Windows PowerShell。
- 路径通过node:path、import.meta.url等解析，不硬编码用户名、盘符或绝对工作区路径；注意文件名大小写。
- 所有源码UTF-8，Git文本统一LF，遵循.gitattributes；历史原始归档保留字节，不批量覆盖。
- 不提交.env、数据库、运行日志、node_modules、系统缓存或真实身份资料。
- 公共工具可用不代表两系统均已测试；明确实际验证平台，不将macOS通过写成Windows通过。
