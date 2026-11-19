const compare = (a, b) => a.length === b.length && a.every((value, i) => value === b[i]);

export function sameSettings(a, b) {
  return a.mode === b.mode && a.experiment === b.experiment && compare(a.a,b.a) && compare(a.b,b.b);
}

export function makeSettings(previous, mode, a, b, valid, newId) {
  if (mode !== 'ab' && mode !== 'fixed') throw Error('Choose a display mode.');
  for (const ids of [a,b]) {
    if (ids.length !== 4 || new Set(ids).size !== 4 || ids.some(id => !valid.has(id))) {
      throw Error('Each lineup needs four different browser tools.');
    }
  }
  if (mode === 'ab' && compare(a,b)) throw Error('Choose different lineups before starting a test.');
  const activeChanged = previous.mode !== mode || !compare(a,previous.a) || (mode === 'ab' && !compare(b,previous.b));
  return {mode, experiment: activeChanged ? newId : previous.experiment, a, b};
}
