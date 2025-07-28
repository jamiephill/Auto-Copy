"use strict";

const opts = {
  mouseDownTarget: null,
  mouseStartX: 0,
  mouseStartY: 0,
  timerId: {
    tripleClick: 0,
    autoCopyDelay: 0,
    nativeAlert: 0,
    clearClipboard: 0,
  },
  blockListSiteEnabled: false,
  blockList: {},
  //enableDebug: false,
};

const debug = ((...args) => {
  if (opts.enableDebug) {
    if (args[0] === "Offscreen" || args[0] === "ServiceWorker") {
      args[0] === `Auto-Copy (${args[0]})`;
    } else {
      args.unshift("Auto-Copy (ContentScript):");
    }
    console.log.apply(null, args);
  }
});

//-----------------------------------------------------------------------------
// Monitor config options for changes and update them accordingly
//-----------------------------------------------------------------------------
chrome.storage.onChanged.addListener((obj, area) => {
  if (area === "sync") {
    debug(`sync storage changed`, obj);
    Object.keys(obj).forEach((key) => {
      opts[key] = obj[key].newValue;
      //-----------------------------------------------------------------------
      // If blockList changes then we need to re-evaluate the page we're on
      // to see if it should be enabled/disabled based on the changes.
      //-----------------------------------------------------------------------
      if (key === "blockList") {
        const pbl = processBlocklist();
        debug(`pbl response ${opts.blockListSiteEnabled}:`, pbl);
        if (pbl.enable && !opts.blockListSiteEnabled) {
          addListeners(pbl.domain);
        } else if (!pbl.enable && opts.blockListSiteEnabled) {
          debug("got here");
          removeListeners(pbl.domain);
        }
      }
    });
    debug("New Opts: ", opts);
  }
});

//-----------------------------------------------------------------------------
// Load options from storage and then setup the content script for the newly
// loaded page.
//-----------------------------------------------------------------------------
chrome.storage.sync.get().then((obj) => {
  Object.keys(obj).forEach((key) => {
    opts[key] = obj[key];
  });
  debug(`opts:`, opts);
  loadContentScript();
});

/*chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {*/
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "log") {
    debug(msg.target, ...msg.data);
  }
});

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const pad = ((string, width, fill) => {
  width = width || 2;
  fill = fill || "0";
  string = String(string);

  return string.padStart(width, fill);
});

const fade = ((el, speed) => {
  if (el.style) {
    el.style.opacity = "1";
  }
  const timer = setInterval(
    function () {
      el.style.opacity = parseFloat(el.style.opacity) - .02;
      if (el.style.opacity <= 0) {
        clearInterval(timer);
        document.body.removeChild(el);
      }
    },
    speed
  );
});

/*const alertOnCopy = ((e) => {*/
const alertOnCopy = (() => {
  if (opts.disableAutoCopy) {
    return;
  }
  debug(`in alertOnCopy`);
  if (opts.nativeAlertOnCopy) {
    debug(`doing native alert`);
    try {
      const s = window.getSelection();
      if (!s || !s.toString) {
        return false;
      }
      let text = s.toString();
      if (opts.trimWhitespace) {
        text = text.replace(/^\s+|\s+$/g, "");
        text = text.replace(/[\n\r]+$/g, "");
      }
      sendMessage({
        type: "showNotification",
        text: text,
        opts: opts,
      });

      if (opts.timerId.nativeAlert) {
        clearTimeout(opts.timerId.nativeAlert);
        opts.timerId.nativeAlert = 0;
      }

      opts.timerId.nativeAlert = setTimeout(function () {
        opts.timerId.nativeAlert = 0;
        sendMessage({
          type: "hideNotification",
        });
      }, 5000);
    } catch (ex) {
      debug(`Caught error: native alert on copy`, ex);
    }
  }

  if (opts.alertOnCopy) {
    debug(`doing in browser alert`);
    const el = document.createElement("div");
    el.style.fontSize = opts.alertOnCopySize;
    el.style.fontFamily = "Helvetica, sans-serif";
    el.style.fontStyle = "normal";
    el.style.fontWeight = "normal";
    el.style.boxShadow = "0px 0px 16px 0px #CBCBCB";
    el.style.border = "1px solid #D9D900";
    el.style.zIndex = "100000001";
    el.style.textAlign = "center";
    el.style.color = "#444444";
    el.style.backgroundColor = "#FFFF5C";
    el.style.position = "fixed";
    el.style.borderRadius = ".25em";
    el.innerHTML = "Auto Copied";
    el.style.boxSizing = "content-box";
    el.style.height = "2em";
    el.style.lineHeight = "2em";
    el.style.width = "7em";
    el.style.padding = "0px";
    el.style.margin = "0px";

    debug(`location: ${opts.alertOnCopyLocation}`);
    if (opts.alertOnCopyLocation === "TopLeft") {
      el.style.top = "25px";
      el.style.left = "25px";
    } else if (opts.alertOnCopyLocation === "TopRight") {
      el.style.top = "25px";
      el.style.right = "25px";
    } else if (opts.alertOnCopyLocation === "BottomLeft") {
      el.style.bottom = "25px";
      el.style.left = "25px";
    } else {
      el.style.bottom = "25px";
      el.style.right = "25px";
    }

    document.body.appendChild(el);

    let duration = parseFloat(opts.alertOnCopyDuration) * 1000;
    if (isNaN(duration)) {
      duration = 750;
    }

    debug(`Fade duration: ${duration}`);

    sleep(duration).then(() => {
      fade(el, 5);
    });
  }
});

const includeComment = ((params) => {
  params = params || {};

  debug(`in includeComment with:`, params);

  if (!params.text) {
    debug(`includeComment: No text supplied`);
    return;
  }

  let text;
  const count = (params.text.split(/\s+/)).length;
  let comment = "";
  let flag = true;
  let url = "";
  const crlf = (opts.copyAsPlainText) ? "\n" : "<br>";

  debug(
    `Use modifier to ${opts.includeCommentToggleState} comment?`,
    `${opts.includeUrlToggle}; modifier key: `,
    `${opts.includeCommentToggleModifier}`
  );
  if (opts.includeCommentToggle) {
    let tflag = false;
    if (
      opts.includeCommentToggleState === "enable" &&
      modifierKeyActive(params.event, opts.includeCommentToggleModifier)
    ) {
      debug(
        `Modifier key (${opts.includeCommentToggleModifier}) was active;`,
        `adding comment`
      );
      tflag = true;
    } else if (
      opts.includeCommentToggleState === "disable" &&
      !modifierKeyActive(params.event, opts.includeCommentToggleModifier)
    ) {
      debug(
        `Modifier key (${opts.includeCommentToggleModifier}) was not active;`,
        `adding comment`
      );
      tflag = true;
    }

    if (!tflag) {
      debug(`Ignoring adding comment due to modifier and state`);
      if (params.merge) {
        return (params.text);
      }

      return ("");
    }
  }

  if (
    opts.includeCommentWordCountEnabled &&
    count <= opts.includeCommentWordCount
  ) {
    debug(`Setting comment flag to false`);
    flag = false;
  }

  if (opts.includeComment && opts.includeCommentFormat && flag) {
    comment = opts.includeCommentFormat;
    debug(`Format: ${comment}`);

    if (opts.includeCommentFormat.indexOf("$title") >= 0) {
      comment = comment.replace(/\$title/g, document.title || "no title");
    }

    if (opts.copyAsPlainText) {
      url = window.location.href;
    } else {
      comment = comment.replace(/</g, "&lt;");
      comment = comment.replace(/>/g, "&gt;");
      url = `<a title="${document.title}" href="${window.location.href}">` +
        `${window.location.href}</a>`;
    }

    if (opts.includeCommentFormat.indexOf("$url") >= 0) {
      comment = comment.replace(/\$url/g, url);
    }

    if (opts.includeCommentFormat.indexOf("$crlf") >= 0) {
      comment = comment.replace(/\$crlf/g, crlf);
    }

    const date = new Date();

    if (opts.includeCommentFormat.indexOf("$month") >= 0) {
      comment = comment.replace(/\$month/g, pad(date.getMonth() + 1));
    }
    if (opts.includeCommentFormat.indexOf("$day") >= 0) {
      comment = comment.replace(/\$day/g, pad(date.getDate()));
    }
    if (opts.includeCommentFormat.indexOf("$year") >= 0) {
      comment = comment.replace(/\$year/g, date.getFullYear());
    }
    if (opts.includeCommentFormat.indexOf("$24hour") >= 0) {
      comment = comment.replace(/\$24hour/g, pad(date.getHours()));
    }
    if (
      opts.includeCommentFormat.indexOf("$ampm") >= 0 ||
      opts.includeCommentFormat.indexOf("$hour") >= 0
    ) {
      let hour = date.getHours();
      let ampm = "AM";
      if (hour > 12) {
        hour = hour - 12;
        ampm = "PM";
      } else if (hour === 12) {
        ampm = "PM";
      } else if (hour === 0) {
        hour = 12;
      }
      comment = comment.replace(/\$hour/g, pad(hour));
      comment = comment.replace(/\$ampm/g, ampm);
    }
    if (opts.includeCommentFormat.indexOf("$minute") >= 0) {
      comment = comment.replace(/\$minute/g, pad(date.getMinutes()));
    }
    if (opts.includeCommentFormat.indexOf("$second") >= 0) {
      comment = comment.replace(/\$second/g, pad(date.getSeconds()));
    }
    if (opts.includeCommentFormat.indexOf("$timestamp") >= 0) {
      const timestamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-` +
        `-${pad(date.getDate())} ${pad(date.getHours())}` +
        `:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      comment = comment.replace(/\$timestamp/g, timestamp);
    }

    if (params.merge) {
      if (opts.includeCommentPrepend) {
        debug(`Prepending comment: ${comment}`);
        text = comment + crlf + params.text;
      } else {
        debug(`Postpending comment: ${comment}`);
        text = params.text + crlf + comment;
      }
    } else {
      text = comment;
    }

    return (text);
  }

  if (params.merge) {
    return (params.text);
  }

  return ("");
});

const copyAsPlainText = ((params) => {
  params = params || {
    event: {},
  };

  debug(`Entering copy as plain text`, params);

  try {
    const s = window.getSelection();
    let text = s.toString();
    //-------------------------------------------------------------------------
    // Don't execute the copy if nothing is selected.
    //-------------------------------------------------------------------------
    if (text.length <= 0) {
      debug(`Selection was empty`);
      return;
    }

    if (opts.trimWhitespace) {
      debug(`Trimming selectection`);
      text = text.replace(/^\s+|\s+$/g, "");
      text = text.replace(/[\n\r]+$/g, "");
    }

    debug(`Got selectection: ${text}`);

    if (opts.includeComment) {
      text = includeComment({
        text: text,
        merge: true,
        event: params.event,
      });
    }

    debug(`Sending copy as plain text: ${text}`);
    sendMessage({
      type: "reformat",
      opts: opts,
      text: text,
    });
  } catch (ex) {
    debug(`Caught exception: `, ex);
  }
});

function sendMessage(obj) {
  debug(`In sendMessage`);
  try {
    chrome.runtime.sendMessage(obj);
    alertOnCopy();
  } catch (ex) {
    debug(`Caught exception: `, ex);
    //-------------------------------------------------------------------------
    // If we detect a fault here then the extension has likely been updated so
    // let's notify the user that the page needs to be reload.
    //-------------------------------------------------------------------------
    const id = "autoCopyReloadNotice";
    if (opts.disableAutoCopy || document.getElementById(id)) {
      return;
    }
    opts.disableAutoCopy = true;
    const el1 = document.createElement("div");
    const el = document.createElement("div");
    el1.appendChild(el);

    el.style.top = "25px";
    el.style.fontSize = "14px";
    el.style.fontFamily = "Helvetica, sans-serif";
    el.style.fontStyle = "normal";
    el.style.fontWeight = "normal";
    el.style.boxShadow = "0px 0px 16px 0px #CBCBCB";
    el.style.border = "1px solid #D9D900";
    el.style.zIndex = "100000001";
    el.style.textAlign = "center";
    el.style.color = "#444444";
    el.style.backgroundColor = "#FFFF5C";
    el.style.position = "fixed";
    el.style.borderRadius = ".25em";
    el.innerHTML = `Auto Copy extension has been updated.  The page needs ` +
      `to be <a style="text-decoration: underline; color: #0000EE; cursor: ` +
      `pointer" onclick="location.reload()">reloaded</a> in order for it to ` +
      `work. <a onclick="document.body.removeChild(document.getElementById( ` +
      `'${id}'))" style="cursor: pointer; font-weight: ` +
      `bold">&nbsp;&times;&nbsp;</a>`;
    el.style.boxSizing = "content-box";
    el.style.height = "auto";
    el.style.width = "auto";
    el.style.padding = "8px";
    el.style.margin = "0px";

    el1.id = id;
    el1.style.display = "flex";
    el1.style["justify-content"] = "center";
    el1.style["align-items"] = "center";
    el1.style.border = "none";
    el1.style.background = "transparent";
    el1.style.width = "100%";
    el1.style.height = "0";

    document.body.appendChild(el1);
  }
}

//-----------------------------------------------------------------------------
// We are using a combination of mouse travel and click count to decide how to
// handle the clicks.  If not mouse travel and a single click then we will not
// do anything.  If no mouse travel and more than one click means someone could
// be double or triple clicking to make a selection so we'll set a delay in
// case they are triple clicking.  This is to prevent autoCopy from firing
// multiple times (for the double click and then again for the triple click).
//
// If we detect mouse travel and it is a single click then we will call
// autoCopy immediately as that should be an indicaton of a selection being
// made.
//-----------------------------------------------------------------------------
const autoCopyDecideAction = ((e) => {
  let mouseTravel = false;

  debug(
    `Mouse coords: X(end)=${e.x} - Y(end)=${e.y} -`,
    `X(start)=${opts.mouseStartX} - Y(start)=${opts.mouseStartY}`
  );
  debug(
    `Keyboard modifiers: ALT=${e.altKey}; CTRL=${e.ctrlKey};`,
    `SHIFT=${e.shiftKey}`
  );

  if (opts.mouseStartX && opts.mouseStartY) {
    const x = Math.abs(e.x - opts.mouseStartX);
    const y = Math.abs(e.y - opts.mouseStartY);
    opts.mouseStartX = 0;
    opts.mouseStartY = 0;
    if (x > 3 || y > 3) {
      debug(`Detected mouse drag`);
      mouseTravel = true;
    }
  }

  debug(`Click count: ${e.detail} - mouse travel? ${mouseTravel}`);

  if (opts.pasteOnMiddleClick && e.button === 1) {
    debug(`paste requested, calling autoCopy immediately`);
    autoCopyDelay(e);
  } else if (mouseTravel && e.detail === 1) {
    debug(`calling autoCopyDealy immediately`);
    autoCopyDelay(e);
  } else if (!mouseTravel && e.detail === 1) {
    debug(`ignoring click.  No mouse travel and click count is one.`);
    return;
  } else if (mouseTravel && e.detail >= 2) {
    debug(`double click and drag -- calling autoCopyDelay immediately`);
    autoCopyDelay(e);
  } else if (!mouseTravel && e.detail >= 3) {
    debug(`triple click detected -- calling autoCopyDelay immediately`);
    clearTimeout(opts.timerId.tripleClick);
    opts.timerId.tripleClick = 0;
    autoCopyDelay(e);
  } else if (!mouseTravel && e.detail === 2) {
    //-------------------------------------------------------------------------
    // We have to wait before calling auto copy when two clicks are
    // detected to see if there is going to be a triple click.
    //-------------------------------------------------------------------------
    debug(`timerId (w1)? ${opts.timerId.tripleClick}`);
    if (!opts.timerId.tripleClick) {
      debug(
        `Setting timer to call autoCopy -- need to wait and see if there`,
        `is a triple click.`
      );
      opts.timerId.tripleClick = setTimeout(function () {
        opts.timerId.tripleClick = 0;
        autoCopyDelay(e);
      }, 300);
    }
  }
});

//-----------------------------------------------------------------------------
// This implements a copy delay
//-----------------------------------------------------------------------------
const autoCopyDelay = ((e) => {
  if (opts.copyDelay && opts.copyDelayWait >= 0) {
    debug(`Copy delay in effect, waiting ${opts.copyDelayWait} seconds`);
    const duration = parseFloat(opts.copyDelayWait) * 1000;
    debug(`Copy delay: timerId (autoCopyDelay)? ${opts.timerId.autoCopyDelay}`);
    if (opts.timerId.autoCopyDelay) {
      debug(`Copy delay: clearing timer (autoCopyDelay)`);
      clearTimeout(opts.timerId.autoCopyDelay);
    }
    debug(`Copy delay: setting timer to call autoCopy`);
    opts.timerId.autoCopyDelay = setTimeout(function () {
      opts.timerId.autoCopyDelay = 0;
      autoCopy(e);
    }, duration);
  } else {
    debug(`Copy delay disabled`);
    autoCopy(e);
  }
});

const modifierKeyActive = ((e, name) => {
  if (name === "ctrl" && e.ctrlKey && !e.shiftKey && !e.altKey) {
    return true;
  } else if (name === "alt" && e.altKey && !e.ctrlKey && !e.shiftKey) {
    return true;
  } else if (name === "shift" && e.shiftKey && !e.ctrlKey && !e.altKey) {
    return true;
  } else if (name === "ctrlalt" && e.ctrlKey && e.altKey && !e.shiftKey) {
    return true;
  } else if (name === "ctrlshift" && e.ctrlKey && e.shiftKey && !e.altKey) {
    return true;
  } else if (name === "ctrlaltshift" && e.ctrlKey && e.shiftKey && e.altKey) {
    return true;
  } else if (name === "altshift" && e.altKey && e.shiftKey && !e.ctrlKey) {
    return true;
  }

  return false;
});

//-----------------------------------------------------------------------------
// The mouseup target is the element at the point the mouseup event occurs.
// It is possible to select text within a text field but have the mouse cursor
// move outside of the text field which makes it impossible to tell if a text
// field element was involved in the selection.  In order to work around this
// the mousedown target is used to determine if a text field is involved.
//
// It is only important if the user wants to exclude selections from text
// fields
//
// The if is always evaluating to false because the message passing hasn't
// occurred by the time this code segment is executed.  I'm leaving it in
// as a placeholder in case localStorage gets initialized directly for content
// pages.
//-----------------------------------------------------------------------------
const autoCopy = ((e) => {
  //let nodeTypes = { "input" : false, "editable" : false };
  let inputElement = false;
  let editableElement = false;

  if (
    opts.mouseDownTarget &&
    opts.mouseDownTarget.nodeName &&
    (opts.mouseDownTarget.nodeName === "INPUT" ||
      opts.mouseDownTarget.nodeName === "TEXTAREA")
  ) {
    debug(`Mouse down on input element`);
    inputElement = true;
  }

  if (opts.mouseDownTarget && opts.mouseDownTarget.isContentEditable) {
    debug(`Mouse down on content editable element`);
    editableElement = true;
  }

  debug(`opts: `, opts);
  debug(
    `Use modifier to ${opts.ctrlState} extension? ${opts.ctrlToDisable};`,
    `modifier key: ${opts.ctrlToDisableKey}`
  );

  if (opts.ctrlToDisable) {
    let flag = false;
    if (
      opts.ctrlState === "enable" &&
      modifierKeyActive(e, opts.ctrlToDisableKey)
    ) {
      debug(`Modifier key (${opts.ctrlToDisableKey}) was active; doing copy`);
      flag = true;
    }
    if (
      opts.ctrlState === "disable" &&
      !modifierKeyActive(e, opts.ctrlToDisableKey)
    ) {
      debug(
        `Modifier key (${opts.ctrlToDisableKey}) was not active;`,
        `doing copy`
      );
      flag = true;
    }

    if (!flag) {
      debug(`Ignoring copy due to modifier and state`);
      return;
    }
  }

  if (opts.pasteOnMiddleClick && e.button === 1) {
    //let el = e.target;
    debug(`autoCopy: detected paste on middle click`);

    if (
      ((e.target.nodeName === "INPUT" ||
        e.target.nodeName === "TEXTAREA") &&
        e.target.type !== "checkbox" &&
        e.target.type !== "radio" &&
        !e.target.disabled &&
        !e.target.readOnly) ||
        e.target.contentEditable === "true"
    ) {
      const rv = document.execCommand("paste");
      debug(`paste rv: ${rv}`);
    } else {
      debug(`${e.target.nodeName} is not editable, cannot perform paste`);
    }
    return;
  }

  if (!opts.enableForContentEditable && editableElement) {
    debug(`Extension is not enabled for content editable elements`);
    return;
  }

  if (!opts.enableForTextBoxes && inputElement) {
    debug(`Extension is not enabled for text boxes`);
    return;
  }

  const s = window.getSelection();
  let text = s.toString();
  debug(
    `selection collapsed? ${s.isCollapsed}; length: ${text.length};`,
    `selection: ${text}`
  );
  if (!inputElement && s.isCollapsed) {
    debug(`No selection, ignoring click`);
    return;
  } else if (inputElement && text.length <= 0) {
    //-------------------------------------------------------------------------
    // Chrome is showing collapsed when an input element has selected text.
    //-------------------------------------------------------------------------
    debug(`(input element) No selection, ignoring click`);
    return;
  }

  try {
    debug(
      `copy as link: ${opts.copyAsLink}; Modifier to copy as link:`,
      `${opts.altToCopyAsLink}; modifier key: ${opts.altToCopyAsLinkModifier}`
    );
    if (
      opts.copyAsLink || (
        opts.altToCopyAsLink &&
        modifierKeyActive(e, opts.altToCopyAsLinkModifier)
      )
    ) {
      debug(
        `performing copy as link; modifier key detected:`,
        `${opts.altToCopyAsLinkModifier}`
      );
      sendMessage({
        type: "asLink",
        text: text,
        href: window.location.href,
        title: document.title,
        opts: opts,
      });
    } else if (opts.copyAsPlainText) {
      debug(`performing copy as plain text`);
      copyAsPlainText({ event: e });
    } else if (opts.includeComment) {
      debug(`performing copy with comment: ${text}`);
      //-----------------------------------------------------------------------
      // This is needed to clear the clipboard contents. Otherwise, we'll keep
      // adding to what's on the clipboard in background.js
      //-----------------------------------------------------------------------
      const rv = document.execCommand("copy");
      debug(`copy result: ${rv}`);
      if (opts.trimWhitespace) {
        debug(`Falling back to plain text copy (0x1)`);
        opts.copyAsPlainText = true;
        copyAsPlainText({ event: e });
        opts.copyAsPlainText = false;
      } else if (rv) {
        debug(`before include comment: ${text}`);
        text = includeComment({
          text: text,
          merge: false,
          event: e,
        });
        debug(`Got comment: ` + text);
        sendMessage({
          type: "includeComment",
          comment: text,
          opts: opts,
        });
      } else {
        debug(`Falling back to plain text copy (0x2)`);
        opts.copyAsPlainText = true;
        copyAsPlainText({ event: e });
        opts.copyAsPlainText = false;
      }
    } else {
      debug(`executing copy`);
      //-----------------------------------------------------------------------
      // This is needed to clear the clipboard contents. Otherwise, we'll keep
      // adding to what's on the clipboard in background.js
      //-----------------------------------------------------------------------
      const rv = document.execCommand("copy");
      debug(`copied: ${rv}`);
      if (opts.trimWhitespace || !rv) {
        debug(`Falling back to plain text copy (0x3)`);
        opts.copyAsPlainText = true;
        copyAsPlainText({ event: e });
        opts.copyAsPlainText = false;
      } else {
        alertOnCopy();
      }
    }
  } catch (ex) {
    debug(`Caught exception: `, ex);
  }

  if (opts.removeSelectionOnCopy) {
    debug(`Removing selection`);
    s.removeAllRanges();
  }

  if (opts.clearClipboard) {
    if (opts.timerId.clearClipboard) {
      clearTimeout(opts.timerId.clearClipboard);
      opts.timerId.clearClipboard = 0;
    }

    const duration = parseFloat(opts.clearClipboardWait) * 1000;
    debug(`Setting timer to clear clipboard: ${duration}`);
    opts.timerId.clearClipboard = setTimeout(function () {
      opts.timerId.clearClipboard = 0;
      debug(`Clearing clipboard`);
      sendMessage({
        type: "clearClipboard",
      });
    }, duration);
  }

  return;
});

const mouseTracking = ((e) => {
  debug(`Setting mouse start: X(start)=${e.x}; Y(start)=${e.y}`);
  opts.mouseStartX = e.x;
  opts.mouseStartY = e.y;
  opts.mouseDownTarget = e.target;
});

function processBlocklist() {
  debug(`Walk blocklist`);
  Object.keys(opts.blockList).forEach((key) => {
    debug(`  blocklist entry: ${key} ->  ${opts.blockList[key]}`);
  });

  let domain;
  const href = window.location.href;
  let flag = false;
  const hostname = window.location.hostname;
  debug(`window.location.href is ${href}`);
  if (window.location.protocol === "file:") {
    domain = window.location.pathname.match(/^\/([^/]+)\//)[1];
    if (
      opts.blockList[encodeURIComponent(href)] ||
      opts.blockList[encodeURIComponent(domain)]
    ) {
      flag = true;
    }
  } else if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  ) {
    domain = hostname;
    if (
      opts.blockList[domain] === 1 ||
      //-----------------------------------------------------------------------
      // FIXME - Are these really needed since we're testing above?
      //-----------------------------------------------------------------------
      opts.blockList["localhost"] === 1 ||
      opts.blockList["127.0.0.1"] === 1 ||
      opts.blockList["[::1]"] === 1
    ) {
      flag = true;
    }
  } else {
    const fqdnParts = hostname.split(".");
    if (fqdnParts.length <= 0) {
      debug(`window.location.hostname is empty`);
      return;
    }

    if (opts.blockList[encodeURIComponent(href)]) {
      domain = href;
      flag = true;
    } else {
      fqdnParts.forEach(() => {
        //---------------------------------------------------------------------
        // stop processing if we get down to the TLD (stratusnine.com)
        //---------------------------------------------------------------------
        if (fqdnParts.length < 2) {
          return false;
        }
        domain = fqdnParts.join(".");
        debug(`Domain walk: ${domain}`);
        if (opts.blockList[domain] === 1) {
          flag = true;
          return false;
        }
        fqdnParts.shift();
      });
    }
  }

  if (!domain) {
    debug(`Domain is undefined: ${window.location.href} / ${hostname}`);
  }

  return ({
    enable: !flag,
    domain: domain,
  });
}

function addListeners(domain) {
  debug(`Extension enabled for ${domain}`, document);
  opts.blockListSiteEnabled = true;
  document.addEventListener("mouseup", autoCopyDecideAction, false);
  document.addEventListener("mousedown", mouseTracking, false);
}

function removeListeners(domain) {
  debug(`Extension disabled for ${domain}`, document);
  opts.blockListSiteEnabled = false;
  document.removeEventListener("mouseup", autoCopyDecideAction, false);
  document.removeEventListener("mousedown", mouseTracking, false);
}

function loadContentScript() {
  const pbl = processBlocklist();
  if (pbl.enable) {
    addListeners(pbl.domain);
  } else {
    debug(`URL is blocklisted, disabling for ${pbl.domain}`);
  }
}
