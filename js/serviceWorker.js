"use strict";

//-----------------------------------------------------------------------------
// Has info on how to auto-reload tabs
// https://stackoverflow.com/questions/78214531/my-service-worker-is-not-connecting-to-my-content-script-in-my-chrome-extension
// We don't need this since we're now using the onInstalled listener
//-----------------------------------------------------------------------------

//-----------------------------------------------------------------------------
// This will log messages to the service worker console
//-----------------------------------------------------------------------------
/*
let enableDebug = true;
const debug = (...args) => {
  if (enableDebug) {
    if (args[0] === "Offscreen") {
      args[0] = `Auto-Copy (${args[0]})`;
    } else {
      args.unshift("Auto-Copy (ServiceWorker):");
    }
    console.log.apply(null, args);
  }
};
*/

//-----------------------------------------------------------------------------
// This will log messages back to the content script console.  This way we can
// consolidate all the messages in one place, and use the enableDebug setting
// to determine if we should log the output.  The only downside si that we
// have to receive a message from the content script before we can send
// something to the content script as we need the tabId in order to be able to
// send a message.
//-----------------------------------------------------------------------------
let tabId;
const debug = (...args) => {
  if (!tabId) {
    //-------------------------------------------------------------------------
    // If we haven't received a tabId yet then let's just log to the console
    //-------------------------------------------------------------------------
    const enableDebug = true;
    if (enableDebug) {
      if (args[0] === "Offscreen") {
        args[0] = `Auto-Copy (${args[0]})`;
      } else {
        args.unshift("Auto-Copy (ServiceWorker):");
      }
      console.log.apply(null, args);
    }
    return;
  }

  const target = (args[0] === "Offscreen") ? args.shift() : "ServiceWorker";

  chrome.tabs.sendMessage(tabId, {
    target: target,
    type: "log",
    data: args,
  });
};

//-----------------------------------------------------------------------------
// When the extension is installed or updated then we'll check to see if we
// have initialized the default options, and if not, we'll go ahead and set
// them.
//
// onInstalled provides:
//   previousVersion = "5.0.0" (only available if reason = 'update')
//   reason = 'install' || 'update' || 'chrome_update' || 'shared_module_update'
//-----------------------------------------------------------------------------
chrome.runtime.onInstalled.addListener((...args) => {
  debug(`onInstalled listener`, args);
  chrome.storage.sync.get([
    "alertOnCopyLocation", // Temporary to fix issue with options conversion
    "blockList",           // 7/26/25
    "initializedStorage",
  ]).then((obj) => {
    debug(`is storage initialized? ${obj.initializedStorage}`, obj);
    if (!obj.initializedStorage) {
      //-----------------------------------------------------------------------
      // We'll check to see if there is data in localStorage.  If so, we'll
      // use that for the defaults.  Otherwise we'll use defaultOpts.
      //
      // checkForLocalStorageConfig uses an offscreen document to gain access
      // to localStorage and sends a message back (see localStorageData below)
      // with the info if it exists.
      //-----------------------------------------------------------------------
      checkForLocalStorageConfig();
    } else {
      const tObj = {};
      if (obj.alertOnCopyLocation && obj.alertOnCopyLocation.match(/^[bt]/)) {
        tObj.alertOnCopyLocation =
          obj.alertOnCopyLocation.charAt(0).toUpperCase() +
          obj.alertOnCopyLocation.slice(1);
      }
      if (obj.blockList && typeof obj.blockList === "string") {
        tObj.blockList = convertBlockListToObject(obj.blockList);
      }
      chrome.storage.sync.set(tObj);
    }
  });
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  //---------------------------------------------------------------------------
  // Send a message towards the content script
  //---------------------------------------------------------------------------
  /*
  chrome.tabs.sendMessage(sender.tab.id, {
    "type": "config", "data" : opts
  });
  */

  if (msg.type === "log") {
    debug(msg.target, ...msg.data);
  } else if (msg.type === "localStorageData") {
    debug("Offscreen", [ "Got config from localStorage", msg.data ]);
    convertConfigOrSetDefaults(msg.data);
  } else if (msg.type === "hideNotification") {
    tabId = sender.tab.id;
    debug(`${msg.type}`, msg);
    chrome.notifications.onClosed.dispatch();
    chrome.notifications.getAll().then((obj) => {
      if (Object.keys(obj).length !== 0) {
        chrome.notifications.clear("AutoCopy");
      }
    });
  } else if (msg.type === "showNotification") {
    tabId = sender.tab.id;
    debug(`${msg.type}`, msg);
    chrome.notifications.getAll().then((obj) => {
      if (Object.keys(obj).length !== 0) {
        debug(`In notification update`);
        chrome.notifications.update("AutoCopy", {
          title: "AutoCopy",
          message: msg.text,
          type: "basic",
          iconUrl: "/assets/autoCopy-128.png",
          priority: 1,
          silent: (msg.opts.nativeAlertOnCopySound) ? false : true,
        });
      } else {
        debug(`In notification create`);
        chrome.notifications.create("AutoCopy", {
          title: "AutoCopy",
          message: msg.text,
          type: "basic",
          iconUrl: "/assets/autoCopy-128.png",
          priority: 1,
          silent: (msg.opts.nativeAlertOnCopySound) ? false : true,
        });
      }
    });
  } else if (msg.type === "clearClipboard") {
    tabId = sender.tab.id;
    debug(`${msg.type} -- setting value to null`, msg);
    //-----------------------------------------------------------------------
    // Setting a null value will cause the clipboard to appear empty
    //-----------------------------------------------------------------------
    offscreenCopyTextarea("\0");
  } else if (msg.type === "includeComment") {
    tabId = sender.tab.id;
    debug(`${msg.type}`, msg);
    offscreenCopyDiv(msg.comment, msg.opts, msg.type);
  } else if (msg.type === "asLink") {
    tabId = sender.tab.id;
    debug(`${msg.type}`, msg);
    if (msg.text && msg.text.length > 0) {
      if (msg.opts.trimWhitesapce) {
        msg.text = msg.text.replace(/^\s+|\s+$/g, "");
        msg.text = msg.text.replace(/[\n\r]+$/g, "");
      }
      const comment =
        `<a title="${msg.title}" href="${msg.href}">${msg.text}</a>`;

      offscreenCopyDiv(comment, msg.opts, msg.type);
    }
  } else if (msg.type === "reformat") {
    tabId = sender.tab.id;
    debug(`${msg.type}`, msg);
    if (msg.text && msg.text.length > 0) {
      if (msg.opts.trimWhitesapce) {
        msg.text = msg.text.replace(/^\s+|\s+$/g, "");
        msg.text = msg.text.replace(/[\n\r]+$/g, "");
      }
      debug(`Reformat -- textArea value: '${msg.text}'`);
      offscreenCopyTextarea(msg.text);
    }
  }
});

async function offscreenCopyTextarea(text) {
  debug("In offscreenCopyTextarea");
  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL("/html/offscreen.html"),
    reasons: [ chrome.offscreen.Reason.CLIPBOARD ],
    justification: "Modifying clipboard",
  });
  debug("After createDocument");

  chrome.runtime.sendMessage({
    type: "copyTextarea",
    target: "offscreen-doc",
    text: text,
  });
}

async function offscreenCopyDiv(text, opts, subType) {
  debug("In offscreenCopyDiv");
  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL("/html/offscreen.html"),
    reasons: [ chrome.offscreen.Reason.CLIPBOARD ],
    justification: "Modifying clipboard",
  });
  debug("After createDocument");

  chrome.runtime.sendMessage({
    type: "copyDiv",
    target: "offscreen-doc",
    subType: subType,
    text: text,
    opts: opts,
  });
}

async function checkForLocalStorageConfig() {
  debug("In checkForLocalStorageConfig");
  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL("/html/offscreen.html"),
    reasons: [ chrome.offscreen.Reason.LOCAL_STORAGE ],
    justification: "Converting form localStorage to runtime.storage",
  });
  debug("After createDocument");

  chrome.runtime.sendMessage({
    type: "retrieveLocalStorage",
    target: "offscreen-doc",
  });
}

function convertBlockListToObject(blockList) {
  const tbl = {};
  if (blockList.length > 0) {
    blockList.split(",").forEach((k) => {
      const parts = k.split(":");
      tbl[parts[0]] = parseInt(parts[1], 10);
    });
  }
  return (tbl);
}

function convertConfigOrSetDefaults(obj) {
  //---------------------------------------------------------------------------
  // Map expected items from localStorage to their new name.  Most of the time
  // the old and new name is the same.
  //---------------------------------------------------------------------------
  const configMap = {
    alertOnCopy: "alertOnCopy",
    alertOnCopySize: "alertOnCopySize",
    alertOnCopyDuration: "alertOnCopyDuration",
    alertOnCopyLocation: "alertOnCopyLocation",
    removeSelectionOnCopy: "removeSelectionOnCopy",
    enableForTextBoxes: "enableForTextBoxes",
    enableForContentEditable: "enableForContentEditable",
    pasteOnMiddleClick: "pasteOnMiddleClick",
    ctrlToDisable: "ctrlToDisable",
    ctrlToDisableKey: "ctrlToDisableKey",
    ctrlState: "ctrlState",
    altToCopyAsLink: "altToCopyAsLink",
    altToCopyAsLinkModifier: "altToCopyAsLinkModifier",
    copyAsLink: "copyAsLink",
    copyAsPlainText: "copyAsPlainText",
    includeUrl: "includeComment",
    includeUrlToggle: "includeCommentToggle",
    includeUrlToggleModifier: "includeCommentToggleModifier",
    includeUrlToggleState: "includeCommentToggleState",
    prependUrl: "includeCommentPrepend",
    includeUrlText: "includeCommentFormat",
    includeUrlCommentCountEnabled: "includeCommentWordCountEnabled",
    includeUrlCommentCount: "includeCommentWordCount",
    blockList: "blockList",
    debug: "enableDebug",
    copyDelay: "copyDelay",
    copyDelayWait: "copyDelayWait",
    clearClipboard: "clearClipboard",
    clearClipboardWait: "clearClipboardWait",
    trimWhitespace: "trimWhitespace",
    nativeAlertOnCopy: "nativeAlertOnCopy",
    nativeAlertOnCopySound: "nativeAlertOnCopySound",
  };
  const defaultOpts = {
    initializedStorage: true,
    // aoc
    alertOnCopy: true,
    // aocs
    alertOnCopySize: "14px",
    // aocd
    alertOnCopyDuration: .75,
    alertOnCopyLocation: "BottomRight",
    // rsoc
    removeSelectionOnCopy: false,
    enableSelectAll: true,
    enableSelectAllForTextBoxes: true,
    enableSelectAllForContentEditable: true,
    enableArrowSelect: true,
    enableArrowSelectForTextBoxes: true,
    enableArrowSelectForContentEditable: true,
    // eitb
    enableForTextBoxes: true,
    // eice
    enableForContentEditable: true,
    // pomc
    pasteOnMiddleClick: false,
    // dc
    ctrlToDisable: false,
    // dck
    ctrlToDisableKey: "ctrl",
    // acs
    ctrlState: "disable",
    // acal
    altToCopyAsLink: false,
    // acalo
    altToCopyAsLinkModifier: "alt",
    // cal
    copyAsLink: false,
    // capt
    copyAsPlainText: false,
    // iurl / includeUrl
    includeComment: true,
    // iurlemod / includeUrlToggle
    includeCommentToggle: false,
    // iurlmod / includeUrlToggleModifier
    includeCommentToggleModifier: "ctrlshift",
    // iurlemodstate / includeUrlToggleState
    includeCommentToggleState: "disable",
    // prependUrl
    includeCommentPrepend: false,
    // iurltext / includeUrlText
    includeCommentFormat: "$crlfCopied from: $title - <$url>",
    // iurlewc / includeUrlCommentCountEnabled
    includeCommentWordCountEnabled: true,
    // iurlcount / includeUrlCommentCount
    includeCommentWordCount: 5,
    blockList: { "docs.google.com": 1 },
    // debug
    enableDebug: false,
    copyDelay: false,
    copyDelayWait: 5,
    clearClipboard: false,
    clearClipboardWait: 10,
    trimWhitespace: false,
    nativeAlertOnCopy: false,
    nativeAlertOnCopySound: false,
  };

  debug(`Opts (defaults):`, defaultOpts);
  debug(`localStorage opts:`, obj);

  Object.keys(obj).forEach((key) => {
    if (configMap[key]) {
      debug(`Setting ${configMap[key]} from ${key} with ${obj[key]}`);
      if (key === "alertOnCopyLocation") {
        defaultOpts[configMap[key]] =
          obj[key].charAt(0).toUpperCase() + obj[key].slice(1);
      } else if (key === "blockList") {
        defaultOpts[configMap[key]] = convertBlockListToObject(obj[key]);
      } else {
        defaultOpts[configMap[key]] = obj[key];
      }
    }
  });

  debug(`Combined opts:`, defaultOpts);

  //chrome.storage.local.set(defaultOpts).then(() => {
  //  debug(`local options initialized`);
  //});
  chrome.storage.sync.set(defaultOpts).then(() => {
    debug(`sync options initialized`);
  });
}
