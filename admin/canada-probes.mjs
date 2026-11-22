import { SERVICE } from '../assets/service.mjs';

const measurements = 'https://api.globalping.io/v1/measurements';
export const cities = ['Vancouver', 'Toronto', 'Halifax'];
const targets = [new URL('https://coolcode.ca/'), new URL('/health', SERVICE)];
const elapsed = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function checkRegion(target, type, {request = fetch, wait = elapsed, signal} = {}) {
  const label = type === 'dns' ? 'DNS A' : 'HTTPS';
  const base = city => ({city, check: label, target: target.host + (type === 'http' ? target.pathname : '')});
  const options = {signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store'};
  try {
    const post = await request(measurements, {...options, method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({type, target: target.hostname, locations: cities.map(city => ({city, country: 'CA', limit: 1})),
        measurementOptions: type === 'dns' ? {query: {type: 'A'}} : {protocol: 'HTTPS', request: {method: 'GET', path: target.pathname}}})});
    if (!post.ok) {
      const error = (await post.json().catch(() => ({}))).error;
      if (post.status === 422 && error?.type === 'no_probes_found') return cities.map(city => ({...base(city), status: 'No probe returned'}));
      throw Error(post.status === 429 ? 'Globalping hourly limit reached' : 'Globalping request failed (HTTP ' + post.status + ')');
    }
    const {id} = await post.json();
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) throw Error('Invalid measurement ID');
    for (let attempt = 0; attempt < 18; attempt++) {
      signal?.throwIfAborted();
      await wait(1500);
      const res = await request(measurements + '/' + id, options);
      if (!res.ok) throw Error('Globalping result unavailable (HTTP ' + res.status + ')');
      const result = await res.json();
      if (result.status !== 'finished') continue;
      return cities.map(city => {
        const match = result.results.find(item => item.probe.country === 'CA' && item.probe.city.toLowerCase() === city.toLowerCase());
        if (!match) return {...base(city), id, status:'No probe returned'};
        const {probe, result: observation} = match;
        let status = observation.status === 'finished' ? 'Response received' : 'Probe ' + observation.status;
        if (observation.status === 'finished') status = type === 'dns'
          ? (observation.statusCodeName || 'DNS') + ' · ' + (observation.answers || []).filter(a => a.type === 'A').length + ' A answers'
          : 'HTTP ' + observation.statusCode;
        return {...base(city), id, probeCity:probe.city, network:probe.network, asn:probe.asn, status,
          ms:Number.isFinite(observation.timings?.total) ? observation.timings.total : null};
      });
    }
    throw Error('Globalping measurement timed out');
  } catch (error) {
    if (signal?.aborted) throw error;
    return cities.map(city => ({...base(city), status:error.message, collectionError:true}));
  }
}

export async function runCanadaChecks(signal = AbortSignal.timeout(65000)) {
  const batches = await Promise.all(targets.flatMap(target => ['dns','http'].map(type => checkRegion(target, type, {signal}))));
  return {checkedAt:new Date().toISOString(), rows:batches.flat()};
}
