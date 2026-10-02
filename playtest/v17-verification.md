# Penguin Jump v17 検証記録

検証日: 2026-10-02 (JST)。実機への書き込みは行っていません。

## 成果物と変更

- ROM: `build/PenguinJump-v17.gbc`、131,072 bytes、GBC専用。
- SHA-256: `2a7e4b7eaed471f647f1132b4595c3c0473398c7710c2bdd7e1c22ee4c39cc24`。
- 公式GB Studio CLIのビルド成功。コンパイル診断0件、既存のNode DEP0190警告1件。
- 公開rom_inspectのヘッダー・Nintendo logo・チェックサム検査は正常。
- 両モード共通の描画から氷柱・隕石の地面マーカーを除去し、落下前の警告音2か所を削除。氷柱は落下開始後だけ表示・衝突判定する。
- 内部の24物理tickの待ち時間と、軌道・着地時間・配置間隔・落下後の当たり判定は保持。
- マーカー素材とアクター16 / 20は予約枠として残し、アクターの順序・参照を変更せず非表示に固定。タイトルはV17。

## 公開PyBoyによる確認

RAMへの書き込みや強制ステージ変更は使用せず、タイトルでHARDを選び通常入力で検証しました。接触死亡と回避は同じROMの公開チェックポイントから分岐し、両方の入力記録を保持しています。記録は `build/playtest-v17-release`、合計1,826フレーム、3分岐、passedで終了しました。

| 確認対象 | 結果 |
|---|---|
| 氷柱の落下前 | state1で上空の本体と地面マーカーが非表示。複数フレームのactor hiddenフラグと実画像を確認 |
| 氷柱の落下中 | state2で本体を表示し、地面マーカーは非表示。ジャンプで通過でき、操作しない分岐はdeath cause6 |
| 隕石の落下前 | state1で地面マーカー・本体とも非表示 |
| 隕石の落下中 | state2で右上から左下へ本体が落下、地面マーカーなし。ジャンプで通過でき、操作しない分岐はdeath cause8 |
| 予兆アクター | 30回の表示観測でアクター16 / 20がともにhidden。両者を表示するコードを除去したことも差分で確認 |
| 他の障害物 | 広い穴、ハンマー、雪玉、浮遊ブロック、高い氷を通過し、HARDを1コースクリア（魚58） |
| メニュー再開 | ゲームオーバー→B→左→STARTでNORMALへ戻り、難易度0・初速56・魚0で再開。21アクターの連結と描画を確認 |
| OAM | 今回の標本は最大8個/走査線、10個制限超過0件 |
| 警告音 | 落下前のtone呼出しを2か所削除したことをソースで確認。実機の聴音確認は未実施 |

NORMALの10・20ステージ目まで進める通し検証は今回は未実施です。予兆の描画・音・氷柱の表示開始条件は両モード共通で、モード別の変更はありません。実機の起動・表示・音・操作は未確認です。

## ブラウザーの未確認事項

更新前のV16タイトルは一時停止中で、録画はidleでした。公開capture_stateでframe73129を保存しました。公式Webエクスポートは終了コード0で新ROMを生成しましたが、プレビュー更新は `Browser recording close acknowledgement is UNKNOWN.` を返しました。その後の公開statusはlistenerを維持したclosureState unresolved、同じCUAタブへの観測はwebview attachのタイムアウトでした。

更新操作を再送せず、リロード・別ブラウザーへの切替・サーバー強制終了は行っていません。新Web出力は保存しましたが、V17のブラウザー表示・操作を確認できた扱いにはしていません。結果は `v17-evidence.json` のweb / webFinalStatus / previousWebStateに保持しています。

## 証跡

- `v17-evidence.json`: 実ROM、ビルド、全分岐の観測、表示フラグ・OAM、プレビューの不明応答。
- `v17/icicle-no-warning.png` / `v17/icicle-falling.png`: 氷柱の落下前と落下中。
- `v17/meteor-no-warning.png` / `v17/meteor-visible-falling.png`: 隕石の落下前と落下中。
- `v17/icicle-gameover.png` / `v17/meteor-gameover.png`: 両方の接触死亡。
- `v17/hard-first-clear.png` / `v17/normal-menu-restart.png`: 回避完走とメニュー再開。
- `v17-playtest-runner.js` / `v17-hazards.js`: 公開入力・読取専用観測のヘルパー。
