var opts = {
  'enableForTextBoxes' : false,
  'mouseDownTarget'    : null
};

//-----------------------------------------------------------------------------
// window.localStorage is available, but doesn't appear to be initialized
// when accessed from content scripts so I'm using message passing and a
// background page to get the info.
//-----------------------------------------------------------------------------
chrome.extension.sendRequest(
  { "name" : "enableForTextBoxes" }, 
  function (resp) {
    opts.enableForTextBoxes = (resp.value === "true") ? true : false;
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
    if (
      !opts.enableForTextBoxes &&
      (opts.mouseDownTarget.nodeName === "INPUT" ||
      opts.mouseDownTarget.nodeName === "TEXTAREA") 
    ){
      return;
    }
  
    try {
      var s = window.getSelection();
      if (s.toString().length > 0) {
       document.execCommand("copy", false, null);
      }
    } catch (ex) {
      console.log("Caught exception: "+ex);
    }
  },
  false
);
