---
name: fix-all
description: 一键检测并修复项目中的 Biome lint 问题和 TypeScript 类型错误。当用户说"修复"、"fix"、"lint fix"、"typecheck fix"、"一键修复"、"检查并修复"、"跑一下检查"时使用此技能。也适用于提交代码前想确保代码质量、CI 检查失败需要修复、或看到 biome/tsc 报错需要处理的场景。
---

# Fix All - 一键检测与修复

这个技能帮你自动检测并修复项目中的代码质量问题，包括 Biome lint 和 TypeScript 类型检查。

## 项目工具链

本项目是 pnpm monorepo，使用以下工具链：

| 工具 | 命令 | 用途 |
|------|------|------|
| Biome v2 | `biome check packages` | lint + format 检查 |
| Biome fix | `biome check --write --unsafe packages` | 自动修复 lint/format |
| TypeScript | `tsc --noEmit -p <pkg>/tsconfig.json` | 类型检查（逐包） |
| pnpm | 包管理器 | monorepo 管理 |

### 包列表

```
common, compass, drawer, gaea-explorer-js, geojson-render,
heat, measure, popup, primitive-geojson, subscriber,
sync-viewer, tooltip, zoom-controller
```

## 执行流程

### Step 1: 运行全部检查（并行）

同时运行以下两个检查，收集所有问题：

```bash
# 检查 1: Biome lint + format
pnpm lint 2>&1

# 检查 2: TypeScript 逐包 typecheck
# 对每个包运行 tsc --noEmit，收集错误
for pkg in common compass drawer gaea-explorer-js geojson-render heat measure popup primitive-geojson subscriber sync-viewer tooltip zoom-controller; do
  npx tsc --noEmit -p "packages/$pkg/tsconfig.json" 2>&1
done
```

将所有输出保存，分析错误数量和类型。

### Step 2: 分析问题并分类

根据输出，将问题分为两类：

**A 类 - 可自动修复（Biome 能处理的）：**
- 格式问题（缩进、引号、分号、尾逗号等）
- 可自动修复的 lint 规则（unused imports 等）

**B 类 - 需要手动修复（TypeScript 类型错误）：**
- 类型不匹配 (TS2322)
- 缺少属性 (TS2739)
- 参数类型错误 (TS2345)
- 其他类型相关错误

### Step 3: 自动修复 A 类问题

对 Biome 可以自动修复的问题，直接运行：

```bash
pnpm lint:fix
```

即 `biome check --write --unsafe packages`。

### Step 4: 逐个修复 B 类问题

对每个 TypeScript 错误：

1. **读取错误文件**，定位到具体行号
2. **理解错误上下文** - 阅读周围的代码，理解期望的类型
3. **选择修复策略**：
   - **补全缺失属性**：如果是缺少必需属性，添加合理的默认值或正确的值
   - **修正类型断言**：如果类型推断错误，添加正确的类型标注或断言
   - **添加可选标记**：如果属性实际上可选，在类型定义中添加 `?`
   - **修复参数类型**：确保传入的参数与函数签名匹配
4. **应用修复**：使用 Edit 工具精确修改
5. **验证修复**：重新对该包运行 `tsc --noEmit` 确认错误已解决

### Step 5: 最终验证

所有修复完成后，重新运行全部检查：

```bash
pnpm lint 2>&1
# 以及逐包 typecheck
```

确认零错误后，执行下一步。

### Step 6: 代码精简

修复过程可能引入冗余代码或不够简洁的写法。在所有错误清零后，调用 `/simplify` 技能对本次修改过的文件进行代码审查和精简，确保修复代码与项目风格一致、无多余代码。

具体做法：
1. 通过 `git diff` 识别本次修改的所有文件
2. 对这些文件执行 `/simplify`，检查复用性、质量和效率
3. 如果 `/simplify` 发现问题，立即修复并重新运行 Step 5 验证
4. 确认无误后，输出修复报告

## 修复报告格式

完成后输出如下格式的报告：

```
## 修复报告

### Biome
- 检查文件数: N
- 自动修复: N 个问题
- 剩余: 0

### TypeScript
- 修复的包: package-a, package-b
- 修复的错误数: N
- 剩余错误: 0

### 修改的文件
- packages/xxx/src/file.ts - 修复了 xxx 类型错误
- packages/yyy/test/test.ts - 补全了缺失属性
```

## 注意事项

- 优先使用 Biome 的自动修复能力，不要手动修复 Biome 能处理的问题
- TypeScript 修复时要理解业务逻辑，不要盲目添加 `as any` 或 `@ts-ignore`
- 测试文件中的类型错误同样需要认真修复，不要跳过
- 如果某个类型错误涉及多个包的联动修改，一次性完成所有相关修改
- 修复过程中如果发现 biome.json 中的规则配置导致误报，可以建议调整配置但不要直接修改
