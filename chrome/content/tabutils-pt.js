//¹Ì¶¨±êÇ©Ò³
tabutils._phantomTabs = function() {
  gBrowser.pinTab = function pinTab(aTab, aForce, aRestoring, aBookmarkId) {
    if (arguments.length == 1) {
      aForce = true;
      aRestoring = false;
    }

    if (aForce == aTab.pinned && (!aForce || aBookmarkId == aTab.bookmarkId))
      return;

    if (aForce == null)
      aForce = !aTab.pinned;

    if (!aForce) {
      aTab.setAttribute("fadein", true);
      aTab.removeAttribute("pinned");

      if (aRestoring == null && !gPrivateBrowsingUI.privateBrowsingEnabled) {
        let uri = aTab.linkedBrowser.currentURI;
        try {
          uri = PlacesUtils.bookmarks.getBookmarkURI(aTab.bookmarkId);
        }
        catch (e) {}

        PlacesUtils.tagging.untagURI(uri, ["pinned"]);
        this.updatePinnedTabsBar();
      }
      aTab.bookmarkId = null;

      if (!aRestoring) {
        tabutils._ss.deleteTabValue(aTab, "pinned");
        tabutils._ss.deleteTabValue(aTab, "bookmarkId");
      }
      aTab.dispatchEvent(new CustomEvent("TabUnpinning", {bubbles: true}));

      this.mTabContainer.positionPinnedTab(aTab);
      this.mTabContainer.positionPinnedTabs();
      this.mTabContainer.adjustTabstrip();

      aTab.linkedBrowser.docShell.isAppTab = false;
      if (aTab.selected)
        this._setCloseKeyState(true);
      aTab.dispatchEvent(new CustomEvent("TabUnpinned", {bubbles: true}));
    }
    else {
      aTab.setAttribute("pinned", true);

      if (aRestoring == null && !gPrivateBrowsingUI.privateBrowsingEnabled && TU_getPref("extensions.tabutils.autoPin", true)) {
        PlacesUtils.tagging.tagURI(aTab.linkedBrowser.currentURI, ["pinned"]);
        this.updatePinnedTabsBar();

        aTab.bookmarkId = PlacesUtils.getItemIdForTaggedURI(aTab.linkedBrowser.currentURI, "pinned");
      }
      else {
        aTab.bookmarkId = aBookmarkId;
      }

      if (!aRestoring) {
        tabutils._ss.setTabValue(aTab, "pinned", "true");
        tabutils._ss.setTabValue(aTab, "bookmarkId", String(aTab.bookmarkId || "")); // Bug 961646
      }
      aTab.dispatchEvent(new CustomEvent("TabPinning", {bubbles: true}));

      this.mTabContainer.positionPinnedTab(aTab);
      this.mTabContainer.positionPinnedTabs();
      this.mTabContainer.stylePinnedTabs();
      this.mTabContainer.adjustTabstrip();

      aTab.linkedBrowser.docShell.isAppTab = true;
      if (aTab.selected)
        this._setCloseKeyState(false);
      aTab.dispatchEvent(new CustomEvent("TabPinned", {bubbles: true}));
    }
  };

  gBrowser.unpinTab = function unpinTab(aTab) this.pinTab(aTab, false, false);

  TU_hookCode("gBrowser.onTabRestoring", "}", function() {
    this.pinTab(aTab, aTab.pinned, true, ss.getTabValue(aTab, "bookmarkId"));

    if (aTab.pinned && TU_getPref("extensions.tabutils.pinTab.autoRevert", false)) {
      let uri;
      try {
        uri = PlacesUtils.bookmarks.getBookmarkURI(aTab.bookmarkId);
      }
      catch (e) {}

      if (uri) {
        let browser = aTab.linkedBrowser;
        let history = browser.sessionHistory;
        if (history.count > 0)
          history.PurgeHistory(history.count);

        let tabData = browser.__SS_data;
        tabData.entries = [];
        tabData.index = 0;
        tabData.userTypedValue = uri.spec;
        tabData.userTypedClear = 1;
      }
    }
  });

  gBrowser.autoPinTab = function autoPinTab(aTab, aURI, aTags) {
    if (!aTab.pinned &&
        aTags.indexOf("pinned") > -1 &&
        TU_getPref("extensions.tabutils.autoPin", true) &&
        !Array.some(this.visibleTabs.slice(0, this._numPinnedTabs), function(bTab) bTab.linkedBrowser.currentURI.spec == aURI.spec)) {
      this.pinTab(aTab, true, false, PlacesUtils.getItemIdForTaggedURI(aURI, "pinned"));

      if (aTab.mCorrespondingButton &&
          !TU_getPref("extensions.tabutils.pinTab.autoRevert", false) &&
          PlacesUtils.annotations.itemHasAnnotation(aTab.bookmarkId, "tabState"))
      setTimeout(function() {
        aTab.linkedBrowser.stop();
        tabutils._ss.setTabState(aTab, PlacesUtils.annotations.getItemAnnotation(aTab.bookmarkId, "tabState"));
      }, 0);
    }
  };

  TU_hookCode("gBrowser.onTabOpen", "}", "this.autoPinTab(aTab, uri, tags);");
  TU_hookCode("gBrowser.onLocationChange", "}", "this.autoPinTab(aTab, uri, tags);");

  TU_hookCode("gBrowser.onTabClose", "}", function() {
    if (aTab.mCorrespondingButton && !gPrivateBrowsingUI.privateBrowsingEnabled) {
      PlacesUtils.setAnnotationsForItem(aTab.bookmarkId, [{name: "tabState", value: tabutils._ss.getTabState(aTab)}]);
      aTab.mCorrespondingButton.tab = null;
      aTab.mCorrespondingButton = null;
    }
  });

  TU_hookCode("gBrowser.moveTabTo", /.*_numPinnedTabs.*/g, ";");
  TU_hookCode("gBrowser.moveTabTo", "{", function() {
    aIndex = Math.min(Math.max(0, aIndex), this.mTabs.length - 1);
    if (aIndex == aTab._tPos)
      return;

    if (!arguments[2]) {
      if (aTab.mCorrespondingButton) {
        let bTab = this.mTabs[aIndex > aTab._tPos ? aIndex + 1 : aIndex];
        let bNode = bTab && bTab.mCorrespondingButton && bTab.mCorrespondingButton._placesNode;
        let aNode = aTab.mCorrespondingButton._placesNode;
        PlacesUtils.bookmarks.moveItem(aNode.itemId, aNode.parent.itemId, bNode ? bNode.bookmarkIndex : -1);
        return;
      }

      for (var i = 0, tab; (tab = this.mTabs[i]) && tab.mCorrespondingButton; i++);
      for (var j = i, tab; (tab = this.mTabs[j]) && tab.pinned; j++);

      if (aTab.pinned)
        aIndex = Math.min(Math.max(i, aIndex), j - 1);
      else
        aIndex = Math.max(j, aIndex);

      if (aIndex == aTab._tPos)
        return;
    }
  });

  gBrowser.mTabContainer.positionPinnedTab = function positionPinnedTab(aTab) {
    if (aTab.mCorrespondingButton) {
      aTab.mCorrespondingButton.tab = null;
      aTab.mCorrespondingButton = null;
    }

    for (var i = 0, tab; (tab = this.childNodes[i]) && (tab.pinned || tab == aTab); i++);
    if (aTab.pinned ^ aTab._tPos < i)
      gBrowser.moveTabTo(aTab, aTab._tPos < i ? i - 1 : i, true);

    if (aTab.pinned && TU_getPref("extensions.tabutils.pinTab.showPhantom", true)) {
      gBrowser.moveTabTo(aTab, aTab._tPos < i ? i - 1 : i, true);

      let pinnedbox = this.mTabstrip._pinnedbox, n = 0;
      for (let button of pinnedbox.childNodes) {
        if (button.tab) {
          n++;
          continue;
        }
        if (button._placesNode.itemId == aTab.bookmarkId) {
          button.tab = aTab;
          aTab.mCorrespondingButton = button;
          gBrowser.moveTabTo(aTab, n, true);
          break;
        }
      }
    }
  };

  gBrowser.mTabContainer.positionPinnedTabs = function positionPinnedTabs(aRebuild) {
    var pinnedbox = this.mTabstrip._pinnedbox;
    if (aRebuild) {
      for (let i = 0, tab; (tab = this.childNodes[i]) && tab.mCorrespondingButton; i++) {
        tab.mCorrespondingButton = null;
      }

      let n = 0;
      for (let button of pinnedbox.childNodes) {
        button.tab = null;
        for (let i = 0, tab; (tab = this.childNodes[i]) && tab.pinned; i++) {
          if (tab.bookmarkId == button._placesNode.itemId) {
            button.tab = tab;
            tab.mCorrespondingButton = button;
            gBrowser.moveTabTo(tab, n++, true);
            break;
          }
        }
      }
    }

    if (this.firstChild.pinned || pinnedbox.hasChildNodes())
      this.setAttribute("haspinned", true);
    else
      this.removeAttribute("haspinned");

    for (let button of pinnedbox.childNodes) {
      button.width = button.tab ? button.tab.getBoundingClientRect().width : 0;
      button.style.opacity = button.width > 0 ? 0 : "";
    }

    var ltr = getComputedStyle(this).direction == "ltr";
    var [start, end] = ltr ? ["left", "right"] : ["right", "left"];
    pinnedbox.style.setProperty("border-" + start, "", ""); //RTL compatibility

    var pinnedboxEnd = pinnedbox.hasChildNodes() ? pinnedbox.lastChild.getBoundingClientRect()[end]
                                                 : pinnedbox.getBoundingClientRect()[start] + parseFloat(getComputedStyle(pinnedbox).getPropertyValue("padding-" + start)) * (ltr ? 1 : -1);
    var paddingEnd = 0;
    for (let i = 0, tab; (tab = this.childNodes[i]) && tab.pinned; i++) {
      if (tab.mCorrespondingButton) {
        let rect = tab.mCorrespondingButton.getBoundingClientRect();
        let style = getComputedStyle(tab.mCorrespondingButton);
        tab.style.left = rect.left - parseFloat(style.marginLeft) + "px";
      }
      else {
        let style = getComputedStyle(tab);
        let width = tab.boxObject.width + parseFloat(style.marginLeft) + parseFloat(style.marginRight);
        tab.style.left = pinnedboxEnd + paddingEnd * (ltr ? 1 : -1) + width * (ltr ? 0 : -1) + "px";
        paddingEnd += width;
      }
    }
    pinnedbox.style.setProperty("border-" + end, paddingEnd > 0 ? paddingEnd + "px solid transparent" : "", "");

    this.mTabstrip.ensureElementIsVisible(this.selectedItem, false);
  };
  gBrowser.mTabContainer._positionPinnedTabs = gBrowser.mTabContainer.positionPinnedTabs;

  TU_hookCode("gBrowser.mTabContainer.adjustTabstrip", "{", "if (arguments[0]) this.positionPinnedTabs();");

  tabutils.addEventListener(gBrowser.mTabContainer, "overflow", function() {this.positionPinnedTabs();}, false);
  tabutils.addEventListener(gBrowser.mTabContainer, "underflow", function() {this.positionPinnedTabs();}, false);

  gBrowser.updatePinnedTabsBar = function updatePinnedTabsBar() {
    let tagId = -1;
    if (TU_getPref("extensions.tabutils.pinTab.showPhantom", true))
      tagId = PlacesUtils.getItemIdForTag("pinned");

    let pinnedbox = this.mTabContainer.mTabstrip._pinnedbox;
    let place = "place:folder=" + tagId;
    if (pinnedbox.place != place) {
      while (pinnedbox.hasChildNodes()) {
        let button = pinnedbox.firstChild;
        if (button.tab)
          button.tab.mCorrespondingButton = null;
        pinnedbox.removeChild(button);
      }
      pinnedbox.place = place;
    }
  };

  gBrowser.mTabContainer.__defineGetter__("_pinnedTabRules", function() {
    delete this._pinnedTabRules;
    return this._pinnedTabRules = [
      tabutils.insertRule('.tabbrowser-tabs[multirow] #PinnedTabsBar[style*="border"]:empty,' +
                          '.tabbrowser-tabs[multirow] #PinnedTabsBarItems[style*="border"]:empty,' +
                          '.tabbrowser-tabs[orient="vertical"] #PinnedTabsBarItems[style*="border"]:empty,' +
                          '.tabbrowser-tabs[orient="vertical"] #PinnedTabsBar[style*="border"]:empty {}'),
      tabutils.insertRule('.tabbrowser-tabs[multirow] > .tabbrowser-tab[pinned],' +
                          '#main-window .tabbrowser-tabs[orient="vertical"] > .tabbrowser-tab[pinned] {}'),
      tabutils.insertRule('#main-window .tabbrowser-tab[pinned]:not([selected]) {}'),
      tabutils.insertRule('#main-window .tabbrowser-tab[pinned][selected] {}'),
      tabutils.insertRule('#main-window .tabbrowser-tab[pinned] > * {}')
    ];
  });

  gBrowser.mTabContainer.stylePinnedTabs = function stylePinnedTabs() {
    var tab = this.lastChild;
    while (tab && tab.boxObject.height == 0)
      tab = tab.previousSibling;
    if (!tab)
      return;

    var wasSelected = tab.selected;
    var wasPinned = tab.pinned;

    tab.removeAttribute("selected");
    tab.removeAttribute("pinned");
    var style = getComputedStyle(tab);
    var height = tab.boxObject.height;
    var lineHeight = tab.boxObject.height - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth) - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    this._pinnedTabRules[0].style.setProperty("height", height + "px", "");
    this._pinnedTabRules[1].style.setProperty("margin-top", -height + "px", "important");
    this._pinnedTabRules[2].style.setProperty("height", height + "px", "important");
    this._pinnedTabRules[2].style.setProperty("line-height", lineHeight + "px", "");

    tab.setAttribute("selected", true);
    var style = getComputedStyle(tab);
    var height = tab.boxObject.height;
    var lineHeight = tab.boxObject.height - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth) - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    this._pinnedTabRules[3].style.setProperty("height", height + "px", "important");
    this._pinnedTabRules[3].style.setProperty("line-height", lineHeight + "px", "");

    wasSelected ? tab.setAttribute("selected", true) : tab.removeAttribute("selected");
    wasPinned ? tab.setAttribute("pinned", true) : tab.removeAttribute("pinned");

    var tab = this.firstChild;
    while (tab && tab.boxObject.height == 0)
      tab = tab.nextSibling;

    if (tab && tab.pinned) {
      var rect = tab.getBoundingClientRect();
      var style = getComputedStyle(tab);
      var middle = (rect.top + parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop) + rect.bottom - parseFloat(style.borderBottomWidth) - parseFloat(style.paddingBottom)) / 2;

      var icon = tab.boxObject.firstChild;
      var rect = icon.getBoundingClientRect();
      var style = getComputedStyle(icon);
      var x_middle = (rect.top - parseFloat(style.marginTop) + rect.bottom + parseFloat(style.marginBottom)) / 2 - (parseFloat(style.top) || 0);
      this._pinnedTabRules[4].style.setProperty("top", middle - x_middle + "px", "");
    }
  };

  tabutils.addEventListener(window, "resize", function(event) {
    if (!arguments.callee._initialized) {
      if (event.target != window)
        return;
      arguments.callee._initialized = true;
    }

    var tabContainer = gBrowser.mTabContainer;
    var boxObject = tabContainer.mTabstrip.boxObject;
    if (tabContainer.mTabstripX != boxObject.x || tabContainer.mTabstripY != boxObject.y) {
      tabContainer.positionPinnedTabs();
      tabContainer.mTabstripX = boxObject.x;
      tabContainer.mTabstripY = boxObject.y;
    }

    if (tabContainer.mTabstripHeight != boxObject.height) {
      tabContainer.stylePinnedTabs();
      tabContainer.mTabstripHeight = boxObject.height;
    }
  }, false);

  TU_hookCode("gBrowser.selectTabAtIndex", "this.visibleTabs", "this.visibleTabs.filter(function(aTab) !aTab.collapsed)");

  gBrowser.selectUnpinnedTabAtIndex = TU_hookFunc(gBrowser.selectTabAtIndex, "visibleTabs", "allTabs");

  gBrowser.selectPinnedTabAtIndex = function selectPinnedTabAtIndex(aIndex, aEvent) {
    var tabs = this.mTabContainer.mTabstrip._pinnedbox.childNodes;
    if (tabs.length == 0)
      tabs = Array.slice(this.visibleTabs, 0, this._numPinnedTabs);

    if (aIndex < 0)
      aIndex += tabs.length;

    if (aIndex >= 0 && aIndex < tabs.length)
      (tabs[aIndex].tab || tabs[aIndex]).click();

    if (aEvent) {
      aEvent.preventDefault();
      aEvent.stopPropagation();
    }
  };
};
