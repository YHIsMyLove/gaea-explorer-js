---
name: ship
description: 一键发布工作流 —— 从代码检查到 CI/CD 部署的完整自动化流程。当用户说"发布"、"deploy"、"ship"、"发布到github"、"推送发布"、"上线"、"release"、"publish"、"部署"、"一键发布"、"ship it"时使用此技能。也适用于用户想将当前工作推送到远端并触发 CI/CD 的场景。
---

# Ship — 一键发布工作流

将当前分支的改动安全推送到 GitHub，合并到主分支并触发 CI/CD 自动发布。

整个流程分五个阶段，**任何阶段失败则立即停止**，向用户报告错误并等待指示。

## 阶段概览

```
[1. 本地检查] → [2. Release 预检] → [3. 提交推送] → [4. PR 合并] → [5. 确认发布]
      ↓                ↓                  ↓               ↓               ↓
 lint/build/test  tags/dry-run      commit/push     PR → merge     release 验证
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

## Phase 2: Release 预检

利用 `multi-semantic-release` 工具链在推送前验证发布可行性，确保 CI/CD 不会因缺少 tag 或未发布的依赖而失败。

**核心原则：版本号计算、CHANGELOG 生成、tag 创建全部由工具链（semantic-release）完成，不由 LLM 手动操作。**

### 2.1 扫描未发布的包

检查所有 workspace 包是否都有对应的 git tag：

```bash
for pkg in packages/*/package.json; do
  name=$(node -p "require('./$pkg').name")
  version=$(node -p "require('./$pkg').version")
  tag="${name}@${version}"
  if ! git tag -l "$tag" | grep -q .; then
    echo "MISSING: $tag"
  fi
done
```

### 2.2 处理缺少 tag 的包

对于所有 `MISSING` 的包：

1. **分析原因**：是新包（从未发布）还是版本号已更新但 tag 未创建？
2. **向用户确认**：列出所有缺少 tag 的包，说明处理方案
3. **创建初始 tag**（用户确认后）：

```bash
git tag <package-name>@<version>
```

4. **推送 tag 到远端**：

```bash
git push origin --tags
```

> **注意**：新包必须有初始 tag，否则聚合包发布时会因依赖未发布而失败。这是 CI 发布失败的最常见原因。

### 2.3 Dry-run 验证

使用 `multi-semantic-release --dry-run` 模拟完整的发布流程，验证版本计算和依赖关系：

```bash
NPM_TOKEN=${NPM_TOKEN:-dummy} GITHUB_TOKEN=${GH_PAT:-dummy} pnpm multi-semantic-release --dry-run --ignore-private-packages=true --deps.bump=inherit
```

> dry-run 模式不需要真实的 token，主要用于检测依赖关系和版本计算是否正确。

### 2.4 分析 dry-run 结果

dry-run 会输出每个包的发布计划：
- 哪些包会发布新版本
- 版本号变化（如 `1.0.0 → 1.1.0`）
- CHANGELOG 内容预览

如果 dry-run 报错（如 "Cannot release because dependency X has not been released"），回到 2.1 修复后重试。

### 2.5 Phase 2 完成标志

- 所有 workspace 依赖的包都有对应的 git tag（或已有更高版本 tag）
- dry-run 无报错，发布计划符合预期

---

## Phase 3: 提交与推送

### 3.1 确认变更内容

```bash
git status
git diff --stat
```

向用户展示即将提交的变更摘要，等待用户确认。

### 3.2 暂存与提交

根据变更内容生成 conventional commit 消息：
- `feat:` 新功能（触发 minor 版本升级）
- `fix:` 修复 bug（触发 patch 版本升级）
- `feat!:` / `BREAKING CHANGE:` 不兼容变更（触发 major 版本升级）
- `refactor:` 重构（默认不触发版本升级）
- `docs:` 文档变更
- `chore:` 构建/工具变更
- `test:` 测试相关
- `style:` 格式调整

提交消息格式遵循项目 commitlint 配置（@commitlint/config-conventional）。

> **重要**：commit 消息中的 type 直接决定 semantic-release 的版本号计算。`feat:` = minor，`fix:` = patch，`BREAKING CHANGE` = major。

**提交前确认**：展示提交消息，等待用户批准后再执行。

### 3.3 推送到远端

```bash
git push -u origin <branch-name>
```

如果远端分支已存在且有冲突，提示用户解决冲突后再推送。

---

## Phase 4: PR 与合并

### 4.1 检查是否已有 PR

使用 GitHub MCP 工具或 `gh` CLI 检查当前分支是否已有关联的 PR：

```bash
gh pr list --head <branch-name>
```

### 4.2 创建 PR（如不存在）

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

### 4.3 等待 CI 检查

PR 创建后，GitHub Actions 会自动运行 CI（lint / build / test）。

```bash
gh pr checks <pr-number>
```

等待所有检查通过。如果检查失败：
- 报告失败原因
- 建议修复方案
- **不要自动合并**

### 4.4 合并 PR

CI 通过后，询问用户是否合并 PR。确认后执行：

```bash
gh pr merge <pr-number> --squash
```

使用 squash merge 保持 master 历史整洁。

---

## Phase 5: 确认 CI/CD 发布

PR 合并到 master 后，GitHub Actions 会自动触发 release workflow：

- **release.yml**: `multi-semantic-release` 自动完成以下全部操作：
  - 分析 conventional commits 确定版本号
  - 生成/更新 CHANGELOG.md
  - 更新 package.json 版本号
  - 创建 git tag（格式：`@gaea-explorer/<package>@<version>`）
  - 发布到 npm
  - 创建 GitHub Release
- **deploy-docs.yml**: 自动构建并部署文档到 GitHub Pages

### 5.1 监控发布状态

```bash
gh run list --branch master --limit 3
```

等待 release workflow 完成：

```bash
gh run watch <run-id>
```

### 5.2 处理发布失败

如果发布失败，根据错误类型处理：

| 错误 | 处理方式 |
|------|----------|
| "Cannot release because dependency X has not been released" | 在 master 分支为该包创建初始 tag 并推送，重新触发 workflow |
| npm 发布 403/401 | 检查 NPM_TOKEN 是否过期 |
| 构建失败 | 在本地复现并修复 |

重新触发 workflow：

```bash
# 创建缺失的 tag
git tag <package-name>@<version>
git push origin --tags

# 重新触发 release（空 commit）
git commit --allow-empty -m "chore: trigger release [skip ci]"
git push origin master
```

### 5.3 验证发布产物

确认以下内容：
- npm 上包版本已更新：`npm view @gaea-explorer/<package> version`
- GitHub Release 已创建
- CHANGELOG.md 已更新并推送

---

## 本地发布模式

当 CI/CD 不可用或需要本地发布时，直接运行 `multi-semantic-release`。

### 前提条件

- 环境变量 `NPM_TOKEN` 和 `GITHUB_TOKEN` 已设置
- 在 master 分支且所有变更已提交

### 执行

Phase 1 检查通过后：

```bash
pnpm release
```

等同于：

```bash
multi-semantic-release --ignore-private-packages=true --deps.bump=inherit
```

### 自动完成项

- 分析 conventional commits，确定版本号
- 生成/更新 CHANGELOG.md
- 更新 package.json 版本号
- 创建 git tag
- 发布到 npm
- 创建 GitHub Release
- 推送 tag 和 commit 到远端

---

## 错误处理

| 阶段 | 错误 | 处理方式 |
|------|------|----------|
| Phase 1 | lint 失败 | 自动修复 → 重试 → 失败则停止 |
| Phase 1 | build 失败 | 分析修复 → 重试 → 失败则停止 |
| Phase 1 | test 失败 | 分析修复 → 重试 → 失败则停止 |
| Phase 2 | 包无 tag | 创建初始 tag → 推送 → 重试 dry-run |
| Phase 2 | dry-run 失败 | 分析原因 → 修复 → 重试 |
| Phase 3 | 推送冲突 | 提示用户 pull/rebase |
| Phase 4 | CI 检查失败 | 报告原因，不自动合并 |
| Phase 5 | 依赖未发布 | 创建初始 tag → 推送 → 重新触发 |
| Phase 5 | npm 认证失败 | 检查 NPM_TOKEN 配置 |

## 快速模式

当用户说"快速发布"、"直接发"等明确跳过确认的指令时：
- Phase 1 仍必须完整执行（不可跳过）
- Phase 2 自动创建缺失的 tag，跳过 dry-run 确认
- Phase 3 自动提交，跳过确认
- Phase 4 自动创建 PR 并等待 CI，CI 通过后自动合并
- Phase 5 报告结果

## 注意事项

- 永远不要在 master/main 分支上直接工作或提交
- Phase 1 的三项检查是不可跳过的安全网
- Phase 2 的预检能避免 CI 发布失败，建议不要跳过
- 合并 PR 前必须确认 CI 通过
- 如果用户只要求推送而不合并，在 Phase 3 完成后停止
- **commit 消息的 type 直接决定版本号**：`feat:` = minor，`fix:` = patch，`BREAKING CHANGE` = major
- **版本号计算、CHANGELOG 生成、tag 创建全部由 semantic-release 工具链完成**，不由 LLM 手动操作
