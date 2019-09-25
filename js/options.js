var blackList = {
  "init" : true
};

function saveOptions() {
  if (!window.localStorage) {
    alert("Error local storage is unavailable.");
  }

  window.localStorage.enableDebug = 
    document.getElementById("debug").checked ? true : false;

  window.localStorage.alertOnCopy = 
    document.getElementById("aoc").checked ? true : false;
  window.localStorage.alertOnCopySize = 
    document.getElementById("aocs").style.fontSize;

  window.localStorage.alertOnCopyDuration = 
    document.getElementById("aocd").value;
  var els = document.getElementsByName("aocLocation");
  var i=0;
  for (i=0; i<els.length; i++) {
    if (els[i].checked) {
      window.localStorage.alertOnCopyLocation = els[i].value;
    }
  }
  window.localStorage.removeSelectionOnCopy = 
    document.getElementById("rsoc").checked ? true : false;
  window.localStorage.enableForTextBoxes = 
    document.getElementById("eitb").checked ? true : false;
  window.localStorage.enableForContentEditable = 
    document.getElementById("eice").checked ? true : false;
  window.localStorage.pasteOnMiddleClick = 
    document.getElementById("pomc").checked ? true : false;
  window.localStorage.copyAsPlainText = 
    document.getElementById("capt").checked ? true : false;
  window.localStorage.ctrlToDisable = 
    document.getElementById("dc").checked ? true : false;
  window.localStorage.ctrlToDisableKey = 
    document.getElementById("dck").value;
  window.localStorage.ctrlState = 
    document.getElementById("acs").value;
  window.localStorage.altToCopyAsLink = 
    document.getElementById("acal").checked ? true : false;
  window.localStorage.copyAsLink = 
    document.getElementById("cal").checked ? true : false;
  window.localStorage.includeUrl = 
    document.getElementById("iurl").checked ? true : false;
  window.localStorage.prependUrl = 
    document.getElementById("iurlp").checked ? true : false;
  //---------------------------------------------------------------------
  // Setting a localStorage var to empty causes it to get set to 
  // undefined so there is no way to tell if a user has set an empty
  // string.  Therefore, a placeholder is needed, so a single space is
  // used.
  //---------------------------------------------------------------------
  var text = document.getElementById("iurltext").value;
  window.localStorage.includeUrlText = 
    (text.length <= 0 || text === " ") ? " " : text;
  //---------------------------------------------------------------------
  window.localStorage.includeUrlCommentCountEnabled = 
    document.getElementById("iurlewc").checked ? true : false;

  var count = parseInt(document.getElementById("iurlcount").value,10);
  if (count < 1 || count > 99 || isNaN(count)) {
    window.localStorage.includeUrlCommentCount = 5;
  } else {
    window.localStorage.includeUrlCommentCount = count;
  }
}
  
function restoreOptions() {
  opts = {
    'alertOnCopy'                   : false,
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
    'copyAsLink'                    : false,
    'copyAsPlainText'               : false,
    'includeUrl'                    : false,
    'prependUrl'                    : false,
    'includeUrlText'                : '$crlfCopied from: $title - <$url>',
    'includeUrlCommentCountEnabled' : false,
    'includeUrlCommentCount'        : 5,
    'blackList'                     : blackListToObject(),
    'enableDebug'                   : false
  };

  if (!window.localStorage) {
    alert("Error local storage is unavailable.");
    window.close();
  }

  //---------------------------------------------------------------------------
  // Load options.  This will either populate defaults or pulled saved 
  // settings from localStorage.
  //---------------------------------------------------------------------------
  if (window.localStorage != null) {
    for (key in opts) {
      if (window.localStorage.hasOwnProperty(key)) {
	if (key === 'blackList') {
	  opts[key] = blackListToObject();
	} else if (
          key === 'alertOnCopySize' || key === 'alertOnCopyDuration' ||
          key === 'alertOnCopyLocation'
        ) {
	  opts[key] = window.localStorage[key];
	} else if (key === 'ctrlToDisableKey' || key === 'ctrlState') {
	  opts[key] = window.localStorage[key];
	} else if (key === 'includeUrlCommentCount') {
          opts[key] = parseInt(window.localStorage[key], 10);
	} else if (key === 'includeUrlText') {
	  opts[key] = window.localStorage[key];
	} else {
          opts[key] = window.localStorage[key] === "true" ? true : false;
	}
      }
    }
  }
  
  document.getElementById("debug").checked = opts.enableDebug;
  document.getElementById("aoc").checked = opts.alertOnCopy;
  document.getElementById("aocs").style.fontSize = opts.alertOnCopySize;
  document.getElementById("aocd").value = opts.alertOnCopyDuration;
  if (opts.alertOnCopyLocation === "topLeft") {
    document.getElementById("aocltl").checked = true;
  } else if (opts.alertOnCopyLocation === "topRight") {
    document.getElementById("aocltr").checked = true;
  } else if (opts.alertOnCopyLocation === "bottomLeft") {
    document.getElementById("aoclbl").checked = true;
  } else if (opts.alertOnCopyLocation === "bottomRight") {
    document.getElementById("aoclbr").checked = true;
  }
  document.getElementById("rsoc").checked = opts.removeSelectionOnCopy;
  document.getElementById("eitb").checked = opts.enableForTextBoxes;
  document.getElementById("eice").checked = opts.enableForContentEditable;
  document.getElementById("pomc").checked = opts.pasteOnMiddleClick;
  document.getElementById("capt").checked = opts.copyAsPlainText;
  document.getElementById("dc").checked = opts.ctrlToDisable;
  document.getElementById("dck").value = opts.ctrlToDisableKey;
  document.getElementById("acs").value = opts.ctrlState;
  document.getElementById("acal").checked = opts.altToCopyAsLink;
  document.getElementById("cal").checked = opts.copyAsLink;
  document.getElementById("iurl").checked = opts.includeUrl;
  document.getElementById("iurltext").value = opts.includeUrlText;
  document.getElementById("iurlewc").checked = 
    opts.includeUrlCommentCountEnabled;
  document.getElementById("iurlcount").value = opts.includeUrlCommentCount;
  if (document.getElementById("iurlewc").checked) {
    document.getElementById("iurlcount").disabled = false;
  } else {
    document.getElementById("iurlcount").disabled = true;
  }
  
  var v = opts.prependUrl;
  if (v === undefined || v === "false") {
    document.getElementById("iurlp").checked = false;
    document.getElementById("iurla").checked = true;
  } else {
    document.getElementById("iurlp").checked = true;
    document.getElementById("iurla").checked = false;
  }

  if (opts.includeUrl) {
    toggleDiv("diviurlap");
  }

  if (opts.alertOnCopy) {
    toggleDiv("aocSettings");
  }

  blackListToObject();
  handleExclusivity();
}

function initBlackListDiv(obl) {
  for (var n in obl) {
    if (obl[n]) {
      addBlackListRow(decodeURIComponent(n));
    }
  }
}

function addBlackListRow(text) {
  var blEl  = document.getElementById("blacklist");
  var frag  = document.createDocumentFragment();
  var divEl = document.createElement("div");
  frag.appendChild(divEl);
  divEl.className = "row";
  divEl.innerText = text;
  divEl.title = text;
  divEl.addEventListener('click', function() {
    if (this.className.match(/selected/)) {
      this.className = this.className.replace(/\s?selected/, "");
    } else {
      this.className += " selected";
    }
  });
  blEl.appendChild(frag);

  stripeList("div.row");
}

function stripeList(id) {
  els = document.querySelectorAll(id);
  len = els.length;

  for (var i=0; i<len; i++) {
    if (i % 2 === 0) {
      if (!els[i].className.match(/stripe/)) {
        els[i].className += " stripe";
      }
    } else {
      els[i].className = els[i].className.replace(/ stripe/, "");
    }
  }
}

function addToBlackList() {
  var overlay     = document.getElementById("overlay");
  var addErrorEl  = document.getElementById("addError")
  var domain      = document.getElementById("domaintext").value;
  var selectionD  = document.getElementById("blacklistDomain").checked;
  var encodedDomain, parsedDomain;

  addErrorEl.style.display = "none";

  if (selectionD) {
    if (domain.match(/^file:/)) {
      domain = domain.match(/^file:\/\/\/([^\/]+)/)[1];
      encodedDomain = encodeURIComponent(domain);
      if (!domain) {
        addErrorEl.innerText = "Error: speficied domain is invalid";
        addErrorEl.style.display = "block";
        return;
      }
    } else {
      if (!domain.match(/\./)) {
        addErrorEl.innerText = "Error: speficied domain is invalid";
        addErrorEl.style.display = "block";
        return;
      }

      domain = domain.replace(/.*:\/\//,"").replace(/\/.*/,"");
      encodedDomain = encodeURIComponent(domain);

      if (blackList[encodedDomain]) {
        addErrorEl.innerText = 
          "Error: speficied domain is already in the list";
        addErrorEl.style.display = "block";
        return;
      }
    } 
  } else {
    if (domain.match(/^file:/)) {
      encodedDomain = encodeURIComponent(domain);
      if (blackList[encodedDomain]) {
        addErrorEl.innerText = "Error: speficied page is already in the list";
        addErrorEl.style.display = "block";
        return;
      }
    } else {
      if (!domain.match(/\./) && !domain.match(/\//)) {
        addErrorEl.innerText = "Error: speficied page is invalid";
        addErrorEl.style.display = "block";
        return;
      }

      parsedDomain  = domain.replace(/.*:\/\//,"").replace(/\/.*/,"");
      encodedDomain = encodeURIComponent(domain);

      if (blackList[parsedDomain]) {
        addErrorEl.innerText = 
          "Error: speficied page's domain is already in the list";
        addErrorEl.style.display = "block";
        return;
      } else if (blackList[encodedDomain]) {
        addErrorEl.innerText = "Error: speficied page is already in the list";
        addErrorEl.style.display = "block";
        return;
      }
    }
  }

  addErrorEl.style.display = "none";

  blackList[encodedDomain] = 1;
  blackListToString(blackList);
  addBlackListRow(domain);
}

function removeSelectedFromBlackList() {
  var els           = document.querySelectorAll('div.selected');
  var len           = els.length;
  var domain        = "";
  var encodedDomain = "";

  for (var i=0; i<len; i++) {
    domain = els[i].innerText;
    encodedDomain = encodeURIComponent(domain);
    if (blackList[encodedDomain] && domain === "docs.google.com") {
      blackList[encodedDomain] = 0;
    } else if (blackList[encodedDomain]) {
      delete blackList[encodedDomain];
    }
    els[i].parentNode.removeChild(els[i]);
  }

  blackListToString(blackList);
  stripeList("div.row");
}

function blackListToObject() {
  chrome.extension.sendMessage({"type" : "getBlackList"}, function (resp) {
    var flag = (blackList.init) ? 1 : 0;
    blackList = resp;

    if (flag) {
      initBlackListDiv(blackList);
    }
  });

  return(blackList);
}

function blackListToString(oBlackList) {
  var blackList = {};

  chrome.extension.sendMessage({
    "type" : "writeBlackList", "blackList" : oBlackList}
  );
}

function validateCountValue() {
  var enabled = document.getElementById('iurlewc');
  var el      = document.getElementById('iurlcount');

  el.disabled = (enabled.checked) ? false : true;
}
  
function toggleDiv(id) {
  var el = document.getElementById(id);
  
  if (!el) {
    return
  }
  
  el.style.display = (el.style.display === "block") ? "none" : "block";
}

function handleExclusivity() {
  var cal  = document.getElementById('cal');
  var capt = document.getElementById('capt');
  var iurl = document.getElementById('iurl');

  if (cal.checked) {
    capt.disabled = true;
    capt.checked  = false;
    iurl.disabled = true;
    iurl.checked  = false;
  } else {
    capt.disabled = false;
    iurl.disabled = false;
  }

  if (capt.checked || iurl.checked) {
    cal.disabled = true;
    cal.checked  = false;
  } else {
    cal.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('smaller').addEventListener('click', function() {
      var el = document.getElementById('aocs');
      var fs = el.style.fontSize;
        //window.getComputedStyle(el, null).getPropertyValue('font-size');
      fs = parseFloat(fs);
      fs = fs - 1;
      el.style.fontSize = fs + 'px';
      window.localStorage.alertOnCopySize = fs + 'px';
    });
    document.getElementById('bigger').addEventListener('click', function() {
      var el = document.getElementById('aocs');
      var fs = el.style.fontSize 
      fs = parseFloat(fs);
      fs = fs + 1;
      el.style.fontSize = fs + 'px';
      window.localStorage.alertOnCopySize = fs + 'px';
    });
    document.getElementById('aocd').addEventListener('blur', function () {
      if (isNaN(document.getElementById("aocd").value)) {
        document.getElementById("aocd").value = .75;
        window.localStorage.alertOnCopyDuration = .75;
      }
    });
    document.getElementById('aoc').addEventListener('click', function() {
      toggleDiv('aocSettings');
    });
    document.getElementById('iurl').addEventListener('click', function() {
      toggleDiv('diviurlap');
    });
    document.getElementById('iurlewc').addEventListener(
      'click', validateCountValue
    );
    document.getElementById('cal').addEventListener(
      'click', handleExclusivity
    );
    document.getElementById('capt').addEventListener(
      'click', handleExclusivity
    );
    document.getElementById('iurl').addEventListener(
      'click', handleExclusivity
    );
    document.getElementById('iurlcount').addEventListener(
      'click', document.getElementById('iurlcount').select
    );
    document.getElementById('iurlcount').addEventListener(
      'blur', validateCountValue
    );
    document.getElementById('iurlcount').addEventListener(
      'keyup', validateCountValue
    );
    document.getElementById('iurltext').addEventListener(
      'click', document.getElementById('iurltext').select
    );
    document.getElementById('removeBtn').addEventListener(
      'click', removeSelectedFromBlackList
    );
    document.getElementById('addBtn').addEventListener(
      'click', function() {
        var overlay = document.getElementById("overlay");
        overlay.style.visibility = "visible";
        document.getElementById("domaintext").select();
    });
    document.getElementById('addOverlayBtn').addEventListener(
      'click', addToBlackList
    );
    document.getElementById("domaintext").addEventListener(
      'keyup', function(e) {
        if (e.keyCode == 13) {
          addToBlackList();
        }
    });
    document.getElementById('cancelOverlayBtn').addEventListener(
      'click', function() {
        document.getElementById("overlay").style.visibility = "hidden";
        document.getElementById("addError").style.display = "none";
    });

    var els = document.querySelectorAll(".autosave");
    var len = els.length;
    for (var i=0; i<len; i++) {
      if (els[i].nodeName === "SELECT") {
          els[i].addEventListener('change', saveOptions);
      } else {
        if (els[i].type === "text" || els[i].type === "tel") {
          els[i].addEventListener('keyup', saveOptions);
        } else {
          els[i].addEventListener('click', saveOptions);
        }
      }
    }

    restoreOptions();
});
