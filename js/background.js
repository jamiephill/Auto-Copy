chrome.extension.onMessage.addListener(
  function (req, sender, callback) {
    var rv, el, i, len, range, s, resp = {};
    if (req.type === "config") {
      if (window.localStorage != null && req.keys != null) {
        len = req.keys.length;
        for (i=0; i<len; i++) {
          if (req.keys[i] === "blackList") {
            resp[req.keys[i]] = blackListToObject();
          } else {
            resp[req.keys[i]] = 
              window.localStorage[req.keys[i]] || undefined;
          }
        }
        callback(resp);
      } else {
        callback({});
      }
    } else if (req.type === "includeComment") {
        el = document.createElement('div');
	el.contentEditable='true';
        document.body.appendChild(el);
	el.unselectable = 'off';
	el.focus();
	rv = document.execCommand('paste');
	//console.log("Paste: " + rv);
	if (req.opts.prependUrl) {
	  el.innerHTML = req.comment + '<br>' + el.innerHTML;
	} else {
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
