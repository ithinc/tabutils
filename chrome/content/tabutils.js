var tabutils = {
  init: function() {
    this._tabEventListeners.init();
    this._PlacesUtilsExt();

    this._openUILinkInTab();
    this._openLinkInTab();
    this._singleWindowMode();

    this._tabOpeningOptions();
    this._tabClosingOptions();
    this._tabClickingOptions();

    this._unreadTab();
    this._protectAndLockTab();
    this._faviconizeTab();
    this._pinTab();
    this._phantomTabs();
    this._renameTab();
    this._restartTab();
    this._reloadEvery();
    this._bookmarkTabs();
    this._tabView();
    this._multiTabHandler();
    this._groupTabs();
    this._multirowTabs();
    this._verticalTabs();
    this._miscFeatures();

    window.addEventListener("load", this, false);
    window.addEventListener("unload", this, false);

    if (gBrowser.mTabListeners.length > 0) { // Bug 463384 [Fx5]
      let tabListener = gBrowser.mTabListeners[0];
      gBrowser.browsers[0].webProgress.removeProgressListener(gBrowser.mTabFilters[0]);
      gBrowser.mTabFilters[0].removeProgressListener(gBrowser.mTabListeners[0]);
      gBrowser.mTabListeners[0] = gBrowser.mTabProgressListener(tabListener.mTab, tabListener.mBrowser, tabListener.mBlank);
      gBrowser.mTabFilters[0].addProgressListener(gBrowser.mTabListeners[0], Ci.nsIWebProgress.NOTIFY_ALL);
      gBrowser.browsers[0].webProgress.addProgressListener(gBrowser.mTabFilters[0], Ci.nsIWebProgress.NOTIFY_ALL);
    }

    if (!("privateBrowsingEnabled" in gPrivateBrowsingUI)) { // Bug 799001 [Fx20]
      XPCOMUtils.defineLazyGetter(gPrivateBrowsingUI, "privateBrowsingEnabled", function() {
        return PrivateBrowsingUtils.isWindowPrivate(window);
      });
    }

//    Function.prototype.__defineGetter__("stack", function() {
//      var stack = [];
//      for (let caller = this; caller && stack.length < 15; caller = caller.caller) {
//        stack.push(caller.name);
//      }
//      return stack;
//    });
//
//    TU_hookCode("gBrowser.addTab", "{", "Cu.reportError([arguments.callee.stack, aURI]);");
//    TU_hookCode("gBrowser.moveTabTo", "{", "Cu.reportError([arguments.callee.stack, aTab._tPos, aIndex]);");
//    TU_hookCode("gBrowser._beginRemoveTab", "{", "Cu.reportError([arguments.callee.stack]);");
//    TU_hookCode("gBrowser._endRemoveTab", "{", "Cu.reportError([arguments.callee.stack]);");
//    TU_hookCode("gBrowser._blurTab", "{", "Cu.reportError([arguments.callee.stack]);");
//
//    TU_hookCode("gBrowser.pinTab", "{", "Cu.reportError([arguments.callee.stack]);");
//    TU_hookCode("gBrowser.mTabContainer.adjustTabstrip", "{", "Cu.reportError([arguments.callee.stack]);");
//    TU_hookCode("gBrowser.mTabContainer.positionPinnedTabs", "{", "Cu.reportError([arguments.callee.stack]);");
//    TU_hookCode("gBrowser.mTabContainer.stylePinnedTabs", "{", "Cu.reportError([arguments.callee.stack]);");
  },

  onload: function() {
    this._mainContextMenu();
    this._tabContextMenu();
    this._allTabsPopup();
    this._hideTabBar();
    this._undoCloseTabButton();
    this._tabPrefObserver.init();
    this._tagsFolderObserver.init();

    this._firstRun();
  },

  getTabValue: function(aTab, aKey) {
    let val = this._ss.getTabValue(aTab, aKey);
    if (!val) {
      let tabData = aTab.linkedBrowser.__SS_data;
      if (tabData)
        val = tabData.attributes[aKey] || tabData[aKey];
    }
    return val == null ? "" : val.toString();
  },

  setTabValue: function() this._ss.setTabValue.apply(this._ss, arguments),
  deleteTabValue: function() this._ss.deleteTabValue.apply(this._ss, arguments),

  setAttribute: function(aTab, aAttr, aVal) {
    aTab.setAttribute(aAttr, aVal);
    this.setTabValue(aTab, aAttr, aVal);
  },

  removeAttribute: function(aTab, aAttr) {
    aTab.removeAttribute(aAttr);
    this.deleteTabValue(aTab, aAttr);
  },

  restoreAttribute: function(aTab, aAttr) {
    let aVal = this.getTabValue(aTab, aAttr);
    if (aVal)
      aTab.setAttribute(aAttr, aVal);
    else
      aTab.removeAttribute(aAttr);
  },

  getURIsForTag: function() this._tagsFolderObserver.getURIsForTag.apply(this._tagsFolderObserver, arguments),
  getTagsForURI: function() this._tagsFolderObserver.getTagsForURI.apply(this._tagsFolderObserver, arguments),

  getDomainFromURI: function(aURI, aAllowThirdPartyFixup) {
    try {
      if (typeof aURI == "string")
        aURI = this._URIFixup.createFixupURI(aURI, aAllowThirdPartyFixup);
    }
    catch (e) {}

    try {
      return this._eTLDService.getBaseDomain(aURI);
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

  dispatchEvent: function() {
    let event = document.createEvent("Events");
    event.initEvent.apply(event, Array.slice(arguments, 1));
    arguments[0].dispatchEvent(event);
  },

  _eventListeners: [],
  addEventListener: function() {
    document.addEventListener.apply(arguments[0], Array.slice(arguments, 1));
    this._eventListeners.push(arguments);
  },

  onunload: function() {
    this._eventListeners.forEach(function(args) document.removeEventListener.apply(args[0], Array.slice(args, 1)));
    this._tagsFolderObserver.uninit();
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

XPCOMUtils.defineLazyServiceGetter(tabutils, "_ss",
                                   "@mozilla.org/browser/sessionstore;1",
                                   "nsISessionStore");

XPCOMUtils.defineLazyServiceGetter(tabutils, "_URIFixup",
                                   "@mozilla.org/docshell/urifixup;1",
                                   "nsIURIFixup");

XPCOMUtils.defineLazyServiceGetter(tabutils, "_eTLDService",
                                   "@mozilla.org/network/effective-tld-service;1",
                                   "nsIEffectiveTLDService");

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

    gBrowser.onTabOpen = function onTabOpen(aTab) {
      var aURI, aReferrerURI, aRelatedToCurrent;
      if (aTab.arguments) {
        aURI = aTab.arguments.aURI;
        aReferrerURI = aTab.arguments.aReferrerURI;
        aRelatedToCurrent = aTab.arguments.aRelatedToCurrent;
      }

      var uri, tags = [];
      try {
        uri = makeURI(aURI);
      }
      catch (e) {
        uri = makeURI("about:blank");
      }

      if (uri.spec != "about:blank")
        tags = tabutils.getTagsForURI(uri, {});
    };

    gBrowser.onLocationChange = function onLocationChange(aTab) {
      var uri = aTab.linkedBrowser.currentURI;
      var tags = tabutils.getTagsForURI(uri, {});
    };

    TU_hookCode("gBrowser.mTabProgressListener", /(?=.*isBlankPageURL.*)/, function() {
      if (!isBlankPageURL(this.mBrowser.currentURI.spec) &&
          (!this.mBrowser.lastURI || isBlankPageURL(this.mBrowser.lastURI.spec)) &&
          !this.mBrowser.__SS_tabStillLoading) // Bug 698565 [Fx11]
        this.mTabBrowser.onLocationChange(this.mTab);
    });

    TU_hookCode("gBrowser.updateCurrentBrowser", /(?=.*createEvent.*)/, (function() {
      if (!oldTab.selected) {
        let event = document.createEvent("Events");
        event.initEvent("TabBlur", true, false);
        oldTab.dispatchEvent(event);
      }
    }).toString().replace(/^.*{|}$/g, ""));

    gBrowser.onTabMove = function onTabMove(aTab, event) {};
    gBrowser.onTabClose = function onTabClose(aTab) {};
    gBrowser.onTabSelect = function onTabSelect(aTab) {};
    gBrowser.onTabBlur = function onTabBlur(aTab) {};
    gBrowser.onTabPinning = function onTabPinning(aTab) {};
    gBrowser.onTabPinned = function onTabPinned(aTab) {};
    gBrowser.onTabHide = function onTabHide(aTab) {};
    gBrowser.onTabShow = function onTabShow(aTab) {};
    gBrowser.onTabStacked = function onTabStacked(aTab) {};
    gBrowser.onTabUnstacked = function onTabUnstacked(aTab) {};
    gBrowser.onStackCollapsed = function onStackCollapsed(aTab) {};
    gBrowser.onStackExpanded = function onStackExpanded(aTab) {};
    gBrowser.onTabRestoring = function onTabRestoring(aTab) {var ss = tabutils._ss;};
    gBrowser.onTabRestored = function onTabRestored(aTab) {var ss = tabutils._ss;};
    gBrowser.onTabClosing = function onTabClosing(aTab) {var ss = tabutils._ss;};

    [
      "TabOpen", "TabMove", "TabClose", "TabSelect", "TabBlur",
      "TabPinning", "TabPinned", "TabHide", "TabShow",
      "TabStacked", "TabUnstacked", "StackCollapsed", "StackExpanded",
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
      case "TabBlur": gBrowser.onTabBlur(event.target);break;
      case "TabPinning": gBrowser.onTabPinning(event.target);break;
      case "TabPinned": gBrowser.onTabPinned(event.target);break;
      case "TabHide": gBrowser.onTabHide(event.target);break;
      case "TabShow": gBrowser.onTabShow(event.target);break;
      case "TabStacked": gBrowser.onTabStacked(event.target);break;
      case "TabUnstacked": gBrowser.onTabUnstacked(event.target);break;
      case "StackCollapsed": gBrowser.onStackCollapsed(event.target);break;
      case "StackExpanded": gBrowser.onStackExpanded(event.target);break;
      case "SSTabRestoring": gBrowser.onTabRestoring(event.target);break;
      case "SSTabRestored": gBrowser.onTabRestored(event.target);break;
      case "SSTabClosing": gBrowser.onTabClosing(event.target);break;
    }
  }
};

tabutils._PlacesUtilsExt = function() {
  PlacesUtils.getItemIdForTag = function getItemIdForTag(aTag) {
    var tagId = -1;
    var tagsResultNode = this.getFolderContents(this.tagsFolderId).root;
    for (var i = 0, cc = tagsResultNode.childCount; i < cc; i++) {
      var node = tagsResultNode.getChild(i);
      if (node.title.toLowerCase() == aTag.toLowerCase()) {
        tagId = node.itemId;
        break;
      }
    }
    tagsResultNode.containerOpen = false;
    return tagId;
  };

  PlacesUtils.getItemIdForTaggedURI = function getItemIdForTaggedURI(aURI, aTag) {
    var tagId = this.getItemIdForTag(aTag);
    if (tagId == -1)
      return -1;

    var bookmarkIds = this.bookmarks.getBookmarkIdsForURI(aURI, {});
    for (let bookmarkId of bookmarkIds) {
      if (this.bookmarks.getFolderIdForItem(bookmarkId) == tagId)
        return bookmarkId;
    }
    return -1;
  };

  PlacesUtils.removeTag = function removeTag(aTag) {
    this.tagging.getURIsForTag(aTag).forEach(function(aURI) {
      this.tagging.untagURI(aURI, [aTag]);
    }, this);
  };
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

  //右键点击书签
  TU_hookCode("BookmarksEventHandler.onClick",
    ["aEvent.button == 2", "$& && (aEvent.ctrlKey || aEvent.altKey || aEvent.metaKey || !TU_getPref('extensions.tabutils.rightClickBookmarks', 0))"],
    ["aEvent.button == 1", "aEvent.button > 0"],
    ["}", "if (aEvent.button == 2) aEvent.preventDefault();"]
  );
  TU_hookCode("checkForMiddleClick",
    ["event.button == 1", "($& || event.button == 2 && !event.ctrlKey && !event.altKey && !event.metaKey && TU_getPref('extensions.tabutils.rightClickBookmarks', 0))"],
    [/.*closeMenus.*/, "{$&;event.preventDefault();}"]
  );
  TU_hookCode("whereToOpenLink", "e.button == 1", "e.button > 0");

  //保持菜单打开
  TU_hookCode("BookmarksEventHandler.onClick", /.*hidePopup.*/, "if (!(TU_getPref('extensions.tabutils.middleClickBookmarks', 0) & 4)) $&");
  TU_hookCode("checkForMiddleClick", /.*closeMenus.*/, "if (!(TU_getPref('extensions.tabutils.middleClickBookmarks', 0) & 4)) $&");

  TU_hookCode.call(document.getElementById("PopupAutoCompleteRichResult"), "onPopupClick",
    ["aEvent.button == 2", "$& && (aEvent.ctrlKey || aEvent.altKey || aEvent.metaKey || !TU_getPref('extensions.tabutils.rightClickBookmarks', 0))"],
    [/.*closePopup[\s\S]*handleEscape.*/, "if (aEvent.button && TU_getPref('extensions.tabutils.middleClickBookmarks', 0) & 4) gBrowser.userTypedValue = null; else {$&}"]
  );

  tabutils.addEventListener(gURLBar.parentNode, "blur", function(event) {
    if (gURLBar.popupOpen && TU_getPref('extensions.tabutils.middleClickBookmarks', 0) & 4) {
      gURLBar._dontBlur = true;
      setTimeout(function() {
        gURLBar.mIgnoreFocus = true;
        gURLBar.focus();
        gURLBar.mIgnoreFocus = false;
        gURLBar._dontBlur = false;
      }, 0);
    }
  }, true);
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

  //强制在后台打开所有新标签页
  TU_hookCode("gBrowser.loadOneTab", /(?=var owner)/, "bgLoad = bgLoad && !tabutils.gLoadAllInForeground || tabutils.gLoadAllInBackground;");
  TU_hookCode("gBrowser.loadTabs", /(?=var owner)/, "aLoadInBackground = aLoadInBackground && !tabutils.gLoadAllInForeground || tabutils.gLoadAllInBackground;");

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
  TU_hookCode("nsBrowserAccess.prototype.openURI", '"browser.link.open_newwindow"', 'isExternal ? "browser.link.open_external" : $&');

  //左键点击链接
  TU_hookCode("contentAreaClick", /.*handleLinkClick.*/g, "if (event.button || event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) $&");
  TU_hookCode("handleLinkClick", 'where == "current"', "false");

  //中键点击链接
  TU_hookCode("openNewTabWith", "aEvent.shiftKey", "$& ^ (aEvent.button == 1 && TU_getPref('extensions.tabutils.middleClickLinks', 0) & 2) > 0");

  //右键点击链接
  TU_hookCode("contentAreaClick",
    ["event.button == 2", "$& && (event.ctrlKey || event.altKey || event.metaKey || !TU_getPref('extensions.tabutils.rightClickLinks', 0))"]
  );
  TU_hookCode("handleLinkClick",
    ["event.button == 2", "false"],
    ["event.preventDefault();", 'document.getElementById("contentAreaContextMenu").hidePopup();$&', 'g']
  );
  TU_hookCode("openNewTabWith", "aEvent.button == 1", "aEvent.button > 0");

  //拖曳链接
  TU_hookCode("handleDroppedLink", /.*loadURI.*/, function(s) (function() {
    {
      switch (true) {
        case /\.(xpi|user\.js)$/.test(typeof data == "object" ? data.url : uri): // Bug 846635 [Fx25]
        case !TU_getPref("extensions.tabutils.dragAndGo", true):
          $0;break;
        case event.ctrlKey != TU_getPref("extensions.tabutils.invertDrag", false):
          BrowserSearch.loadSearch(name || url, true);break;
        default:
          openNewTabWith(typeof data == "object" ? data.url : uri, null, typeof data == "object" ? data.postData : postData.value, event, true, event.target.ownerDocument.documentURIObject);break;
      }
    }
  }).toString().replace(/^.*{|}$/g, "").replace("$0", s));

  for (let b of gBrowser.browsers) {
    b.droppedLinkHandler = handleDroppedLink;
  }

  //在新标签页打开链接时继承历史
  TU_hookCode("gBrowser.loadOneTab",
    ["{", function() {
      var currentTab = this.mCurrentTab;
    }],
    [/(?=return tab;)/, function() {
      if (aReferrerURI && TU_getPref("extensions.tabutils.openLinkWithHistory", false)) {
        let currentHistory = currentTab.linkedBrowser.sessionHistory;
        let newHistory = tab.linkedBrowser.sessionHistory.QueryInterface(Ci.nsISHistoryInternal);
        for (let i = 0; i <= currentHistory.index; i++) {
          newHistory.addEntry(currentHistory.getEntryAtIndex(i, false), true);
        }
      }
    }]
  );
};

//单窗口模式
tabutils._singleWindowMode = function() {
  if (TU_getPref("extensions.tabutils.singleWindowMode", false)) {
    var win = (function() {
      var winEnum = Services.wm.getZOrderDOMWindowEnumerator("navigator:browser", true);
      while (winEnum.hasMoreElements()) {
        var win = winEnum.getNext();
        if (win != window && win.toolbar.visible)
          return win;
      }
    })();

    if (win) {
      TU_hookFunc((gBrowserInit.onLoad + gBrowserInit._delayedStartup).toString().match(/^.*{|if \(uriToLoad.*{([^{}]|{[^{}]*}|{([^{}]|{[^{}]*})*})*}|}$/g).join("\n"), // Bug 756313 [Fx19]
        ["{", "var uriToLoad = window.arguments && window.arguments[0];"],
        ["gBrowser.loadTabs(specs, false, true);", "this.gBrowser.loadTabs(specs, false, false);"],
        ["loadOneOrMoreURIs(uriToLoad);", "this.gBrowser.loadTabs(uriToLoad.split('|'), false, false);"],
        [/.*loadURI.*\n.*/, "this.gBrowser.loadOneTab(uriToLoad, window.arguments[2], window.arguments[1] && window.arguments[1].split('=')[1], window.arguments[3] || null, false, window.arguments[4] || false);"],
        [/.*swapBrowsersAndCloseOther.*/, "return;"],
        ["}", "if (uriToLoad) window.close();"]
      ).apply(win);
    }
  }

  tabutils._tabPrefObserver.singleWindowMode = function() {
    if (TU_getPref("extensions.tabutils.singleWindowMode", false)) {
      if (TU_getPref("browser.link.open_external", 3) == 2)
        TU_setPref("browser.link.open_external", 3);
      if (TU_getPref("browser.link.open_newwindow") == 2)
        TU_setPref("browser.link.open_newwindow", 3);
      if (TU_getPref("browser.link.open_newwindow.override.external") == 2) // Bug 509664 [Fx10]
        TU_setPref("browser.link.open_newwindow.override.external", 3);
      if (TU_getPref("browser.link.open_newwindow.restriction") != 0)
        TU_setPref("browser.link.open_newwindow.restriction", 0);
    }
  };

  TU_hookCode("OpenBrowserWindow", "{", function() {
    if (TU_getPref("extensions.tabutils.singleWindowMode", false))
      return BrowserOpenTab() || gBrowser.getLastOpenedTab();
  });

  TU_hookCode("undoCloseWindow", "{", function() {
    if (TU_getPref("extensions.tabutils.singleWindowMode", false))
      return undoCloseTab(aIndex);
  });

  TU_hookCode("openNewWindowWith", "{", function() {
    if (TU_getPref("extensions.tabutils.singleWindowMode", false))
      return openNewTabWith(aURL, aDocument, aPostData, null, aAllowThirdPartyFixup, aReferrer);
  });

  TU_hookCode("openLinkIn", /(?=.*getTopWin.*)/, function() {
    if (where == "window" && TU_getPref("extensions.tabutils.singleWindowMode", false))
      where = "tab";
  });

  TU_hookCode("nsBrowserAccess.prototype.openURI", /(?=switch \(aWhere\))/, function() {
    if (aWhere == Ci.nsIBrowserDOMWindow.OPEN_NEWWINDOW && TU_getPref("extensions.tabutils.singleWindowMode", false))
      aWhere = Ci.nsIBrowserDOMWindow.OPEN_NEWTAB;
  });

  TU_hookCode("gBrowser.replaceTabWithWindow", "{", function() {
    if (["_onDragEnd", "onxbldragend"].indexOf(arguments.callee.caller.name) > -1 && TU_getPref("extensions.tabutils.singleWindowMode", false))
      return null;
  });

  tabutils.addEventListener(window, "popupshown", function(event) {
    var singleWindowMode = TU_getPref("extensions.tabutils.singleWindowMode", false);
    [
      "menu_newNavigator",
      "historyUndoWindowMenu",
      "context-openlink",
      "context-openframe",
      "placesContext_open:newwindow"
    ].forEach(function(aId) {
      var item = event.originalTarget.getElementsByAttribute("id", aId)[0];
      if (item)
        item.setAttribute("disabled", singleWindowMode);
    });
  }, false);
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
    var reuseBlank = TU_getPref("extensions.tabutils.reuseBlank", 1);
    return reuseBlank & 1 && this.isBlankTab(this.mCurrentTab) ? this.mCurrentTab :
           reuseBlank & 2 && this.isBlankTab(this.mTabContainer.lastChild) ? this.mTabContainer.lastChild :
           reuseBlank & 4 ? this.getFirstBlankTabBut() : null;
  };

  gBrowser.getFirstBlankTabBut = function getFirstBlankTabBut(aTab) {
    for (let tab of this.mTabs) {
      if (tab != aTab && this.isBlankTab(tab))
        return tab;
    }
  };

  gBrowser.isBlankTab = function isBlankTab(aTab) {
    return this.isBlankBrowser(aTab.linkedBrowser)
        && ["busy", "pending", "ontap"].every(function(aAttr) !aTab.hasAttribute(aAttr))
        && !aTab.hidden && !aTab.closing;
  };

  gBrowser.isBlankBrowser = function isBlankBrowser(aBrowser) {
    return (!aBrowser.currentURI || isBlankPageURL(aBrowser.currentURI.spec))
        && (!aBrowser.sessionHistory || aBrowser.sessionHistory.count < 2)
        && (!aBrowser.webProgress || !aBrowser.webProgress.isLoadingDocument);
  };
  TU_hookCode("isBlankPageURL", 'aURL == "about:blank"', "gInitialPages.indexOf(aURL) > -1");

  //自动关闭非主动打开的空白标签页
  TU_hookCode("gBrowser.mTabProgressListener", /(?=var location)/, function() {
    if (aWebProgress.DOMWindow.document.documentURI == "about:blank"
        && aRequest.QueryInterface(nsIChannel).URI.spec != "about:blank"
        && aStatus == 0
        && TU_getPref("extensions.tabutils.removeUnintentionalBlank", true)) {
      let win = aWebProgress.DOMWindow;
      win._closeTimer = win.setTimeout(function(self) {
        self.mTabBrowser.isBlankTab(self.mTab) && self.mTabBrowser.removeTab(self.mTab);
      }, 250, this);
    }
  });

  //在当前标签页的右侧打开新标签页
  //连续打开后台标签时保持原有顺序
  TU_hookCode("gBrowser.addTab",
    [/\S*insertRelatedAfterCurrent\S*(?=\))/, "false"],
    [/(?=(return t;)(?![\s\S]*\1))/, function() {
      if (t.hasAttribute("opener")) {
        function shouldStack(tab) let (args = tab.arguments) (args.aReferrerURI || args.aRelatedToCurrent && args.aURI != "about:blank");

        let lastRelatedTab = this.mCurrentTab;
        let isStack = lastRelatedTab.hasAttribute("group") && lastRelatedTab.getAttribute("group-counter") != 1;
        let willStack = (isStack || TU_getPref("extensions.tabutils.autoStack", false)) && shouldStack(t);
        if (isStack && !willStack)
          lastRelatedTab = this.lastSiblingTabOf(lastRelatedTab);

        if (TU_getPref("extensions.tabutils.openTabNext.keepOrder", true)) {
          let tab = lastRelatedTab.nextSibling;
          let panelId = this.mCurrentTab.linkedPanel;
          for (; tab && tab.pinned; tab = tab.nextSibling);
          for (; tab && tab.getAttribute("opener") == panelId && tab != t && (!willStack || shouldStack(tab)); tab = tab.nextSibling)
            lastRelatedTab = tab;
        }

        if (willStack)
          this.attachTabTo(t, lastRelatedTab, {move: true, expand: true});
        this.moveTabTo(t, t._tPos > lastRelatedTab._tPos ? lastRelatedTab._tPos + 1 : lastRelatedTab._tPos);
      }
    }]
  );

  TU_hookCode("gBrowser.onTabOpen", "}", function() {
    if ((function() {
      switch (TU_getPref("extensions.tabutils.openTabNext", 1)) {
        case 1: //All
        case 2: return aRelatedToCurrent || aReferrerURI || aURI != "about:blank"; //All but New Tab
        case 3: return aRelatedToCurrent == null ? aReferrerURI : aRelatedToCurrent; //None but Links
        default: return false; //None
      }
    })()) {
      aTab.setAttribute("opener", this.mCurrentTab.linkedPanel);
    }
  });

  TU_hookCode("gBrowser.onTabPinned", "}", function() {
    aTab.removeAttribute("opener");
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
  TU_hookCode("URLBarSetURI", "gInitialPages.indexOf(uri.spec) != -1", "isBlankPageURL(uri.spec)");
  TU_hookCode("gBrowser._beginRemoveTab", /.*addTab.*/, "BrowserOpenTab();");
  TU_hookCode("gBrowser._endRemoveTab", /.*addTab.*/, "BrowserOpenTab();");

  gBrowser.getLastOpenedTab = function getLastOpenedTab() {
    return this.mTabContainer.getElementsByAttribute("linkedpanel", this.mPanelContainer.lastChild.id)[0];
  };

  //复制标签页
  TU_hookCode("gBrowser.duplicateTab",
    [/return/g, "var tab ="],
    ["}", function() {
      this.detachTab(tab, true);
      if (["_onDrop", "onxbldrop", "duplicateTabIn"].indexOf(arguments.callee.caller.name) == -1) {
        if (TU_getPref("extensions.tabutils.openDuplicateNext", true)) {
          if (aTab.hasAttribute("group") && aTab.getAttribute("group-counter") != 1 ||
              TU_getPref("extensions.tabutils.autoStack", false))
            this.attachTabTo(tab, aTab, {move: true, expand: true});
          this.moveTabTo(tab, tab._tPos > aTab._tPos ? aTab._tPos + 1 : aTab._tPos);
        }
        if (!tabutils.gLoadAllInBackground && !TU_getPref("extensions.tabutils.loadDuplicateInBackground", false))
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
  gBrowser._tabsToSelect = function _tabsToSelect(aTab) {
    if (!aTab)
      aTab = this.mCurrentTab;

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
        if (!tab.hidden && !tab.closing && !(tab._tPos in seenTabs)) {
          seenTabs[tab._tPos] = true;
          yield tab;
        }
      }
    }

    function __tabs__(selectOnClose) {
      var tabs = gBrowser.mTabs;
      switch (selectOnClose) {
        case 1: //Left
          for (let i = aTab._tPos - 1; i >= 0; i--) yield tabs[i];
          break;
        case 2: //Right
          for (let i = aTab._tPos + 1; i < tabs.length; i++) yield tabs[i];
          break;
        case 4: //First
          for (let i = 0; i < tabs.length; i++) yield tabs[i];
          break;
        case 8: //Last
          for (let i = tabs.length - 1; i >= 0; i--) yield tabs[i];
          break;
        case 0x10: //Last selected
          var tabHistory = gBrowser.mTabContainer._tabHistory;
          for (let i = tabHistory.length - 1; i >= 0; i--) yield tabHistory[i];
          break;
        case 0x20: //Unread
          for (let tab of __tabs__()) if (tab.getAttribute("unread") == "true") yield tab;
          break;
        case 0x40: //Related
          for (let tab of __tabs__()) if (gBrowser.isRelatedTab(tab, aTab)) yield tab;
          break;
        case 0x80: //Unread Related
          for (let tab of __tabs__(0x20)) if (gBrowser.isRelatedTab(tab, aTab)) yield tab;
          break;
        case undefined: //Right or Rightmost
          for (let i = aTab._tPos + 1; i < tabs.length; i++) yield tabs[i];
          for (let i = aTab._tPos - 1; i >= 0; i--) yield tabs[i];
          break;
      }
    }
  };

  gBrowser._blurTab = function _blurTab(aTab) {
    if (!aTab.selected)
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
    Array.forEach(this.mTabs, function(aTab) {
      if (aTab.getAttribute("opener").startsWith(panelId))
        aTab.setAttribute("opener", panelId + (+aTab.getAttribute("opener").slice(panelId.length) + 1));
    });
  });

  TU_hookCode("gBrowser.onTabClose", "}", function() {
    if (aTab.hasAttribute("opener")) {
      let opener = aTab.getAttribute("opener");
      let panelId = aTab.linkedPanel;
      Array.forEach(this.mTabs, function(aTab) {
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
      case event.keyCode == event.DOM_VK_LEFT && !event.shiftKey:
      case event.keyCode == event.DOM_VK_RIGHT && !event.shiftKey:
        if (TU_getPref("extensions.tabutils.handleCtrlArrow", true)) {
          if (!gBrowser._previewMode && TU_getPref("extensions.tabutils.handleCtrl", true))
            gBrowser._previewMode = true;

          let rtl = getComputedStyle(gBrowser.mTabContainer).direction == "rtl";
          gBrowser.mTabContainer.advanceSelectedTab(event.keyCode == event.DOM_VK_LEFT ^ rtl ? -1 : 1, true);
          event.preventDefault();
          event.stopPropagation();
        }
        break;
      case event.keyCode == event.DOM_VK_PAGE_UP && !event.shiftKey:
      case event.keyCode == event.DOM_VK_PAGE_DOWN && !event.shiftKey:
        if (!gBrowser._previewMode && TU_getPref("extensions.tabutils.handleCtrl", true))
          gBrowser._previewMode = true;
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
      case event.DOM_VK_LEFT:
      case event.DOM_VK_RIGHT:
        if (event.ctrlKey && TU_getPref("extensions.tabutils.handleCtrlArrow", true))
          event.stopPropagation();
    }
  }, true);

  tabutils.addEventListener(window, "keydown", function(event) {
    switch (event.keyCode) {
      case event.DOM_VK_LEFT:
      case event.DOM_VK_RIGHT:
        if (event.ctrlKey && TU_getPref("extensions.tabutils.handleCtrlArrow", true))
          event.stopPropagation();
    }
  }, true);

  TU_hookCode("gBrowser.onTabClose", "}", function() {
    if (gBrowser._previewMode) {
      gBrowser.selectedTab = let (tabHistory = gBrowser.mTabContainer._tabHistory) tabHistory[tabHistory.length - 1];
      gBrowser._previewMode = false;
    }
  });

  TU_hookCode("gBrowser.updateCurrentBrowser", /.*dispatchEvent[\s\S]*_tabAttrModified.*/, "$&};if (window.windowState != window.STATE_MINIMIZED) {");

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

  //Don't resize tabs until mouse leaves the tab bar
  gBrowser.mTabContainer.__defineGetter__("_tabSizingRule", function() { //Bug 465086, 649654
    delete this._tabSizingRule;
    return this._tabSizingRule = tabutils.insertRule('.tabbrowser-tabs[dontresize] > .tabbrowser-tab:not([pinned]):not([faviconized]) {}');
  });

  gBrowser.mTabContainer._lockTabSizing = function() {};
  gBrowser.mTabContainer._unlockTabSizing = function() {};

  gBrowser.mTabContainer._revertTabSizing = function _revertTabSizing() {
    if (!this._tabSizingLocked)
      return;

    if (this._tabSizingLocked == 1) {
      this._tabSizingLocked = false;
      return;
    }

    this.mTabstrip._scrollbox.style.maxWidth = "";
    this._closingTabsSpacer.style.minWidth = "";
    this.removeAttribute("dontresize");
    this._tabSizingLocked = false;

    if (this.hasAttribute("overflow") && this.mTabstrip._scrollbox.scrollWidth <= this.mTabstrip._scrollbox.clientWidth) {
      this.mTabstrip._scrollButtonUp.style.visibility = "";
      this.mTabstrip._scrollButtonDown.style.visibility = "";
      this.removeAttribute("overflow");
    }
    this.adjustTabstrip();
    this._fillTrailingGap();
  };

  tabutils.addEventListener(gBrowser.mTabContainer, 'mouseover', function(event) {
    if (this._tabSizingLocked || this.hasAttribute("multirow") || this.orient == "vertical"
        || event.target.localName != "tab" || event.target.pinned
        || !TU_getPref("extensions.tabutils.delayResizing", true))
      return;

    this._tabSizingLocked = true;
    window.addEventListener('mousemove', function(event) {
      let boxObject = gBrowser.mTabContainer.boxObject;
      if (event.screenY < boxObject.screenY - boxObject.height * 0.5 || event.screenY > boxObject.screenY + boxObject.height * 1.5) {
        window.removeEventListener('mousemove', arguments.callee, false);
        gBrowser.mTabContainer._revertTabSizing();
      }
    }, false);
  }, false);

  tabutils.addEventListener(gBrowser.mTabContainer, 'TabClose', function(event) {
    if (!this._tabSizingLocked || event.target.pinned)
      return;

    if (this._tabSizingLocked == 1) {
      this.mTabstrip._scrollbox.style.maxWidth = this.mTabstrip._scrollbox.clientWidth + "px";
      this._tabSizingLocked++;
    }

    let tab = event.target;
    let visibleTabs = Array.filter(this.childNodes, function(aTab) aTab.boxObject.width > 0);
    let flexibleTabs = Array.filter(visibleTabs, function(aTab) getComputedStyle(aTab).MozBoxFlex > 0);
    if (flexibleTabs.length == 0)
      return;

    if (tab == visibleTabs[visibleTabs.length - 1] || tab == flexibleTabs[flexibleTabs.length - 1]) {
      if (this.hasAttribute("dontresize")) {
        let spacer = this._closingTabsSpacer;
        spacer.style.MozBoxFlex = 1;
        spacer.style.minWidth = getComputedStyle(spacer).width;
        spacer.style.MozBoxFlex = "";

        this.setAttribute("dontanimate", true);
        this.removeAttribute("dontresize");this.clientTop; //Bug 649247
        this.setAttribute("dontanimate", !TU_getPref("browser.tabs.animate"));
      }
      return;
    }

    if (!this.hasAttribute("dontresize")) {
      let width = flexibleTabs[0].getBoundingClientRect().width;
      this._tabSizingRule.style.setProperty("max-width", width + "px", "important");

      this.setAttribute("dontanimate", true);
      this.setAttribute("dontresize", true);this.clientTop;
      this.setAttribute("dontanimate", !TU_getPref("browser.tabs.animate"));
    }

    if (!this.mTabstrip._scrollButtonUp.disabled) {
      let spacer = this._closingTabsSpacer;
      let width = parseFloat(spacer.style.minWidth) || 0;
      width += tab.getBoundingClientRect().width;

      if (!this.mTabstrip._scrollButtonDown.disabled) {
        let scrollbox = this.mTabstrip._scrollbox;
        width -= scrollbox.scrollLeftMax - scrollbox.scrollLeft; // Bug 766937 [Fx16]
      }
      spacer.style.minWidth = width + "px";
    }
  }, false);

  tabutils.addEventListener(gBrowser.mTabContainer, 'TabOpen', function(event) {
    if (this._tabSizingLocked)
      this._revertTabSizing();
  }, false);

  tabutils.addEventListener(gBrowser.mTabContainer, 'underflow', function(event) {
    if (this._tabSizingLocked > 1) {
      this.setAttribute("overflow", true);
      this.mTabstrip._scrollButtonUp.style.visibility = "visible";
      this.mTabstrip._scrollButtonDown.style.visibility = "visible";
    }
  }, false);
};

//标记未读标签页
tabutils._unreadTab = function() {
  gBrowser.unreadTab = function unreadTab(aTab, aForce) {
    if (aForce == null)
      aForce = aTab.getAttribute("unread") != "true";

    if (aForce && !aTab.selected) {
      tabutils.setAttribute(aTab, "unread", true);
      aTab.setAttribute("rotate", aTab.getAttribute("rotate") != "true");
    }
    else {
      tabutils.removeAttribute(aTab, "unread");
      aTab.removeAttribute("rotate");
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

//保护标签页、锁定标签页、冻结标签页
tabutils._protectAndLockTab = function() {
  gBrowser.protectTab = function protectTab(aTab, aForce, aRestoring) {
    if (aTab.hasAttribute("protected") && aForce != true) {
      tabutils.removeAttribute(aTab, "protected");
      if (!aRestoring && !gPrivateBrowsingUI.privateBrowsingEnabled) {
        PlacesUtils.tagging.untagURI(aTab.linkedBrowser.currentURI, ["protected"]);
      }
      this.mTabContainer.adjustTabstrip(aTab.pinned);
    }
    else if (!aTab.hasAttribute("protected") && aForce != false) {
      tabutils.setAttribute(aTab, "protected", true);
      if (!aRestoring && !gPrivateBrowsingUI.privateBrowsingEnabled && TU_getPref("extensions.tabutils.autoProtect", true)) {
        PlacesUtils.tagging.tagURI(aTab.linkedBrowser.currentURI, ["protected"]);
      }
      this.mTabContainer.adjustTabstrip(aTab.pinned);
    }
  };

  gBrowser.lockTab = function lockTab(aTab, aForce, aRestoring) {
    if (aTab.hasAttribute("locked") && aForce != true) {
      tabutils.removeAttribute(aTab, "locked");
      if (!aRestoring && !gPrivateBrowsingUI.privateBrowsingEnabled) {
        PlacesUtils.tagging.untagURI(aTab.linkedBrowser.currentURI, ["locked"]);
      }
    }
    else if (!aTab.hasAttribute("locked") && aForce != false) {
      tabutils.setAttribute(aTab, "locked", true);
      if (!aRestoring && !gPrivateBrowsingUI.privateBrowsingEnabled && TU_getPref("extensions.tabutils.autoLock", true)) {
        PlacesUtils.tagging.tagURI(aTab.linkedBrowser.currentURI, ["locked"]);
      }
    }
  };

  gBrowser.freezeTab = function freezeTab(aTab, aForce) {
    if ((!aTab.hasAttribute("protected") || !aTab.hasAttribute("locked")) && aForce != false) {
      this.protectTab(aTab, true);
      this.lockTab(aTab, true);
    }
    else if ((aTab.hasAttribute("protected") || aTab.hasAttribute("locked")) && aForce != true) {
      this.protectTab(aTab, false);
      this.lockTab(aTab, false);
    }
  };

  TU_hookCode("gBrowser.onTabRestoring", "}", function() {
    this.protectTab(aTab, ss.getTabValue(aTab, "protected") == "true", true);
    this.lockTab(aTab, ss.getTabValue(aTab, "locked") == "true", true);
  });

  gBrowser.autoProtectTab = function autoProtectTab(aTab, aURI, aTags) {
    if (!aTab.hasAttribute("protected") && aTags.indexOf("protected") > -1 && TU_getPref("extensions.tabutils.autoProtect", true))
      this.protectTab(aTab, true, true);
  };

  gBrowser.autoLockTab = function autoLockTab(aTab, aURI, aTags) {
    if (aURI.spec != "about:blank" && TU_getPref("extensions.tabutils.autoLock", true)) {
      let locked = tabutils.getURIsForTag("locked").some(function(bURI) aURI.spec.startsWith(bURI.spec));
      this.lockTab(aTab, locked, true);
    }
  };

  TU_hookCode("gBrowser.onTabOpen", "}", "this.autoProtectTab(aTab, uri, tags);this.autoLockTab(aTab, uri, tags);");
  TU_hookCode("gBrowser.onLocationChange", "}", "this.autoProtectTab(aTab, uri, tags);this.autoLockTab(aTab, uri, tags);");

  TU_hookCode("gBrowser.removeTab", "{", function() {
    if (aTab.hasAttribute("protected") || aTab.pinned && TU_getPref("extensions.tabutils.pinTab.autoProtect", false))
      return;
  });
  TU_hookCode("gBrowser.createTooltip", /(tab|tn).mOverCloseButton/, "$& && !$1.hasAttribute('protected')");

  TU_hookCode("gBrowser.loadURI", "{", function() {
    let locked = this.mCurrentTab.hasAttribute("locked")
              || this.mCurrentTab.pinned && TU_getPref("extensions.tabutils.pinTab.autoLock", false);
    if (locked && !aURI.startsWith("javascript:"))
      return this.loadOneTab(aURI, aReferrerURI, aCharset, null, null, false);
  });

  TU_hookCode("gBrowser.loadURIWithFlags", "{", function() {
    let locked = this.mCurrentTab.hasAttribute("locked")
              || this.mCurrentTab.pinned && TU_getPref("extensions.tabutils.pinTab.autoLock", false);
    if (locked && !aURI.startsWith("javascript:"))
      return this.loadOneTab(aURI, aReferrerURI, aCharset, aPostData, null, aFlags & Ci.nsIWebNavigation.LOAD_FLAGS_ALLOW_THIRD_PARTY_FIXUP);
  });

  TU_hookCode("contentAreaClick", /if[^{}]*event.button == 0[^{}]*{([^{}]|{[^{}]*}|{([^{}]|{[^{}]*})*})*(?=})/, "$&" + (function() {
    let locked = gBrowser.mCurrentTab.hasAttribute("locked")
              || gBrowser.mCurrentTab.pinned && TU_getPref("extensions.tabutils.pinTab.autoLock", false);
    if (locked && !href.startsWith("javascript:")) {
      openNewTabWith(href, linkNode.ownerDocument, null, event, false);
      event.preventDefault();
      return;
    }
  }).toString().replace(/^.*{|}$/g, ""));
};

//图标化标签页
tabutils._faviconizeTab = function() {
  gBrowser.faviconizeTab = function faviconizeTab(aTab, aForce, aRestoring) {
    if (aTab.hasAttribute("faviconized") && aForce != true) {
      tabutils.removeAttribute(aTab, "faviconized");
      tabutils.setTabValue(aTab, "faviconized", false); //for pinned but not iconified tabs
      if (!aRestoring && !gPrivateBrowsingUI.privateBrowsingEnabled) {
        PlacesUtils.tagging.untagURI(aTab.linkedBrowser.currentURI, ["faviconized"]);
      }
      this.mTabContainer.adjustTabstrip(aTab.pinned);
    }
    else if (!aTab.hasAttribute("faviconized") && aForce != false) {
      tabutils.setAttribute(aTab, "faviconized", true);
      if (!aRestoring && !gPrivateBrowsingUI.privateBrowsingEnabled && TU_getPref("extensions.tabutils.autoFaviconize", true)) {
        PlacesUtils.tagging.tagURI(aTab.linkedBrowser.currentURI, ["faviconized"]);
      }
      this.mTabContainer.adjustTabstrip(aTab.pinned);
    }
  };

  TU_hookCode("gBrowser.onTabRestoring", "}", function() {
    this.faviconizeTab(aTab, ss.getTabValue(aTab, "faviconized") == "true" ||
                             ss.getTabValue(aTab, "faviconized") != "false" && tabutils.getTabValue(aTab, "pinned") == "true", true);
  });

  gBrowser.autoFaviconizeTab = function autoFaviconizeTab(aTab, aURI, aTags) {
    if (this.mTabContainer.orient == "horizontal" && !aTab.pinned && aURI.spec != "about:blank" && TU_getPref("extensions.tabutils.autoFaviconize", true)) {
      let faviconized = tabutils.getURIsForTag("faviconized").some(function(bURI) aURI.spec.startsWith(bURI.spec));
      this.faviconizeTab(aTab, faviconized, true);
    }
  };

  TU_hookCode("gBrowser.onTabOpen", "}", "this.autoFaviconizeTab(aTab, uri, tags);");
  TU_hookCode("gBrowser.onLocationChange", "}", "this.autoFaviconizeTab(aTab, uri, tags);");
};

//固定标签页
tabutils._pinTab = function() {
};

//重命名标签页
tabutils._renameTab = function() {
  gBrowser.renameTab = function renameTab(aTab, aTitle, aRestoring) {
    if (aTab.getAttribute("title") == aTitle)
      return;

    if (aTitle)
      tabutils.setAttribute(aTab, "title", aTitle);
    else
      tabutils.removeAttribute(aTab, "title");

    if (!aRestoring && !gPrivateBrowsingUI.privateBrowsingEnabled && TU_getPref("extensions.tabutils.autoRename", true)) {
      PlacesUtils.tagging[aTitle ? "tagURI" : "untagURI"](aTab.linkedBrowser.currentURI, ["autoRename"]);

      let itemId = PlacesUtils.getItemIdForTaggedURI(aTab.linkedBrowser.currentURI, "autoRename");
      if (itemId != -1)
        PlacesUtils.bookmarks.setItemTitle(itemId, aTitle);
    }

    this.setTabTitle(aTab);
  }

  TU_hookCode("gBrowser.onTabRestoring", "}", function() {
    tabutils.restoreAttribute(aTab, "title");
    if (aTab.hasAttribute("title")) {
      aTab.label = aTab.getAttribute("title");
      aTab.crop = "end";
    }
  });

  gBrowser.autoRenameTab = function autoRenameTab(aTab, aURI, aTags) {
    if (!aTab.hasAttribute("title") && aTags.indexOf("autoRename") > -1 && TU_getPref("extensions.tabutils.autoRename", true)) {
      let itemId = PlacesUtils.getItemIdForTaggedURI(aURI, "autoRename");
      this.renameTab(aTab, PlacesUtils.bookmarks.getItemTitle(itemId), true);
    }
  };

  TU_hookCode("gBrowser.onTabOpen", "}", "this.autoRenameTab(aTab, uri, tags);");
  TU_hookCode("gBrowser.onLocationChange", "}", "this.autoRenameTab(aTab, uri, tags);");

  TU_hookCode("gBrowser.setTabTitle", "browser.contentTitle", "aTab.getAttribute('title') || $&");
  TU_hookCode("gBrowser.getWindowTitleForBrowser", "aBrowser.contentTitle", "this.mTabs[this.browsers.indexOf(aBrowser)].getAttribute('title') || $&");

  //Bookmark title as Tab title
  TU_hookCode("gBrowser.loadOneTab",
    ["{", "var lastArg = Object(arguments[arguments.length - 1]);"],
    [/(?=return tab;)/, function() {
      if (lastArg.title && TU_getPref("extensions.tabutils.titleAsBookmark", false))
        tab.setAttribute("title", lastArg.title);
    }]
  );

  TU_hookCode("gBrowser.loadTabs",
    ["{", "var lastArg = Object(arguments[arguments.length - 1]), aTitles = TU_getPref('extensions.tabutils.titleAsBookmark', false) ? lastArg.titles : null;"],
    [/(\w+) = .*addTab.*\[(.*)\].*/g, function(s, s1, s2) (function() {
      $0
      if (aTitles && aTitles[$2])
        $1.setAttribute("title", aTitles[$2]);
    }).toString().replace(/^.*{|}$/g, "").replace("$0", s).replace("$1", s1, "g").replace("$2", s2, "g")]
  );
};

//重启标签页
tabutils._restartTab = function() {
  gBrowser.restartTab = function restartTab(aTab) {
    if (aTab.hasAttribute("pending")) // Bug 817947 [Fx20]
      return;

    var tabState = tabutils._ss.getTabState(aTab);
    var bTab = this.addTab();
    bTab.collapsed = true;
    bTab.linkedBrowser.stop();
    bTab.linkedBrowser.docShell;
    this.swapBrowsersAndCloseOther(aTab, bTab);
    tabutils._ss.setTabState(aTab, tabState);
  };

  gBrowser.autoRestartTab = function autoRestartTab(aTab) {
    if (aTab.selected || aTab._restartTimer || ["busy", "pending"].some(function(aAttr) aTab.hasAttribute(aAttr)))
      return;

    let restartAfter = TU_getPref("extensions.tabutils.restartAfter", 0);
    if (restartAfter == 0)
      return;

    let spec = aTab.linkedBrowser.currentURI.spec;
    if (isBlankPageURL(spec) || tabutils.getURIsForTag("norestart").some(function(aURI) spec.startsWith(aURI.spec)))
      return;

    aTab._restartTimer = setTimeout(function(aTab) {
      if (aTab && aTab.parentNode)
        gBrowser.restartTab(aTab);
    }, restartAfter * 60 * 1000, aTab);
  };

  TU_hookCode("gBrowser.onTabSelect", "}", function() {
    if (aTab._restartTimer) {
      clearTimeout(aTab._restartTimer);
      aTab._restartTimer = null;
    }
  });

  TU_hookCode("gBrowser.onTabBlur", "}", function() {
    this.autoRestartTab(aTab);
  });

  TU_hookCode("gBrowser.mTabProgressListener", /(?=var location)/, function() {
    if (this.mTab._restartTimer) {
      clearTimeout(this.mTab._restartTimer);
      this.mTab._restartTimer = null;
    }
    this.mTabBrowser.autoRestartTab(this.mTab);
  });
};

//自动刷新标签页
tabutils._reloadEvery = function() {
  gBrowser.autoReloadTab = function autoReloadTab(aTab, aForce, aInterval, aRestoring) {
    if (aTab.hasAttribute("autoReload") && aForce != true) {
      tabutils.removeAttribute(aTab, "autoReload");
      tabutils.deleteTabValue(aTab, "reloadInterval");
      if (!aRestoring && !gPrivateBrowsingUI.privateBrowsingEnabled) {
        PlacesUtils.tagging.untagURI(aTab.linkedBrowser.currentURI, ["autoReload"]);
      }
      this.mTabContainer.adjustTabstrip(aTab.pinned);

      clearTimeout(aTab._reloadTimer);
    }
    else if (!aTab.hasAttribute("autoReload") && aForce == null || aForce == true) {
      tabutils.setAttribute(aTab, "autoReload", true);
      aTab._reloadInterval = aInterval || aTab._reloadInterval || TU_getPref("extensions.tabutils.reloadInterval", 10);
      TU_setPref("extensions.tabutils.reloadInterval", aTab._reloadInterval);
      tabutils.setTabValue(aTab, "reloadInterval", aTab._reloadInterval);

      if (!aRestoring && !gPrivateBrowsingUI.privateBrowsingEnabled && TU_getPref("extensions.tabutils.autoEnableAutoReload", true)) {
        PlacesUtils.tagging.tagURI(aTab.linkedBrowser.currentURI, ["autoReload"]);

        let itemId = PlacesUtils.getItemIdForTaggedURI(aTab.linkedBrowser.currentURI, "autoReload");
        if (itemId != -1)
          PlacesUtils.setAnnotationsForItem(itemId, [{name: "reloadInterval", value: aTab._reloadInterval}]);
      }
      this.mTabContainer.adjustTabstrip(aTab.pinned);

      clearTimeout(aTab._reloadTimer);
      aTab._reloadTimer = setTimeout(function(aTab) {
        if (aTab && aTab.parentNode)
          gBrowser.reloadTab(aTab);
      }, aTab._reloadInterval * 1000, aTab);
    }
  };

  TU_hookCode("gBrowser.onTabRestoring", "}", function() {
    this.autoReloadTab(aTab, ss.getTabValue(aTab, "autoReload") == "true", ss.getTabValue(aTab, "reloadInterval"), true);
  });

  gBrowser.autoAutoReloadTab = function autoAutoReloadTab(aTab, aURI, aTags) {
    if (!aTab.hasAttribute("autoReload") && aTags.indexOf("autoReload") > -1 && TU_getPref("extensions.tabutils.autoEnableAutoReload", true)) {
      let itemId = PlacesUtils.getItemIdForTaggedURI(aURI, "autoReload"), reloadInterval;
      if (PlacesUtils.annotations.itemHasAnnotation(itemId, "reloadInterval")) {
        reloadInterval = PlacesUtils.annotations.getItemAnnotation(itemId, "reloadInterval");
      }
      this.autoReloadTab(aTab, true, reloadInterval, true);
    }
  };

  TU_hookCode("gBrowser.onTabOpen", "}", "this.autoAutoReloadTab(aTab, uri, tags);");
  TU_hookCode("gBrowser.onLocationChange", "}", "this.autoAutoReloadTab(aTab, uri, tags);");

  TU_hookCode("gBrowser.mTabProgressListener", /(?=var location)/, function() {
    if (this.mTab.hasAttribute("autoReload")) {
      clearTimeout(this.mTab._reloadTimer);
      this.mTab._reloadTimer = setTimeout(function(aTab) {
        if (aTab && aTab.parentNode)
          gBrowser.reloadTab(aTab);
      }, this.mTab._reloadInterval * 1000, this.mTab);
    }
  });

  gBrowser.updateAutoReloadPopup = function updateAutoReloadPopup(aPopup) {
    aPopup.value = gBrowser.mContextTab._reloadInterval || TU_getPref("extensions.tabutils.reloadInterval", 10);
    aPopup.label = (function() {
      var m = parseInt(aPopup.value / 60), s = aPopup.value % 60;
      return (m > 1 ? m + " " + aPopup.getAttribute("minutes") : m > 0 ? m + " " + aPopup.getAttribute("minute") : "")
           + (m > 0 && s > 0 ? " " : "")
           + (s > 1 ? s + " " + aPopup.getAttribute("seconds") : s > 0 ? s + " " + aPopup.getAttribute("second") : "");
    })();

    var itemEnable = aPopup.getElementsByAttribute("anonid", "enable")[0];
    itemEnable.setAttribute("checked", gBrowser.mContextTabs.every(function(aTab) aTab.hasAttribute("autoReload")));
    itemEnable.setAttribute("label", itemEnable.getAttribute("text") + ": " + aPopup.label);

    var itemCustom = aPopup.getElementsByAttribute("anonid", "custom")[0];
    var item = aPopup.getElementsByAttribute("value", aPopup.value)[0];
    if (item) {
      item.setAttribute("checked", true);
    }
    else {
      itemCustom.setAttribute("checked", true);
      itemCustom.setAttribute("value", aPopup.value);
    }

    if (itemCustom.hasAttribute("checked")) {
      itemCustom.setAttribute("label", itemCustom.getAttribute("text") + ": " + aPopup.label);
    }
    else {
      itemCustom.setAttribute("label", itemCustom.getAttribute("text") + PlacesUIUtils.ellipsis);
    }
  };
};

// Bookmark tabs with history
tabutils._bookmarkTabs = function() {
  gBrowser.bookmarkTab = function(aTabs) {
    if (!("length" in aTabs))
      aTabs = [aTabs];

    if (aTabs.length > 1) {
      let tabURIs = !gPrivateBrowsingUI.privateBrowsingEnabled && TU_getPref("extensions.tabutils.bookmarkWithHistory", false) ?
                    Array.map(aTabs, function(aTab) [aTab.linkedBrowser.currentURI, [{name: 'bookmarkProperties/tabState', value: tabutils._ss.getTabState(aTab)}]]) :
                    Array.map(aTabs, function(aTab) aTab.linkedBrowser.currentURI);
      PlacesUIUtils.showBookmarkDialog({action: "add",
                                        type: "folder",
                                        URIList: tabURIs,
                                        hiddenRows: ["description"]}, window);
    }
    else
      PlacesCommandHook.bookmarkPage(aTabs[0].linkedBrowser, PlacesUtils.bookmarksMenuFolderId, true);
  };

  TU_hookCode("PlacesCommandHook.bookmarkPage",
    [/(?=.*(createItem|PlacesCreateBookmarkTransaction).*)/, function() {
      var annos = [descAnno];
      if (!gPrivateBrowsingUI.privateBrowsingEnabled && TU_getPref("extensions.tabutils.bookmarkWithHistory", false)) {
        let tab = gBrowser.mTabs[gBrowser.browsers.indexOf(aBrowser)];
        if (tab)
          annos.push({name: "bookmarkProperties/tabState", value: tabutils._ss.getTabState(tab)});
      }
    }],
    [/.*(createItem|PlacesCreateBookmarkTransaction).*/, function(s) s.replace("[descAnno]", "annos")]  // Bug 575955 [Fx13]
  );

  TU_hookCode("PlacesCommandHook.bookmarkCurrentPages",
    ["this.uniqueCurrentPages", (function() {
      !gPrivateBrowsingUI.privateBrowsingEnabled && TU_getPref("extensions.tabutils.bookmarkAllWithHistory", true) ?
      Array.map(gBrowser.allTabs, function(aTab) [aTab.linkedBrowser.currentURI, [{name: 'bookmarkProperties/tabState', value: tabutils._ss.getTabState(aTab)}]]) :
      Array.map(gBrowser.allTabs, function(aTab) aTab.linkedBrowser.currentURI);
    }).toString().replace(/^.*{|}$/g, "")],
    ["pages.length > 1", "true"]
  );

  //Highlight bookmarks with history
  TU_hookCode("PlacesViewBase.prototype._createMenuItemForPlacesNode", /(?=return element;)/, function() {
    if (aPlacesNode.itemId != -1 && PlacesUtils.annotations.itemHasAnnotation(aPlacesNode.itemId, "bookmarkProperties/tabState"))
      element.setAttribute("history", true);
  });

  TU_hookCode("PlacesToolbar.prototype._insertNewItem", "}", function() {
    if (aChild.itemId != -1 && PlacesUtils.annotations.itemHasAnnotation(aChild.itemId, "bookmarkProperties/tabState"))
      button.setAttribute("history", true);
  });

  //Open bookmarks with history
  TU_hookCode("gBrowser.loadOneTab",
    ["{", "var lastArg = Object(arguments[arguments.length - 1]);"],
    [/(?=return tab;)/, function() {
      if (lastArg.itemId && PlacesUtils.annotations.itemHasAnnotation(lastArg.itemId, "bookmarkProperties/tabState")) {
        tab.linkedBrowser.stop();
        tabutils._ss.setTabState(tab, PlacesUtils.annotations.getItemAnnotation(lastArg.itemId, "bookmarkProperties/tabState"));
      }
    }]
  );

  TU_hookCode("gBrowser.loadTabs",
    ["{", "var lastArg = Object(arguments[arguments.length - 1]), aItemIds = lastArg.itemIds;"],
    [/(\w+) = .*addTab.*\[(.*)\].*/g, function(s, s1, s2) (function() {
      $0
      if (aItemIds && aItemIds[$2] && PlacesUtils.annotations.itemHasAnnotation(aItemIds[$2], "bookmarkProperties/tabState")) {
        $1.linkedBrowser.stop();
        tabutils._ss.setTabState($1, PlacesUtils.annotations.getItemAnnotation(aItemIds[$2], "bookmarkProperties/tabState"));
      }
    }).toString().replace(/^.*{|}$/g, "").replace("$0", s).replace("$1", s1, "g").replace("$2", s2, "g")]
  );
};

tabutils._multiTabHandler = function() {

  //选择多个标签页
  gBrowser.isNormalTab = function isNormalTab(aTab) {
    return !aTab.pinned && !aTab.hidden && !aTab.closing;
  };

  gBrowser.__defineGetter__("allTabs", function() {
    let tabs = Array.filter(this.mTabs, this.isNormalTab);
    return tabs.length > 0 ? tabs : (this.visibleTabs || this.mTabs);
  });

  gBrowser.__defineGetter__("selectedTabs", function() {
    return Array.filter(this.mTabs, function(aTab) aTab.hasAttribute("multiselected"));
  });

  gBrowser.__defineSetter__("selectedTabs", function(val) {
    Array.forEach(this.mTabs, function(aTab) aTab.removeAttribute("multiselected"));
    Array.forEach(val, function(aTab) {
      if (aTab.boxObject.width > 0) {
        if (aTab.getAttribute("group-collapsed") == "true" && aTab.getAttribute("group-counter") > 1) {
          let tabs = this.siblingTabsOf(aTab);
          tabs.forEach(function(aTab) aTab.setAttribute("multiselected", true));
        }
        aTab.setAttribute("multiselected", true);
      }
    }, this);
    this._lastClickedTab = null;
    return val;
  });

  gBrowser.contextTabsOf = function contextTabsOf(aTab) {
    return aTab.hasAttribute("multiselected") ? this.selectedTabs :
           aTab.getAttribute("group-collapsed") == "true" || aTab.mOverTwisty ? this.siblingTabsOf(aTab) : [aTab];
  };

  gBrowser.selectTab = function selectTab(aTab, aForce) {
    if (aForce == null)
      aForce = !aTab.hasAttribute("multiselected");

    if (aTab.getAttribute("group-collapsed") == "true" && aTab.getAttribute("group-counter") > 1) {
      let tabs = this.siblingTabsOf(aTab);
      if (aForce)
        tabs.forEach(function(aTab) aTab.setAttribute("multiselected", true));
      else
        tabs.forEach(function(aTab) aTab.removeAttribute("multiselected"));
    }
    aForce ? aTab.setAttribute("multiselected", true) : aTab.removeAttribute("multiselected");
    this._lastClickedTab = aTab;
  };

  gBrowser.selectTabs = function selectTabs(aTab, aKeepSelection) {
    var bTab = this._lastClickedTab || this.mCurrentTab;
    var [start, end] = aTab._tPos < bTab._tPos ? [aTab._tPos, bTab._tPos] : [bTab._tPos, aTab._tPos];
    this.selectedTabs = Array.slice(this.mTabs, start, end + 1)
                             .concat(aKeepSelection ? this.selectedTabs : []);
    this._lastClickedTab = bTab;
  };

  gBrowser.selectAllTabs = function() {
    var allTabs = this.allTabs;
    this.selectedTabs = this.selectedTabs.map(function(aTab) aTab._tPos).join() ==
                        allTabs.map(function(aTab) aTab._tPos).join() ? (this.visibleTabs || this.mTabs) : allTabs;
  };

  TU_hookCode("gBrowser.onTabSelect", "}", function() {
    if (!aTab.hasAttribute("multiselected"))
      this.selectedTabs = [];
  });

  TU_hookCode("gBrowser.onTabHide", "}", function() {
    aTab.removeAttribute("multiselected");
  });

  TU_hookCode("gBrowser.onStackCollapsed", "}", function() {
    let tabs = this.siblingTabsOf(aTab);
    if (!tabs.every(function(aTab) aTab.hasAttribute("multiselected")))
      tabs.forEach(function(aTab) aTab.removeAttribute("multiselected"));
  });

//  var tabContextMenu = gBrowser.tabContextMenu;
//  tabContextMenu.setAttribute("oncommand", "gBrowser.selectedTabs = [];");

  //左侧/右侧/其他/重复/相似标签页
  gBrowser.leftTabsOf = function leftTabsOf(aTabs) {
    if (!("length" in aTabs))
      aTabs = [aTabs];

    return Array.slice(this.mTabs, 0, aTabs[0]._tPos).filter(this.isNormalTab);
  };

  gBrowser.rightTabsOf = function rightTabsOf(aTabs) {
    if (!("length" in aTabs))
      aTabs = [aTabs];

    return Array.slice(this.mTabs, aTabs[aTabs.length - 1]._tPos + 1).filter(this.isNormalTab);
  };

  gBrowser.otherTabsOf = function otherTabsOf(aTabs) {
    if (!("length" in aTabs))
      aTabs = [aTabs];

    return Array.filter(this.mTabs, function(aTab) this.isNormalTab(aTab) && Array.indexOf(aTabs, aTab) == -1, this);
  };

  gBrowser.duplicateTabsOf = function duplicateTabsOf(aTabs) {
    if (!("length" in aTabs))
      aTabs = [aTabs];

    return Array.filter(this.mTabs, function(aTab) this.isNormalTab(aTab) && Array.some(aTabs, function(bTab) {
      return aTab.linkedBrowser.currentURI.spec == bTab.linkedBrowser.currentURI.spec;
    }), this);
  };

  gBrowser.similarTabsOf = function similarTabsOf(aTabs) {
    if (!("length" in aTabs))
      aTabs = [aTabs];

    return Array.filter(this.mTabs, function(aTab) this.isNormalTab(aTab) && Array.some(aTabs, function(bTab) {
      try {
        return aTab.linkedBrowser.currentURI.host == bTab.linkedBrowser.currentURI.host;
      }
      catch (e) {
        return aTab.linkedBrowser.currentURI.spec == bTab.linkedBrowser.currentURI.spec;
      }
    }), this);
  };

  gBrowser.uniqueTabsOf = function uniqueTabsOf(aTabs) {
    if (!("length" in aTabs))
      aTabs = [aTabs];

    var seenURIs = {};
    return Array.reduce(aTabs, function(aTabs, aTab) {
      var uri = aTab.linkedBrowser.currentURI.spec;
      if (!(uri in seenURIs)) {
        seenURIs[uri] = true;
        aTabs.push(aTab);
      }
      return aTabs;
    }, []);
  };

  //关闭多个标签页
  TU_hookCode("gBrowser.warnAboutClosingTabs", /\w+(?= <= 1)/, "($& = arguments[1] && 'length' in arguments[1] ? arguments[1].length : $&)"); // Bug 866880 [Fx24]
  gBrowser.removeTabsBut = function removeTabsBut(aTabs, bTabs) {
    aTabs = aTabs ? "length" in aTabs ? aTabs : [aTabs] : [];
    bTabs = bTabs ? "length" in bTabs ? bTabs : [bTabs] : [];

    if (bTabs.length > 0)
      aTabs = Array.filter(aTabs, function(aTab) Array.indexOf(bTabs, aTab) == -1);

    if (aTabs.length == 0)
      return;

    if (aTabs.length == 1)
      return this.removeTab(aTabs[0], {animate: true});

    if (this.warnAboutClosingTabs("closingTabsEnum" in this ? this.closingTabsEnum.ALL : true, aTabs)) { // Bug 866880 [Fx24]
      if (Array.indexOf(aTabs, this.mCurrentTab) > -1)
        this.selectedTab = bTabs[0] || aTabs[0];

      let count = 0;
      for (let i = aTabs.length - 1; i >= 0; i--) {
        this.removeTab(aTabs[i]);
        if (!aTabs[i].parentNode)
          count++;
      }
      this._lastClosedTabsCount = count;
    }
  };

  TU_hookCode("undoCloseTab", /.*(ss|SessionStore).undoCloseTab.*/, "for (let i = aIndex == null ? gBrowser._lastClosedTabsCount || 1 : 1; i > 0; i--) $&"); // Bug 898732 [Fx26]

  gBrowser.closeLeftTabs = function(aTab) this.removeTabsBut(this.leftTabsOf(aTab), aTab);
  gBrowser.closeRightTabs = function(aTab) this.removeTabsBut(this.rightTabsOf(aTab), aTab);
  gBrowser.closeOtherTabs = function(aTab) this.removeTabsBut(this.otherTabsOf(aTab), aTab);
  gBrowser.closeDuplicateTabs = function(aTab) this.removeTabsBut(this.duplicateTabsOf(aTab), aTab);
  gBrowser.closeSimilarTabs = function(aTab) this.removeTabsBut(this.similarTabsOf(aTab), aTab);
  gBrowser.closeAllTabs = function() this.removeTabsBut(this.allTabs);
  gBrowser.closeAllDuplicateTabs = function() this.removeTabsBut(this.allTabs, this.uniqueTabsOf(this.allTabs));

  //拖曳多个标签页
  gBrowser.gatherTabs = function gatherTabs(aTabs, aTab, aSuppressTabMove) {
    let index = 0;
    if (aTab) {
      index = aTabs.indexOf(aTab);
      if (index == -1) {
        while (++index < aTabs.length && aTabs[index]._tPos < aTab._tPos);
        aTabs.splice(index, 0, aTab);
      }
    }

    for (let i = index - 1; i >= 0; i--) {
      aTabs[i]._suppressTabMove = aSuppressTabMove;
      this.moveTabBefore(aTabs[i], aTabs[i + 1]);
      delete aTabs[i]._suppressTabMove;
    }

    for (let i = index + 1; i < aTabs.length; i++) {
      aTabs[i]._suppressTabMove = aSuppressTabMove;
      this.moveTabAfter(aTabs[i], aTabs[i - 1]);
      delete aTabs[i]._suppressTabMove;
    }
  };

  gBrowser.moveTabBefore = function moveTabBefore(aTab, bTab) {
    this.moveTabTo(aTab, aTab._tPos < bTab._tPos ? bTab._tPos - 1 : bTab._tPos);
  };

  gBrowser.moveTabAfter = function moveTabAfter(aTab, bTab) {
    this.moveTabTo(aTab, aTab._tPos > bTab._tPos ? bTab._tPos + 1 : bTab._tPos);
  };

  TU_hookCode("gBrowser.onTabMove", "{", function() {
    if (aTab._suppressTabMove)
      return;
  });

  tabutils.addEventListener(gBrowser.mTabContainer, "dragstart", function(event) {
    if (event.target.localName == "tab") {
      let draggedTab = event.target;
      let draggedTabs = gBrowser.contextTabsOf(draggedTab);
      draggedTabs.splice(draggedTabs.indexOf(draggedTab), 1);
      draggedTabs.unshift(draggedTab);

      let dt = event.dataTransfer;
      draggedTabs.forEach(function(aTab, aIndex) {
        dt.mozSetDataAt(TAB_DROP_TYPE, aTab, aIndex);
        dt.mozSetDataAt("text/x-moz-text-internal", aTab.linkedBrowser.currentURI.spec, aIndex);
      });
    }
  }, true);

  TU_hookCode("gBrowser.mTabContainer._setEffectAllowedForDataTransfer",
    ["dt.mozItemCount > 1", "false"]
  );

  TU_hookCode("gBrowser.onTabMove", "}", function() {
    if (aTab.hasAttribute("multiselected")) {
      let selectedTabs = this.selectedTabs;
      if (selectedTabs[selectedTabs.length - 1]._tPos - selectedTabs[0]._tPos >= selectedTabs.length) {
        let tabs = selectedTabs.filter(function(aTab) aTab.boxObject.width > 0);
        tabs.splice(tabs.indexOf(aTab), 1);

        let index = 0;
        let oldPos = aTab._tPos > event.detail ? event.detail - 0.5 : event.detail + 0.5;
        while (index < tabs.length && tabs[index]._tPos < oldPos)
          index++;
        tabs.splice(index, 0, aTab);

        setTimeout(function(self) {
          self.selectedTabs = [];
          self.gatherTabs(tabs, aTab);
          self.selectedTabs = selectedTabs;
        }, 0, this);
      }
    }
  });

  TU_hookCode("gBrowser.moveTabTo", // Bug 822068 [Fx20]
    ["this.mCurrentTab._selected = false;", "let wasFocused = (document.activeElement == this.mCurrentTab);$&"],
    ["this.mCurrentTab._selected = true;", "$&;if (wasFocused) this.mCurrentTab.focus();"]
  );

  ["moveTabBackward", "moveTabForward", "moveTabToStart", "moveTabToEnd"].forEach(function(aMethod) {
    TU_hookCode.call(gBrowser, aMethod, "this.mCurrentTab.focus();", "");
  });

  TU_hookCode("gBrowser.moveTabBackward", "this.mCurrentTab._tPos", (function() { // Bug 656222 [Fx20]
    (function (self) {
      let tab = self.mCurrentTab.previousSibling;
      while (tab && tab.boxObject.width == 0)
        tab = tab.previousSibling;
      return tab ? tab._tPos + 1 : 0;
    })(this)
  }).toString().replace(/^.*{|}$/g, ""));

  TU_hookCode("gBrowser.moveTabForward", "this.mCurrentTab._tPos", (function() {
    (function (self) {
      let tab = self.mCurrentTab.nextSibling;
      while (tab && tab.boxObject.width == 0)
        tab = tab.nextSibling;
      return tab ? tab._tPos - 1 : self.mTabs.length;
    })(this)
  }).toString().replace(/^.*{|}$/g, ""));

  //Protect/Lock/Faviconize/Pin All Tabs
  [
    ["gBrowser.unreadTab", ["unread"]],
    ["gBrowser.protectTab", ["protected"]],
    ["gBrowser.lockTab", ["locked"]],
    ["gBrowser.freezeTab", ["protected", "locked"]],
    ["gBrowser.faviconizeTab", ["faviconized"]],
    ["gBrowser.pinTab", ["pinned"]],
    ["gBrowser.autoReloadTab", ["autoReload"]]
  ].forEach(function([aFuncName, aAttrs]) {
    TU_hookCode(aFuncName, "{", (function() {
      if ("length" in arguments[0]) {
        let aTabs = Array.slice(arguments[0]);
        if (aForce == null)
          aForce = !aTabs.every(function(aTab) aAttrs.every(function(aAttr) aTab.hasAttribute(aAttr)));

        let func = arguments.callee, args = Array.slice(arguments, 2);
        aTabs.forEach(function(aTab) {
          func.apply(this, Array.concat(aTab, aForce, args));
        }, this);
        return;
      }
    }).toString().replace(/^.*{|}$/g, "").replace("aAttrs", aAttrs.toSource()));
  });

  TU_hookCode("gBrowser.reloadTab", /.*reload\b.*/, "try {$&} catch (e) {}");

  gBrowser.moveTabToWindow = function moveTabToWindow(aTabs, aWindow) {
    if (!aWindow) {
      aTabs[0].selectedTabs = aTabs;
      return this.replaceTabWithWindow(aTabs[0]);
    }

    if (aWindow.gPrivateBrowsingUI.privateBrowsingEnabled != gPrivateBrowsingUI.privateBrowsingEnabled) // Bug 799001 [Fx20]
      return;

    let bTabs = [];
    aTabs.forEach(function(aTab) {
      let bTab = this.addTab();
      bTab.linkedBrowser.stop();
      bTab.linkedBrowser.docShell;
      this.swapBrowsersAndCloseOther(bTab, aTab);
      bTabs.push(bTab);
    }, aWindow.gBrowser);

    if (bTabs.length > 1 && aWindow.TU_getPref("extensions.tabutils.autoStack", false))
      aWindow.gBrowser.groupTabs(bTabs);

    return aWindow;
  };

  TU_hookCode("gBrowser.swapBrowsersAndCloseOther", /(?=.*_beginRemoveTab.*)/, function() {
    if ([gBrowserInit.onLoad, gBrowserInit._delayedStartup].indexOf(arguments.callee.caller) > -1 ||  // Bug 756313 [Fx19]
        ["onxbldrop", "_handleTabDrop"].indexOf(arguments.callee.caller.name) > -1) {
      let selectedTabs = aOtherTab.selectedTabs || remoteBrowser.contextTabsOf(aOtherTab);
      if (selectedTabs.length > 1) {
        this.swapBrowsersAndCloseOther(aOurTab, selectedTabs.shift());

        let bTabs = [aOurTab];
        selectedTabs.forEach(function(aTab, aIndex) {
          let bTab = this.addTab();
          bTab.linkedBrowser.stop();
          bTab.linkedBrowser.docShell;
          this.moveTabTo(bTab, aOurTab._tPos + aIndex + 1);
          this.swapBrowsersAndCloseOther(bTab, aTab);
          bTabs.push(bTab);
        }, this);

        if (bTabs.length < this.mTabs.length && TU_getPref("extensions.tabutils.autoStack", false))
          this.groupTabs(bTabs);

        return;
      }
    }
  });

  [
    ["context_reloadTab", "gBrowser.mContextTabs.forEach(gBrowser.reloadTab, gBrowser);"],
    ["context_reloadAllTabs", "gBrowser.allTabs.forEach(gBrowser.reloadTab, gBrowser);"],
    ["context_pinTab", "gBrowser.pinTab(gBrowser.mContextTabs, true);"],
    ["context_unpinTab", "gBrowser.pinTab(gBrowser.mContextTabs, false);"],
    ["context_openTabInWindow", "gBrowser.moveTabToWindow(gBrowser.mContextTabs);"],
    ["context_bookmarkTab", "gBrowser.bookmarkTab(gBrowser.mContextTabs);"],
    ["context_closeTab", "gBrowser.removeTabsBut(gBrowser.mContextTabs);"],
    ["context_closeOtherTabs", "gBrowser.removeTabsBut(gBrowser.allTabs, gBrowser.mContextTabs);"]
  ].forEach(function([aId, aCommand]) {
    var item = document.getElementById(aId);
    if (item) {
      item.setAttribute("oncommand", aCommand);
      item.setAttribute("multiselected", "any");
    }
  });
}

tabutils._tabClickingOptions = function() {

  //载入剪贴板URL
  gBrowser.loadURLFromClipboard = function loadURLFromClipboard(aTab) {
    var url = readFromClipboard();
    if (!url)
      return;

    if (aTab) {
      aTab.linkedBrowser.stop();
      aTab.linkedBrowser.loadURIWithFlags(url, Ci.nsIWebNavigation.LOAD_FLAGS_ALLOW_THIRD_PARTY_FIXUP);
    }
    else {
      this.loadOneTab(url, null, null, null, TU_getPref('extensions.tabutils.loadNewInBackground', false), true);
    }
  };

  //浏览历史菜单
  TU_hookCode("FillHistoryMenu",
    ["count <= 1", "count == 0"],
    [/(?=var webNav)/, function() {
      var tab = document.popupNode;
      if (!tab || tab.localName != 'tab')
        tab = gBrowser.selectedTab;
      aParent.value = tab._tPos;
    }],
    ["gBrowser.webNavigation", "tab.linkedBrowser.webNavigation"]
  );
  TU_hookCode("gotoHistoryIndex",
    ["gBrowser.selectedTab", "tab", "g"],
    ["gBrowser", "tab.linkedBrowser", "g"],
    [/(?=let where)/, "let tab = gBrowser.mTabs[aEvent.target.parentNode.value];"]
  );

  TU_hookCode("TabContextMenu.updateContextMenu", "aPopupMenu.triggerNode", "document.popupNode", "g");
  TU_hookCode("gBrowser.mTabContainer._selectNewTab", "{", function() {
    if (["onxblmousedown"].indexOf(arguments.callee.caller.name) > -1 &&
        !aNewTab.selected)
      aNewTab.setAttribute("firstclick", true);
  });

  gBrowser.onTabClick = function onTabClick(event) {
    if (event.target.hasAttribute("firstclick")) {
      event.target.removeAttribute("firstclick");
      if (event.button == 0 && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey)
        return;
    }

    if (event.altKey) {
      window.addEventListener("keyup", function(event) {
        if (event.keyCode == event.DOM_VK_ALT) {
          window.removeEventListener("keyup", arguments.callee, true);
          event.preventDefault();
          event.stopPropagation();
        }
      }, true);
    }

    var type = [
      event.ctrlKey || event.metaKey ? "Ctrl" : "",
      event.altKey ? "Alt" : "",
      event.shiftKey ? "Shift" : "",
      event.button == 1 ? "Middle" : event.button == 2 ? "Right" : ""
    ].join("").replace(/./, function(s) s.toLowerCase());

    if (type) {
      this.doClickAction(type, event);
    }
    else if (event.detail == 1 && !event.target.mOverCloseButton) {
      event.target._leftClickTimer = setTimeout(function(self) {
        self.doClickAction("left", event);
      }, TU_getPref("extensions.tabutils.leftClickTabDelay", 250), this);
    }
  };

  gBrowser.onTabBarDblClick = function onTabBarDblClick(event) {
    if (event.button == 0 && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey
        && !this._blockDblClick && !gBrowser._blockDblClick) {
      clearTimeout(event.target._leftClickTimer);
      this.doClickAction("dbl", event);
    }
  };

  gBrowser._getTargetTab = function _getTargetTab(event) {
    if (event.target.localName == "tab")
      return event.target;

    for (let target = event.originalTarget; target; target = target.parentNode) {
      switch (target.localName) {
        case "tab":
        case "tabs": return target;
        case "menuitem": return target.tab;
        case "toolbarbutton": return target.command == "cmd_newNavigatorTab" ? target : null;
      }
    }
    return null;
  };

  gBrowser.doClickAction = function doClickAction(type, event) {
    var target = this._getTargetTab(event);
    if (!target)
      return;

    TabContextMenu.contextTab = target.localName == "tab" ? target : gBrowser.mCurrentTab;
    gBrowser.mContextTabs = gBrowser.contextTabsOf(gBrowser.mContextTab);

    var prefName = target.localName == "tab" ? "ClickTab" :
                   target.localName == "tabs" ? "ClickTabBar" : "ClickNewTabButton";
    var action = TU_getPref("extensions.tabutils." + type + prefName, 0);
    var code = TU_getPref("extensions.tabutils.mouse." + action + ".oncommand");
    if (code) {
      try {
        new Function("event", code)(event);
      }
      catch (e) {}

      event.preventDefault();
      event.stopPropagation();
      return;
    }

    function $() document.getElementById.apply(document, arguments);

    switch (action) {
      case 0: //Default
        return;
      case 1: //New Tab
        BrowserOpenTab();
        break;
      case 2: //Duplicate Tab
        $("context_duplicateTab").doCommand();
        break;
      case 3: //Reload Tab
        $("context_reloadTab").doCommand();
        break;
      case 4: //Close Tab
        $("context_closeTab").doCommand();
        break;
      case 5: //Undo Close Tab
        undoCloseTab();
        break;
      case 6: //Load URL from Clipboard
        gBrowser.loadURLFromClipboard(target.localName == "tab" ? gBrowser.mContextTab : null);
        break;
      case 7: //Switch to Last Selected Tab
        if (gBrowser.mContextTab.selected) {
          gBrowser.selectedTab = gBrowser.getLastSelectedTab();
        }
        break;
      case 11: //Session History Menu
        var backForwardMenu = $("backForwardMenu");
        document.popupNode = gBrowser.mContextTab;
        backForwardMenu.setAttribute("onpopuphidden", "if (event.target == this) document.popupNode = null;");
        backForwardMenu.openPopupAtScreen(event.screenX, event.screenY, true);
        break;
      case 12: //Recently Closed Tabs
        $("undoCloseTabPopup").openPopupAtScreen(event.screenX, event.screenY, true);
        break;
      case 13: //List All Tabs
        var allTabsPopup = gBrowser.mTabContainer.mAllTabsPopup;
        if (allTabsPopup) {
          allTabsPopup.openPopupAtScreen(event.screenX, event.screenY, true);
        }
        break;
      case 14: //Tab Context Menu
        var tabContextMenu = gBrowser.tabContextMenu;
        document.popupNode = gBrowser.mContextTab;
        tabContextMenu.setAttribute("onpopuphidden", "if (event.target == this) document.popupNode = null;");
        tabContextMenu.openPopupAtScreen(event.screenX, event.screenY, true);
        break;
      case 16: //Toolbar Context Menu
        $("toolbar-context-menu").openPopupAtScreen(event.screenX, event.screenY, true);
        break;
      case 15: //Bookmarks
        $("bookmarksPopup").openPopupAtScreen(event.screenX, event.screenY, false);
        break;
      case 21: //Protect Tab
        $("context_protectTab").doCommand();
        break;
      case 22: //Lock Tab
        $("context_lockTab").doCommand();
        break;
      case 23: //Freeze Tab
        gBrowser.freezeTab(gBrowser.mContextTabs);
        break;
      case 24: //Faviconize Tab
        $("context_faviconizeTab").doCommand();
        break;
      case 25: //Pin Tab
        gBrowser.pinTab(gBrowser.mContextTabs);
        break;
      case 26: //Hide Tab
        break;
      case 27: //Rename Tab
        $("context_renameTab").doCommand();
        break;
      case 28: //Restart Tab
        $("context_restartTab").doCommand();
        break;
      case 29: //Reload Tab Every
        $("context_reloadEvery").getElementsByAttribute("anonid", "enable")[0].doCommand();
        break;
      case 31: //Select a Tab
        $("context_selectTab").doCommand();
        break;
      case 32: //Select Multiple Tabs
        $("context_selectTabs").doCommand();
        break;
      case 33: //Select Multiple Tabs (+)
        gBrowser.selectTabs(gBrowser.mContextTab, true);
        break;
      case 34: //Select All Tabs
        $("context_selectAllTabs").doCommand();
        break;
      case 35: //Unselect All Tabs
        $("context_unselectAllTabs").doCommand();
        break;
      case 36: //Invert Selection
        $("context_invertSelection").doCommand();
        break;
      case 37: //Select Similar Tabs
        gBrowser.selectedTabs = gBrowser.similarTabsOf(gBrowser.mContextTabs);
        break;
      case 41: //Close Left Tabs
        $("context_closeLeftTabs").doCommand();
        break;
      case 42: //Close Right Tabs
        $("context_closeRightTabs").doCommand();
        break;
      case 43: //Close Other Tabs
        $("context_closeOtherTabs").doCommand();
        break;
      case 44: //Close Duplicate Tabs
        $("context_closeDuplicateTabs").doCommand();
        break;
      case 45: //Close Similar Tabs
        $("context_closeSimilarTabs").doCommand();
        break;
      case 46: //Close All Tabs
        $("context_closeAllTabs").doCommand();
        break;
      case 51: //Collapse/Expand Stack
        if (gBrowser.mContextTab.getAttribute("group-collapsed") == "true")
          $("context_expandGroup").doCommand();
        else
          $("context_collapseGroup").doCommand();
        break;
      case 52: //Recolor Stack
        $("context_colorGroup").doCommand();
        break;
      default: //Do Nothing
        break;
    }

    event.preventDefault();
    event.stopPropagation();
  };

  gBrowser.mTabContainer.setAttribute("onclick", "if (event.button == 0) gBrowser.onTabClick(event);");
  gBrowser.mTabContainer.setAttribute("ondblclick", "gBrowser.onTabBarDblClick(event);");
  tabutils.addEventListener(gBrowser.mTabContainer, "MozMouseHittest", function(event) {if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey || event.detail > 0) event.stopPropagation();}, true);
  tabutils.addEventListener(gBrowser.mTabContainer, "click", function(event) {if (event.button == 1) gBrowser.onTabClick(event);}, true);
  tabutils.addEventListener(gBrowser.mTabContainer, "contextmenu", function(event) {if (event.button == 2) gBrowser.onTabClick(event);}, true);
  tabutils.addEventListener(gBrowser.mTabContainer, "dblclick", function(event) {if (event.target.localName == "tabs") gBrowser.onTabBarDblClick(event);}, true);

  //Mouse release to select
  TU_hookCode("gBrowser.mTabContainer._selectNewTab", "{", function() {
    if (["onxblmousedown"].indexOf(arguments.callee.caller.name) > -1 &&
        TU_getPref("extensions.tabutils.mouseReleaseSelect", true))
      return;
  });

  TU_hookCode("gBrowser.onTabClick", "{", function() {
    if (event.button == 0 && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey
        && event.target.localName == "tab" && !event.target.selected && !event.target.mOverCloseButton) {
      this.mTabContainer._selectNewTab(event.target);
      return;
    }
  });

  //Mouse hover to select
  gBrowser.mTabContainer._mouseHoverSelectTimer = null;
  tabutils.addEventListener(gBrowser.mTabContainer, 'mouseover', function(event) {
    if (event.target.localName == 'tab' && !event.target.selected && TU_getPref("extensions.tabutils.mouseHoverSelect", false)) {
      clearTimeout(this._mouseHoverSelectTimer);
      this._mouseHoverSelectTimer = setTimeout(function(aTab) {
        if (aTab && !aTab.mOverCloseButton)
          gBrowser.selectedTab = aTab;
      }, TU_getPref("extensions.tabutils.mouseHoverSelectDelay", 250), event.target);
    }
  }, false);

  tabutils.addEventListener(gBrowser.mTabContainer, 'mouseout', function(event) {
    if (event.target.localName == 'tab') {
      clearTimeout(this._mouseHoverSelectTimer);
      this._mouseHoverSelectTimer = null;
    }
  }, false);

  //Mouse scroll to select
  tabutils.addEventListener(gBrowser.mTabContainer, 'DOMMouseScroll', function(event) {
    if (event.ctrlKey) {
      document.getElementById(event.detail < 0 ? "cmd_prevGroup" : "cmd_nextGroup").doCommand();
      event.stopPropagation();
      return;
    }

    if (event.originalTarget != this.mTabstrip._scrollButtonUp &&
        event.originalTarget != this.mTabstrip._scrollButtonDown &&
        TU_getPref("extensions.tabutils.mouseScrollSelect", false)) {
      let scrollDir = event.detail < 0 ^ TU_getPref("extensions.tabutils.mouseScrollSelectDir", false) ? -1 : 1;
      this.advanceSelectedTab(scrollDir, TU_getPref("extensions.tabutils.mouseScrollSelectWrap", false));
      event.stopPropagation();
    }
  }, true);

  //Center current tab
  TU_hookCode("gBrowser.onTabSelect", "}", function() {
    if (TU_getPref("extensions.tabutils.centerCurrentTab", false)) {
      let tabStrip = this.mTabContainer.mTabstrip;
      let scrollRect = tabStrip.scrollClientRect;
      let tabRect = aTab.getBoundingClientRect();
      let [start, end] = tabStrip._startEndProps;
      tabStrip._stopSmoothScroll();
      tabStrip.scrollPosition += (tabRect[start] + tabRect[end])/2 - (scrollRect[start] + scrollRect[end])/2;
    }
  });
};

tabutils._miscFeatures = function() {
  TU_hookCode("gBrowser.onTabOpen", "}", function() { //Bug 615039
    TU_hookCode.call(aTab.linkedBrowser, "loadURIWithFlags", "{", function() {
      try {
        makeURI(aURI);
      }
      catch (e) {
        try {
          if (aURI && aURI.indexOf(".") == -1
              && aFlags & Ci.nsIWebNavigation.LOAD_FLAGS_ALLOW_THIRD_PARTY_FIXUP
              && TU_getPref("keyword.enabled")
              && TU_getPref("network.dns.ignoreHostonly", false))
            aURI = tabutils._URIFixup.keywordToURI(aURI).spec;
        }
        catch (e) {}
      }
    });
  });

  if ("TreeStyleTabBrowser" in window) //Compatibility with Tree Style Tab
  TU_hookCode("TreeStyleTabBrowser.prototype.positionPinnedTabs", "{", "return;");

  if ("openGMarkLabelInTabs" in window) //Compatibility with GMarks
  TU_hookCode("openGMarkLabelInTabs",
    [/.*openUILinkIn.*/, ""],
    [/(?=.*(labelArray)(?![\s\S]*\1))/, function() {
      var urls = [label.url for (label of labelArray)];
      var loadInBackground = TU_getPref("browser.tabs.loadBookmarksInBackground");
      gBrowser.loadTabs(urls, loadInBackground, false);
    }]
  );

  TU_hookCode("BookmarkingUI" in window ? "BookmarkingUI._updateStar" : "PlacesStarButton._updateStateInternal", /(?=.*this._itemIds.*)/, function() { //Bug 650527
    this._itemIds = this._itemIds.filter(function(itemId) {
      var parentId = PlacesUtils.bookmarks.getFolderIdForItem(itemId);
      var grandparentId = PlacesUtils.bookmarks.getFolderIdForItem(parentId);
      return grandparentId != PlacesUtils.tagsFolderId;
    });
  });

  //Compatibility with themes
  let os = Services.appinfo.OS; //WINNT, Linux or Darwin
  let version = parseFloat(Services.appinfo.version);
  document.documentElement.setAttribute("OS", os);
  document.documentElement.setAttribute("v4", version >= 4.0);
  document.documentElement.setAttribute("v6", version >= 6.0);
  document.documentElement.setAttribute("v14", version >= 14.0);
  document.documentElement.setAttribute("v21", version >= 21.0);

  for (let sheet of Array.slice(document.styleSheets)) {
    switch (sheet.href) {
      case "chrome://browser/skin/browser.css":
        for (let cssRule of Array.slice(sheet.cssRules)) {
          if (/> .tabbrowser-tab/.test(cssRule.selectorText)) {
            tabutils.insertRule(cssRule.cssText.replace(RegExp.lastMatch, ".tabbrowser-tab"));
            continue;
          }

          if (/> .tabbrowser-arrowscrollbox > .arrowscrollbox-scrollbox/.test(cssRule.selectorText)) {
            tabutils.insertRule(cssRule.cssText.replace(RegExp.lastMatch, "#PinnedTabsBarItems"));
            continue;
          }

          switch (cssRule.selectorText) {
            case ".tabbrowser-arrowscrollbox > .arrowscrollbox-scrollbox":
              tabutils.insertRule(cssRule.cssText.replace(cssRule.selectorText, ".tabbrowser-tabs[orient='horizontal']:not([overflow]):not([multirow]) $&"))
                      .style.MozMarginStart = "-" + cssRule.style.MozPaddingStart;
              tabutils.insertRule(cssRule.cssText.replace(cssRule.selectorText, "#PinnedTabsBarItems"));
              tabutils.insertRule(cssRule.cssText.replace(cssRule.selectorText, ".tabbrowser-tabs[orient='horizontal']:not([overflow]):not([multirow]) #PinnedTabsBarItems"))
                      .style.MozMarginEnd = "-" + cssRule.style.MozPaddingEnd;
              break;
            case ".tab-throbber[pinned], .tab-icon-image[pinned]":
            case ".tab-throbber[pinned], .tab-icon-image[pinned], .tabs-newtab-button > .toolbarbutton-icon":
              tabutils.insertRule(cssRule.cssText.replace(cssRule.selectorText, ".tabbrowser-tab[faviconized] :-moz-any(.tab-throbber, .tab-icon-image)"));
              break;
          }
        }
        break;
      case "chrome://clrtabs/skin/prefs.css": // Compat. with ColorfulTabs 17.2
        for (let cssRule of Array.slice(sheet.cssRules)) {
          switch (cssRule.selectorText) {
            case "tab.tabbrowser-tab .tab-text.tab-label":
              cssRule.style.setProperty("color", cssRule.style.getPropertyValue("color"), "");
              break;
          }
        }
        break;
    }
  }
};

//浏览区右键菜单
tabutils._mainContextMenu = function() {
  nsContextMenu.prototype.isLinkSelected = function() {
    var focusedWindow = document.commandDispatcher.focusedWindow;
    if (!focusedWindow || focusedWindow == window)
      focusedWindow = window.content;

    var links = focusedWindow.document.links;
    var selection = focusedWindow.getSelection();
    if (!links || !selection)
      return false;

    this.linkURLs = [];
    for (let link of links) {
      if (selection.containsNode(link, true) && this.linkURLs.indexOf(link.href) == -1)
        this.linkURLs.push(link.href);
    }

    var item = document.getElementById("context-openselectedlinksintab");
    item.setAttribute("label", item.getAttribute("label").replace(/\d*(?=])/, this.linkURLs.length));

    return this.linkURLs.length > 1;
  };

  nsContextMenu.prototype.openSelectedLinksInTab = function() {
    this.linkURLs.forEach(function(aURL) openNewTabWith(aURL, this.target.ownerDocument, null, null, false), this);
  };

  //TU_hookCode("nsContextMenu.prototype.initOpenItems", /.*openlinkincurrent.*/, function(s) s.replace("onPlainTextLink", "shouldShow"));
  TU_hookCode("nsContextMenu.prototype.initOpenItems", "}", function() {
    this.showItem("context-openselectedlinksintab", this.isLinkSelected());
  });
};

//标签页右键菜单
tabutils._tabContextMenu = function() {
  function $() {return document.getElementById.apply(document, arguments);}

  var tabContextMenu = gBrowser.tabContextMenu;
  tabContextMenu.insertBefore($("context_closeOtherTabs"), $("context_closeTab").nextSibling);

  Array.slice($("tabContextMenu-template").childNodes).forEach(function(aItem, aIndex, aItems) {
    var refNode;
    switch (true) {
      case aItem.getAttribute("insertafter") != "":
        refNode = tabContextMenu.getElementsByAttribute("id", aItem.getAttribute("insertafter"))[0];
        refNode = refNode && refNode.nextSibling;
        break;
      case aItem.getAttribute("insertbefore") != "":
        refNode = tabContextMenu.getElementsByAttribute("id", aItem.getAttribute("insertbefore"))[0];
        break;
      default:
        refNode = aItems[aIndex - 1] && aItems[aIndex - 1].nextSibling;
        break;
    }
    tabContextMenu.insertBefore(aItem, refNode);
  });

  tabutils.addEventListener(tabContextMenu.parentNode, "popupshowing", function(event) {
    if (event.target != tabContextMenu)
      return;

    for (let item of tabContextMenu.childNodes)
      item.hidden = false;
  }, true);

  tabutils.addEventListener(tabContextMenu.parentNode, "popupshowing", function(event) {
    if (event.target != tabContextMenu)
      return;

    gBrowser.mContextTabs = gBrowser.contextTabsOf(gBrowser.mContextTab);

    var mselected = gBrowser.mContextTab.hasAttribute("multiselected");
    var grouponly = gBrowser.mContextTabs.every(function(aTab) aTab.hasAttribute("group") && aTab.getAttribute("group-counter") != 1);
//    var disableCollapse = grouponly && gBrowser.mContextTabs.every(function(aTab) aTab.getAttribute("group-collapsed") == "true");
//    var disableExpand = grouponly && gBrowser.mContextTabs.every(function(aTab) aTab.getAttribute("group-collapsed") != "true");

    var contextTab = gBrowser.mContextTab;
    $("context_collapseGroup").setAttribute("disabled", contextTab.getAttribute("group-collapsed") == "true");
    $("context_expandGroup").setAttribute("disabled", contextTab.getAttribute("group-collapsed") != "true");
    $("context_splitGroup").setAttribute("disabled", contextTab.getAttribute("group-collapsed") == "true" ||
                                                     contextTab.hasAttribute("group-first") ||
                                                     contextTab.hasAttribute("group-last"));

    var lastVisibleItem = null;
    for (let item of tabContextMenu.childNodes) {
      switch (true) {
        case item.localName == "menuseparator":
          item.hidden = !lastVisibleItem || lastVisibleItem.localName == "menuseparator";
          break;
        case mselected && (item.getAttribute("multiselected") == "false" || item.getAttribute("multiselected") == ""):
        case !mselected && item.getAttribute("multiselected") == "true":
        case !grouponly && item.getAttribute("grouponly") == "true":
          item.hidden = true;
          break;
      }

      if (!item.hidden && !item.collapsed)
        lastVisibleItem = item;
    }
    if (lastVisibleItem && lastVisibleItem.localName == "menuseparator")
      lastVisibleItem.hidden = true;

    var item = $("context_readTab");
    var checked = gBrowser.mContextTabs.every(function(aTab) aTab.getAttribute("unread") != "true");
    item.setAttribute("label", checked ? item.getAttribute("label_checked") : item.getAttribute("label_unchecked"));
    item.setAttribute("checked", checked);
    item.setAttribute("disabled", gBrowser.mContextTabs.every(function(aTab) aTab.selected));

    [
      ["context_protectTab", ["protected"]],
      ["context_lockTab", ["locked"]],
      ["context_faviconizeTab", ["faviconized"]]
    ].forEach(function([aId, aAttrs]) {
      $(aId).setAttribute("checked", gBrowser.mContextTabs.every(function(aTab) aAttrs.every(function(aAttr) aTab.hasAttribute(aAttr))));
    });

    var autoProtect = TU_getPref("extensions.tabutils.pinTab.autoProtect", false);
    var autoLock = TU_getPref("extensions.tabutils.pinTab.autoLock", false);
    var disableProtect = autoProtect && gBrowser.mContextTabs.every(function(aTab) aTab.pinned && !aTab.hasAttribute("protected"));
    var disableLock = autoLock && gBrowser.mContextTabs.every(function(aTab) aTab.pinned && !aTab.hasAttribute("locked"));

    if (disableProtect) $("context_protectTab").setAttribute("checked", true);
    if (disableLock) $("context_lockTab").setAttribute("checked", true);

    $("context_closeTab").setAttribute("disabled", $("context_protectTab").getAttribute("checked") == "true");
    $("context_protectTab").setAttribute("disabled", disableProtect);
    $("context_lockTab").setAttribute("disabled", disableLock);

    var disableLeft = gBrowser.leftTabsOf(gBrowser.mContextTabs).length == 0;
    var disableRight = gBrowser.rightTabsOf(gBrowser.mContextTabs).length == 0;
    var disableOther = gBrowser.otherTabsOf(gBrowser.mContextTabs).length == 0;

    $("context_closeLeftTabs").setAttribute("disabled", disableLeft);
    $("context_closeRightTabs").setAttribute("disabled", disableRight);
    $("context_closeOtherTabs").setAttribute("disabled", disableOther);
    $("context_closeDuplicateTabs").setAttribute("disabled", disableOther);
    $("context_closeSimilarTabs").setAttribute("disabled", disableOther);

    var selectedTabs = gBrowser.selectedTabs;
    $("context_groupTab").setAttribute("disabled", selectedTabs.length <= 1);
    $("context_selectTab").setAttribute("checked", mselected);
    $("context_unselectAllTabs").setAttribute("disabled", selectedTabs.length == 0);

    $("context_openTabInWindow").collapsed = !$("context_moveToWindow").collapsed;
    $("context_mergeWindow").setAttribute("disabled", Services.wm.getZOrderDOMWindowEnumerator("navigator:browser", false).getNext() == window);

    $("context_mergeGroup").hidden = $("context_tabViewMenu").hidden;
    $("context_mergeGroup").setAttribute("disabled", !Array.some(gBrowser.mTabs, function(aTab) aTab.hidden));
  }, false);

  tabutils.populateWindowMenu = function populateWindowMenu(aPopup, aExcludePopup) {
    while (aPopup.lastChild && aPopup.lastChild.localName != "menuseparator")
      aPopup.removeChild(aPopup.lastChild);

    var winEnum = Services.wm.getEnumerator("navigator:browser");
    while (winEnum.hasMoreElements()) {
      var win = winEnum.getNext();
      var m = document.createElement("menuitem");
      m.setAttribute("class", "menuitem-iconic bookmark-item menuitem-with-favicon");
      m.setAttribute("label", win.gBrowser.mCurrentTab.label);
      m.setAttribute("image", win.gBrowser.mCurrentTab.image);
      m.setAttribute("acceltext", "[" + win.gBrowser.mTabs.length + "]");
      m.setAttribute("disabled", win == window || aExcludePopup && !win.toolbar.visible ||
                                 win.gPrivateBrowsingUI.privateBrowsingEnabled != gPrivateBrowsingUI.privateBrowsingEnabled);
      m.window = win;
      aPopup.appendChild(m);
    }
  };
};

// Panorama enhancements
tabutils._tabView = function() {
  if (!("TabView" in window)) {
    TU_setPref("extensions.tabutils.menu.context_tabViewMenu", false);
    TU_setPref("extensions.tabutils.menu.context_mergeGroup", false);
    return;
  }

  TabView.populateGroupMenu = function(aPopup, aExcludeEmpty) {
    while (aPopup.lastChild && aPopup.lastChild.localName != "menuseparator")
      aPopup.removeChild(aPopup.lastChild);

    if (!this._window && !Array.some(gBrowser.mTabs, function(aTab) aTab.hidden))
      return;

    let self = this;
    this._initFrame(function() {
      let activeGroupItem = self._window.GroupItems.getActiveGroupItem();
      self._window.GroupItems.groupItems.forEach(function(groupItem) {
        if (!groupItem.hidden && (groupItem.getChildren().length > 0 || !aExcludeEmpty && groupItem.getTitle().length > 0)) {
          let activeTab = groupItem.getActiveTab() || groupItem.getChild(0);
          let m = document.createElement("menuitem");
          m.setAttribute("class", "menuitem-iconic bookmark-item menuitem-with-favicon");
          m.setAttribute("label", activeTab ? activeTab.tab.label : "");
          m.setAttribute("image", activeTab ? activeTab.tab.image : "");
          m.setAttribute("acceltext", groupItem.getTitle() + "[" + groupItem.getChildren().length + "]");
          m.setAttribute("disabled", groupItem == activeGroupItem);
          m.value = groupItem;
          aPopup.appendChild(m);
        }
      });
    });
  };

  TabView.moveTabsTo = function(aTabs, aGroupItem) {
    if (!aGroupItem.isAGroupItem) {
      TabView.moveTabTo(aGroupItem.tab, null);
      aGroupItem = aGroupItem.parent;
    }
    aTabs.forEach(function(aTab) TabView.moveTabTo(aTab, aGroupItem.id));
    gBrowser.updateCurrentBrowser(true);
  };

  TabView.mergeGroup = function(aGroupItem) {
    if (aGroupItem.isAGroupItem) {
      this._window.GroupItems.newTab({});

      let activeGroupItem = this._window.GroupItems.getActiveGroupItem();
      if (activeGroupItem != aGroupItem)
        aGroupItem.getChildren().slice().forEach(function(tabItem) TabView.moveTabTo(tabItem.tab, activeGroupItem.id));
    }
    else {
      this._window.GroupItems.newTab(aGroupItem);
    }
    gBrowser.updateCurrentBrowser(true);
  };

  TabView.selectGroup = function(aGroupItem) {
    if (!aGroupItem)
      return;

    if (aGroupItem.isAGroupItem) {
      let activeTab = aGroupItem.getActiveTab() || aGroupItem.getChild(0);
      if (activeTab)
        gBrowser.selectedTab = activeTab.tab;
    }
    else
      gBrowser.selectedTab = aGroupItem.tab;
  };

  var button = $("tabview-button");
  if (button && !button.hasChildNodes()) {
    let popup = button.appendChild(document.createElement("menupopup"));
    popup.setAttribute("onpopupshowing", "TabView.populateGroupMenu(event.target, true);");
    popup.setAttribute("oncommand", "TabView.selectGroup(event.originalTarget.value);");
    popup.setAttribute("position", "after_end");
    button.setAttribute("type", "menu-button");

    let item = popup.appendChild(document.createElement("menuitem"));
    item.setAttribute("label", $("context_tabViewNewGroup").getAttribute("label"));
    item.setAttribute("command", "cmd_newGroup");
    popup.appendChild(document.createElement("menuseparator"));
  }

  function $() {return document.getElementById.apply(document, arguments);}
};

//列出所有标签页弹出菜单
tabutils._allTabsPopup = function() {
  function $() {return document.getElementById.apply(document, arguments);}

  var allTabsPopup = gBrowser.mTabContainer.mAllTabsPopup;
  if (!allTabsPopup)
    return;

  Array.slice($("alltabs-popup-template").childNodes).forEach(function(aItem) {
    allTabsPopup.appendChild(aItem);
  });

  allTabsPopup.setAttribute("oncommand", "event.stopPropagation();");
  allTabsPopup.setAttribute("onclick", "if (event.button == 0) event.stopPropagation();");
  tabutils.addEventListener(allTabsPopup.parentNode, "popupshowing", function(event) {
    while (allTabsPopup.firstChild && allTabsPopup.firstChild.tab) //Bug 714594 (Fx12), 716271 (Fx12)
      allTabsPopup.removeChild(allTabsPopup.firstChild);

    var lastVisibleItem = null;
    for (let item = allTabsPopup.firstChild; item && !item.tab; item = item.nextSibling) {
      if (item.localName == "menuseparator")
        item.hidden = !lastVisibleItem || lastVisibleItem.localName == "menuseparator";

      if (!item.hidden && !item.collapsed)
        lastVisibleItem = item;
    }

    var item = $("context_showAllTabs");
    item.setAttribute("checked", gBrowser.mTabContainer.getAttribute("showAllTabs"));
    item.setAttribute("disabled", gBrowser.mTabContainer.orient == "vertical");

    var tabs = gBrowser.allTabs;
    var item = $("context_readAllTabs");
    var checked = tabs.every(function(aTab) aTab.getAttribute("unread") != "true");
    item.setAttribute("label", checked ? item.getAttribute("label_checked") : item.getAttribute("label_unchecked"));
    item.setAttribute("checked", checked);
    item.setAttribute("disabled", tabs.every(function(aTab) aTab.selected));

    [
      ["context_protectAllTabs", ["protected"]],
      ["context_lockAllTabs", ["locked"]],
      ["context_faviconizeAllTabs", ["faviconized"]]
    ].forEach(function([aId, aAttrs]) {
      $(aId).setAttribute("checked", tabs.every(function(aTab) aAttrs.every(function(aAttr) aTab.hasAttribute(aAttr))));
    });
  }, true);

  if ("MenuEdit" in window) { //Make allTabsPopup editable by MenuEdit
    TU_hookCode("MenuEdit.getEditableMenus", /(?=return menus;)/, "menus['" + allTabsPopup.id + "'] = gBrowser.mTabContainer.mAllTabsPopup.parentNode.tooltipText;");
  }
};

tabutils._hideTabBar = function() {
  if (onViewToolbarsPopupShowing.name == "onViewToolbarsPopupShowing") //Compa. with Omnibar
  TU_hookCode("onViewToolbarsPopupShowing", /(?=.*addon-bar.*)/, function() {
    let tabsToolbar = document.getElementById("TabsToolbar");
    if (toolbarNodes.indexOf(tabsToolbar) == -1)
      toolbarNodes.push(tabsToolbar);
  });

  TU_hookCode("setToolbarVisibility", /.*setAttribute.*/, 'if (toolbar.id == "TabsToolbar") gBrowser.mTabContainer.visible = isVisible; else $&');
  TU_hookCode("gBrowser.mTabContainer.updateVisibility", "{", 'if (!TU_getPref("browser.tabs.autoHide")) return;');
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
    gBrowser._lastClosedTabsCount = null;
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
  navbar.currentSet = navbar.currentSet.replace(/undoclosetab-button|button_tuOptions/g, "")
                                       .replace("urlbar-container", "undoclosetab-button,button_tuOptions,$&");
  navbar.setAttribute("currentset", navbar.currentSet);
  document.persist(navbar.id, "currentset");
};

tabutils._tabPrefObserver = {
  init: function() {
    window.addEventListener("unload", this, false);
    this.register();

    //Close buttons
    TU_hookCode("gBrowser.mTabContainer.adjustTabstrip",
      [/let tab.*/, function() {
        let tab;
        Array.some(this.childNodes, function(aTab) {
          return !aTab.pinned && !aTab.hasAttribute("faviconized") && aTab.boxObject.width > 0 && (tab = aTab);
        });
      }],
      ["this.mCloseButtons", "($& & 0x0f)"],
      ["this.mCloseButtons != 3", "(this.mCloseButtons & 0x0f) != 3 && !(this.mCloseButtons & 0x20)"],
      ["this._closeWindowWithLastTab", "false", "g"],
      ["}", function() {
        this.setAttribute("closeButtonOnPointedTab", (this.mCloseButtons & 0x0f) == 1 || !!(this.mCloseButtons & 0x10));
      }]
    );

    //Tab counter
    TU_hookCode("gBrowser.mTabContainer.adjustTabstrip", "}", function() {
      if (this.mAllTabsPopup) {
        let n = gBrowser.mTabs.length - gBrowser._removingTabs.length;
        let m = gBrowser.allTabs.length;
        this.mAllTabsPopup.parentNode.label = m == n ? n : [m, n].join("/");
      }
    });

    //Tab animations
    TU_hookCode("gBrowser.removeTab", 'window.getComputedStyle(aTab).maxWidth == "0.1px"', 'aTab.boxObject.width == 0');

    //Shortcuts
    tabutils.addEventListener(window, "keypress", function(event) {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.charCode == 90 || event.charCode == 122)) {//Ctrl+Shift+Z
        let popup = document.getElementById('undoCloseTabPopup');
        if (popup.state == "open") {
          popup.hidePopup();
          event.preventDefault();
          event.stopPropagation();
        }
      }
    }, true);

    //Don't allow drag/dblclick on the tab bar to act on the window
    if ("_update" in TabsInTitlebar) // Compat. with Linux
    TU_hookCode("TabsInTitlebar._update", "!this._dragBindingAlive", "$& && TU_getPref('extensions.tabutils.dragBindingAlive', true)");

    gPrefService.getChildList("extensions.tabutils.", {}).sort().concat([
      "browser.tabs.animate", //Bug 649671
      "browser.tabs.tabClipWidth",
      "browser.tabs.tabMaxWidth",
      "browser.tabs.tabMinWidth",
      "browser.tabs.tabMinHeight"
    ]).forEach(function(aPrefName) {
      this.observe(null, "nsPref:changed", aPrefName);
    }, this);
  },

  register: function() {
    Services.prefs.addObserver("", this, false);
  },

  unregister: function() {
    Services.prefs.removeObserver("", this);
  },

  get cssRules() {
    delete this.cssRules;
    return this.cssRules = {
      current:   { tab:  tabutils.insertRule('.tabbrowser-tab[selected="true"] {}'),
                   text: tabutils.insertRule('.tabbrowser-tab[selected="true"] * {}')},
      unread:    { tab:  tabutils.insertRule('.tabbrowser-tab[unread="true"]:not([selected="true"]) {}'),
                   text: tabutils.insertRule('.tabbrowser-tab[unread="true"]:not([selected="true"]) * {}')},
      read:      { tab:  tabutils.insertRule('.tabbrowser-tab:not([unread="true"]):not([selected="true"]) {}'),
                   text: tabutils.insertRule('.tabbrowser-tab:not([unread="true"]):not([selected="true"]) * {}')},
      unloaded:  { tab:  tabutils.insertRule(':-moz-any(.tabbrowser-tab, .alltabs-item)[pending] {}'),
                   text: tabutils.insertRule(':-moz-any(.tabbrowser-tab, .alltabs-item)[pending] * {}')},
      selected:  { tab:  tabutils.insertRule('.tabbrowser-tab[multiselected] {}'),
                   text: tabutils.insertRule('.tabbrowser-tab[multiselected] * {}')},
      protected: { tab:  tabutils.insertRule('.tabbrowser-tab[protected] {}'),
                   text: tabutils.insertRule('.tabbrowser-tab[protected] * {}')},
      locked:    { tab:  tabutils.insertRule('.tabbrowser-tab[locked] {}'),
                   text: tabutils.insertRule('.tabbrowser-tab[locked] * {}')}
    };
  },

  batching: false,
  observe: function(aSubject, aTopic, aData) {
    if (aTopic != "nsPref:changed" || this.batching)
      return;

    switch (aData) {
      case "browser.tabs.animate": this.animate();return;
      case "browser.tabs.tabClipWidth": this.tabClipWidth();return;
      case "browser.tabs.tabMaxWidth": this.tabMaxWidth();return;
      case "browser.tabs.tabMinWidth": this.tabMinWidth();return;
      case "browser.tabs.tabMinHeight": this.tabMinHeight();return;
    }

    if (!aData.startsWith("extensions.tabutils."))
      return;

    let name = aData.slice(20).replace(".", "_", "g");
    if (name in this) {
      this[name]();
      return;
    }

    //Tab stack coloring
    if (/^extensions.tabutils.colorStack.([0-9A-Fa-f]+)$/.test(aData)) {
      this.updateGroupColor(RegExp.$1, TU_getPref(aData));
      return;
    }

    //Tab highlighting
    if (/^extensions.tabutils.(?:highlight|styles.)([^.]+)$/.test(aData)) {
      let prefName = RegExp.$1.toLowerCase();
      let style = {};
      try {
        style = JSON.parse(TU_getPref("extensions.tabutils.styles." + prefName));
        if (!TU_getPref("extensions.tabutils.highlight" + prefName[0].toUpperCase() + prefName.slice(1)))
          style.bold = style.italic = style.underline = style.strikethrough = style.outline = style.color = style.bgColor = style.opacity = false;
      }
      catch (e) {}

      if (!(prefName in this.cssRules))
        return;

      let tabStyle = this.cssRules[prefName].tab.style;
      tabStyle.setProperty("font-weight", style.bold ? "bold" : "", "");
      tabStyle.setProperty("font-style", style.italic ? "italic" : "", "");
      tabStyle.setProperty("text-decoration", style.underline ? "underline" : style.strikethrough ? "line-through" : "", "");
      tabStyle.setProperty("outline", style.outline ? "1px solid" : "", "");
      tabStyle.setProperty("outline-offset", style.outline ? "-1px" : "", "");
      tabStyle.setProperty("outline-color", style.outline ? style.outlineColorCode : "", "");
      tabStyle.setProperty("-moz-outline-radius", style.outline ? "4px" : "", "");
      tabStyle.setProperty("color", style.color ? style.colorCode : "", "important");
      tabStyle.setProperty("background-image", style.bgColor ? "-moz-linear-gradient(" + style.bgColorCode + "," + style.bgColorCode + ")" : "", "important");
      tabStyle.setProperty("opacity", style.opacity ? style.opacityCode : "", "");

      let textStyle = this.cssRules[prefName].text.style;
      textStyle.setProperty("color", style.color ? style.colorCode : "", "important");
      textStyle.setProperty("background-image", style.bgColor ? "-moz-linear-gradient(" + style.bgColorCode + "," + style.bgColorCode + ")" : "", "important");
      return;
    }

    //Custom context menuitems
    if (/^extensions.tabutils.menu.([^.]+)$/.test(aData)) {
      let item = document.getElementById(RegExp.$1);
      if (item)
        item.collapsed = !TU_getPref(aData);
      return;
    }

    if (/^extensions.tabutils.menu.([^.]+).([^.]+)$/.test(aData)) {
      let item = document.getElementById(RegExp.$1);
      if (!item) {
        item = document.createElement("menuitem");
        item.id = RegExp.$1;
        item.collapsed = !TU_getPref("extensions.tabutils.menu." + RegExp.$1);

        if (item.id.toLowerCase().indexOf("alltabs") > -1 && gBrowser.mTabContainer.mAllTabsPopup)
          gBrowser.mTabContainer.mAllTabsPopup.insertBefore(item, document.getElementById("sep_closeAllTabs"));
        else
          gBrowser.tabContextMenu.insertBefore(item, document.getElementById("sep_closeTab"));
      }
      this.setAttribute(item, RegExp.$2, TU_getPref(aData));
      return;
    }

    //Custom shortcut keys
    if (/^extensions.tabutils.shortcut.([^.]+)$/.test(aData)) {
      let key = document.getElementById(RegExp.$1);
      if (key)
        key.setAttribute("disabled", !TU_getPref(aData));
      return;
    }

    if (/^extensions.tabutils.shortcut.([^.]+).([^.]+)$/.test(aData)) {
      let key = document.getElementById(RegExp.$1);
      if (!key) {
        key = document.getElementById("tuKeyset").appendChild(document.createElement("key"));
        key.id = RegExp.$1;
        key.setAttribute("disabled", !TU_getPref("extensions.tabutils.shortcut." + RegExp.$1));
      }
      this.setAttribute(key, RegExp.$2, TU_getPref(aData));
      return;
    }

    //Custom toolbar buttons
    if (/^extensions.tabutils.button.([^.]+)$/.test(aData)) {
      let button = document.getElementById(RegExp.$1);
      if (button)
        button.collapsed = !TU_getPref(aData);
      return;
    }

    if (/^extensions.tabutils.button.(newtab-button|alltabs-button|tabs-closebutton).([^.]+)$/.test(aData)) {
      [
        gBrowser.mTabContainer.mTabstrip.querySelector(".tabs-" + RegExp.$1),
        document.getAnonymousElementByAttribute(gBrowser.mTabContainer, "anonid", RegExp.$1),
        document.getElementById(RegExp.$1 == "newtab-button" ? "new-tab-button" : RegExp.$1)
      ].forEach(function(button) {
        if (button)
          this.setAttribute(button, RegExp.$2, TU_getPref(aData));
      }, this);
      return;
    }

    if (/^extensions.tabutils.button.([^.]+).([^.]+)$/.test(aData)) {
      let button = document.getElementById(RegExp.$1) || gNavToolbox.palette.getElementsByAttribute("id", RegExp.$1)[0];
      if (!button) {
        button = document.getElementById("nav-bar").appendChild(document.createElement("toolbarbutton"));
        button.id = RegExp.$1;
        button.image = gBrowser.mFaviconService.defaultFavicon.spec;
        button.className = "toolbarbutton-1 chromeclass-toolbar-additional";
        button.collapsed = !TU_getPref("extensions.tabutils.button." + RegExp.$1);
      }
      this.setAttribute(button, RegExp.$2, TU_getPref(aData));
      return;
    }

    //Inject CSS code
    if (/^extensions.tabutils.css.[^.]+$/.test(aData)) {
      try {
        tabutils.insertRule(TU_getPref(aData));
      }
      catch (e) {}
      return;
    }

    //Inject JS code
    if (/^extensions.tabutils.js.[^.]+$/.test(aData)) {
      try {
        new Function(TU_getPref(aData))();
      }
      catch (e) {}
      return;
    }
  },

  setAttribute: function(aElt, aAttr, aVal) {
    aVal == null ? aElt.removeAttribute(aAttr) : aElt.setAttribute(aAttr, aVal);
    if (aAttr == "insertbefore" || aAttr == "insertafter" || aAttr == "parent") {
      let parentNode = document.getElementById(aElt.getAttribute("parent")) || aElt.parentNode;
      let refNode;
      switch (true) {
        case aElt.getAttribute("insertafter") != "":
          refNode = parentNode.getElementsByAttribute("id", aElt.getAttribute("insertafter"))[0];
          refNode = refNode && refNode.nextSibling;
          break;
        case aElt.getAttribute("insertbefore") != "":
          refNode = parentNode.getElementsByAttribute("id", aElt.getAttribute("insertbefore"))[0];
          break;
      }
      parentNode.insertBefore(aElt, refNode);
    }
    else if (aAttr == "separatorbefore" || aAttr == "separatorafter") {
      let refNode = aAttr == "separatorbefore" ? aElt : aElt.nextSibling;
      if (aElt.localName == "menuitem" || aElt.localName == "menu")
        aElt.parentNode.insertBefore(document.createElement("menuseparator"), refNode);
      else if (aElt.localName == "toolbarbutton" || aElt.localName == "toolbaritem")
        aElt.parentNode.insertBefore(document.createElement("toolbarseparator"), refNode);
    }
  },

  animate: function() {
    gBrowser.mTabContainer.setAttribute("dontanimate", !TU_getPref("browser.tabs.animate"));
  },

  tabClipWidth: function() {
    gBrowser.mTabContainer.mTabClipWidth = TU_getPref("browser.tabs.tabClipWidth");
    gBrowser.mTabContainer.adjustTabstrip();
  },

  tabMaxWidth: function() {
    this._tabWidthRule[0].style.setProperty("max-width", TU_getPref("browser.tabs.tabMaxWidth") + "px", "");
    this._tabWidthRule[1].style.setProperty("width", TU_getPref("browser.tabs.tabMaxWidth") + "px", "");
    gBrowser.mTabContainer.adjustTabstrip();
  },

  tabMinWidth: function() {
    this._tabWidthRule[0].style.setProperty("min-width", TU_getPref("browser.tabs.tabMinWidth") + "px", "");
    gBrowser.mTabContainer.adjustTabstrip();
  },

  tabFitTitle: function() {
    gBrowser.mTabContainer.setAttribute("tabfittitle", TU_getPref("extensions.tabutils.tabFitTitle"));
  },

  tabMinHeight: function() {
    this._tabHeightRule[0].style.setProperty("min-height", TU_getPref("browser.tabs.tabMinHeight") + "px", "important");
    this.tabstripHeight();
  },

  tabstripHeight: function() {
    var tab = gBrowser.mTabContainer.lastChild;
    while (tab && tab.boxObject.height == 0)
      tab = tab.previousSibling;
    if (!tab)
      return;

    var wasSelected = tab.selected;
    var wasPinned = tab.pinned;

    tab.removeAttribute("selected");
    tab.removeAttribute("pinned");
    this._tabHeightRule[1].style.minHeight = "";

    var style = getComputedStyle(tab);
    var height = tab.boxObject.height + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    this._tabHeightRule[1].style.minHeight = height + "px";

    wasSelected ? tab.setAttribute("selected", true) : tab.removeAttribute("selected");
    wasPinned ? tab.setAttribute("pinned", true) : tab.removeAttribute("pinned");
  },

  get _tabWidthRule() {
    delete this._tabWidthRule;
    return this._tabWidthRule = [
      tabutils.insertRule('.tabbrowser-tab:not([faviconized]) {width: 0; -moz-box-flex: 100;}'),
      tabutils.insertRule('.tabbrowser-arrowscrollbox[orient="vertical"] > scrollbox {}'),
      tabutils.insertRule('#tabbrowser-tabs[orient="vertical"] > .tabbrowser-tab {max-width: none !important; -moz-box-flex: 0;}')
    ];
  },

  get _tabHeightRule() {
    delete this._tabHeightRule;
    return this._tabHeightRule = [
      tabutils.insertRule('.tabbrowser-tab, .tabbrowser-arrowscrollbox > .tabs-newtab-button {}'),
      tabutils.insertRule('.tabbrowser-tabs:not([multirow]) .tabbrowser-arrowscrollbox > scrollbox {}')
    ];
  },

  closeButtons: function() {
    gBrowser.mTabContainer.mCloseButtons = TU_getPref("extensions.tabutils.closeButtons");
    gBrowser.mTabContainer.adjustTabstrip();
  },

  showTabCounter: function() {
    var allTabsPopup = gBrowser.mTabContainer.mAllTabsPopup;
    if (allTabsPopup)
      allTabsPopup.parentNode.setAttribute("showTabCounter", TU_getPref("extensions.tabutils.showTabCounter"));

    gBrowser.mTabContainer.adjustTabstrip();
    this.tabstripHeight();
  },

  showLeftSpace: function() {
    gBrowser.mTabContainer.setAttribute("showLeftSpace", TU_getPref("extensions.tabutils.showLeftSpace"));
    gBrowser.mTabContainer.adjustTabstrip();
  },

  showRightSpace: function() {
    gBrowser.mTabContainer.setAttribute("showRightSpace", TU_getPref("extensions.tabutils.showRightSpace"));
    gBrowser.mTabContainer.adjustTabstrip();
  },

  statusbarMode: function() {
    switch (TU_getPref("extensions.tabutils.statusbarMode")) {
      case 0: document.getElementById("status-bar").setAttribute("mode", "icons");break;
      case 1: document.getElementById("status-bar").setAttribute("mode", "text");break;
      default: document.getElementById("status-bar").setAttribute("mode", "full");break;
    }
  },

  hideOpenInTab: function() {
    var hideOpenInTab = TU_getPref("extensions.tabutils.hideOpenInTab");
    document.getElementById("statusbar-openintab").collapsed = hideOpenInTab;
  },

  hideLoadInBackground: function() {
    var hideLoadInBackground = TU_getPref("extensions.tabutils.hideLoadInBackground");
    if (hideLoadInBackground)
      TU_setPref("extensions.tabutils.loadAllInBackground", false);
    document.getElementById("statusbar-loadinbackground").collapsed = hideLoadInBackground;
  },

  hideLoadInForeground: function() {
    var hideLoadInForeground = TU_getPref("extensions.tabutils.hideLoadInForeground");
    if (hideLoadInForeground)
      TU_setPref("extensions.tabutils.loadAllInForeground", false);
    document.getElementById("statusbar-loadinforeground").collapsed = hideLoadInForeground;
  },

  openLinkInTab: function() {
    tabutils.gOpenLinkInTab = TU_getPref("extensions.tabutils.openLinkInTab");
    document.getElementById("statusbar-openintab").setAttribute("checked", tabutils.gOpenLinkInTab);
  },

  loadAllInBackground: function() {
    tabutils.gLoadAllInBackground = TU_getPref("extensions.tabutils.loadAllInBackground");
    if (tabutils.gLoadAllInBackground)
      TU_setPref("extensions.tabutils.loadAllInForeground", false);
    document.getElementById("statusbar-loadinbackground").setAttribute("checked", tabutils.gLoadAllInBackground);
  },

  loadAllInForeground: function() {
    tabutils.gLoadAllInForeground = TU_getPref("extensions.tabutils.loadAllInForeground");
    if (tabutils.gLoadAllInForeground)
      TU_setPref("extensions.tabutils.loadAllInBackground", false);
    document.getElementById("statusbar-loadinforeground").setAttribute("checked", tabutils.gLoadAllInForeground);
  },

  loadInNewTab: function() {
    switch (TU_getPref("extensions.tabutils.loadInNewTab")) {
      case 0: TU_setPref("browser.newtab.url", "about:blank");break;
      case 1: TU_setPref("browser.newtab.url", gHomeButton.getHomePage().split("|")[0]);break;
    }
  },

  dragBindingAlive: function() {
    let tabsToolbar = document.getElementById("TabsToolbar");
    if (tabsToolbar._dragBindingAlive != null)
      tabsToolbar._dragBindingAlive = TU_getPref("extensions.tabutils.dragBindingAlive", true);
  },

  pinTab_showPhantom: function() {
    gBrowser.updatePinnedTabsBar();
    gBrowser.mTabContainer.setAttribute("showPhantom", TU_getPref("extensions.tabutils.pinTab.showPhantom"));
    gBrowser.mTabContainer.positionPinnedTabs();
    gBrowser.mTabContainer.adjustTabstrip();
  },

  colorStack: function() {
    gBrowser.mTabContainer.setAttribute("colorStack", TU_getPref("extensions.tabutils.colorStack"));
  },

  toolbarShadowOnTab: "-moz-linear-gradient(bottom, rgba(10%,10%,10%,.4) 1px, transparent 1px)",
  bgTabTexture: "-moz-linear-gradient(transparent, hsla(0,0%,45%,.1) 1px, hsla(0,0%,32%,.2) 80%, hsla(0,0%,0%,.2))",
  bgTabTextureHover: "-moz-linear-gradient(hsla(0,0%,100%,.3) 1px, hsla(0,0%,75%,.2) 80%, hsla(0,0%,60%,.2))",
  selectedTabTexture: "-moz-linear-gradient(rgba(255,255,255,0), rgba(255,255,255,.5) 50%)",

  _tabColoringRules: {},
  updateGroupColor: function(group, color) {
    if (color && !(group in this._tabColoringRules)) {
      let selectorText;
      if (group[0] == "{")
        selectorText = '#main-window .tabbrowser-tab[group="' + group + '"]:not([group-counter="1"])';
      else
        selectorText = '.tabbrowser-tabs[colorStack="true"] > .tabbrowser-tab[group^="{' + group + '"]:not([group-counter="1"])';

      this._tabColoringRules[group] = [
        tabutils.insertRule(selectorText + '{}'),
        tabutils.insertRule(selectorText + ':hover {}'),
        tabutils.insertRule(selectorText + '[selected="true"] {}'),
        tabutils.insertRule('#main-window[tabsontop=false]:not([disablechrome]) ' + selectorText.replace('#main-window', '#tabbrowser-tabs >') + '[selected="true"]:not(:-moz-lwtheme) {}')
      ];
    }

    if (group in this._tabColoringRules) {
      let gradient = '-moz-linear-gradient(' + color + ', -moz-dialog)';
      this._tabColoringRules[group][0].style.backgroundImage = color ? [this.toolbarShadowOnTab, this.bgTabTexture, gradient].join() : "";
      this._tabColoringRules[group][1].style.backgroundImage = color ? [this.toolbarShadowOnTab, this.bgTabTextureHover, gradient].join() : "";
      this._tabColoringRules[group][2].style.backgroundImage = color ? [this.selectedTabTexture, gradient].join() : "";
      this._tabColoringRules[group][3].style.backgroundImage = color ? [this.toolbarShadowOnTab, this.selectedTabTexture, gradient].join() : "";
    }
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

tabutils._tagsFolderObserver = {
  _tags: ["protected", "locked", "faviconized", "pinned", "autoRename", "autoReload", "norestart"],
  _tagIds: [],
  _taggedURIs: [],

  _getIndexForTag: function(aTag) {
    for (let i = 0; i < this._tags.length; i++) {
      if (this._tags[i].toLowerCase() == aTag.toLowerCase())
        return i;
    }
    return -1;
  },

  _updateTaggedURIs: function(aTag, aIndex) {
    if (aIndex == null) {
      aIndex = typeof(aTag) == "string" ? this._getIndexForTag(aTag)
                                        : this._tagIds.indexOf(aTag);
      if (aIndex == -1)
        return;
      aTag = this._tags[aIndex];
    }

    this._tagIds[aIndex] = -1;
    this._taggedURIs[aIndex] = PlacesUtils.tagging.getURIsForTag(aTag);
    this._tagIds[aIndex] = PlacesUtils.getItemIdForTag(aTag);
  },

  init: function() {
    this._tags.forEach(this._updateTaggedURIs, this);
    PlacesUtils.bookmarks.addObserver(this, false);
  },

  uninit: function() {
    PlacesUtils.bookmarks.removeObserver(this);
  },

  getURIsForTag: function(aTag) {
    let index = this._getIndexForTag(aTag);
    return index > -1 && this._tagIds[index] > -1 ? this._taggedURIs[index] : [];
  },

  getTagsForURI: function(aURI) {
    let tags = [];
    this._tags.forEach(function(aTag, aIndex) {
      if (this._tagIds[aIndex] > -1 &&
          this._taggedURIs[aIndex].some(function(bURI) aURI.spec == bURI.spec))
        tags.push(aTag);
    }, this);
    return tags;
  },

  onItemAdded: function(aItemId, aParentId, aIndex, aItemType, aURI, aTitle/* 6.0 */) {
    if (aParentId == PlacesUtils.bookmarks.tagsFolder &&
        aItemType == PlacesUtils.bookmarks.TYPE_FOLDER) {
      if (aTitle == null)
        aTitle = PlacesUtils.bookmarks.getItemTitle(aItemId);
      this._updateTaggedURIs(aTitle);
    }
    else if (aItemType == PlacesUtils.bookmarks.TYPE_BOOKMARK) {
      this._updateTaggedURIs(aParentId);
    }
  },

  onItemRemoved: function(aItemId, aParentId, aIndex, aItemType) {
    if (aParentId == PlacesUtils.bookmarks.tagsFolder &&
        aItemType == PlacesUtils.bookmarks.TYPE_FOLDER) {
      this._updateTaggedURIs(aItemId);
    }
    else if (aItemType == PlacesUtils.bookmarks.TYPE_BOOKMARK) {
      this._updateTaggedURIs(aParentId);
    }
  },

  onItemChanged: function(aItemId, aProperty, aIsAnnotationProperty, aNewValue, aLastModified, aItemType, aParentId/* 6.0 */) {
    if (aParentId == null)
      aParentId = PlacesUtils.bookmarks.getFolderIdForItem(aItemId);

    if (aProperty == "title" &&
        aParentId == PlacesUtils.bookmarks.tagsFolder &&
        aItemType == PlacesUtils.bookmarks.TYPE_FOLDER) {
      this._updateTaggedURIs(aItemId);
      this._updateTaggedURIs(aNewValue);
    }
    else if (aProperty = "uri" && aItemType == PlacesUtils.bookmarks.TYPE_BOOKMARK) {
      this._updateTaggedURIs(aParentId);
    }
  },

  onItemMoved: function(aItemId, aOldParentId, aOldIndex, aNewParentId, aNewIndex, aItemType) {
    if (aItemType == PlacesUtils.bookmarks.TYPE_FOLDER) {
      if (aOldParentId == PlacesUtils.bookmarks.tagsFolder)
        this._updateTaggedURIs(aItemId);
      else if (aNewParentId == PlacesUtils.bookmarks.tagsFolder)
        this._updateTaggedURIs(PlacesUtils.bookmarks.getItemTitle(aItemId));
    }
    else if (aItemType == PlacesUtils.bookmarks.TYPE_BOOKMARK) {
      this._updateTaggedURIs(aOldParentId);
      this._updateTaggedURIs(aNewParentId);
    }
  },

  onBeginUpdateBatch: function() {},
  onEndUpdateBatch: function() {},
  onBeforeItemRemoved: function() {},
  onItemVisited: function() {},
  QueryInterface: XPCOMUtils.generateQI([Ci.nsINavBookmarkObserver])
};
