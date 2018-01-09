var opts = {
  'init'            : false,
  'mouseDownTarget' : null,
  'mouseStartX'     : 0,
  'mouseStartY'     : 0,
  'mouseTravel'     : false,
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
  var el;
  debug("E.x = " + e.x + " - " + e.y);
  if (opts.alertOnCopy) {
    el = document.createElement('div');
    el.innerHTML             = "Auto Copied";
    el.style.position        = 'fixed';
    el.style.boxSizing       = 'content-box';
    el.style.height          = '30px';
    el.style.lineHeight      = '30px';
    el.style.width           = '125px';
    el.style.fontSize        = '16px';
    el.style.bottom          = '40px';
    el.style.right           = '40px';
    el.style.textAlign       = 'center';
    el.style.fontFamily      = 'Helvetica, sans-serif';
    el.style.fontStyle       = 'normal';
    el.style.fontWeight      = 'normal';
    el.style.backgroundColor = '#FFFF5C';
    el.style.padding         = '4px';
    el.style.margin          = '0px';
    el.style.borderRadius    = '4px';
    el.style.boxShadow       = '0px 0px 7px 0px #818181';
    el.style.boxShadow       = '0px 0px 16px 0px #CBCBCB';
    el.style.border          = '1px solid #FAD42E';
    el.style.border          = '1px solid #D9D900';
    el.style.zIndex          = '100000001';
    document.body.appendChild(el);
    setTimeout(function () {
      fade(el, 5);
    }, 1250);
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

  return(params.text);
}

function copyAsPlainText() {
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
      text = includeComment({ 'text' : text, 'merge' : true });
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
  opts.mouseTravel = false;
  debug(
    "Mouse coords: " + e.x + " - " + e.y + " - " + opts.mouseStartX + " - " +
      opts.mouseStartY
  );
  if (opts.mouseStartX && opts.mouseStartY) {
    x = Math.abs(e.x - opts.mouseStartX);
    y = Math.abs(e.y - opts.mouseStartY);
    opts.mouseStartX = 0;
    opts.mouseStartY = 0;
    if (x > 3 || y > 3) {
      debug("Detected mouse drag");
      opts.mouseTravel = true;
    }
  }

  if (opts.pasteOnMiddleClick && e.button === 1) {
    debug("paste requested, calling autoCopy immediately");
    autoCopy(e);
  } else if (opts.mouseTravel && e.detail === 1) {
    debug("calling autoCopy immediately");
    autoCopy(e);
  } else if (!opts.mouseTravel && e.detail === 1) {
    debug("ignoring click.  No mouse travel and click count is one.");
    return;
  } else if (!opts.mouseTravel && e.detail >= 2) {
    if (!opts.timerId) {
      debug(
        "Setting timer to call autoCopy -- need to wait and see if there " +
        "are more clicks."
      );
      opts.timerId = setTimeout(function () {
        opts.timerId = 0;
        autoCopy(e);
      }, 500);
    } else {
      debug("Got anohter click reseting timer");
      clearTimeout(opts.timerId);
      opts.timerId = setTimeout(function () {
        opts.timerId = 0;
        autoCopy(e);
      }, 500);
    }
  }
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

  if (opts.mouseDownTarget && opts.mouseDownTarget.contentEditable === "true") {
    debug("Mouse down on content editable element");
    editableElement = true;
  }

  if (opts.enableDebug) {
    console.debug(opts, true);
  }

  debug("Click count: " + e.detail);
  /* This can be used because we will no longer detect double and triple
   * clicked selections :(
  if (!opts.mouseTravel) {
    debug("No mouse movement, ignoring click");
    return;
  }
  */

  if (
    opts.ctrlToDisable
    && opts.ctrlState === 'enable'
    && ((opts.ctrlToDisableKey === 'ctrl' && !e.ctrlKey)
      || (opts.ctrlToDisableKey === 'shift' && !e.shiftKey))
  ) {
    debug("Ctrl/shift was not active, ignoring click");
    return;
  }

  if (
    opts.ctrlToDisable
    && opts.ctrlState === 'disable'
    && ((opts.ctrlToDisableKey === 'ctrl' && e.ctrlKey)
      || (opts.ctrlToDisableKey === 'shift' && e.shiftKey))
  ) {
    debug("Ctrl/shift was active, ignoring click");
    return;
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

  /*
  if (
    (!opts.enableForContentEditable &&
    opts.mouseDownTarget &&
    opts.mouseDownTarget.contentEditable === "true")
  ) {
  */
  if (!opts.enableForContentEditable && editableElement) {
    debug("Extension is not enabled for content editable elements");
    return;
  }

  /*
  if (
    !opts.enableForTextBoxes &&
    opts.mouseDownTarget &&
    opts.mouseDownTarget.nodeName &&
    (opts.mouseDownTarget.nodeName === "INPUT" ||
    opts.mouseDownTarget.nodeName === "TEXTAREA")
  ) {
  */
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
    if (opts.copyAsLink || (opts.altToCopyAsLink && e.altKey)) {
      debug("performing copy as link");
      chrome.extension.sendMessage({
        "type"  : "asLink",
        "text"  : text,
        "href"  : window.location.href,
        "title" : document.title
      });
    } else if (opts.copyAsPlainText) {
      debug("performing copy as plain text");
      copyAsPlainText();
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
          'merge' : false
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
        copyAsPlainText();
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
        copyAsPlainText();
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
