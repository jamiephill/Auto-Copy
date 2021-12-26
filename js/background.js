var notify = 0;
chrome.notifications.onClosed.addListener(function () {
  notify = 0;
  chrome.notifications.clear('AutoCopy');
});

chrome.extension.onMessage.addListener(
  function (req, sender, callback) {
    var rv, el, text, resp = {}, opts = {}, key;
    if (req.type === "config") {
      opts = {
        'alertOnCopy'                   : true,
        'alertOnCopySize'               : '14px',
        'alertOnCopyDuration'           : .75,
        'alertOnCopyLocation'           : 'bottomRight',
        'removeSelectionOnCopy'         : false,
        'enableForTextBoxes'            : true,
        'enableForContentEditable'      : true,
        'pasteOnMiddleClick'            : false,
        'ctrlToDisable'                 : false,
        'ctrlToDisableKey'              : 'ctrl',
        'ctrlState'                     : 'disable',
        'altToCopyAsLink'               : false,
        'altToCopyAsLinkModifier'       : 'alt',
        'copyAsLink'                    : false,
        'copyAsPlainText'               : false,
        'includeUrl'                    : false,
        'includeUrlToggle'              : false,
        'includeUrlToggleModifier'      : 'ctrlshift',
        'includeUrlToggleState'         : 'disable',
        'prependUrl'                    : false,
        'includeUrlText'                : '$crlfCopied from: $title - <$url>',
        'includeUrlCommentCountEnabled' : false,
        'includeUrlCommentCount'        : 5,
        'blockList'                     : blockListToObject(),
        'enableDebug'                   : false,
        'copyDelay'                     : false,
        'copyDelayWait'                 : 5,
        'clearClipboard'                : false,
        'clearClipboardWait'            : 10,
        'trimWhitespace'                : false,
        'nativeAlertOnCopy'             : false,
        'nativeAlertOnCopySound'        : false,
      };

      if (window.localStorage != null) {
	for (key in opts) {
	  if (opts.hasOwnProperty(key)) {
	    if (key === 'blockList') {
              resp[key] = blockListToObject();
	    } else if (key === 'ctrlToDisableKey' || key === 'ctrlState') {
              resp[key] = window.localStorage[key] || opts[key];
	    } else if (key === 'includeUrlCommentCount') {
	      if (window.localStorage.hasOwnProperty(key)) {
		resp[key] = parseInt(window.localStorage[key], 10);
	      } else {
		resp[key] = opts[key];
	      }
	    } else if (
              key === 'alertOnCopySize' || key === 'alertOnCopyDuration' ||
              key === 'alertOnCopyLocation' ||
              key === 'altToCopyAsLinkModifier' ||
              key === 'includeUrlToggleModifier' ||
              key === 'includeUrlToggleState' ||
              key === 'copyDelayWait' ||
              key === 'clearClipboardWait'
            ) {
	      resp[key] = window.localStorage[key] || opts[key];
	    } else if (key === 'includeUrlText') {
	      resp[key] = window.localStorage[key] || opts[key];
	    } else {
	      if (window.localStorage.hasOwnProperty(key)) {
                resp[key] = window.localStorage[key] === "true" ? true : false;
	      } else {
                resp[key] = opts[key];
	      }
	    }
	  }
	}

        callback(resp);
      } else {
        callback(opts);
      }
    } else if (req.type === "hideNotification") {
      chrome.notifications.onClosed.dispatch();
    } else if (req.type === "showNotification") {
      if (notify) {
        chrome.notifications.update(
          'AutoCopy', {
            'title'    : 'AutoCopy',
            'message'  : req.text,
            'type'     : 'basic',
            'iconUrl'  : 'assets/autoCopy-128.png',
            'priority' : 1,
            'silent'   : (req.opts.nativeAlertOnCopySound) ? false : true,
          },
          (id) => { 
            if (chrome.runtime.lastError) {
              console.log("Last error: ", id, chrome.runtime.lastError);
            }
          }
        );
      } else {
        chrome.notifications.create(
          'AutoCopy', {
            'title'    : 'AutoCopy',
            'message'  : req.text,
            'type'     : 'basic',
            'iconUrl'  : 'assets/autoCopy-128.png',
            'priority' : 1,
            'silent'   : (req.opts.nativeAlertOnCopySound) ? false : true,
          },
          (id) => { 
            if (chrome.runtime.lastError) {
              console.log("Last error: ", id, chrome.runtime.lastError);
            }
          }
        );
      }
      notify = 1;
    } else if (req.type === "clearClipboard") {
      el = document.createElement('textarea');
      document.body.appendChild(el);
      //-----------------------------------------------------------------------
      // Setting a null value will cause the clipboard to appear empty
      //-----------------------------------------------------------------------
      el.value = "\0";
      el.select();
      var rv = document.execCommand("copy");
      //console.log("Copy: " + rv);
      document.body.removeChild(el);
    } else if (req.type === "includeComment") {
        el = document.createElement('div');
	el.contentEditable='true';
        document.body.appendChild(el);
	el.unselectable = 'off';
	el.focus();
	rv = document.execCommand('paste');
	//console.log("Paste: " + rv);
	if (req.opts.prependUrl && req.comment) {
          //console.log("prepending comment: " + req.comment);
	  el.innerHTML = req.comment + '<br>' + el.innerHTML;
	} else if (req.comment) {
          //console.log("postpending comment: " + req.comment);
	  el.innerHTML = el.innerHTML + '<br>' + req.comment;
	}
	document.execCommand('SelectAll');
        rv = document.execCommand("copy");
        document.body.removeChild(el);
    } else if (req.type === "asLink") {
      if (req.text && req.text.length > 0) {
        if (opts.trimWhitesapce) {
          req.text = req.text.replace(/^\s+|\s+$/g, '');
          req.text = req.text.replace(/[\n\r]+$/g, '');
        }
        el = document.createElement('div');
	el.innerHTML = '<a title="' + req.title + '" href="' + req.href + 
          '">' + req.text + '</a>';
	el.contentEditable='true';
        document.body.appendChild(el);
	el.unselectable = 'off';
	el.focus();
	document.execCommand('SelectAll');
        rv = document.execCommand("copy");
        document.body.removeChild(el);
      }
    } else if (req.type === "reformat") {
      if (req.text && req.text.length > 0) {
        el = document.createElement('textarea');
        document.body.appendChild(el);
        if (opts.trimWhitesapce) {
          req.text = req.text.replace(/^\s+|\s+$/g, '');
          req.text = req.text.replace(/[\n\r]+$/g, '');
        }
        el.value = req.text;
        //console.log("textArea value: '" + req.text + "'");
        el.select();

        rv = document.execCommand("copy");
        //console.log("Copy: " + rv);
        document.body.removeChild(el);
      }
    } else if (req.type === "paste") {
      el = document.createElement('textarea');
      document.body.appendChild(el);
      el.value = "";
      el.select();
      var rv = document.execCommand("paste");
      //console.log("Paste: " + rv);
      rv = el.value
      document.body.removeChild(el);
      callback(rv);
    } else if (req.type === "getBlockList") {
      callback(blockListToObject());
    } else if (req.type === "writeBlockList") {
      storeBlockList(req.blockList);
    }
  }
);

function storeBlockList(oBlockList) {
  var arr = [];
  for (var n in oBlockList) {
    arr.push(n + ":" + oBlockList[n]);
  }

  window.localStorage.blockList = arr.join(",");
}

function blockListToObject() {
  var oBlockList = {};

  //---------------------------------------------------------------------------
  //  Temporary while we convert to a new name
  //---------------------------------------------------------------------------
  if (window.localStorage.blackList) {
    window.localStorage.blockList = window.localStorage.blockList;
    delete window.localStorage.blackList;
  }

  if (!window.localStorage.blockList) {
    //console.log("setting blocklist for first time");
    window.localStorage.blockList = "docs.google.com:1";
  }

  var domains    = window.localStorage.blockList.split(",");
  var len        = domains.length
  var parts      = [];
  var i;

  //console.log("In blockListToObject");
  for (i=0; i<len; i++) {
    parts = domains[i].split(":");

    oBlockList[parts[0]] = parseInt(parts[1],10);
  }

  //console.log("Walking blocklist");
  //for (i in oBlockList) {
  //  console.log("  Blocklist entry: " + i + " -> " + oBlockList[i]);
  //}

  return(oBlockList);
}
