# Penguin Jump v19 実機書き込み

- 書き込み完了: 2026-10-03 00:29:49 JST
- 対象: Chromatic - Player 01、USB 00 / 1.2.1.3
- ROM: `build/PenguinJump-v19.gbc`（131,072 bytes）
- SHA-256: `8c13344ace957985c83271bfd89643966908e7355f0ec4918bccee9b2a679929`
- 結果: `succeeded` / `vendor-reported-success`、終了コード0、プロセスclose確認済み
- 操作ID: `c6a7aaa50d0ed0df32a33305bcfef6dc3add520bae79c772e21f6484b956ecb9`
- 証跡: `flash-v19-result.json`

実機の起動・表示・音・操作は未観測です。検証済みのV19配布ROMを直接指定し、前回と同じデバイスへの書き込み承認を引き継ぎました。V19には、ステージ20以降の吹雪・氷柱3倍・隕石3倍をそれぞれ10%で独立抽選する機能が含まれます。

ビルド時点のZIPと検証記録は当時の状態を保持しています。ブラウザー更新は今回の依頼範囲には含めず、旧プレビューの終了応答不明を保持しています。
