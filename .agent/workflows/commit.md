---
description: 提交代码到 GitHub
---
// turbo-all

1. 查看当前 git 状态
```bash
git -C /Users/zcy/dev/github/qfaitool.com status
```

2. 添加所有变更文件
```bash
git -C /Users/zcy/dev/github/qfaitool.com add -A
```

3. 提交代码（commit message 根据本次变更内容自动生成，使用中文，简洁描述改了什么）
```bash
git -C /Users/zcy/dev/github/qfaitool.com commit -m "<根据变更内容生成>"
```

4. 推送到 GitHub
```bash
git -C /Users/zcy/dev/github/qfaitool.com push origin main
```
