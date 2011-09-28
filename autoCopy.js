var opts = {
  'enableForTextBoxes'            : false,
  'pasteOnMiddleClick'            : false,
  'copyAsPlainText'               : false,
  'includeUrl'                    : false,
  'prependUrl'                    : false,
  'includeUrlText'                : "",
  'includeUrlCommentCountEnabled' : false,
  'includeUrlCommentCount'        : 5,
  'mouseDownTarget'               : null
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
      "enableForTextBoxes", "pasteOnMiddleClick", "copyAsPlainText", 
      "includeUrl", "prependUrl", "includeUrlText", 
      "includeUrlCommentCountEnabled", "includeUrlCommentCount"
    ] 
  }, 
  function (resp) {
    opts.enableForTextBoxes = 
      (resp.enableForTextBoxes === "true") ? true : false;
    opts.pasteOnMiddleClick = 
      (resp.pasteOnMiddleClick === "true") ? true : false;
    opts.copyAsPlainText = (resp.copyAsPlainText === "true") ? true : false;
    opts.includeUrl = (resp.includeUrl === "true") ? true : false;
    opts.prependUrl = (resp.prependUrl === "true") ? true : false;
    opts.includeUrlCommentCountEnabled = 
      (resp.includeUrlCommentCountEnabled === "true") ? true : false;
    opts.includeUrlCommentCount =
      (isNaN(resp.includeUrlCommentCount)) ? 5 : resp.includeUrlCommentCount;
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

    if (opts.pasteOnMiddleClick && e.button === 1) {
      try {
        chrome.extension.sendRequest(
          {
            "type" : "paste",
            "text" : text,
          },
          function(text) {
            var el = e.target;
            var p1, p2;

            if (
              e.target.nodeName === "INPUT" || 
              e.target.nodeName === "TEXTAREA"
            ) {
              p1 = el.value.substring(0,el.selectionStart);
              p2 = el.value.substring(el.selectionEnd);

              el.value = p1 + text + p2;
            } else {
              console.log(
                e.target.nodeName+" is not a valid element to paste into"
              );
            }
          }
        );
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
  
    //-------------------------------------------------------------------------
    // I'm having to force this setting as of Chrome 6 because of a change in
    // Chrome 6 (actually in webkit) that disables execCommand.  It still 
    // works in background pages which means the copy as plain text option 
    // still works.
    //-------------------------------------------------------------------------
    //opts.copyAsPlainText = true;
    //-------------------------------------------------------------------------

    var comment, count=0, flag=true;
    try {
      s = window.getSelection();
      text = s.toString();
      
      //-----------------------------------------------------------------------
      // Don't execute the copy if nothing is selected.
      //-----------------------------------------------------------------------
      if (text.length <= 0) {
        return;
      }

      if (opts.copyAsPlainText || opts.includeUrl) {
        count = (text.split(/\s+/)).length;

        if (
          opts.includeUrlCommentCountEnabled &&
          count <= opts.includeUrlCommentCount
        ) {
          flag = false;
        } 

        if (opts.includeUrl && opts.includeUrlText && flag) {
          comment = opts.includeUrlText;

          if (opts.includeUrlText.indexOf('$title') >= 0) {
            comment = comment.replace(/\$title/g, document.title);
          }

          if (opts.includeUrlText.indexOf('$url') >= 0) {
            comment = comment.replace(/\$url/g, document.URL);
          }

          if (opts.includeUrlText.indexOf('$crlf') >= 0) {
            comment = comment.replace(/\$crlf/g, "\n");
          }

          if (opts.prependUrl) {
            text = comment + "\n" + text;
          } else {
            text += "\n" + comment;
          }
        }

        chrome.extension.sendRequest(
          {
            "type" : "reformat",
            "text" : text,
          }
        );
      } else {
        rv = document.execCommand("copy");
      }
    } catch (ex) {
      console.log("Caught exception: "+ex);
    }
    return;
  },
  false
);
