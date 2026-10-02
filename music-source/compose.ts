// オリジナル曲「Snowbound Hop」。GB Studio 4.3.2 の公式 UGE シリアライザーで出力する。
import fs from 'node:fs';
import path from 'node:path';
import { createSong, createPattern, createSequenceItem, createSubPattern } from 'shared/lib/uge/song';
import { saveUGESong, loadUGESong } from 'shared/lib/uge/ugeHelper';

const song = createSong();
Object.assign(song, { name: 'Snowbound Hop', artist: 'Penguin Jump', comment: 'Original 16-bar loop. Pulse 2 reserved for gameplay SFX.', ticksPerRow: 8 });
const common = { length: null, subpatternEnabled: false, subpattern: createSubPattern() };
song.dutyInstruments = [{ ...common, index: 0, name: 'Snow bell', dutyCycle: 2, initialVolume: 7, volumeSweepChange: -6, frequencySweepTime: 0, frequencySweepShift: 0 }];
song.waveInstruments = [{ ...common, index: 0, name: 'Round bass', length: 112, volume: 2, waveIndex: 0 }];
song.noiseInstruments = [
  { ...common, index: 0, name: 'Soft kick', length: 9, initialVolume: 5, volumeSweepChange: -7, bitCount: 15 },
  { ...common, index: 1, name: 'Snow clap', length: 6, initialVolume: 4, volumeSweepChange: -7, bitCount: 15 },
  { ...common, index: 2, name: 'Ice hat', length: 3, initialVolume: 2, volumeSweepChange: -7, bitCount: 15 },
];
// UGE は各種15音色の固定スロットを持つ。
for (const list of [song.dutyInstruments, song.waveInstruments, song.noiseInstruments]) {
  while (list.length < 15) list.push({ ...list[0], index: list.length, name: 'Unused' } as never);
}
song.waves = [Uint8Array.from({ length: 32 }, (_, i) => Math.round(7.5 + 6.5 * Math.sin(i * Math.PI / 16)))];
const melodies = [
  'E5 G5 A5 G5 E5 D5 C5 -', 'D5 E5 G5 E5 D5 C5 D5 -',
  'E5 G5 A5 C6 B5 A5 G5 E5', 'D5 G5 B5 A5 G5 - D5 -',
  'E5 G5 A5 G5 E5 D5 C5 E5', 'F5 A5 C6 A5 G5 F5 E5 -',
  'D5 E5 G5 A5 G5 E5 D5 B4', 'C5 E5 G5 E5 C5 - - -',
  'A5 C6 E6 D6 C6 A5 G5 E5', 'F5 A5 C6 D6 C6 A5 G5 -',
  'G5 B5 D6 C6 B5 G5 E5 D5', 'E5 G5 C6 B5 A5 G5 E5 -',
  'A5 G5 E5 C5 E5 G5 A5 C6', 'B5 A5 G5 E5 F5 A5 C6 A5',
  'G5 E5 D5 B4 D5 E5 G5 B5', 'C6 G5 E5 D5 C5 - G4 B4',
];
const bass = ['C3 G3','G3 D4','A3 E4','G3 D4','C3 G3','F3 C4','G3 D4','C3 G3',
              'A3 E4','F3 C4','G3 D4','C3 G3','A3 E4','F3 C4','G3 D4','C3 G3'];
const note = (n: string) => ('C D EF G A B'.indexOf(n[0]) + (Number(n[1]) - 3) * 12);
for (let block = 0; block < 4; block++) {
  const tracks = Array.from({ length: 4 }, createPattern);
  for (let bar = 0; bar < 4; bar++) {
    const b = block * 4 + bar, start = bar * 16;
    melodies[b].split(' ').forEach((n, i) => {
      if (n !== '-') Object.assign(tracks[0][start + i * 2], { note: note(n), instrument: 0 });
    });
    bass[b].split(' ').forEach((n, i) => {
      for (const offset of [0, 8]) Object.assign(tracks[2][start + i * 4 + offset], { note: note(n), instrument: 0 });
    });
    for (let i = 0; i < 16; i += 2) {
      const instrument = i % 8 === 0 ? 0 : i % 8 === 4 ? 1 : 2;
      Object.assign(tracks[3][start + i], { note: instrument === 0 ? 12 : instrument === 1 ? 30 : 50, instrument });
    }
  }
  song.patterns.push(...tracks);
  song.sequence.push(createSequenceItem(block));
}
const output = path.resolve(process.argv[2] || 'assets/music/SnowboundHop.uge');
const bytes = saveUGESong(song);
const parsed = loadUGESong(bytes);
if (parsed.sequence.length !== 4 || parsed.patterns.length !== 16 || parsed.ticksPerRow !== 8) throw new Error('UGE roundtrip mismatch');
for (let b = 0; b < 4; b++) if (parsed.patterns[b * 4 + 1].some(c => c.note !== null || c.effectCode !== null)) throw new Error('SFX channel is occupied');
fs.writeFileSync(output, bytes);
fs.writeFileSync(path.join(path.dirname(output), 'SnowboundHop.uge.gbsres'), JSON.stringify({ _resourceType: 'music', id: 'ea2490a3-a7f2-4c22-a6d8-31bc7b895e3a', name: 'Snowbound Hop', symbol: 'song_snowbound_hop', settings: {}, filename: 'SnowboundHop.uge', type: 'uge' }, null, 2) + '\n');
console.log(JSON.stringify({ output, bytes: bytes.length, patterns: parsed.patterns.length, orders: parsed.sequence.length, ticksPerRow: parsed.ticksPerRow, sfxChannelEmpty: true }));

// 無敵用の別曲。短い4小節の16分音符アルペジオで通常曲と区別する。
const star = { ...song, name: 'Aurora Dash', comment: 'Original invincibility loop. Pulse 2 reserved for gameplay SFX.', patterns: [], sequence: [createSequenceItem(0)],
  dutyInstruments: song.dutyInstruments.map(i => ({ ...i, name: 'Aurora sparkle', dutyCycle: 1, initialVolume: 6, volumeSweepChange: -7 })) };
const starMelodies = [
  'C5 E5 G5 C6 E6 C6 G5 E5 D5 F5 A5 D6 F6 D6 A5 F5',
  'E5 G5 C6 E6 G6 E6 C6 G5 F5 A5 C6 F6 E6 C6 A5 F5',
  'A5 C6 E6 A6 G6 E6 C6 A5 F5 A5 C6 F6 A6 F6 C6 A5',
  'G5 B5 D6 G6 F6 D6 B5 G5 C6 G5 E5 G5 B5 D6 G5 B5',
];
const starBass = ['C3 G3', 'C3 G3', 'F3 C4', 'G3 D4'];
const starTracks = Array.from({ length: 4 }, createPattern);
for (let bar = 0; bar < 4; bar++) {
  starMelodies[bar].split(' ').forEach((n, i) => Object.assign(starTracks[0][bar * 16 + i], { note: note(n), instrument: 0 }));
  starBass[bar].split(' ').forEach((n, i) => {
    for (const off of [0, 8]) Object.assign(starTracks[2][bar * 16 + i * 4 + off], { note: note(n), instrument: 0 });
  });
  for (let i = 0; i < 16; i += 2) {
    const instrument = i % 8 === 0 ? 0 : i % 8 === 4 ? 1 : 2;
    Object.assign(starTracks[3][bar * 16 + i], { note: instrument === 0 ? 12 : instrument === 1 ? 30 : 50, instrument });
  }
}
star.patterns = starTracks;
const starBytes = saveUGESong(star);
const starParsed = loadUGESong(starBytes);
if (starParsed.sequence.length !== 1 || starParsed.patterns[1].some(c => c.note !== null || c.effectCode !== null)) throw new Error('Star UGE mismatch');
const starPath = path.join(path.dirname(output), 'AuroraDash.uge');
fs.writeFileSync(starPath, starBytes);
fs.writeFileSync(starPath + '.gbsres', JSON.stringify({ _resourceType: 'music', id: 'bc580331-6cc7-432c-b826-06905beee9d7', name: 'Aurora Dash', symbol: 'song_aurora_dash', settings: {}, filename: 'AuroraDash.uge', type: 'uge' }, null, 2) + '\n');
console.log(JSON.stringify({ output: starPath, bytes: starBytes.length, orders: 1, sfxChannelEmpty: true }));
