---
name: ship
description: 一键发布工作流 —— 从代码检查到 CI/CD 部署的完整自动化流程。当用户说"发布"、"deploy"、"ship"、"发布到github"、"推送发布"、"上线"、"release"、"publish"、"部署"、"一键发布"、"ship it"时使用此技能。也适用于用户想将当前工作推送到远端并触发 CI/CD 的场景。
---

# Ship — 一键发布工作流

将当前分支的改动安全推送到 GitHub，合并到主分支并触发 CI/CD 自动发布。

整个流程分四个阶段，**任何阶段失败则立即停止**，向用户报告错误并等待指示。

## 阶段概览

```
[1. 本地检查] → [2. 提交推送] → [3. PR 合并] → [4. 等待 CI/CD]
     ↓                ↓               ↓               ↓
  lint/build/test   commit/push    PR → merge     release 自动发布
```

---

## Phase 1: 本地检查

这一阶段确保代码在本地完全通过所有检查，避免推送到远端后 CI 失败浪费时间。

### 1.1 检查当前分支和状态

```bash
git status
git branch --show-current
```

确认：
- 当前分支不是 `master`/`main`（应该在 develop 或 feature 分支工作）
- 如果在 master/main 上，提醒用户切换到 develop 分支

### 1.2 运行 Biome lint

```bash
pnpm lint
```

如果有 lint 错误：
- 先尝试 `pnpm lint:fix` 自动修复
- 修复后重新 `pnpm lint` 确认通过
- 如果仍有无法自动修复的错误，停止并报告给用户

### 1.3 运行构建

```bash
pnpm build
```

构建失败时，分析错误原因，尝试修复后重新构建。无法修复则停止。

### 1.4 运行测试

```bash
pnpm test
```

测试失败时，分析失败的测试用例，尝试修复后重新运行。无法修复则停止。

### 1.5 Phase 1 完成标志

所有三项检查（lint / build / test）均通过，无报错。

---

## Phase 2: 提交与推送

### 2.1 确认变更内容

```bash
git status
git diff --stat
```

向用户展示即将提交的变更摘要，等待用户确认。

### 2.2 暂存与提交

根据变更内容生成 conventional commit 消息：
- `feat:` 新功能
- `fix:` 修复 bug
- `refactor:` 重构
- `docs:` 文档变更
- `chore:` 构建/工具变更
- `test:` 测试相关
- `style:` 格式调整

提交消息格式遵循项目 commitlint 配置（@commitlint/config-conventional）。

**提交前确认**：展示提交消息，等待用户批准后再执行。

### 2.3 推送到远端

```bash
git push -u origin <branch-name>
```

如果远端分支已存在且有冲突，提示用户解决冲突后再推送。

---

## Phase 3: PR 与合并

### 3.1 检查是否已有 PR

使用 GitHub MCP 工具或 `gh` CLI 检查当前分支是否已有关联的 PR：

```bash
gh pr list --head <branch-name>
```

### 3.2 创建 PR（如不存在）

如果不存在 PR，创建一个新的：

```bash
gh pr create \
  --base master \
  --title "<conventional-commit-title>" \
  --body "<PR描述>"
```

PR 描述应包含：
- 变更摘要
- 相关 issue 链接（如有）
- 测试说明

### 3.3 等待 CI 检查

PR 创建后，GitHub Actions 会自动运行 CI（lint / build / test）。

```bash
gh pr checks <pr-number>
```

等待所有检查通过。如果检查失败：
- 报告失败原因
- 建议修复方案
- **不要自动合并**

### 3.4 合并 PR

CI 通过后，询问用户是否合并 PR。确认后执行：

```bash
gh pr merge <pr-number> --squash
```

使用 squash merge 保持 master 历史整洁。

---

## Phase 4: 确认 CI/CD 发布

PR 合并到 master 后，GitHub Actions 会自动触发 release workflow：

- **release.yml**: semantic-release 自动分析 commit、生成 changelog、发布到 npm、创建 GitHub Release
- **deploy-docs.yml**: 自动构建并部署文档到 GitHub Pages

### 4.1 监控发布状态

```bash
gh run list --branch master --limit 3
```

### 4.2 确认发布结果

检查 release workflow 和 docs deploy workflow 是否成功完成。

---

## 错误处理

| 阶段 | 错误 | 处理方式 |
|------|------|----------|
| Phase 1 | lint 失败 | 自动修复 → 重试 → 失败则停止 |
| Phase 1 | build 失败 | 分析修复 → 重试 → 失败则停止 |
| Phase 1 | test 失败 | 分析修复 → 重试 → 失败则停止 |
| Phase 2 | 推送冲突 | 提示用户 pull/rebase |
| Phase 3 | CI 检查失败 | 报告原因，不自动合并 |
| Phase 4 | 发布失败 | 报告原因，建议手动处理 |

## 快速模式

当用户说"快速发布"、"直接发"等明确跳过确认的指令时：
- Phase 1 仍必须完整执行（不可跳过）
- Phase 2 自动提交，跳过确认
- Phase 3 自动创建 PR 并等待 CI，CI 通过后自动合并
- Phase 4 报告结果

## 注意事项

- 永远不要在 master/main 分支上直接工作或提交
- Phase 1 的三项检查是不可跳过的安全网
- 合并 PR 前必须确认 CI 通过
- 如果用户只要求推送而不合并，在 Phase 2 完成后停止
- 保持 conventional commit 格式，这直接影响 semantic-release 的版本号
