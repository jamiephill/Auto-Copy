var blackList = {
  "init" : true
};

function saveOptions() {
  if (!window.localStorage) {
    alert("Error local storage is unavailable.");
    //window.close();
  }

  console.log("in save");

  window.localStorage.enableForTextBoxes = 
    document.getElementById("eitb").checked ? true : false;
  window.localStorage.pasteOnMiddleClick = 
    document.getElementById("pomc").checked ? true : false;
  //---------------------------------------------------------------------
  // Working around an issue in Chrome 6
  //---------------------------------------------------------------------
  //window.localStorage.copyAsPlainText = 
  //  document.getElementById("capt").checked ? true : false;
  window.localStorage.copyAsPlainText = true;
  //---------------------------------------------------------------------
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
    //(text.length <= 0 || text === " ") ? " " : text + " ";
  //---------------------------------------------------------------------
  window.localStorage.includeUrlCommentCountEnabled = 
    document.getElementById("iurlewc").checked ? true : false;

  var count = parseInt(document.getElementById("iurlcount").value,10);
  if (count < 1 || count > 99 || isNaN(count)) {
    window.localStorage.includeUrlCommentCount = 5;
  } else {
    window.localStorage.includeUrlCommentCount = count;
  }

  //window.close();
}
  
function restoreOptions() {
  if (!window.localStorage) {
    alert("Error local storage is unavailable.");
    window.close();
  }
  
  document.getElementById("eitb").checked = 
    (window.localStorage.enableForTextBoxes === "true") ? true : false;
  document.getElementById("pomc").checked = 
    (window.localStorage.pasteOnMiddleClick === "true") ? true : false;
  //---------------------------------------------------------------------
  // Working around an issue in Chrome 6
  //---------------------------------------------------------------------
  //document.getElementById("capt").checked = 
  //  (window.localStorage.copyAsPlainText === "true") ? true : false;
  document.getElementById("capt").checked = true;
  //---------------------------------------------------------------------
  document.getElementById("iurl").checked = 
    (window.localStorage.includeUrl === "true") ? true : false;
  document.getElementById("iurltext").value = 
    window.localStorage.includeUrlText || 
      "$crlfCopied from: $title - <$url>";
  document.getElementById("iurlewc").checked = 
    (window.localStorage.includeUrlCommentCountEnabled === "true") ? 
      true : false;
  document.getElementById("iurlcount").value = 
    window.localStorage.includeUrlCommentCount || 5;

  if (document.getElementById("iurlewc").checked) {
    document.getElementById("iurlcount").disabled = false;
  } else {
    document.getElementById("iurlcount").disabled = true;
  }
  
  var v = window.localStorage.prependUrl;
  if (v === undefined || v === "false") {
    document.getElementById("iurlp").checked = false;
    document.getElementById("iurla").checked = true;
  } else {
    document.getElementById("iurlp").checked = true;
    document.getElementById("iurla").checked = false;
  }

  if (
    window.localStorage.includeUrl &&
    window.localStorage.includeUrl === "true"
  ) {
    toggleDiv("diviurlap");
  }

  blackListToObject();
}

function initBlackListDiv(obl) {
  for (var n in obl) {
    addBlackListRow(n);
  }
}

function addBlackListRow(text) {
  var blEl  = document.getElementById("blacklist");
  var frag  = document.createDocumentFragment();
  var divEl = document.createElement("div");
  frag.appendChild(divEl);
  divEl.className = "row";
  divEl.innerText = text;
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
  var overlay    = document.getElementById("overlay");
  var addErrorEl = document.getElementById("addError")
  var domain     = document.getElementById("domaintext").value;

  addErrorEl.style.visibility = "hidden";

  if (!domain.match(/\./)) {
    addErrorEl.innerText = "Error: speficied domain is invalid";
    addErrorEl.style.visibility = "visible";
    return;
  }

  domain = domain.replace(/.*:\/\//,"").replace(/\/.*/,"");

  if (blackList[domain]) {
    addErrorEl.innerText = "Error: speficied domain is already in the list";
    addErrorEl.style.visibility = "visible";
    return;
  }

  overlay.style.visibility = "hidden";

  blackList[domain] = 1;
  blackListToString(blackList);

  addBlackListRow(domain);
}

function removeSelectedFromBlackList() {
  var els    = document.querySelectorAll('div.selected');
  var len    = els.length;
  var domain = "";

  for (var i=0; i<len; i++) {
    domain = els[i].innerText;
    if (blackList[domain] && domain === "docs.google.com") {
      blackList[domain] = 0;
    } else if (blackList[domain]) {
      delete blackList[domain];
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
  
function toggleCapt() {
  var capt = document.getElementById('capt');
  var iurl = document.getElementById('iurl').checked;

  //---------------------------------------------------------------------
  // Working around an issue in Chrome 6
  //---------------------------------------------------------------------
  capt.checked = true;
  return;
  //---------------------------------------------------------------------

  if (iurl) {
    capt.checked = true;
  } else {
    capt.checked = 
      (window.localStorage.copyAsPlainText === "true") ? true : false;
  }
}

function fixUpIncludeUrl() {
  var capt    = document.getElementById('capt').checked;
  var iurl    = document.getElementById('iurl');
  var iurldiv = document.getElementById('diviurlap');

  if (capt) {
    iurl.checked = 
      (window.localStorage.includeUrl === "true") ? true : false;
    if (iurl.checked) {
      iurldiv.style.display = 'block';
    }
  } else {
    iurl.checked = false;
    iurldiv.style.display = 'none';
  }
}

function toggleDiv(id) {
  var el = document.getElementById(id);
  
  if (!el) {
    return
  }
  
  el.style.display = (el.style.display === "block") ? "none" : "block";
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('iurl').addEventListener('click', function() {
      toggleDiv('diviurlap'); toggleCapt();
    });
    document.getElementById('iurlewc').addEventListener(
      'click', validateCountValue
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
        document.getElementById("addError").style.visibility = "hidden";
    });

    var els = document.querySelectorAll(".autosave");
    var len = els.length;
    for (var i=0; i<len; i++) {
      if (els[i].type === "text") {
        els[i].addEventListener('keyup', saveOptions);
      } else {
        els[i].addEventListener('click', saveOptions);
      }
    }

    restoreOptions();
});
