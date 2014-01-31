// Tab Stack
tabutils._stackTabs = function() {

  if ("TabView" in window)
  TU_hookCode("TabView.moveTabTo", "{", function() { // Ensure hidden tabs won't break tab stacks
    this._initFrame(function() {
      tab._suppressTabMove=true;
      let groupItem = this._window.GroupItems.groupItem(groupItemId);
      let tabItem = groupItem && groupItem.getChild(-1);
      this._window.GroupItems.moveTabToGroupItem(tab, groupItemId);
      gBrowser.moveTabAfter(tab, tabItem && tabItem.tab);
      delete tab._suppressTabMove;
    }.bind(this));
    return;
  });

  gBrowser.siblingTabsOf = function siblingTabsOf(aTab) {
    if (typeof aTab == "string") {
      let group = aTab;
      return Array.filter(this.visibleTabs, function(aTab) aTab.getAttribute("group") == group);
    }

    let group = aTab.getAttribute("group");
    let tabs = [aTab];
    for (let tab = aTab; (tab = tab.nextSibling) && tab.getAttribute("group") == group && !tab.hidden;) {
      if (!tab.closing)
        tabs.push(tab);
    }
    for (let tab = aTab; (tab = tab.previousSibling) && tab.getAttribute("group") == group && !tab.hidden;) {
      if (!tab.closing)
        tabs.unshift(tab);
    }
    return tabs;
  };

  gBrowser.previousSiblingTabOf = function previousSiblingTabOf(aTab) this.nextSiblingTabOf(aTab, -1);
  gBrowser.nextSiblingTabOf = function nextSiblingTabOf(aTab, aDir) {
    let group = aTab.getAttribute("group");
    let next = aDir < 0 ? "previousSibling" : "nextSibling";
    for (let tab = aTab; (tab = tab[next]) && tab.getAttribute("group") == group && !tab.hidden;) {
      if (!tab.closing)
        return tab;
    }
  };

  gBrowser.firstSiblingTabOf = function firstSiblingTabOf(aTab) this.lastSiblingTabOf(aTab, -1);
  gBrowser.lastSiblingTabOf = function lastSiblingTabOf(aTab, aDir) {
    let group = aTab.getAttribute("group");
    let next = aDir < 0 ? "previousSibling" : "nextSibling";
    for (let tab = aTab; (tab = tab[next]) && tab.getAttribute("group") == group && !tab.hidden;) {
      if (!tab.closing)
        aTab = tab;
    }
    return aTab;
  };

  gBrowser.stackTabs = function stackTabs(aTabs, aTab, aExpand) {
    aTabs = aTabs.filter(function(aTab) !aTab.pinned)
                 .sort(function(aTab, bTab) aTab._tPos - bTab._tPos);
    if (aTabs.length < 2)
      return;

    if (!aTab)
      aTab = aTabs[0];

    this.selectedTabs = [];
    this.unstackTabs(aTabs, aTab.hasAttribute("group") && !aTab.hasAttribute("group-first") && !aTab.hasAttribute("group-last"));
    this.gatherTabs(aTabs, aTab, true);

    for (let tab of aTabs) {
      this.attachTabTo(tab, aTab, {expand: aExpand, suppressUpdate: true});
    }
    this.updateStack(aTab);
  };

  gBrowser.unstackTabs = function unstackTabs(aTabs, aMove) {
    aMove = aMove != false;
    for (let i = 0; i < aTabs.length; i++) {
      if (aTabs[i].hasAttribute("group-first"))
        this.detachTab(aTabs[i]);
    }
    for (let i = aTabs.length - 1; i >= 0; i--)
      this.detachTab(aTabs[i], aMove);
  };

  gBrowser.attachTabTo = function attachTabTo(aTab, bTab, options) {
    if (aTab == bTab || aTab.pinned || bTab.pinned)
      return;

    if (!options)
      options = {};

    if (aTab.hasAttribute("group"))
      this.detachTab(aTab);

    if (!bTab.hasAttribute("group")) {
      bTab.setAttribute("group", Services.nsIUUIDGenerator.generateUUID());
      bTab.setAttribute("group-counter", 1);
    }

    if (bTab.getAttribute("group-counter") == 1) {
      bTab.setAttribute("group-collapsed", !options.expand && TU_getPref("extensions.tabutils.autoCollapseNewStack", true));
      this.mTabContainer.mTabstrip.ensureElementIsVisible(bTab);
    }

    //must happen after "group" is set to avoid bypassing stack, and
    //before "group-counter" is set to avoid moving stack, if TabMove event is not suppressed
    if (options.move) {
      aTab._suppressTabMove = true;
      switch (options.move) {
        case "start":
          this.moveTabBefore(aTab, this.firstSiblingTabOf(bTab));
          break;
        case "end":
          this.moveTabAfter(aTab, this.lastSiblingTabOf(bTab));
          break;
        case "before":
          this.moveTabBefore(aTab, bTab);
          break;
        default:
          this.moveTabAfter(aTab, bTab);
          break;
      }
      delete aTab._suppressTabMove;
    }

    aTab.setAttribute("group", bTab.getAttribute("group"));
    if (aTab.getAttribute("opener") != bTab.linkedPanel)
      aTab.setAttribute("opener", bTab.getAttribute("opener") || bTab.linkedPanel);

    if (!options.suppressUpdate)
      this.updateStack(bTab);
    tabutils.dispatchEvent(aTab, "TabStacked");
  };

  gBrowser.detachTab = function detachTab(aTab, aMove) {
    if (!aTab.hasAttribute("group"))
      return;

    if (aMove && !aTab.hasAttribute("group-first") && !aTab.hasAttribute("group-last")) {
      aTab._suppressTabMove = true;
      this.moveTabAfter(aTab, this.lastSiblingTabOf(aTab));
      this.mTabContainer._notifyBackgroundTab(aTab);
      delete aTab._suppressTabMove;
    }
    this.updateStack(aTab, {excludeSelf: true});
    tabutils.dispatchEvent(aTab, "TabUnstacked");

    tabutils.removeAttribute(aTab, "group");
    tabutils.removeAttribute(aTab, "group-color");
    tabutils.removeAttribute(aTab, "group-collapsed");
    tabutils.removeAttribute(aTab, "group-counter");
    aTab.removeAttribute("group-first");
    aTab.removeAttribute("group-last");

    aTab.removeAttribute("opener");
    if (aTab.selected)
      this.updateCurrentBrowser(true);
  };

  gBrowser.collapseStack = function collapseStack(aTab) {
    if (!aTab.hasAttribute("group"))
      return;

    if (aTab.getAttribute("group-collapsed") == "true")
      return;

    let tabs = this.siblingTabsOf(aTab);
    for (let tab of tabs) {
      tabutils.setAttribute(tab, "group-collapsed", true);
      if (tab.hasAttribute("group-counter"))
        aTab = tab;
    }

    let tabcontent = document.getAnonymousElementByAttribute(aTab, "class", "tab-content");
    if (tabcontent)
      tabcontent.setAttribute("group-counter", "(" + tabs.length + ")");

    tabutils.dispatchEvent(aTab, "StackCollapsed");
    this.mTabContainer.adjustTabstrip();
  };

  gBrowser.expandStack = function expandStack(aTab) {
    if (!aTab.hasAttribute("group"))
      return;

    if (aTab.getAttribute("group-collapsed") != "true")
      return;

    let tabs = this.siblingTabsOf(aTab);
    for (let tab of tabs) {
      tabutils.removeAttribute(tab, "group-collapsed");
      if (tab.hasAttribute("group-counter"))
        aTab = tab;
    }
    tabutils.dispatchEvent(aTab, "StackExpanded");
    this.mTabContainer.adjustTabstrip();
    this.mTabContainer.mTabstrip.ensureElementIsVisible(tabs[tabs.length - 1], false);
    this.mTabContainer.mTabstrip.ensureElementIsVisible(tabs[0], false);
  };

  gBrowser.updateStack = function updateStack(aTab, options) {
    if (!aTab.hasAttribute("group"))
      return;

    if (!options)
      options = {};

    let tabs = this.siblingTabsOf(aTab.getAttribute("group"));
    if (options.excludeSelf) {
      let index = tabs.indexOf(aTab);
      if (index > -1)
        tabs.splice(index, 1);
    }
    if (tabs.length == 0)
      return;

    if (!aTab.selected && !aTab.hasAttribute("group-counter") || tabs.indexOf(aTab) == -1) {
      aTab = tabs[0];
      for (let i = 1; i < tabs.length; i++) {
        if (tabs[i].hasAttribute("group-counter")) {
          aTab = tabs[i];
          break;
        }
      }
    }

    let group = options.id ? Services.nsIUUIDGenerator.generateUUID().toString()
                           : aTab.getAttribute("group");
    let color = "color" in options ? options.color : aTab.getAttribute("group-color");
    let collapsed = aTab.getAttribute("group-collapsed") == "true";
    for (let tab of tabs) {
      tabutils.setAttribute(tab, "group", group);
      tabutils.setAttribute(tab, "group-color", color);
      tabutils.setAttribute(tab, "group-collapsed", collapsed);
      tabutils.removeAttribute(tab, "group-counter");
      tab.removeAttribute("group-first");
      tab.removeAttribute("group-last");
    }
    tabutils._tabPrefObserver.updateStackColor(group, color);

    if (!aTab.selected && tabs.indexOf(this.mCurrentTab) > -1)
      aTab = this.mCurrentTab;

    tabutils.setAttribute(aTab, "group-counter", tabs.length);
    tabs[0].setAttribute("group-first", true);
    tabs[tabs.length - 1].setAttribute("group-last", true);

    let tabcontent = document.getAnonymousElementByAttribute(aTab, "class", "tab-content");
    if (tabcontent)
      tabcontent.setAttribute("group-counter", "(" + tabs.length + ")");
  };

  tabutils.addEventListener(gBrowser.mTabContainer, "dragover", function(event) {
    let tab = event.target.localName == "tab" ? event.target : null;
    if (tab && tab.getAttribute("group-collapsed") == "true" &&
        tab.getAttribute("group-counter") != 1 &&
        TU_getPref("extensions.tabutils.autoExpandStackOnDragover", true)) {
      if (!this._dragTime)
        this._dragTime = Date.now();
      if (Date.now() >= this._dragTime + 750)
        gBrowser.expandStack(tab);
    }
  }, true);

  tabutils.addEventListener(gBrowser.mTabContainer, "dragover", function(event) {
    if (!TU_getPref("extensions.tabutils.dragToStack", false))
      return;

    let tab = event.target.localName == "tab" ? event.target : null;
    if (!tab || tab.pinned)
      return;

    let dt = event.dataTransfer;
    let draggedTab = dt.mozGetDataAt(TAB_DROP_TYPE, 0);
    if (!draggedTab || draggedTab == tab || draggedTab.pinned || draggedTab.parentNode != this)
      return;

    let dropEffect = dt.dropEffect;
    if (dropEffect == "link" || dropEffect == "copy") {
      tab.removeAttribute("dragover");
      return;
    }

    let vertical = this.orient == "vertical";
    let [start, end] = vertical ? ["top", "bottom"] : ["left", "right"];
    let [position, size] = vertical ? ["screenY", "height"] : ["screenX", "width"];

    if (event[position] < tab.boxObject[position] + tab.boxObject[size] * .25)
      tab.setAttribute("dragover", start);
    else if (event[position] > tab.boxObject[position] + tab.boxObject[size] * .75)
      tab.setAttribute("dragover", end);
    else {
      tab.setAttribute("dragover", "center");
      this._tabDropIndicator.collapsed = true;
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  tabutils.addEventListener(gBrowser.mTabContainer, "drop", function(event) {
    let tab = event.target.localName == "tab" ? event.target : null;
    if (!tab || !tab.hasAttribute("dragover"))
      return;

    let move;
    switch (tab.getAttribute("dragover")) {
      case "left":
      case "top":
        if (!tab.hasAttribute("group-first") || tab.getAttribute("group-collapsed") == "true")
          return;
        move = "before";
        break;
      case "right":
      case "bottom":
        if (!tab.hasAttribute("group-last") || tab.getAttribute("group-collapsed") == "true")
          return;
        move = "after";
        break;
      default:
        if (tab.getAttribute("group-collapsed") == "true" && tab.getAttribute("group-counter") > 1)
          move = "end";
        else
          move = "stack";
        break;
    }

    tab.removeAttribute("dragover");
    this._tabDropIndicator.collapsed = true;
    event.stopPropagation();

    let dt = event.dataTransfer;
    let draggedTab = dt.mozGetDataAt(TAB_DROP_TYPE, 0);
    let draggedTabs = [draggedTab];
    for (let i = 1; i < dt.mozItemCount; i++) {
      let tab = dt.mozGetDataAt(TAB_DROP_TYPE, i);
      if (tab._tPos < draggedTab._tPos)
        draggedTabs.splice(-1, 0, tab);
      else
        draggedTabs.push(tab);
    }

    if (move == "stack") {
      gBrowser.stackTabs(draggedTabs.concat(tab), tab);
      return;
    }

    gBrowser.selectedTabs = [];
    gBrowser.unstackTabs(draggedTabs, false);
    gBrowser.attachTabTo(draggedTabs[0], tab, {move: move, expand: true, suppressUpdate: true});
    for (let i = 1; i < draggedTabs.length; i++) {
      gBrowser.attachTabTo(draggedTabs[i], draggedTabs[i - 1], {move: true, suppressUpdate: true});
    }
    gBrowser.updateStack(tab);
  }, true);

  tabutils.addEventListener(gBrowser.mTabContainer, "dragleave", function(event) {
    this._dragTime = 0;
    if (event.target.localName == "tab")
      event.target.removeAttribute("dragover");
  }, true);

  tabutils.addEventListener(gBrowser.mTabContainer, "dragend", function(event) { //Bug 460801
    Array.forEach(this.childNodes, function(aTab) aTab.removeAttribute("dragover"));
  }, true);

  TU_hookCode("gBrowser.onTabMove", "}", function() {
    let ltr = aTab._tPos > event.detail;
    let previousTab = ltr ? aTab.previousSibling : aTab.nextSibling;
    let nextTab = ltr ? aTab.nextSibling : aTab.previousSibling;

    if (aTab.hasAttribute("group") && aTab.getAttribute("group-counter") != 1 && !aTab.hidden) {
      if (aTab.getAttribute("group-collapsed") == "true" && aTab.hasAttribute("group-counter")) {
        let tabs = this.siblingTabsOf(aTab.getAttribute("group"));
        tabs.splice(tabs.indexOf(aTab), 1);

        let index = 0;
        let oldPos = ltr ? event.detail - 0.5 : event.detail + 0.5;
        while (index < tabs.length && tabs[index]._tPos < oldPos)
          index++;
        tabs.splice(index, 0, aTab);

        setTimeout(function() { //gather stack
          let selectedTabs = this.selectedTabs;
          this.selectedTabs = [];
          this.gatherTabs(tabs, aTab);
          this.selectedTabs = selectedTabs;
        }.bind(this), 0);
      }
      else if (aTab.getAttribute("group") == previousTab.getAttribute("group") || nextTab &&
               aTab.getAttribute("group") == nextTab.getAttribute("group"))
        this.updateStack(aTab);
      else
        this.detachTab(aTab);
    }

    if (nextTab && nextTab.hasAttribute("group") &&
        nextTab.getAttribute("group") != aTab.getAttribute("group") &&
        nextTab.getAttribute("group") == previousTab.getAttribute("group")) {
      if (nextTab.getAttribute("group-collapsed") == "true")
        setTimeout(function() { //bypass stack
          if (ltr)
            this.moveTabAfter(aTab, this.lastSiblingTabOf(nextTab));
          else
            this.moveTabBefore(aTab, this.firstSiblingTabOf(nextTab));
        }.bind(this), 0);
      else {
        if (aTab.getAttribute("group-collapsed") == "true" && aTab.getAttribute("group-counter") > 1)
          this.unstackTabs(this.siblingTabsOf(aTab.getAttribute("group")), false);
        this.attachTabTo(aTab, nextTab);
      }
    }
  });

  TU_hookCode("gBrowser.onTabClosing", "}", function() {
    tabutils._ss.deleteTabValue(aTab, "group-collapsed");
  });

  TU_hookCode("gBrowser.onTabClose", "}", function() {
    if (aTab.selected && aTab.hasAttribute("group") && !aTab.hasAttribute("opener"))
      this.selectedTab = this.nextSiblingTabOf(aTab) || this.previousSiblingTabOf(aTab);

    if (aTab.getAttribute("group-collapsed") == "true" &&
        aTab.getAttribute("group-counter") > 1) {
      aTab.removeAttribute("group-counter");
    }
    this.updateStack(aTab, {excludeSelf: true});
  });

  TU_hookCode("gBrowser.onTabRestoring", "}", function() {
    tabutils.restoreAttribute(aTab, "group");
    tabutils.restoreAttribute(aTab, "group-color");
    tabutils.restoreAttribute(aTab, "group-collapsed");
    tabutils.restoreAttribute(aTab, "group-counter");
    this.updateStack(aTab);

    if (aTab.getAttribute("group-collapsed") == "true")
      this.mTabContainer.adjustTabstrip();
  });

  TU_hookCode("gBrowser.onTabSelect", "}", function() {
    if (aTab.hasAttribute("group") && !aTab.hasAttribute("group-counter"))
      this.updateStack(aTab);

    if (aTab.getAttribute("group-collapsed") == "true" &&
        aTab.getAttribute("group-counter") != 1 &&
        TU_getPref("extensions.tabutils.autoExpandStackAndCollapseOthersOnSelect", true)) {
      Array.forEach(this.mTabs, function(aTab) {
        if (aTab.getAttribute("group-counter") > 1 && !aTab.hidden && !aTab.selected)
          this.collapseStack(aTab);
      }, this);
      this.expandStack(aTab);
      this.mTabContainer.mTabstrip.ensureElementIsVisible(this.mCurrentTab, false);
    }

    let lastTab = this.getLastSelectedTab();
    if (lastTab && lastTab.hasAttribute("group") &&
        lastTab.getAttribute("group") != aTab.getAttribute("group") &&
        TU_getPref("extensions.tabutils.autoCollapseStackOnBlur", false))
      this.collapseStack(lastTab);
  });

  TU_hookCode("gBrowser.onTabPinning", "}", function() {
    this.detachTab(aTab);
  });

  gBrowser.showOnlyTheseTabs = function showOnlyTheseTabs(aTabs) {
    Array.reduceRight(this.mTabs, function(self, aTab) {
      if (aTabs.indexOf(aTab) == -1)
        this.hideTab(aTab);
    }.bind(this), this);
    Array.reduce(this.mTabs, function(self, aTab) {
      if (aTabs.indexOf(aTab) > -1)
        this.showTab(aTab);
    }.bind(this), this);
    this.tabContainer.mTabstrip.ensureElementIsVisible(this.selectedTab, false);
  };

  TU_hookCode("gBrowser.onTabHide", "}", function() {
    this.updateStack(aTab, {excludeSelf: true});
  });

  TU_hookCode("gBrowser.onTabShow", "}", function() {
    this.updateStack(aTab);
  });

  TU_hookCode("gBrowser.loadTabs",
    [/(?=var tabNum)/, "var tabs = [firstTabAdded || this.mCurrentTab];"],
    [/(?=.*aReplace.*\n.*moveTabTo.*)/, "tabs.push(tab);"],
    [/(?=.*!aLoadInBackground.*)/, function() {
      if (tabs.length > 1 && TU_getPref("extensions.tabutils.autoStack", false))
        this.stackTabs(tabs);
    }]
  );

  TU_hookCode("gBrowser.mTabContainer._selectNewTab", "aNewTab.disabled",
    "$& || aNewTab.getAttribute('group-collapsed') == 'true' && !aNewTab.hasAttribute('group-counter')"
  );

  TU_hookCode("gBrowser.createTooltip", /(tab|tn).getAttribute\("label"\)/, function(s, s1) (function() {
    $1.mOverTwisty ? $1.getAttribute("group-collapsed") == "true" ?
                     document.getElementById("context_expandStack").getAttribute("label") :
                     document.getElementById("context_collapseStack").getAttribute("label")
                   : $1.getAttribute("group-collapsed") == "true" && $1.getAttribute("group-counter") != 1 ?
                     TU_getPref("extensions.tabutils.mouseHoverPopup", true) ?
                     event.preventDefault() :
                     this.siblingTabsOf($1).map(function($1) ($1.hasAttribute("group-counter") ? "> " : "# ") + $0).join("\n") :
                     $0
  }).toString().replace(/^.*{|}$/g, "").replace("$0", s, "g").replace("$1", s1, "g"));

  if (gBrowser.mTabContainer.mAllTabsPopup)
  TU_hookCode("gBrowser.mTabContainer.mAllTabsPopup._setMenuitemAttributes",
    ["aTab.selected", '$& || aTab.hasAttribute("group-counter") && arguments.callee.caller == gBrowser.updateTabStackPopup']
  );

  gBrowser.updateTabStackPopup = function updateTabStackPopup(aPopup) {
    while (aPopup.hasChildNodes())
      aPopup.removeChild(aPopup.lastChild);

    let tabs = this.siblingTabsOf(this.mTabs[aPopup.value]);
    for (let tab of tabs) {
      let item = document.createElement("menuitem");
      item.setAttribute("class", "menuitem-iconic alltabs-item menuitem-with-favicon");
      item.setAttribute("label", tab.label);
      item.setAttribute("crop", tab.crop);

      if (tab.hasAttribute("busy"))
        item.setAttribute("busy", "true");
      else
        item.setAttribute("image", tab.image);

      if (tab.hasAttribute("group-counter"))
        item.setAttribute("selected", "true");

      if (gBrowser.mTabContainer.mAllTabsPopup)
        gBrowser.mTabContainer.mAllTabsPopup._setMenuitemAttributes(item, tab);

      item.value = tab._tPos;
      aPopup.appendChild(item);
    }
  };

  tabutils.addEventListener(gBrowser.mTabContainer, "TabAttrModified", function(event) {
    let popup = document.getElementById("tabStackPopup");
    if (popup.state != "open")
      return;

    let tab = event.target;
    for (let item of popup.childNodes) {
      if (item.value == tab._tPos) {
        gBrowser.mTabContainer.mAllTabsPopup._setMenuitemAttributes(item, tab);
        break;
      }
    }
  }, false);

  tabutils.addEventListener(gBrowser.mTabContainer, "mouseover", function(event) {
    if (event.target.localName == "tab" &&
        event.target.getAttribute("group-collapsed") == "true" &&
        event.target.getAttribute("group-counter") != 1 &&
        TU_getPref("extensions.tabutils.mouseHoverPopup", true)) {
      let tab = event.target;
      let target = event.relatedTarget;
      while (target && target != tab)
        target = target.parentNode;
      if (target)
        return;

      let popup = document.getElementById("tabStackPopup");
      clearTimeout(popup._mouseHoverTimer);

      popup.hidePopup();
      popup._mouseHoverTimer = setTimeout(function() {
        popup.value = tab._tPos;
        popup.openPopup(tab, this.orient == "horizontal" ? "after_start" : "end_before");
      }.bind(this), TU_getPref("extensions.tabutils.mouseHoverPopupDelay", 250));
    }
  }, false);

  tabutils.addEventListener(gBrowser.mTabContainer, "mouseout", function(event) {
    if (event.target.localName == "tab") {
      let tab = event.target;
      let target = event.relatedTarget;
      while (target && target != tab)
        target = target.parentNode;
      if (target)
        return;

      let popup = document.getElementById("tabStackPopup");
      clearTimeout(popup._mouseHoverTimer);
      popup._mouseHoverTimer = setTimeout(function() {
        popup.hidePopup();
      }, 250);
    }
  }, false);

  tabutils.addEventListener(gBrowser.mTabContainer, "mousedown", function(event) {
    if (event.target.localName == "tab") {
      let popup = document.getElementById("tabStackPopup");
      clearTimeout(popup._mouseHoverTimer);
      popup.hidePopup();
    }
  }, false);

  let tabStackPopup = document.getElementById("tabStackPopup");
  tabutils.addEventListener(tabStackPopup, "mouseover", function(event) {
    clearTimeout(this._mouseHoverTimer);
  }, false);

  tabutils.addEventListener(tabStackPopup, "mouseout", function(event) {
    this._mouseHoverTimer = setTimeout(function() {
      this.hidePopup();
    }.bind(this), 250);
  }, false);
};
