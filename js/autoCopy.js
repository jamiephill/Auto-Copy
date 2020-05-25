var opts = {
  'init'            : false,
  'mouseDownTarget' : null,
  'mouseStartX'     : 0,
  'mouseStartY'     : 0,
  'timerId'         : 0
};

//-----------------------------------------------------------------------------
// window.localStorage is available, but doesn't appear to be initialized
// when accessed from content scripts so I'm using message passing and a
// background page to get the info.
//-----------------------------------------------------------------------------
chrome.extension.sendMessage(
  { "type" : "config" },
  function (resp) {
    var key;
    opts.init = true;

    for (key in resp) {
      if (resp.hasOwnProperty(key)) {
        opts[key] = resp[key];
      }
    }

    debug("Got opts:");
    debug(opts, true);

    var i;
    debug("Walk blacklist");
    for (i in opts.blackList) {
      debug("  blacklist entry: " + i + " -> " + opts.blackList[i]);
    }

    var arr;
    var domain;
    var href = window.location.href;
    var flag = false;
    debug("window.location.href is " + href);
    if (window.location.protocol === "file:") {
      domain = window.location.pathname.match(/^\/([^\/]+)\//)[1];
      if (
        opts.blackList[encodeURIComponent(href)] ||
        opts.blackList[encodeURIComponent(domain)]
      ) {
        flag = true;
      }
    } else {
      arr  = window.location.hostname.split(".");
      if (arr.length <= 0) {
        debug("window.location.hostname is empty");
        return;
      }

      if (opts.blackList[encodeURIComponent(href)]) {
        domain = href;
        flag   = true;
      } else {
        for (i in arr) {
          if (arr.length < 2) {
            break;
          }
          domain = arr.join(".");
          debug("Domain walk: " + domain);
          if (opts.blackList[domain] == 1) {
            flag = true;
            break;
          }
          arr.shift();
        }
      }
    }

    if (!domain) {
      debug("Domain is undefined: " + window.location.href);
      return;
    }

    if (!flag) {
      debug("Extension enabled for " + domain);
      document.body.addEventListener("mouseup", autoCopyW, false);

      document.body.addEventListener(
        "mousedown",
        function (e) {
          //debug("StartX = " + e.x + " -- StartY = " + e.y);
          opts.mouseStartX = e.x;
          opts.mouseStartY = e.y;
          opts.mouseDownTarget = e.target;
        },
        false
      );
    } else {
      debug("URL is blacklisted, disabling: " + domain);
    }
  }
);

function padDigits(n, width, z) {
  width   = width || 2;
  z       = z || 0;
  n       = String(n);
  var arr = [];

  if (n.length >= width) {
    return n;
  }

  arr.length = width - n.length + 1;
  return arr.join(z) + n;
}

function debug(text, standalone) {
  if (opts.enableDebug) {
    if (!standalone) {
      console.debug("Auto-Copy (debug): " + text);
    } else {
      console.debug(text);
    }
  }
}

function fade(el, speed) {
  var timer;
  if (el.style) {
    el.style.opacity= '1';
  }
  timer = setInterval(function () {
    el.style.opacity = parseFloat(el.style.opacity) - .02;
    if (el.style.opacity <= 0) {
      clearInterval(timer);
      document.body.removeChild(el);
    }
  },
  speed);
}

function alertOnCopy(e) {
  var el, el1;

  if (opts.alertOnCopy) {
    el = document.createElement('div');
    el.style.fontSize        = opts.alertOnCopySize;
    el.style.fontFamily      = 'Helvetica, sans-serif';
    el.style.fontStyle       = 'normal';
    el.style.fontWeight      = 'normal';
    el.style.boxShadow       = '0px 0px 16px 0px #CBCBCB';
    el.style.border          = '1px solid #D9D900';
    el.style.zIndex          = '100000001';
    el.style.textAlign       = 'center';
    el.style.color           = '#444444';
    el.style.backgroundColor = '#FFFF5C';
    el.style.position        = 'fixed';
    el.style.borderRadius    = '.25em';
    el.innerHTML             = "Auto Copied";
    el.style.boxSizing       = 'content-box';
    el.style.height          = '2em';
    el.style.lineHeight      = '2em';
    el.style.width           = '7em';
    el.style.padding         = '0px';
    el.style.margin          = '0px';

    debug("location: " + opts.alertOnCopyLocation);
    if (opts.alertOnCopyLocation === 'topLeft') {
      el.style.top = '25px';
      el.style.left  = '25px';
    } else if (opts.alertOnCopyLocation === 'topRight') {
      el.style.top   = '25px';
      el.style.right = '25px';
    } else if (opts.alertOnCopyLocation === 'bottomLeft') {
      el.style.bottom = '25px';
      el.style.left   = '25px';
    } else {
      el.style.bottom = '25px';
      el.style.right  = '25px';
    }

    document.body.appendChild(el);

    var duration = parseFloat(opts.alertOnCopyDuration) * 1000;
    if (isNaN(duration)) {
      duration = 750;
    }

    debug("Fade duration: " + duration);

    setTimeout(function () {
      fade(el, 5);
    }, duration);
  }
}

function includeComment(params) {
  params = params || {};

  if (!params.text) {
    debug("includeComment: No text supplied");
    return;
  }

  var text;
  var count   = (params.text.split(/\s+/)).length;
  var comment = '';
  var flag    = true;
  var url     = '';
  var crlf    = (opts.copyAsPlainText) ? "\n" : "<br>";

  debug(
    "Use modifier to " + opts.includeUrlToggleState + " comment? " +
    opts.includeUrlToggle + 
    "; modifier key: " + opts.includeUrlToggleModifier
  );
  if (opts.includeUrlToggle) {
    let tflag = false;
    if (
      opts.includeUrlToggleState === 'enable' &&
      modifierKeyActive(params.event, opts.includeUrlToggleModifier)
    ) {
      debug(
        "Modifier key (" + opts.includeUrlToggleModifier +
        ") was active; adding comment"
      );
      tflag = true;
    } else if (
      opts.includeUrlToggleState === 'disable' &&
      !modifierKeyActive(params.event, opts.includeUrlToggleModifier)
    ) {
      debug(
        "Modifier key (" + opts.includeUrlToggleModifier + 
        ") was not active; adding comment"
      );
      tflag = true;
    }

    if (!tflag) {
      debug("Ignoring adding comment due to modifier and state");
      if (params.merge) {
        return(params.text);
      }

      return('');
    }
  }

  if (
    opts.includeUrlCommentCountEnabled &&
    count <= opts.includeUrlCommentCount
  ) {
    debug("Setting comment flag to false");
    flag = false;
  }


  if (opts.includeUrl && opts.includeUrlText && flag) {
    comment = opts.includeUrlText;
    debug("Format: " + comment);

    if (opts.includeUrlText.indexOf('$title') >= 0) {
      comment = comment.replace(/\$title/g, document.title);
    }

    if (opts.copyAsPlainText) {
      url = window.location.href;
    } else {
      comment = comment.replace(/</g, "&lt;");
      comment = comment.replace(/>/g, "&gt;");
      url = '<a title="' + document.title + '" href="' + window.location.href +
        '">' + window.location.href + '</a>';
    }

    if (opts.includeUrlText.indexOf('$url') >= 0) {
      comment = comment.replace(/\$url/g, url);
    }

    if (opts.includeUrlText.indexOf('$crlf') >= 0) {
      comment = comment.replace(/\$crlf/g, crlf);
    }

    var date = new Date();
    var hr;
    var timestamp;
    
    if (opts.includeUrlText.indexOf('$month') >= 0) {
      comment = comment.replace(/\$month/g, padDigits(date.getMonth() + 1));
    }
    if (opts.includeUrlText.indexOf('$day') >= 0) {
      comment = comment.replace(/\$day/g, padDigits(date.getDate()));
    }
    if (opts.includeUrlText.indexOf('$year') >= 0) {
      comment = comment.replace(/\$year/g, date.getFullYear());
    }
    if (opts.includeUrlText.indexOf('$24hour') >= 0) {
      comment = comment.replace(/\$24hour/g, padDigits(date.getHours()));
    }
    if (opts.includeUrlText.indexOf('$hour') >= 0) {
      hr = date.getHours();
      if (hr > 12) {
        hr -= 12;
      }
      comment = comment.replace(/\$hour/g, padDigits(date.getHours()));
    }
    if (opts.includeUrlText.indexOf('$minute') >= 0) {
      comment = comment.replace(/\$minute/g, padDigits(date.getMinutes()));
    }
    if (opts.includeUrlText.indexOf('$second') >= 0) {
      comment = comment.replace(/\$second/g, padDigits(date.getSeconds()));
    }

    if (opts.includeUrlText.indexOf('$timestamp') >= 0) {
      timestamp = date.getFullYear() + '-' + padDigits(date.getMonth() + 1) +
        '-' + padDigits(date.getDate()) + ' ' + padDigits(date.getHours()) +
        ':' + padDigits(date.getMinutes()) + ':' + padDigits(date.getSeconds());
      comment = comment.replace(/\$timestamp/g, timestamp);
    }

    if (params.merge) {
      if (opts.prependUrl) {
        debug("Prepending comment: " + comment);
        text = comment + crlf + params.text;
      } else {
        debug("Postpending comment: " + comment);
        text = params.text + crlf + comment;
      }
    } else {
      text = comment;
    }

    return(text);
  }

  if (params.merge) {
    return(params.text);
  }

  return('');
}

function copyAsPlainText(params) {
  params = params || {
    'event' : {}
  };
  var s;
  var text;
  try {
    s = window.getSelection();
    text = s.toString();

    //-------------------------------------------------------------------------
    // Don't execute the copy if nothing is selected.
    //-------------------------------------------------------------------------
    if (text.length <= 0) {
      debug("Selection was empty");
      return;
    }

    debug("Got selectection: " + text);

    if (opts.includeUrl) {
      text = includeComment({
        'text' : text, 'merge' : true, 'event' : params.event
      });
    }

    debug("Sending copy as plain text: " + text);
    chrome.extension.sendMessage({
      "type" : "reformat",
      "text" : text
    });
  } catch (ex) {
    debug("Caught exception: " + ex);
  }
}

//-----------------------------------------------------------------------------
// We using a combination of mouse travel and click count to decide how to
// handle the clicks.  If not mouse travel and a single click then we will not
// do anything.  If no mouse travel and move than one click means someone could
// be double or triple clicking to make a selection so we'll set a delay in
// case they are triple clicking.  This is to prevent autoCopy from firing
// multiple times (for the double click and then again for the triple click).
//
// If we detect mouse travel and it is a single click then we will call
// autoCopy immediately as that should be an indicaton of a selection being
// made.
//-----------------------------------------------------------------------------
function autoCopyW(e) {
  var x;
  var y;
  var mouseTravel = false;
  debug(
    "Mouse coords: " + e.x + " - " + e.y + " - " + opts.mouseStartX + " - " +
      opts.mouseStartY
  );
  debug(
    "Keyboard modifiers: alt=" + e.altKey + " - ctrl=" + e.ctrlKey +
      " - shift=" + e.shiftKey
  );
  if (opts.mouseStartX && opts.mouseStartY) {
    x = Math.abs(e.x - opts.mouseStartX);
    y = Math.abs(e.y - opts.mouseStartY);
    opts.mouseStartX = 0;
    opts.mouseStartY = 0;
    if (x > 3 || y > 3) {
      debug("Detected mouse drag");
      mouseTravel = true;
    }
  }

  debug("Click count: " + e.detail + " - mouse travel? " + mouseTravel);

  if (opts.pasteOnMiddleClick && e.button === 1) {
    debug("paste requested, calling autoCopy immediately");
    autoCopy(e);
  } else if (mouseTravel && e.detail === 1) {
    debug("calling autoCopy immediately");
    autoCopy(e);
  } else if (!mouseTravel && e.detail === 1) {
    debug("ignoring click.  No mouse travel and click count is one.");
    return;
  } else if (mouseTravel && e.detail >= 2) {
    debug("double click and drag -- calling autoCopy immediately");
    autoCopy(e);
  } else if (!mouseTravel && e.detail >= 3) {
    debug("triple click detected -- calling autoCopy immediately");
    clearTimeout(opts.timerId);
    opts.timerId = 0;
    autoCopy(e);
  } else if (!mouseTravel && e.detail == 2) {
    //-------------------------------------------------------------------------
    // We have to wait before calling auto copy when two clicks are 
    // detected to see if there is going to be a triple click.
    //-------------------------------------------------------------------------
    debug("timerId? " + opts.timerId);
    if (!opts.timerId) {
      debug(
        "Setting timer to call autoCopy -- need to wait and see if there " +
        "is a triple click."
      );
      opts.timerId = setTimeout(function () {
        opts.timerId = 0;
        autoCopy(e);
      }, 500);
    }
  }
}

function modifierKeyActive(e, name) {
  if (
    name === 'ctrl' && e.ctrlKey && !e.shiftKey && !e.altKey
  ) {
    return true;
  } else if (
    name === 'alt' && e.altKey && !e.ctrlKey && !e.shiftKey
  ) {
    return true;
  } else if (
    name === 'shift' && e.shiftKey && !e.ctrlKey && !e.altKey
  ) {
    return true;
  } else if (
    name === 'ctrlalt' && e.ctrlKey && e.altKey && !e.shiftKey
  ) {
    return true;
  } else if (
    name === 'ctrlshift' && e.ctrlKey && e.shiftKey && !e.altKey
  ) {
    return true;
  } else if (
    name === 'ctrlaltshift' && e.ctrlKey && e.shiftKey && e.altKey
  ) {
    return true;
  } else if (
    name === 'altshift' && e.altKey && e.shiftKey && !e.ctrlKey
  ) {
    return true;
  }

  return false;
}

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
function autoCopy(e) {
  var rv;
  var el;
  var s;
  var text;
  var nodeTypes       = { 'input' : false, 'editable' : false };
  var inputElement    = false;
  var editableElement = false;

  if (
    opts.mouseDownTarget &&
    opts.mouseDownTarget.nodeName &&
    (opts.mouseDownTarget.nodeName === "INPUT" ||
    opts.mouseDownTarget.nodeName === "TEXTAREA")
  ) {
    debug("Mouse down on input element");
    inputElement = true;
  }

  if (opts.mouseDownTarget && opts.mouseDownTarget.isContentEditable) {
    debug("Mouse down on content editable element");
    editableElement = true;
  }

  if (opts.enableDebug) {
    console.debug(opts, true);
  }

  debug(
    "Use modifier to " + opts.ctrlState + " extension? " + opts.ctrlToDisable + 
    "; modifier key: " + opts.ctrlToDisableKey
  );
  if (opts.ctrlToDisable) {
    let flag = false;
    if (
      opts.ctrlState === 'enable' &&
      modifierKeyActive(e, opts.ctrlToDisableKey)
    ) {
      debug(
        "Modifier key (" + opts.ctrlToDisableKey + ") was active; " + 
        "doing copy"
      );
      flag = true;
    }
    if (
      opts.ctrlState === 'disable' &&
      !modifierKeyActive(e, opts.ctrlToDisableKey)
    ) {
      debug(
        "Modifier key (" + opts.ctrlToDisableKey + ") was not active; " + 
        "doing copy"
      );
      flag = true;
    }

    if (!flag) {
      debug("Ignoring copy due to modifier and state");
      return;
    }
  }

  if (opts.pasteOnMiddleClick && e.button === 1) {
    el = e.target;
    debug("autoCopy: detected paste on middle click");

    if (
      ((e.target.nodeName === "INPUT"
        || e.target.nodeName === "TEXTAREA")
      && e.target.type !== "checkbox"
      && e.target.type !== "radio"
      && !e.target.disabled
      && !e.target.readOnly)
      || e.target.contentEditable === "true"
    ) {
      rv = document.execCommand('paste');
      debug("paste rv:" + rv);

      //-----------------------------------------------------------------------
      // This is fallback for browsers that don't support execCommand in the
      // content script
      //-----------------------------------------------------------------------
      if (!rv) {
        try {
          chrome.extension.sendMessage(
            {
              "type" : "paste",
              "text" : text
            },
            function(text) {
              var p1;
              var p2;
              var start;
              var end;

              if (
                e.target.nodeName === "INPUT"
                  || e.target.nodeName === "TEXTAREA"
              ) {
                p1 = el.value.substring(0,el.selectionStart);
                p2 = el.value.substring(el.selectionEnd);

                el.value = p1 + text + p2;
              } else if (e.target.contentEditable === "true") {
                el.innerHTML = el.innerHTML + text;
              }
            }
          );
        } catch (ex) {
          debug("Caught exception: " + ex);
        }
      }
    } else {
      debug(
        e.target.nodeName + " is not editable, cannot perform paste"
      );
    }
    return;
  }

  if (!opts.enableForContentEditable && editableElement) {
    debug("Extension is not enabled for content editable elements");
    return;
  }

  if (!opts.enableForTextBoxes && inputElement) {
    debug("Extension is not enabled for text boxes");
    return;
  }

  s    = window.getSelection();
  debug("selection collapsed? " + s.isCollapsed);
  text = s.toString();
  debug("selection collapsed? " + s.isCollapsed + " - length: " + text.length);
  if (!inputElement && s.isCollapsed) {
    debug("No selection, ignoring click");
    return;
  } else if (inputElement && text.length <= 0) {
    //-------------------------------------------------------------------------
    // Chrome is showing collapsed when an input element has selected text.
    //-------------------------------------------------------------------------
    debug("(input element) No selection, ignoring click");
    return;
  }

  try {
    debug(
      "copy as link: " + opts.copyAsLink + "; Modifier to copy as link: " +
      opts.altToCopyAsLink + "; modifier key: " + opts.altToCopyAsLinkModifier
    );
    if (
      opts.copyAsLink || (
        opts.altToCopyAsLink &&
        modifierKeyActive(e, opts.altToCopyAsLinkModifier)
      )
    ) {
      debug(
        "performing copy as link; modifier key detected: " +
        opts.altToCopyAsLinkModifier
      );
      chrome.extension.sendMessage({
        "type"  : "asLink",
        "text"  : text,
        "href"  : window.location.href,
        "title" : document.title
      });
    } else if (opts.copyAsPlainText) {
      debug("performing copy as plain text");
      copyAsPlainText({ 'event' : e });
    } else if (opts.includeUrl) {
      debug("performing copy with comment");
      //-----------------------------------------------------------------------
      // This is needed to clear the clipboard contents. Otherwise, we'll keep
      // adding to what's on the clipboard in background.js
      //-----------------------------------------------------------------------
      rv = document.execCommand("copy");
      if (rv) {
        text = includeComment({
          'text'  : text,
          'merge' : false,
          'event' : e
        });
        debug("Got comment: " + text);
        chrome.extension.sendMessage({
          "type"    : "includeComment",
          "comment" : text,
          "opts"    : opts
        });
      } else {
        debug("Falling back to plain text copy");
        opts.copyAsPlainText = true;
        copyAsPlainText({ 'event' : e });
        opts.copyAsPlainText = false;
      }
    } else {
      debug("executing copy");
      //-----------------------------------------------------------------------
      // This is needed to clear the clipboard contents. Otherwise, we'll keep
      // adding to what's on the clipboard in background.js
      //-----------------------------------------------------------------------
      rv = document.execCommand("copy");
      debug("copied: " + rv);
      if (!rv) {
        debug("Falling back to plain text copy");
        opts.copyAsPlainText = true;
        copyAsPlainText({ 'event' : e });
        opts.copyAsPlainText = false;
      }
    }
    alertOnCopy(e);
  } catch (ex) {
    debug("Caught exception: " + ex);
  }

  if (opts.removeSelectionOnCopy) {
    debug("Removing selection");
    s.removeAllRanges();
  }

  return;
}
