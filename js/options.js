function saveOptions() {
  if (!window.localStorage) {
    alert("Error local storage is unavailable.");
    //window.close();
  }

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

  if (!window.localStorage.blackList) {
    alert("Here");
    window.localStorage.blackList = {
      'docs.google.com' : 1
    };
  } else {
    window.localStorage.blackList = {};
    window.localStorage.blackList["docs.google.com"] = 1;
  }
  // Need to get blacklist div, and add rows from localStorage.blackList
  //var blEl = document.getElementById("blacklist");
  //var len  = window.localStorage.blackList.length;
  //var frag, divEl;
  //var lsbl = window.localStorage.blackList;
  //for (var i=0; i<len; i++) {
    //frag = window.localStorage.blackList[i];
    //blEl += '<div class="row">' + i + '</div>';
    /*
    frag  = document.createDocumentFragment();
    divEl = document.createElement("div");
    frag.appendChild(divEl);
    divEl.className = "row";
    divEl.innerHTML(i);
    blEl.appendChild(frag);
    */
  //}
}

function validateCountValue() {
  var enabled = document.getElementById('iurlewc');
  var el      = document.getElementById('iurlcount');
  var count   = parseInt(el.value,10);
  //var saveBtn = document.getElementById('saveButton');
  var text    = document.getElementById('commentCount');

  if (enabled.checked) {
    el.disabled = false;
    if (count < 1 || count > 99 || isNaN(count)) {
      //el.value = 5;
      //saveBtn.disabled = true;
      //text.className = "error";
    } else {
      //saveBtn.disabled = false;
      //text.className = "";
    }
  } else {
    el.disabled = true;
    //saveBtn.disabled = false;
    //text.className = "";
  }
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
    restoreOptions();
    //$("ul.tabs").tabs("div.panes > div");

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
    //document.getElementById('saveButton').addEventListener(
    //  'click', saveOptions
    //);
    //
    var els = document.querySelectorAll(".autosave");
    var len = els.length;
    for (var i=0; i<len; i++) {
      if (els[i].type === "text") {
        els[i].addEventListener('change', saveOptions);
      } else {
        els[i].addEventListener('click', saveOptions);
      }
    }

    els = document.querySelectorAll("div.row");
    len = els.length;
    for (var i=0; i<len; i++) {
      els[i].addEventListener('click', function() {
          if (this.className.match(/selected/)) {
            this.className = this.className.replace(/\s?selected/, '');
          } else {
            this.className += " selected";
          }
      });
    }
});
