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
        'blackList'                     : blackListToObject(),
        'enableDebug'                   : false
      };

      if (window.localStorage != null) {
	for (key in opts) {
	  if (opts.hasOwnProperty(key)) {
	    if (key === 'blackList') {
              resp[key] = blackListToObject();
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
              key === 'includeUrlToggleState'
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
        el.value = req.text;
        el.select();
        //console.log("textArea value: " + el.value);
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
    } else if (req.type === "getBlackList") {
      callback(blackListToObject());
    } else if (req.type === "writeBlackList") {
      blackListToString(req.blackList);
    }
  }
);

function blackListToString(oBlackList) {
  var arr = [];
  for (var n in oBlackList) {
    arr.push(n + ":" + oBlackList[n]);
  }

  window.localStorage.blackList = arr.join(",");
}

function blackListToObject() {
  var oBlackList = {};

  if (!window.localStorage.blackList) {
    //console.log("setting blacklist for first time");
    window.localStorage.blackList = "docs.google.com:1";
  }

  var domains    = window.localStorage.blackList.split(",");
  var len        = domains.length
  var parts      = [];
  var i;

  //console.log("In blackListToObject");
  for (i=0; i<len; i++) {
    parts = domains[i].split(":");

    oBlackList[parts[0]] = parseInt(parts[1],10);
  }

  //console.log("Walking blacklist");
  //for (i in oBlackList) {
  //  console.log("  Blacklist entry: " + i + " -> " + oBlackList[i]);
  //}

  return(oBlackList);
}
