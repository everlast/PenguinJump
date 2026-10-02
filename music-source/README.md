# Penguin Jump の音楽

Penguin Jump 用に作曲したオリジナルの16小節ループ。Cメジャー、4/4拍子、120 BPM、1周32秒。GB Studio 4.3.2 / hUGE Tracker の `.uge` 形式で、GB Studio の音楽エディターから編集できます。

- パルス1: 短く減衰する主旋律。A–A′–B–終止の構成。
- パルス2: 空欄。ゲームのジャンプ・魚・無敵・衝突などの効果音専用。
- 波形3: サイン波の低音。短い長さ設定で音を区切ります。
- ノイズ4: 小さめのキック、スネア、ハイハット。

タイトルの `EVENT_MUSIC_PLAY` で再生開始。コースをまたいで流れ続け、STARTによる一時停止とゲームオーバーでは曲の位置を保持して停止します。再開・再挑戦で同じ位置から続きます。ゲームオーバーの効果音は曲を止めてから鳴らします。

`compose.ts` は曲の音符・音色を定義し、導入済みGB Studioの公式シリアライザーで `assets/music/SnowboundHop.uge` と登録メタデータを生成します。既存曲や外部音源は使っていません。読み戻しによる4パターンブロックと空のパルス2の検査を含みます。

再生成例（プロジェクト直下。`GBS_VENDOR` は導入済み GB Studio のルート）:

```sh
node "$GBS_VENDOR/node_modules/esbuild/bin/esbuild" music-source/compose.ts \
  --bundle --platform=node --tsconfig="$GBS_VENDOR/tsconfig.json" \
  --outfile=/tmp/penguin-compose.cjs
node /tmp/penguin-compose.cjs assets/music/SnowboundHop.uge
```

エンジンの `music_pause` はこの版では `BANKED` 宣言がないため、別バンクにある独自シーンから直接呼び出せません。`pj_pause_music` が同じISR停止フラグとインライン消音処理をローカルで実行します。共有エンジンは変更していません。


## v9: Aurora Dash とテンポ連動

無敵専用曲「Aurora Dash」は同じCメジャー、4小節、基準120 BPM・1周8秒。短いパルス音の16分音符アルペジオで通常曲と区別しています。無敵が始まると曲の冒頭から再生し、無敵終了で通常曲の冒頭に戻ります。無敵中のコースクリアでは曲を継続し、ポーズ中は無敵時間と曲の両方が止まります。

`compose.ts` は両方のUGEを生成します。タイトルの「Penguin Jump: 無敵BGMを設定」イベントで使用曲を選べます。パルス2は両曲とも空欄を維持してください。

テンポは `120 × pj_speed / 56` BPM。速度56から84まで、1クリアごとに約2.14 BPM上がり、180 BPMで止まります。256 HzのISRで `pj_music_rate` を累算し、224を超えるたびに曲を1 tick進めます。音程用レジスターと効果音の更新周期を変えず、8→7→6 tickのような粗い段階変化を避けています。音楽マネージャーの上書きは `plugins/penguin-runner/engine/src/core/music_manager.c` に限定し、アップグレード時は導入版の同名ファイルとの差分を確認してください。

曲初期化でhUGEのミュートマスクがクリアされるため、毎回グローバルの予約を再適用します。また、曲切替時にパルス2まで消音すると直前の無敵開始音が途切れるため、BGMの3チャンネルだけを消音します。
