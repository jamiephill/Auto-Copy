var opts = {
  'enableForTextBoxes' : false,
  'pasteOnMiddleClick' : false,
  'copyAsPlainText'    : false,
  'includeUrl'         : false,
  'prependUrl'         : false,
  'includeUrlText'     : "",
  'mouseDownTarget'    : null
};

//-----------------------------------------------------------------------------
// window.localStorage is available, but doesn't appear to be initialized
// when accessed from content scripts so I'm using message passing and a
// background page to get the info.
//-----------------------------------------------------------------------------
chrome.extension.sendRequest(
  { 
    "type" : "config",
    "keys" : [
      "enableForTextBoxes", "copyAsPlainText", "includeUrl", "prependUrl",
      "includeUrlText"
    ] 
  }, 
  function (resp) {
    opts.enableForTextBoxes = 
      (resp.enableForTextBoxes === "true") ? true : false;
    opts.copyAsPlainText = (resp.copyAsPlainText === "true") ? true : false;
    opts.includeUrl = (resp.includeUrl === "true") ? true : false;
    opts.prependUrl = (resp.prependUrl === "true") ? true : false;
    opts.includeUrlText =
      (resp.includeUrlText === " ") ? "" : resp.includeUrlText;
  }
);

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
if (!opts.enableForTextBoxes) {
  document.body.addEventListener(
    "mousedown", 
    function (e) {
      opts.mouseDownTarget = e.target;
    },
    false
  );
}

document.body.addEventListener(
  "mouseup", 
  function (e) {
    var rv, s, el, text;

    //-------------------------------------------------------------------------
    // Unfortunately Chrome doesn't seem to support execCommand('paste').  
    // When it is called it always returns false.  I am going to post to the
    // forums to see if there is some way around it.  So I'll leave this code
    // in place for now.
    //-------------------------------------------------------------------------
    if (opts.pasteOnMiddleClick && e.button === 1) {
      try {
        rv = document.execCommand("paste", false, null);
      } catch (ex) {
        console.log("Caught exception: "+ex);
      }
      return;
    }
    //-------------------------------------------------------------------------

    if (
      !opts.enableForTextBoxes &&
      (opts.mouseDownTarget.nodeName === "INPUT" ||
      opts.mouseDownTarget.nodeName === "TEXTAREA") 
    ){
      return;
    }
  
    try {
      s = window.getSelection();
      if (opts.copyAsPlainText || opts.includeUrl) {
        text = s.toString();
        if (opts.includeUrl) {
          if (opts.prependUrl) {
            text = opts.includeUrlText + "<" + location.href + ">\n" + text;
          } else {
            text += "\n" + opts.includeUrlText + "<" + location.href + ">";
          }
        }
        chrome.extension.sendRequest(
          {
            "type" : "reformat",
            "text" : text,
          }
        );
      } else {
        if (s.toString().length > 0) {
          rv = document.execCommand("copy", false, null);
        }
      }
    } catch (ex) {
      console.log("Caught exception: "+ex);
    }
    return;
  },
  false
);
