var opts = {
  'init'                          : false,
  'alertOnCopy'                   : false,
  'removeSelectionOnCopy'         : false,
  'enableForTextBoxes'            : true,
  'pasteOnMiddleClick'            : false,
  'ctrlToDisable'                 : false,
  'ctrlToDisableKey'              : 'ctrl',
  'altToCopyAsLink'               : false,
  'copyAsLink'                    : false,
  'copyAsPlainText'               : false,
  'includeUrl'                    : false,
  'prependUrl'                    : false,
  'includeUrlText'                : "",
  'includeUrlCommentCountEnabled' : false,
  'includeUrlCommentCount'        : 5,
  'mouseDownTarget'               : null,
  'blackList'                     : "",
  'enableDebug'                   : false
};

//-----------------------------------------------------------------------------
// window.localStorage is available, but doesn't appear to be initialized
// when accessed from content scripts so I'm using message passing and a
// background page to get the info.
//-----------------------------------------------------------------------------
chrome.extension.sendMessage(
  { 
    "type" : "config",
    "keys" : [
      "enableForTextBoxes", "pasteOnMiddleClick", "copyAsPlainText", 
      "ctrlToDisable", "copyAsLink", "includeUrl", "prependUrl", 
      "includeUrlText", "removeSelectionOnCopy", "altToCopyAsLink",
      "ctrlToDisableKey", "alertOnCopy",
      "includeUrlCommentCountEnabled", "includeUrlCommentCount", "blackList"
    ] 
  }, 
  function (resp) {
    debug("Got sendMessage response: " + resp);
    opts.init = true;
    opts.alertOnCopy = 
      (resp.alertOnCopy === "true") ? true : false;
    opts.removeSelectionOnCopy = 
      (resp.removeSelectionOnCopy === "true") ? true : false;
    opts.enableForTextBoxes = 
      (resp.enableForTextBoxes === "true") ? true : false;
    opts.pasteOnMiddleClick = 
      (resp.pasteOnMiddleClick === "true") ? true : false;
    opts.copyAsPlainText = 
      (resp.copyAsPlainText === "true") ? true : false;
    opts.ctrlToDisable = 
      (resp.ctrlToDisable === "true") ? true : false;
    opts.altToCopyAsLink = 
      (resp.altToCopyAsLink === "true") ? true : false;
    opts.ctrlToDisableKey = resp.ctrlToDisableKey || 'ctrl';
    opts.copyAsLink = 
      (resp.copyAsLink === "true") ? true : false;
    opts.includeUrl = (resp.includeUrl === "true") ? true : false;
    opts.prependUrl = (resp.prependUrl === "true") ? true : false;
    opts.includeUrlCommentCountEnabled = 
      (resp.includeUrlCommentCountEnabled === "true") ? true : false;
    opts.includeUrlCommentCount =
      (isNaN(resp.includeUrlCommentCount)) ? 5 : resp.includeUrlCommentCount;
    opts.includeUrlText =
      (resp.includeUrlText === " ") ? "" : resp.includeUrlText;
    opts.blackList = resp.blackList;

    var i;
    debug("Walk blacklist");
    for (i in opts.blackList) {
      debug("  blacklist entry: "+i+" -> "+opts.blackList[i]);
    }

    var href = window.location.href;
    var arr  = window.location.hostname.split(".");
    if (arr.length <= 0) {
      debug("window.location.hostname is empty");
      return;
    } 

    debug("window.location.href is " + href);

    var domain;
    var flag = false;
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

    if (!domain) {
      debug("Domain is undefined: " + window.location.hostname);
      return;
    }

    if (!flag) {
      debug("Extension enabled for " + domain);
      document.body.addEventListener("mouseup", autoCopy, false);

      if (!opts.enableForTextBoxes) {
        document.body.addEventListener(
          "mousedown", 
          function (e) {
            opts.mouseDownTarget = e.target;
          },
          false
        );
      }
    } else {
      debug("URL is blacklisted, disabling: " + domain);
    }
  }
);

function debug(text) {
  if (opts.enableDebug) {
    console.debug("Auto-Copy (debug): " + text);
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

function alertOnCopy() {
  var el;
  if (opts.alertOnCopy) {
    el = document.createElement('div');
    el.innerHTML             = "Auto Copied";
    el.style.position        = 'fixed';
    el.style.boxSizing       = 'content-box';
    el.style.height          = '12px';
    el.style.width           = '70px';
    el.style.bottom          = '5px'
    el.style.right           = '5px';
    el.style.textAlign       = 'center';
    el.style.fontFamily      = 'Helvetica, sans-serif';
    el.style.fontStyle       = 'normal';
    el.style.fontWeight      = 'normal';
    el.style.fontSize        = '12px';
    el.style.backgroundColor = '#FFFF5C';
    el.style.padding         = '4px';
    el.style.margin          = '0px';
    el.style.lineHeight      = '12px';
    el.style.borderRadius    = '4px';
    el.style.boxShadow       = '0px 0px 7px 0px #818181';
    el.style.border          = '1px solid #FAD42E';
    el.style.zIndex          = '100000001';
    document.body.appendChild(el);
    setTimeout(function () {
      fade(el, 5);
    }, 400);
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
  var comment = '', flag = true, url = '';
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
  var s, text; 
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
      "text" : text,
    });
  } catch (ex) {
    debug("Caught exception: " + ex);
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
  var rv, el, s, text;

  debug("Detected a mouse event");
  if (opts.enableDebug) {
    console.debug(opts);
  }

  if (
    opts.ctrlToDisable 
    && ((opts.ctrlToDisableKey === 'ctrl' && e.ctrlKey)
      || (opts.ctrlToDisableKey === 'shift' && e.shiftKey))
  ) {
    debug("Ctrl/shift was active disabling");
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
              "text" : text,
            },
            function(text) {
              var p1, p2, start, end;
    
              if (
                (e.target.nodeName === "INPUT"
                  || e.target.nodeName === "TEXTAREA")
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

  if (
    !opts.enableForTextBoxes &&
    opts.mouseDownTarget &&
    opts.mouseDownTarget.nodeName &&
    (opts.mouseDownTarget.nodeName === "INPUT" ||
    opts.mouseDownTarget.nodeName === "TEXTAREA") 
  ){
    debug("Extension is not enabled for text boxes");
    return;
  }

  s = window.getSelection();
  text = s.toString();
  if (text.length <= 0) {
    debug("No selection");
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
      rv = document.execCommand("copy");
      if (rv) {
        text = includeComment({
          'text'  : text,
          'merge' : false,
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
      rv = document.execCommand("copy");
      debug("copied: " + rv);
      if (!rv) {
	debug("Falling back to plain text copy");
	opts.copyAsPlainText = true;
	copyAsPlainText();
	opts.copyAsPlainText = false;
      }
    }
    alertOnCopy();
  } catch (ex) {
    debug("Caught exception: " + ex);
  }

  if (opts.removeSelectionOnCopy) {
    debug("Removing selection");
    s.removeAllRanges();
  }

  return;
}
