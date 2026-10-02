# 配布ROM

最新版は **PenguinJump-v19.gbc**。すべてGame Boy Color専用です。`PenguinJump.gbc` は初版、`PenguinJump-v2.gbc` 以降は制作時の版別ROMです。過去版は履歴確認用に残しています。

`.gbc.debug` は対応するROMのシンボルです。ROMのバイト列は実機書き込み時の成果物から変更していません。`SHA256SUMS` で整合性を確認できます。

```sh
cd build
shasum -a 256 -c SHA256SUMS
```
