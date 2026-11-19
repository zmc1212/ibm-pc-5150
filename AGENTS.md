# IBM PC 5150（1981）装配模拟

复刻 IBM Personal Computer 5150 主板：Intel 8088 @4.77MHz、8253/8237/8259/8255、
IBM BIOS 8K + CASSETTE BASIC 8K ×4 共 5 颗 ROM、4 组 ×9 片 4116 内存、8284/8288 时钟与总线芯片、5 个 ISA 插槽（MDA/FDC 卡垂直插入）、
键盘 DIN、扬声器。POST 阶段内存计数 0→64KB，最后启动 Cassette BASIC。

## 启动方式
- HTTP：`python3 tools/serve.py 8080`（禁缓存）→ http://127.0.0.1:8080
- 双击 index.html：经典 `<script>` 无模块，file:// 行为一致。

## 交互
拖动旋转 / 滚轮缩放 / 点击零件 / 空格暂停 · D 隐藏/显示仪表盘（录屏可用 URL ?dash=0） / R 重播 / 1-8 跳阶段
（core → banks → cards → io → power → post → boot → home）。

## 验收

**自然播放回归（必查）**：刷新页面后不碰键盘，只看装配——已落座零件必须
全程留在板上（只增不减），cards 阶段后计数 22，home 阶段全部飞出后循环重启。
seek 跳段会 sealAll 掩盖飞行 bug，不能用 seek 代替此项。
按 6（post）：内存计数到 64KB + BEEP；按 7（boot）：白色文字屏打出
"The IBM Personal Computer Basic ... Ok"。控制台无错误。

音效：首次点击/按键自动启用（合成音，零素材），右上角 🔊/🔇 可切换；零件落座、阶段切换、打字均配音。

## 界面语言（双语约定）
中文为主、英文为副的双语风格：标题卡/状态卡/阶段胶囊/仪表盘为中文主文案，
英文原文退到小字副位（`.tag .sub`、面板 `.meta`）；型号代号与单位
（8088、BIOS、POST、ISA、CGA、MHz、KB）保留英文；3D 零件丝印贴图、ISA 卡丝印、
POST/BIOS 屏幕输出（内存计数数字、"The IBM Personal Computer Basic ..." 等）
是「机器内容」不是 UI，保持英文原样。改动文案时遵循同一约定：主位中文、副位英文、代号不译。
