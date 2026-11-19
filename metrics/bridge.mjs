import {SERVICE} from '../assets/service.mjs';
if (SERVICE && window.parent !== window && location.origin === 'https://coolcode.ca' &&
    navigator.globalPrivacyControl !== true && navigator.doNotTrack !== '1') {
  const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  window.countToolEvent = event => {
    if (!event || typeof event.tool !== 'string' || event.tool.length > 64 || !slug.test(event.tool)) return;
    const data = {type:event.type, tool:event.tool};
    if (event.type === 'impression' || event.type === 'click') {
      if (!['a','b'].includes(event.variant) || typeof event.experiment !== 'string' ||
          event.experiment.length > 48 || !slug.test(event.experiment)) return;
      data.variant = event.variant; data.experiment = event.experiment;
    } else if (event.type !== 'pageview') return;
    fetch(SERVICE + '/event', {method:'POST', body:JSON.stringify(data), headers:{'Content-Type':'text/plain'},
      credentials:'omit',referrerPolicy:'no-referrer',keepalive:true}).catch(() => {});
  };
}
