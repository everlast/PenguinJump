// GB Studio 4.3.2: 選んだ曲をROMへ収録し、無敵用のバンクとポインターを設定。
module.exports = {
  id: 'EVENT_PENGUIN_STAR_MUSIC',
  name: 'Penguin Jump: 無敵BGMを設定',
  groups: ['EVENT_GROUP_MUSIC'],
  fields: [{ key: 'musicId', label: '無敵中の曲', type: 'music', defaultValue: 'LAST_MUSIC' }],
  compile: (input, helpers) => {
    const track = helpers.music.find(t => t.id === input.musicId);
    if (!track) throw new Error('Penguin Jump: 無敵BGMが見つかりません');
    const symbol = `${track.dataName}_Data`;
    helpers._addBankedDataDependency(symbol);
    helpers._setConstMemInt16('pj_star_track', `_${symbol}`);
    helpers._setConstMemUInt8('pj_star_bank', `___bank_${symbol}`);
  },
};
