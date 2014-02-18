var tabutils = {
  init: function() {
    this._tabEventListeners.init();

    this._openUILinkInTab();
    this._openLinkInTab();

    this._tabOpeningOptions();
    this._tabClosingOptions();

    this._unreadTab();

    window.addEventListener("load", this, false);
    window.addEventListener("unload", this, false);
  },

  onload: function() {
    this._miscFeatures();
    this._undoCloseTabButton();
    this._tabPrefObserver.init();

    this._firstRun();
  },

  setAttribute: function(aTab, aAttr, aVal) {
    aTab.setAttribute(aAttr, aVal);
    this._ss.setTabValue(aTab, aAttr, aVal);
  },

  removeAttribute: function(aTab, aAttr) {
    aTab.removeAttribute(aAttr);
    this._ss.deleteTabValue(aTab, aAttr);
  },

  getDomainFromURI: function(aURI, aAllowThirdPartyFixup) {
    try {
      if (typeof aURI == "string")
        aURI = Services.nsIURIFixup.createFixupURI(aURI, aAllowThirdPartyFixup);
    }
    catch (e) {}

    try {
      return Services.eTLD.getBaseDomain(aURI);
    }
    catch (e) {}

    try {
      return aURI.host;
    }
    catch (e) {
      return aURI.spec;
    }
  },

  get _styleSheet() {
    for (let sheet of Array.slice(document.styleSheets)) {
      if (sheet.href == "chrome://tabutils/skin/tabutils.css") {
        delete this._styleSheet;
        return this._styleSheet = sheet;
      }
    }
    return document.styleSheets[0];
  },

  insertRule: function(rule) {
    var ss = this._styleSheet;
    return ss.cssRules[ss.insertRule(rule, ss.cssRules.length)];
  },

  _eventListeners: [],
  addEventListener: function() {
    document.addEventListener.apply(arguments[0], Array.slice(arguments, 1));
    this._eventListeners.push(arguments);
  },

  onunload: function() {
    this._eventListeners.forEach(function(args) document.removeEventListener.apply(args[0], Array.slice(args, 1)));
  },

  handleEvent: function(event) {
    window.removeEventListener(event.type, this, false);
    switch (event.type) {
      case "DOMContentLoaded": this.init();break;
      case "load": this.onload();break;
      case "unload": this.onunload();break;
    }
  }
};
window.addEventListener("DOMContentLoaded", tabutils, false);

[
  ["@mozilla.org/browser/sessionstore;1", "nsISessionStore", "_ss", tabutils], // Bug 898732 [Fx26]
  ["@mozilla.org/docshell/urifixup;1", "nsIURIFixup"], // Bug 802026 [Fx20]
].forEach(function([aContract, aInterface, aName, aObject])
  XPCOMUtils.defineLazyServiceGetter(aObject || Services, aName || aInterface, aContract, aInterface)
);

tabutils._tabEventListeners = {
  init: function() {
    TU_hookCode("gBrowser.addTab",
      ["{", "if (!aURI) aURI = 'about:blank';"],
      [/(?=var evt)/, function() {
        t.arguments = {
          aURI: aURI,
          aReferrerURI: aReferrerURI,
          aRelatedToCurrent: aRelatedToCurrent
        };
      }]
    );

    gBrowser.onTabOpen = function onTabOpen(aTab) {};
    gBrowser.onTabMove = function onTabMove(aTab) {};
    gBrowser.onTabClose = function onTabClose(aTab) {};
    gBrowser.onTabSelect = function onTabSelect(aTab) {};
    gBrowser.onTabRestoring = function onTabRestoring(aTab) {var ss = tabutils._ss;};
    gBrowser.onTabRestored = function onTabRestored(aTab) {var ss = tabutils._ss;};
    gBrowser.onTabClosing = function onTabClosing(aTab) {var ss = tabutils._ss;};

    [
      "TabOpen", "TabMove", "TabClose", "TabSelect",
      "SSTabRestoring", "SSTabRestored", "SSTabClosing"
    ].forEach(function(type) {
      tabutils.addEventListener(gBrowser.mTabContainer, type, this, false);
    }, this);
  },

  handleEvent: function(event) {
    switch (event.type) {
      case "TabOpen": gBrowser.onTabOpen(event.target);break;
      case "TabMove": gBrowser.onTabMove(event.target, event);break;
      case "TabClose": gBrowser.onTabClose(event.target);break;
      case "TabSelect": gBrowser.onTabSelect(event.target);break;
      case "SSTabRestoring": gBrowser.onTabRestoring(event.target);break;
      case "SSTabRestored": gBrowser.onTabRestored(event.target);break;
      case "SSTabClosing": gBrowser.onTabClosing(event.target);break;
    }
  }
};

tabutils._openUILinkInTab = function() {

  //主页
  TU_hookCode("BrowserGoHome", "browser.tabs.loadBookmarksInBackground", "extensions.tabutils.loadHomepageInBackground");

  //地址栏回车键
  TU_hookCode("gURLBar.handleCommand",
    [/((aTriggeringEvent)\s*&&\s*(aTriggeringEvent.altKey))(?![\s\S]*\1)/, "let (newTabPref = TU_getPref('extensions.tabutils.openUrlInTab', true)) ($1 || newTabPref) && !(($2 ? $3 : false) && newTabPref && TU_getPref('extensions.tabutils.invertAlt', true))"],
    [/(?=.*openUILinkIn.*)/, function() {
      params.inBackground = TU_getPref('extensions.tabutils.loadUrlInBackground', false);
      params.disallowInheritPrincipal = !mayInheritPrincipal;
      params.event = aTriggeringEvent || {};
    }],
    [/.*loadURIWithFlags.*(?=[\s\S]*(let params[\s\S]*openUILinkIn.*))/, function(s, s1) s1.replace("where", '"current"')],
    ["aTriggeringEvent.preventDefault();", ""],
    ["aTriggeringEvent.stopPropagation();", ""]
  );
  TU_hookCode("openLinkIn", /(?=let uriObj)/, "w.gURLBar.handleRevert();");

  //搜索栏回车键
  if (BrowserSearch.searchBar)
  TU_hookCode("BrowserSearch.searchBar.handleSearchCommand",
    [/(\(aEvent && aEvent.altKey\)) \^ (newTabPref)/, "($1 || $2) && !($1 && $2 && TU_getPref('extensions.tabutils.invertAlt', true)) && !isTabEmpty(gBrowser.selectedTab)"],
    [/"tab"/, "TU_getPref('extensions.tabutils.loadSearchInBackground', false) ? 'background' : 'foreground'"]
  );
};

tabutils._openLinkInTab = function() {

  //强制在新标签页打开所有链接
  TU_hookCode("contentAreaClick", /if[^{}]*event.button == 0[^{}]*{([^{}]|{[^{}]*}|{([^{}]|{[^{}]*})*})*(?=})/, "$&" + (function() {
    if (tabutils.gOpenLinkInTab && !href.startsWith("javascript:")) {
      openNewTabWith(href, linkNode.ownerDocument, null, event, false);
      event.preventDefault();
      return;
    }
  }).toString().replace(/^.*{|}$/g, ""));

  TU_hookCode("nsBrowserAccess.prototype.openURI", /(?=switch \(aWhere\))/, function() {
    if (tabutils.gOpenLinkInTab && !isExternal)
      aWhere = Ci.nsIBrowserDOMWindow.OPEN_NEWTAB;
  });

  //强制在新标签页打开外部链接
  TU_hookCode("contentAreaClick", /if[^{}]*event.button == 0[^{}]*{([^{}]|{[^{}]*}|{([^{}]|{[^{}]*})*})*(?=})/, "$&" + (function() {
    if (/^(https?|ftp)/.test(href) && TU_getPref("extensions.tabutils.openExternalInTab", false)) {
      let ourDomain = tabutils.getDomainFromURI(linkNode.ownerDocument.documentURIObject);
      let otherDomain = tabutils.getDomainFromURI(href);
      if (ourDomain != otherDomain) {
        openNewTabWith(href, linkNode.ownerDocument, null, event, false);
        event.preventDefault();
        return;
      }
    }
  }).toString().replace(/^.*{|}$/g, ""));

  //外来链接

  // L-click
  TU_hookCode("contentAreaClick", /.*handleLinkClick.*/g, "if (event.button || event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) $&");
  TU_hookCode("handleLinkClick", "current", "null");
};

tabutils._tabOpeningOptions = function() {

  //新建标签页时利用已有空白标签页
  TU_hookCode("gBrowser.addTab",
    [/if \(arguments.length == 2[^{}]*\) {[^{}]*}/, "$&" + (function() {
      if (!isBlankPageURL(aURI)) {
        let t = aFromExternal && isTabEmpty(this.selectedTab) && this.selectedTab || this.getBlankTab();
        if (t) {
          let b = this.getBrowserForTab(t);
          return t;
        }
      }
    }).toString().replace(/^.*{|}$/g, "")],
    [/(?=return t;)/, gBrowser.addTab.toString().match(/var (uriIsBlankPage|uriIsNotAboutBlank|uriIsAboutBlank).*|let docShellsSwapped[\s\S]*(?=\n.*docShellsSwapped.*)|if \((uriIsNotAboutBlank|.*uriIsAboutBlank)\) {([^{}]|{[^{}]*})*}/g).join("\n")] // Bug 716108 [Fx16]
  );

  gBrowser.getBlankTab = function getBlankTab() {
    return this.isBlankTab(this.mCurrentTab) ? this.mCurrentTab : null;
  };

  gBrowser.isBlankTab = function isBlankTab(aTab) {
    return this.isBlankBrowser(aTab.linkedBrowser)
        && ["busy", "pending"].every(function(aAttr) !aTab.hasAttribute(aAttr));
  };

  gBrowser.isBlankBrowser = function isBlankBrowser(aBrowser) {
    return (!aBrowser.currentURI || isBlankPageURL(aBrowser.currentURI.spec))
        && (!aBrowser.sessionHistory || aBrowser.sessionHistory.count < 2)
        && (!aBrowser.webProgress || !aBrowser.webProgress.isLoadingDocument);
  };
  TU_hookCode("isBlankPageURL", 'aURL == "about:blank"', "gInitialPages.indexOf(aURL) > -1");

  //在当前标签页的右侧打开新标签页
  //连续打开后台标签时保持原有顺序
  TU_hookCode("gBrowser.addTab",
    [/\S*insertRelatedAfterCurrent\S*(?=\))/, "false"],
    [/(?=(return t;)(?![\s\S]*\1))/, function() {
      if (t.arguments.caller != "ssi_restoreWindow" && !t.pinned && function() {
        switch (TU_getPref("extensions.tabutils.openTabNext", 1)) {
          case 1: return true; //All
          case 2: return aRelatedToCurrent != false; //All but New Tab
          case 3: return aRelatedToCurrent == null ? aReferrerURI : aRelatedToCurrent; //None but Links
          default: return false; //None
        }
      }()) {
        let lastRelatedTab = this.mCurrentTab;
        if (TU_getPref("extensions.tabutils.openTabNext.keepOrder", true)) {
          let panelId = this.mCurrentTab.linkedPanel;
          for (let i = this.mTabs.length - 1; i >= 0; i--) {
            if (this.mTabs[i].getAttribute("opener") == panelId) {
              lastRelatedTab = this.mTabs[i];
              break;
            }
          }
        }
        this.moveTabTo(t, t._tPos > lastRelatedTab._tPos ? lastRelatedTab._tPos + 1 : lastRelatedTab._tPos);
        t.setAttribute("opener", this.mCurrentTab.linkedPanel);
      }
    }]
  );

  TU_hookCode("gBrowser.moveTabTo", "{", function() {
    aIndex = Math.min(Math.max(0, aIndex), this.mTabs.length - 1);
    if (aIndex == aTab._tPos)
      return;
  });

  //新建标签页
  if (BrowserOpenTab.name == "BrowserOpenTab") { //Compatibility with Speed Dial
    TU_hookCode("BrowserOpenTab",
      [/.*openUILinkIn\((.*)\)/, function(s, s1) s.replace(s1, (
        s1 = s1.split(","),
        s1.push("{inBackground: TU_getPref('extensions.tabutils.loadNewInBackground', false)}"),
        s1.push("{relatedToCurrent: TU_getPref('extensions.tabutils.openTabNext', 1) == 1}"),
        s1.join().replace("},{", ",")
      ))] // Bug 490225 [Fx11]
    );
  }
  TU_hookCode("isBlankPageURL", "aURL == BROWSER_NEW_TAB_URL", "$& && TU_getPref('extensions.tabutils.markNewAsBlank', true)");
  TU_hookCode("gBrowser._beginRemoveTab", /.*addTab.*/, "BrowserOpenTab();");
  TU_hookCode("gBrowser._endRemoveTab", /.*addTab.*/, "BrowserOpenTab();");

  gBrowser.getLastOpenedTab = function getLastOpenedTab() {
    return this.mTabContainer.getElementsByAttribute("linkedpanel", this.mPanelContainer.lastChild.id)[0];
  };

  //复制标签页
  TU_hookCode("gBrowser.duplicateTab",
    [/return/g, "var tab ="],
    ["}", function() {
      if (["_onDrop", "onxbldrop", "duplicateTabIn"].indexOf(arguments.callee.caller.name) == -1) {
        if (TU_getPref("extensions.tabutils.openDuplicateNext", true))
          this.moveTabTo(tab, tab._tPos > aTab._tPos ? aTab._tPos + 1 : aTab._tPos);
        if (!TU_getPref("extensions.tabutils.loadDuplicateInBackground", false))
          this.selectedTab = tab;
      }
      return tab;
    }]
  );

  //撤销关闭标签页
  TU_hookCode("gBrowser.moveTabTo", "{", function() {
    if (arguments.callee.caller.name == "ssi_undoCloseTab"
        && !TU_getPref("extensions.tabutils.restoreOriginalPosition", true))
      return;
  });
};

tabutils._tabClosingOptions = function() {

  //关闭标签页时选择左侧/右侧/第一个/最后一个标签
  gBrowser._tabsToSelect = function _tabsToSelect(aTabs) {
    if (!aTabs)
      aTabs = this.visibleTabs;

    let tabs = new Array(this.mTabs.length);
    for (let tab of aTabs)
      tabs[tab._tPos] = tab;

    var aTab = this.mCurrentTab;
    var seenTabs = [];
    seenTabs[aTab._tPos] = true;

    var selectOnClose = TU_getPref("extensions.tabutils.selectOnClose", 0);
    if (selectOnClose & 0x80) for (let tab of _tabs_(0x80)) yield tab;
    if (selectOnClose & 0x40) for (let tab of _tabs_(0x40)) yield tab;
    if (selectOnClose & 0x20) for (let tab of _tabs_(0x20)) yield tab;
    if (selectOnClose & 0x03) for (let tab of _tabs_(selectOnClose & 0x03)) yield tab;
    if (selectOnClose & 0x1c) for (let tab of _tabs_(selectOnClose & 0x1c)) yield tab;

    function _tabs_(selectOnClose) {
      for (let tab of __tabs__(selectOnClose)) {
        if (!(tab._tPos in seenTabs)) {
          seenTabs[tab._tPos] = true;
          yield tab;
        }
      }
    }

    function __tabs__(selectOnClose) {
      switch (selectOnClose) {
        case 1: //Left
          for (let i = aTab._tPos - 1; i >= 0; i--) if (i in tabs) yield tabs[i];
          break;
        case 2: //Right
          for (let i = aTab._tPos + 1; i < tabs.length; i++) if (i in tabs) yield tabs[i];
          break;
        case 4: //First
          for (let i = 0; i < tabs.length; i++) if (i in tabs) yield tabs[i];
          break;
        case 8: //Last
          for (let i = tabs.length - 1; i >= 0; i--) if (i in tabs) yield tabs[i];
          break;
        case 0x10: //Last selected
          var tabHistory = gBrowser.mTabContainer._tabHistory;
          for (let i = tabHistory.length - 1; i >= 0; i--) if (tabHistory[i]._tPos in tabs) yield tabHistory[i];
          break;
        case 0x20: //Unread
          for (let tab of __tabs__()) if (tab.hasAttribute("unread")) yield tab;
          break;
        case 0x40: //Related
          for (let tab of __tabs__()) if (gBrowser.isRelatedTab(tab, aTab)) yield tab;
          break;
        case 0x80: //Unread Related
          for (let tab of __tabs__(0x20)) if (gBrowser.isRelatedTab(tab, aTab)) yield tab;
          break;
        case undefined: //Right or Rightmost
          for (let i = aTab._tPos + 1; i < tabs.length; i++) if (i in tabs) yield tabs[i];
          for (let i = aTab._tPos - 1; i >= 0; i--) if (i in tabs) yield tabs[i];
          break;
      }
    }
  };

  gBrowser._blurTab = function _blurTab(aTab) {
    if (aTab != this.mCurrentTab)
      return this.mCurrentTab;

    try {
      return this.selectedTab = this._tabsToSelect().next();
    }
    catch (e) {
      if (this.selectedTab = this.getLastSelectedTab())
        return this.selectedTab;

      if (this.selectedTab = this.getLastSelectedTab(1, true)) // Bug 633707, 651440, 654295, 654311, 663421
        return this.selectedTab;

      return this.selectedTab = BrowserOpenTab() || gBrowser.getLastOpenedTab();
    }
  };

  //关闭标签页时选择亲属标签
  TU_hookCode("gBrowser.onTabSelect", "}", function() {
    var panelId = aTab.linkedPanel;
    Array.forEach(this.visibleTabs, function(aTab) {
      if (aTab.getAttribute("opener").startsWith(panelId))
        aTab.setAttribute("opener", panelId + (+aTab.getAttribute("opener").slice(panelId.length) + 1));
    });
  });

  TU_hookCode("gBrowser.onTabClose", "}", function() {
    if (aTab.hasAttribute("opener")) {
      let opener = aTab.getAttribute("opener");
      let panelId = aTab.linkedPanel;
      Array.forEach(this.visibleTabs, function(aTab) {
        if (aTab.getAttribute("opener").startsWith(panelId))
          aTab.setAttribute("opener", opener);
      });
    }
  });

  TU_hookCode("gBrowser.loadTabs", "}", function() {
    if (aURIs.length > 1)
      this.updateCurrentBrowser(true);
  });

  gBrowser.isRelatedTab = function isRelatedTab(aTab, bTab) {
    if (!bTab)
      bTab = this.mCurrentTab;

    return aTab.hasAttribute("opener") && aTab.getAttribute("opener") == bTab.getAttribute("opener")
        || aTab.getAttribute("opener").startsWith(bTab.linkedPanel)
        || bTab.getAttribute("opener").startsWith(aTab.linkedPanel);
  };

  //关闭标签页时选择上次浏览的标签
  gBrowser.mTabContainer._tabHistory = Array.slice(gBrowser.mTabs);
  TU_hookCode("gBrowser.onTabOpen", "}", function() {
    var tabHistory = this.mTabContainer._tabHistory;
    if (aTab.hasAttribute("opener")) {
      let index = tabHistory.lastIndexOf(this.mCurrentTab);
      while (index > 0 && tabHistory[index - 1].getAttribute("opener") == aTab.getAttribute("opener"))
        index--;
      tabHistory.splice(index, 0, aTab);
    }
    else
      tabHistory.unshift(aTab);
  });

  TU_hookCode("gBrowser.onTabSelect", "}", function() {
    var tabHistory = this.mTabContainer._tabHistory;
    tabHistory.splice(tabHistory.lastIndexOf(aTab), 1);
    tabHistory.push(aTab);
  });

  TU_hookCode("gBrowser.onTabClose", "}", function() {
    var tabHistory = this.mTabContainer._tabHistory;
    tabHistory.splice(tabHistory.lastIndexOf(aTab), 1);
  });

  gBrowser.getLastSelectedTab = function getLastSelectedTab(aDir, aIgnoreHidden) {
    var tabHistory = this.mTabContainer._tabHistory;
    var index = tabHistory.lastIndexOf(this.mCurrentTab);
    for (var i = (index > -1); i < tabHistory.length; i++) {
      var tab = tabHistory[index = aDir < 0 ? index + 1 : index - 1]
             || tabHistory[index = aDir < 0 ? 0 : tabHistory.length - 1];
      if ((aIgnoreHidden || !tab.hidden) && !tab.closing)
        return tab;
    }
  };

  //Ctrl+Tab切换到上次浏览的标签
  //Ctrl+左右方向键切换到前一个/后一个标签
  tabutils.addEventListener(window, "keypress", function(event) {
    if (!event.ctrlKey || event.altKey || event.metaKey)
      return;

    switch (true) {
      case event.keyCode == event.DOM_VK_TAB:
        if (TU_getPref("extensions.tabutils.handleCtrlTab", true)) {
          if (!gBrowser._previewMode && TU_getPref("extensions.tabutils.handleCtrl", true))
            gBrowser._previewMode = true;

          gBrowser.selectedTab = gBrowser.getLastSelectedTab(event.shiftKey ? -1 : 1);
          event.preventDefault();
          event.stopPropagation();
        }
        break;
    }
  }, true);

  tabutils.addEventListener(window, "keyup", function(event) {
    switch (event.keyCode) {
      case event.DOM_VK_CONTROL:
        if (gBrowser._previewMode) {
          gBrowser._previewMode = false;
          gBrowser.updateCurrentBrowser(true);
        }
        break;
    }
  }, true);

  TU_hookCode("gBrowser.onTabClose", "}", function() {
    if (gBrowser._previewMode) {
      gBrowser.selectedTab = let (tabHistory = gBrowser.mTabContainer._tabHistory) tabHistory[tabHistory.length - 1];
      gBrowser._previewMode = false;
    }
  });

  //Close tab by double click
  gBrowser.mTabContainer.addEventListener("dblclick", function(event) {
    if (event.button == 0 && event.target.localName == "tab"
        && !this._blockDblClick && !gBrowser._blockDblClick && TU_getPref("extensions.tabutils.dblClickTab") == 4) {
      gBrowser.removeTab(event.target, {animate: true});
      event.stopPropagation();
    }
  }, false);

  //Undo close tab by middle click
  gBrowser.mTabContainer.addEventListener("click", function(event) {
    if (event.button == 1 && event.target.localName == "tabs" && TU_getPref("extensions.tabutils.middleClickTabBar") == 5) {
      undoCloseTab();
      event.stopPropagation();
    }
  }, true);

  //Don't close the last primary window with the las tab
  TU_hookCode("gBrowser._beginRemoveTab", "_closeWindowWithLastTab", "$& && " + (function() { //Bug 607893
    (TU_getPref("extensions.tabutils.closeLastWindowWithLastTab", false) || function() {
      var winEnum = Services.wm.getEnumerator("navigator:browser");
      while (winEnum.hasMoreElements()) {
        var win = winEnum.getNext();
        if (win != window && win.toolbar.visible)
          return win;
      }
    }())
  }).toString().replace(/^.*{|}$/g, ""));
};

//标记未读标签页
tabutils._unreadTab = function() {
  gBrowser.unreadTab = function unreadTab(aTab, aForce) {
    if (aForce == null)
      aForce = !aTab.hasAttribute("unread");

    if (aForce && !aTab.selected) {
      tabutils.setAttribute(aTab, "unread", true);
    }
    else {
      tabutils.removeAttribute(aTab, "unread");
    }
  };

  TU_hookCode("gBrowser.onTabRestoring", "}", function() {
    this.unreadTab(aTab, ss.getTabValue(aTab, "unread") == "true");
  });

  TU_hookCode("gBrowser.onTabOpen", "}", function() {
    this.unreadTab(aTab, true);
  });

  TU_hookCode("gBrowser.onTabSelect", "}", function() {
    this.unreadTab(aTab, false);
  });

  TU_hookCode("gBrowser.setTabTitle", /(?=aTab.label = title;)/, function() {
    if (!aTab.hasAttribute("busy") && !aTab.linkedBrowser.__SS_restoreState)
      this.unreadTab(aTab, true);
  });

  TU_hookCode("gBrowser.mTabProgressListener", 'this.mTab.setAttribute("unread", "true");', function() {
    if (!this.mBrowser.__SS_restoreState)
      this.mTabBrowser.unreadTab(this.mTab, true);
  });
}

tabutils._miscFeatures = function() {
  if ("openGMarkLabelInTabs" in window) //Compatibility with GMarks
  TU_hookCode("openGMarkLabelInTabs",
    [/.*openUILinkIn.*/, ""],
    [/(?=.*(labelArray)(?![\s\S]*\1))/, function() {
      var urls = [label.url for (label of labelArray)];
      var loadInBackground = TU_getPref("browser.tabs.loadBookmarksInBackground");
      gBrowser.loadTabs(urls, loadInBackground, false);
    }]
  );

  //Compatibility with themes
  let os = Services.appinfo.OS; //WINNT, Linux or Darwin
  let version = parseFloat(Services.appinfo.version);
  document.documentElement.setAttribute("OS", os);
  document.documentElement.setAttribute("v4", version >= 4.0);
  document.documentElement.setAttribute("v6", version >= 6.0);
  document.documentElement.setAttribute("v14", version >= 14.0);
  document.documentElement.setAttribute("v29", version >= 29.0);
};

//撤销关闭标签页按钮
tabutils._undoCloseTabButton = function() {
  TU_hookCode("RecentlyClosedTabsAndWindowsMenuUtils" in window ?
              "RecentlyClosedTabsAndWindowsMenuUtils._undoCloseMiddleClick" : // Bug 928640 [Fx27]
              "HistoryMenu.prototype._undoCloseMiddleClick",
    ["{", function() {
      if (aEvent.button == 2) {
        tabutils._ss.forgetClosedTab(window, Array.indexOf(aEvent.originalTarget.parentNode.childNodes, aEvent.originalTarget));
        aEvent.originalTarget.parentNode.removeChild(aEvent.originalTarget);
        tabutils.updateUndoCloseTabCommand();
        aEvent.preventDefault();
        return;
      }
    }],
    [/undoCloseTab.*/, function() { // Bug 942464 [Fx28]
      undoCloseTab(Array.indexOf(aEvent.originalTarget.parentNode.childNodes, aEvent.originalTarget));
      aEvent.originalTarget.parentNode.removeChild(aEvent.originalTarget);
    }]
  );

  TU_hookCode("HistoryMenu.prototype.populateUndoSubmenu",
    ["}", function() { // Bug 926928 [Fx27]
      for (let item = undoPopup.firstChild; item && item.localName == "menuitem"; item = item.nextSibling) {
        item.setAttribute("oncommand", "undoCloseTab(Array.indexOf(this.parentNode.childNodes, this));");
      }
    }],
    ["}", function() {
      var sanitizeItem = document.getElementById("sanitizeItem");
      var m = undoPopup.appendChild(document.createElement("menuitem"));
      m.setAttribute("label", sanitizeItem.getAttribute("label").replace("\u2026", ""));
      m.setAttribute("accesskey", sanitizeItem.getAttribute("accesskey"));
      m.addEventListener("command", function() {
        while (tabutils._ss.getClosedTabCount(window) > 0)
          tabutils._ss.forgetClosedTab(window, 0);
        tabutils.updateUndoCloseTabCommand();
      }, false);
    }],
    ["}", function() {
      undoPopup.setAttribute("onclick", "if (tabutils._ss.getClosedTabCount(window) == 0) closeMenus(this);event.stopPropagation();");
      undoPopup.setAttribute("oncommand", "event.stopPropagation();");
      undoPopup.setAttribute("context", "");
    }],
    ["}", function() { // Bug 958813
      if (!undoPopup.hasStatusListener) {
        undoPopup.addEventListener("DOMMenuItemActive", function(event) {XULBrowserWindow.setOverLink(event.target.getAttribute("targetURI"));}, false);
        undoPopup.addEventListener("DOMMenuItemInactive", function() {XULBrowserWindow.setOverLink("");}, false);
        undoPopup.hasStatusListener = true;
      }
    }]
  );

  tabutils._undoCloseMiddleClick = HistoryMenu.prototype._undoCloseMiddleClick;
  tabutils.populateUndoSubmenu = HistoryMenu.prototype.populateUndoSubmenu;
  TU_hookCode("tabutils.populateUndoSubmenu",
    [/var undoPopup.*/, "var undoPopup = arguments[0];"],
    [/.*undoMenu.*/g, ""],
    ["return;", "return false;"],
    ["}", "return true;"]
  );

  tabutils.updateUndoCloseTabCommand = function updateUndoCloseTabCommand() {
    if (tabutils._ss.getClosedTabCount(window) == 0)
      document.getElementById("History:UndoCloseTab").setAttribute("disabled", true);
    else
      document.getElementById("History:UndoCloseTab").removeAttribute("disabled");
  };
  //tabutils.updateUndoCloseTabCommand();
  TU_hookCode("gBrowser.onTabClose", "}", "tabutils.updateUndoCloseTabCommand();");
  TU_hookCode("gBrowser.onTabRestoring", "}", "tabutils.updateUndoCloseTabCommand();");
  TU_hookCode("gSessionHistoryObserver.observe", "}", "tabutils.updateUndoCloseTabCommand();");
  TU_hookCode("TabContextMenu.updateContextMenu", 'document.getElementById("context_undoCloseTab").disabled =', "");
};

tabutils._firstRun = function() {
  if (TU_getPref("extensions.tabutils.firstRun"))
    return;
  TU_setPref("extensions.tabutils.firstRun", true);

  let navbar = document.getElementById("nav-bar");
  navbar.currentSet = navbar.currentSet.replace(/closetab-button|undoclosetab-button|button_tuOptions/g, "")
                                       .replace("urlbar-container", "closetab-button,undoclosetab-button,button_tuOptions,$&");
  navbar.setAttribute("currentset", navbar.currentSet);
  document.persist(navbar.id, "currentset");
};

tabutils._tabPrefObserver = {
  init: function() {
    window.addEventListener("unload", this, false);
    this.register();

    //Don't allow drag/dblclick on the tab bar to act on the window
    if ("_update" in TabsInTitlebar) // Compat. with Linux
    TU_hookCode("TabsInTitlebar._update", "!this._dragBindingAlive", "$& && TU_getPref('extensions.tabutils.dragBindingAlive', true)");

    [
      "browser.link.open_external",
      "extensions.tabutils.highlightCurrent",
      "extensions.tabutils.highlightUnread",
      "extensions.tabutils.highlightRead",
      "extensions.tabutils.styles.current",
      "extensions.tabutils.styles.unread",
      "extensions.tabutils.styles.read",
      "extensions.tabutils.openLinkInTab",
      "extensions.tabutils.dragBindingAlive"
    ].forEach(function(aPrefName) {
      this.observe(null, "nsPref:changed", aPrefName);
    }, this);
  },

  register: function() {
    Services.prefs.addObserver("", this, false);
  },

  unregister: function() {
    Services.prefs.removeObserver("", this);
  },

  cssRules: {},
  tabSelector: [
    '.tabbrowser-tab#Selector# > * > .tab-content',
    '.alltabs-item#Selector#'
  ].join(),
  textSelector: [
    '.tabbrowser-tab#Selector# > * > .tab-content > .tab-text',
    '.alltabs-item#Selector#'
  ].join(),
  bgSelector: [
    '.tabbrowser-tab#Selector#',
    '.tabbrowser-tab#Selector# > * > .tab-content',
    '.tabbrowser-tab#Selector# > * > .tab-content > *',
    '.alltabs-item#Selector#'
  ].join(),

  batching: false,
  observe: function(aSubject, aTopic, aData) {
    if (aTopic != "nsPref:changed" || this.batching)
      return;

    switch (aData) {
      case "browser.link.open_external": // Bug 509664 [Fx10]
        if (gPrefService.prefHasUserValue(aData)) {
          TU_setPref("browser.link.open_newwindow.override.external", TU_getPref(aData));
          gPrefService.clearUserPref(aData);
        }
        return;
    }

    if (!aData.startsWith("extensions.tabutils."))
      return;

    let name = aData.slice(20).replace(".", "_", "g");
    if (name in this) {
      this[name]();
      return;
    }

    //Tab highlighting
    if (/^extensions.tabutils.(?:highlight|styles.|selector.)([^.]+)$/.test(aData)) {
      let prefName = RegExp.$1.toLowerCase();
      if (!(prefName in this.cssRules)) {
        let selector = TU_getPref("extensions.tabutils.selector." + prefName);
        if (!selector)
          return;

        this.cssRules[prefName] = {
          tab: tabutils.insertRule(this.tabSelector.replace('#Selector#', selector, 'g') + '{}'),
          text: tabutils.insertRule(this.textSelector.replace('#Selector#', selector, 'g') + '{}'),
          bg: tabutils.insertRule(this.bgSelector.replace('#Selector#', selector, 'g') + '{}')
        };
      }

      let style = {};
      try {
        if (TU_getPref("extensions.tabutils.highlight" + prefName[0].toUpperCase() + prefName.slice(1)))
          style = JSON.parse(TU_getPref("extensions.tabutils.styles." + prefName));
      }
      catch (e) {}

      let tabStyle = this.cssRules[prefName].tab.style;
      tabStyle.setProperty("outline", style.outline ? "1px solid" : "", "");
      tabStyle.setProperty("outline-offset", style.outline ? "-1px" : "", "");
      tabStyle.setProperty("outline-color", style.outline ? style.outlineColorCode : "", "");
      tabStyle.setProperty("-moz-outline-radius", style.outline ? "4px" : "", "");
      tabStyle.setProperty("opacity", style.opacity ? style.opacityCode : "", "");

      let textStyle = this.cssRules[prefName].text.style;
      textStyle.setProperty("font-weight", style.bold ? "bold" : "", "");
      textStyle.setProperty("font-style", style.italic ? "italic" : "", "");
      textStyle.setProperty("text-decoration", style.underline ? "underline" : style.strikethrough ? "line-through" : "", "");
      textStyle.setProperty("color", style.color ? style.colorCode : "", "important");

      let bgStyle = this.cssRules[prefName].bg.style;
      bgStyle.setProperty("background-image", style.bgColor ? "-moz-linear-gradient(" + style.bgColorCode + "," + style.bgColorCode + ")" : "", "important");
      return;
    }
  },

  openLinkInTab: function() {
    tabutils.gOpenLinkInTab = TU_getPref("extensions.tabutils.openLinkInTab");
  },

  dragBindingAlive: function() {
    let tabsToolbar = document.getElementById("TabsToolbar");
    if (tabsToolbar._dragBindingAlive != null)
      tabsToolbar._dragBindingAlive = TU_getPref("extensions.tabutils.dragBindingAlive", true);
  },

  handleEvent: function(event) {
    switch (event.type) {
      case "load":
        window.removeEventListener("load", this, false);
        this.init();
        break;
      case "unload":
        window.removeEventListener("unload", this, false);
        this.unregister();
        break;
    }
  }
};
