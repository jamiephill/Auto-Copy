var opts = {};

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

document.body.addEventListener(
  "mouseup", 
  function (e) {
    if (!e.target.nodeName) {
      return;
    }
  
    if (
      !opts.enableForTextBoxes &&
      (e.target.nodeName === "INPUT" ||
      e.target.nodeName === "TEXTAREA") 
    ){
      return;
    }
  
    try {
      var s = window.getSelection();
      if (s.toString().length > 0) {
       document.execCommand("copy", false, null);
      }
    } catch (ex) {
    }
  },
  false
);
