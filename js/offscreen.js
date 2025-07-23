"use strict"

//-----------------------------------------------------------------------------
// Send debug back to the service worker as it is hard to capture from an
// off screen document
//-----------------------------------------------------------------------------
let receivedMsg = false;
const debug = ((...args) => {
  if (receivedMsg) {
    chrome.runtime.sendMessage({
      'target' : 'Offscreen',
      'type'   : 'log',
      'data'   : args,
    });
  }
});

debug(`Loading offscreen.js`);
chrome.runtime.onMessage.addListener(async (msg) => {
  receivedMsg = true;
  debug(`Got a message in offscreen document`, msg);

  if (msg.type === 'copyTextarea') {
    debug(`in copyTextarea with '${msg.text}'`);
    const el = document.createElement('textarea');
    document.body.appendChild(el);
    el.value = msg.text;
    el.select();
    const rv = document.execCommand('copy');
    debug(`Copy result: ${rv}`);
    document.body.removeChild(el);
  } else if (msg.type === 'copyDiv') {
    debug(`in copyDiv with '${msg.text}'`);
    const el = document.createElement('div');
    el.contentEditable = 'true';
    el.unselectable = 'off';
    document.body.appendChild(el);
    el.focus();
    if (msg.subType === 'asLink') {
      debug(`in subType: ${msg.subType}`);
      el.innerHTML = msg.text;
    } else if (msg.subType === 'includeComment') {
      if (msg.opts.includeCommentPrepend && msg.text) {
        let rv = document.execCommand('paste');
        debug(`Include comment - prepending comment: '${msg.text}'`);
        el.innerHTML = msg.text+ '<br>' + el.innerHTML;
      } else if (msg.text) {
        let rv = document.execCommand('paste');
        debug(`Include comment - postpending comment: '${msg.text}'`);
        el.innerHTML = el.innerHTML + '<br>' + msg.text;
      }
    }
    debug(`innerHTML: '${el.innerHTML}'`);
    document.execCommand('SelectAll');
    rv = document.execCommand("copy");
    debug(`Copy result: ${rv}`);
    document.body.removeChild(el);
  } else if (msg.type === 'retrieveLocalStorage') {
    debug(`In ${msg.type}`);
    let lsObj = (window && window.localStorage) ? window.localStorage : {};
    debug(`Is there a localStorage object?`, lsObj);
    chrome.runtime.sendMessage({
      'target' : 'background',
      'type'   : 'localStorageData',
      'data'   : lsObj,
    });
  }

  window.close();
});
