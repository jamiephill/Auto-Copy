"use strict"

const debug = (...args) => {
  if (opts.enableDebug) {
    args.unshift('Auto-Copy (Settings):');
    console.log.apply(null, args);
  }
};

let opts = {
  'blockList' : {},
};

chrome.storage.onChanged.addListener((obj, area) => {
  if (area === 'sync') {
    Object.keys(obj).forEach(key => {
      opts[key] = obj[key].newValue;
      restoreOptions();
      initBlockListDiv();
      disableModifier();
    });
    debug(`sync storage changed`, obj);
  }
});

function showLoading() {
  document.getElementById("loadingOverlay").style.display = 'block';
}

function hideLoading() {
  document.getElementById("loadingOverlay").style.display = 'none';
}

function saveOptions() {
  const el = document.getElementById(this.id);
  let name = this.id
  let value;

  if (
    this.id === 'alertOnCopyBottomLeft' ||
    this.id === 'alertOnCopyBottomRight' ||
    this.id === 'alertOnCopyTopLeft' ||
    this.id === 'alertOnCopyTopRight'
  ) {
    name = 'alertOnCopyLocation';
    value = el.value;
  } else if (
    this.id === 'includeCommentPrepend' ||
    this.id === 'includeCommentPostpend'
  ) {
    name = 'includeCommentPrepend';
    value = document.getElementById(name).checked;
  } else {
    if (
      el && el.tagName.toLowerCase() === 'input' ||
      el && el.tagName.toLowerCase() === 'select'
    ) {
      if (
        el.type.toLowerCase() === 'checkbox' ||
        el.type.toLowerCase() === 'radio'
      ) {
        value = el.checked;
      } else if (
        el.type.toLowerCase() === 'tel' ||
        el.type.toLowerCase() === 'text' ||
        el.type.match(/^select/i)
      ) {
        value = el.value;
      }
    }
  }

  let obj = {};
  obj[name] = value;

  //chrome.storage.local.set(obj);
  chrome.storage.sync.set(obj).then(() => {
    debug(`Saved options ${this.id} = ${value}`);
  });
}

function restoreOptions() {
  Object.keys(opts).forEach(key => {
    if (key === 'alertOnCopyLocation') {
      document.getElementById('alertOnCopy' + opts[key]).checked = true;
      return true;
    }
    if (key === 'alertOnCopySize') {
      document.getElementById("alertOnCopySize").style.fontSize =
        opts[key];
      return true;
    }

    const el = document.getElementById(key);
    if (
      el && el.tagName.toLowerCase() === 'input' ||
      el && el.tagName.toLowerCase() === 'select'
    ) {
      if (
        el.type.toLowerCase() === 'checkbox' ||
        el.type.toLowerCase() === 'radio'
      ) {
        el.checked = opts[key];
      } else if (
        el.type.toLowerCase() === 'tel' ||
        el.type.toLowerCase() === 'text' ||
        el.type.match(/^select/i)
      ) {
        el.value = opts[key];
      }
    }
  });

  if (opts.includeCommentWordCountEnabled) {
    document.getElementById("includeCommentWordCount").disabled = false;
  } else {
    document.getElementById("includeCommentWordCount").disabled = true;
  }

  if (opts.includeCommentPrepend) {
    document.getElementById("includeCommentPrepend").checked = true;
    document.getElementById("includeCommentPostpend").checked = false;
  } else {
    document.getElementById("includeCommentPrepend").checked = false;
    document.getElementById("includeCommentPostpend").checked = true;
  }

  showHideDiv(opts.alertOnCopy, 'alertOnCopySettings');
  showHideDiv(opts.nativeAlertOnCopy, 'nativeAlertOnCopySettings');
  showHideDiv(opts.includeComment, 'includeCommentSettings');
  showHideDiv(opts.copyDelay, 'copyDelaySettings');
  showHideDiv(opts.clearClipboard, 'clearClipboardSettings');

  disableModifier();
  handleExclusivity();
}

function disableModifier() {
  let els = {};
  document.querySelectorAll('.modifierKey').forEach((item) => {
    els[item.options[item.selectedIndex].value] = item;
    [].forEach.call(item.options, (option) => {
      option.removeAttribute('disabled');
    });

  });

  for (let [k, v] of Object.entries(els)) {
    document.querySelectorAll('.modifierKey').forEach((item) => {
      if (v.id === item.id) {
        return;
      }
      let option = item.options.namedItem(k);
      if (option) {
        option.setAttribute('disabled', '');
      }
    });
  }
}

function initBlockListDiv() {
  const els =
    document.getElementById('blocklist').getElementsByClassName('row');
  Object.keys(els).forEach(el => {
    if (els[el] && els[el].remove) {
      els[el].remove();
    }
  });
  Object.keys(opts.blockList).forEach(key => {
    if (opts.blockList[key]) {
      addBlockListRow(decodeURIComponent(key));
    }
  });
  stripeList("div.row");
}

function addBlockListRow(text) {
  const blEl  = document.getElementById("blocklist");
  const frag  = document.createDocumentFragment();
  const divEl = document.createElement("div");
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
  const els = document.querySelectorAll(id);
  const len = els.length;

  for (let i=0; i<len; i++) {
    if (i % 2 === 0) {
      if (!els[i].className.match(/stripe/)) {
        els[i].className += " stripe";
      }
    } else {
      els[i].className = els[i].className.replace(/ stripe/, "");
    }
  }
}

function updateBlockList() {
  //chrome.storage.local.set({ 'blockList' : opts.blockList });
  chrome.storage.sync.set({ 'blockList' : opts.blockList }).then(() => {
    debug(`Saved options blockList= `, opts.blockList);
  });
}

function addToBlockList() {
  let addErrorEl  = document.getElementById("addError")
  let domain      = document.getElementById("domaintext").value;
  let selectionD  = document.getElementById("blocklistDomain").checked;
  let encodedDomain, parsedDomain;

  addErrorEl.style.display = "none";

  if (selectionD) {
    if (domain.match(/^file:/)) {
      domain = domain.match(/^file:\/\/\/([^\/]+)/)[1];
      encodedDomain = encodeURIComponent(domain);
      if (!domain) {
        addErrorEl.innerText = "Error: domain is invalid";
        addErrorEl.style.display = "block";
        return;
      }
    } else {
      if (!domain.match(/\./)) {
        addErrorEl.innerText = "Error: domain is invalid";
        addErrorEl.style.display = "block";
        return;
      }

      domain = domain.replace(/.*:\/\//,"").replace(/\/.*/,"");
      encodedDomain = encodeURIComponent(domain);

      if (opts.blockList[encodedDomain]) {
        addErrorEl.innerText =
          "Error: domain is already in the list";
        addErrorEl.style.display = "block";
        return;
      }
    }
  } else {
    if (domain.match(/^file:/)) {
      encodedDomain = encodeURIComponent(domain);
      if (opts.blockList[encodedDomain]) {
        addErrorEl.innerText = "Error: page is already in the list";
        addErrorEl.style.display = "block";
        return;
      }
    } else {
      if (!domain.match(/\./) && !domain.match(/\//)) {
        addErrorEl.innerText = "Error: page is invalid";
        addErrorEl.style.display = "block";
        return;
      }

      parsedDomain  = domain.replace(/.*:\/\//,"").replace(/\/.*/,"");
      encodedDomain = encodeURIComponent(domain);

      if (opts.blockList[parsedDomain]) {
        addErrorEl.innerText =
          "Error: page's domain is already in the list";
        addErrorEl.style.display = "block";
        return;
      } else if (opts.blockList[encodedDomain]) {
        addErrorEl.innerText = "Error: page is already in the list";
        addErrorEl.style.display = "block";
        return;
      }
    }
  }

  document.getElementById("domaintext").value = '';

  addErrorEl.style.display = "none";

  opts.blockList[encodedDomain] = 1;
  updateBlockList();
}

function removeSelectedFromBlockList() {
  const els = document.querySelectorAll('div.selected');
  const len = els.length;

  for (let i=0; i<len; i++) {
    let domain = els[i].innerText;
    let encodedDomain = encodeURIComponent(domain);
    if (opts.blockList[encodedDomain] && domain === "docs.google.com") {
      opts.blockList[encodedDomain] = 0;
    } else if (opts.blockList[encodedDomain]) {
      debug(`removing ${encodedDomain} from blockList`);
      delete opts.blockList[encodedDomain];
    }
    els[i].parentNode.removeChild(els[i]);
  }

  updateBlockList();
}

function showHideDiv(state, id) {
  const el = document.getElementById(id);

  if (!el) {
    return
  }

  el.style.display = (state) ? 'block' : 'none';
}

function handleExclusivity() {
  const cal  = document.getElementById('copyAsLink');
  const capt = document.getElementById('copyAsPlainText');
  const iurl = document.getElementById('includeComment');

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
  showLoading();

  const validateNumberValue = (id, defVal) => {
    const el = document.getElementById(id);
    if (isNaN(el.value) || el.value <= 0) {
      alert('Value is invalid resetting to defaults');
      el.value = defVal;
      saveOptions.apply(el);
    }
  };

  const processAlertOnCopySizeChange = (op) => {
    const el = document.getElementById('alertOnCopySize');
    let fs = el.style.fontSize;
    fs = parseFloat(fs);
    fs = (op === 'reduce') ? fs - 1 : fs + 1;
    el.style.fontSize = fs + 'px';
    //chrome.storage.local.set({ 'alertOnCopySize' : fs + 'px' });
    chrome.storage.sync.set({ 'alertOnCopySize' : fs + 'px' }).then(() => {
      debug(`Saved options alertOnCopySize = ${fs}px`);
    });
  };

  document.getElementById('smaller').addEventListener('click', () => {
    processAlertOnCopySizeChange('reduce');
  });

  document.getElementById('bigger').addEventListener('click', () => {
    processAlertOnCopySizeChange('increase');
  });

  document.getElementById('alertOnCopyDuration').addEventListener(
    'blur', () => {
      validateNumberValue('alertOnCopyDuration', .75);
    }
  );
  document.getElementById('includeCommentWordCount').addEventListener(
    'blur', () => {
      validateNumberValue('includeCommentWordCount', 5);
    }
  );
  document.getElementById('includeCommentWordCountEnabled').addEventListener(
    'click', () => {
      validateNumberValue('includeCommentWordCount', 5);
    }
  );
  document.getElementById('copyDelayWait').addEventListener('blur', () => {
    validateNumberValue('copyDelayWait', 5);
  });
  document.getElementById('copyDelay').addEventListener('click', () => {
    validateNumberValue('copyDelayWait', 5);
  });
  document.getElementById('clearClipboardWait').addEventListener('blur', () => {
    validateNumberValue('clearClipboardWait', 5);
  });
  document.getElementById('clearClipboard').addEventListener('click', () => {
    validateNumberValue('clearClipboardWait', 5);
  });

  document.getElementById('copyAsLink').addEventListener(
    'click', handleExclusivity
  );
  document.getElementById('copyAsPlainText').addEventListener(
    'click', handleExclusivity
  );
  document.getElementById('includeComment').addEventListener(
    'click', handleExclusivity
  );
  document.getElementById('includeCommentWordCount').addEventListener(
    'click', document.getElementById('includeCommentWordCount').select
  );
  document.getElementById('includeCommentFormat').addEventListener(
    'click', document.getElementById('includeCommentFormat').select
  );
  document.getElementById('removeBtn').addEventListener(
    'click', removeSelectedFromBlockList
  );
  document.getElementById('addBtn').addEventListener('click', () => {
    const overlay = document.getElementById("overlay");
    overlay.style.visibility = "visible";
    document.getElementById("domaintext").select();
  });
  document.getElementById('addOverlayBtn').addEventListener(
    'click', addToBlockList
  );
  document.getElementById("domaintext").addEventListener('keyup', (e) => {
    if (e.keyCode == 13) {
      addToBlockList();
    }
  });
  document.getElementById('cancelOverlayBtn').addEventListener('click', () => {
    document.getElementById("overlay").style.visibility = "hidden";
    document.getElementById("addError").style.display = "none";
  });

  const els = document.querySelectorAll(".autosave");
  const len = els.length;
  for (let i=0; i<len; i++) {
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

  chrome.storage.sync.get().then(obj => {
    Object.keys(obj).forEach(key => {
      opts[key] = obj[key];
    })
    restoreOptions();
    initBlockListDiv();
    hideLoading();
  });
});
