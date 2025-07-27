"use strict";

//-----------------------------------------------------------------------------
// Send debug back to the service worker as it is hard to capture from an
// off screen document
//-----------------------------------------------------------------------------
let receivedMsg = false;
const debug = ((...args) => {
  if (!receivedMsg) {
    //-------------------------------------------------------------------------
    // If we haven't received a message yet then let's just log to the console
    //-------------------------------------------------------------------------
    const enableDebug = false;
    if (enableDebug) {
      args[0] = `Auto-Copy (${args[0]})`;
      console.log.apply(null, args);
    }
    return;
  }

  chrome.runtime.sendMessage({
    target: "Offscreen",
    type: "log",
    data: args,
  });
});

chrome.runtime.onMessage.addListener(async (msg) => {
  receivedMsg = true;
  debug(`Got a message in offscreen document`, msg);

  if (msg.type === "copyTextarea") {
    debug(`in copyTextarea with "${msg.text}"`);
    const el = document.createElement("textarea");
    document.body.appendChild(el);
    el.value = msg.text;
    el.focus();
    el.select();
    const rv = document.execCommand("copy");
    debug(`Copy result: ${rv}`);
    //-------------------------------------------------------------------------
    // For some reason execCommand("copy") doesn't always seem to work.
    // However, if we add another call after then it does.  I suspect that
    // for some reason the initial call isn't completing before the offscreen
    // document closes, but adding execCommand("paste") afterwards forces it
    // to wait for the copy to complete before trying to execute the paste
    // thus ensuring the clipboard is completely written before the document
    // closes.  This is just a gut feeling and I could be completely wrong
    // about why this seems to fix the issue.
    //-------------------------------------------------------------------------
    document.execCommand("paste");
    document.body.removeChild(el);
  } else if (msg.type === "copyDiv") {
    debug(`in copyDiv with "${msg.text}"`);
    const el = document.createElement("div");
    el.contentEditable = "true";
    el.unselectable = "off";
    document.body.appendChild(el);
    el.focus();
    if (msg.subType === "asLink") {
      debug(`in subType: ${msg.subType}`);
      el.innerHTML = msg.text;
    } else if (msg.subType === "includeComment") {
      if (msg.opts.includeCommentPrepend && msg.text) {
        document.execCommand("paste");
        debug(`Include comment - prepending comment: "${msg.text}"`);
        el.innerHTML = msg.text + "<br>" + el.innerHTML;
      } else if (msg.text) {
        document.execCommand("paste");
        debug(`Include comment - postpending comment: "${msg.text}"`);
        el.innerHTML = el.innerHTML + "<br>" + msg.text;
      }
    }
    debug(`innerHTML: "${el.innerHTML}"`);
    document.execCommand("SelectAll");
    const rv = document.execCommand("copy");
    debug(`Copy result: ${rv}`);
    //-------------------------------------------------------------------------
    // For some reason execCommand("copy") doesn't always seem to work.
    // However, if we add another call after then it does.  I suspect that
    // for some reason the initial call isn't completing before the offscreen
    // document closes, but adding execCommand("paste") afterwards forces it
    // to wait for the copy to complete before trying to execute the paste
    // thus ensuring the clipboard is completely written before the document
    // closes.  This is just a gut feeling and I could be completely wrong
    // about why this seems to fix the issue.
    //-------------------------------------------------------------------------
    document.execCommand("paste");
    document.body.removeChild(el);
  } else if (msg.type === "retrieveLocalStorage") {
    debug(`In ${msg.type}`);
    const lsObj = (window && window.localStorage) ? window.localStorage : {};
    debug(`Is there a localStorage object?`, lsObj);
    chrome.runtime.sendMessage({
      target: "background",
      type: "localStorageData",
      data: lsObj,
    });
  }

  window.close();
});
