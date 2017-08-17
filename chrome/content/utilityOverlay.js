(function _utilityOverlayExt() {
  if (!("whereToOpenLink" in window))
    return;

  TU_hookCode("whereToOpenLink", "{", function() {
    var target;
    switch (TMP_console.callerName()) {
      case "PUIU_openNodeWithEvent":  //Fx 4.0
      case "PUIU__openTabset": // e10s got "PUIU_openNodeWithEvent"
        target = "bookmarks";break;
      case "BrowserGoHome":
        target = "homepage";break;
      case "handleLinkClick": //Fx 4.0. Not applicable for e10s.
        target = "links";break;
      case "ContentClick.contentAreaClick": //for e10s. Need QA.
        target = "links";break;
      default:
        for (var node = e && e.originalTarget; node && !target; node = node.parentNode) {
          switch (node.id) {
            case "bookmarksMenuPopup":
            case "goPopup":
            case "appmenu_bookmarksPopup":  //Fx 4.0
            case "appmenu_historyMenupopup":
            case "pof-main-menupopup": //Plain Old Favorites
            case "ybookmarks_menu_popup": //Delicious Bookmarks
            case "personal-bookmarks":
            case "ybToolbar-toolbar":
            case "bookmarks-menu-button": //Fx 4.0
            case "historymenu_history": //History Button
            case "bookmarksPanel":
            case "history-panel":
            case "ybSidebarPanel":
            case "placeContent":  // Library
              target = "bookmarks";break;
            case "home-button":
              target = "homepage";break;
            case "page-proxy-stack":
            case "go-button":
            case "urlbar-go-button":  //Fx 4.0
            case "PopupAutoCompleteRichResult":
              target = "urlbar";break;
            case "searchbar":
            case "PopupAutoComplete":
              target = "searchbar";break;
          }
        }
    }

    var openInTab, loadInBackground, prefName = "Bookmarks";
    switch (target) {
      case "bookmarks":
        openInTab = TU_getPref("extensions.tabutils.openBookmarksInTab", true);
        loadInBackground = TU_getPref("browser.tabs.loadBookmarksInBackground", false); // Bug 707672 [Fx11]
        break;
      case "homepage":
        openInTab = TU_getPref("extensions.tabutils.openHomepageInTab", false);
        //loadInBackground = TU_getPref("extensions.tabutils.loadHomepageInBackground", false);
        break;
      case "urlbar":
        openInTab = TU_getPref("extensions.tabutils.openUrlInTab", true);
        loadInBackground = TU_getPref("extensions.tabutils.loadUrlInBackground", false);
        break;
      case "searchbar":
        openInTab = TU_getPref("browser.search.openintab");
        loadInBackground = TU_getPref("extensions.tabutils.loadSearchInBackground", false);
        break;
      case "links": //Fx 4.0
        openInTab = tabutils.gOpenLinkInTab;
        prefName = "Links";
        break;
    }
  });

  TU_hookCode("whereToOpenLink",
    [/return "current";/, "e = {shiftKey:false, ctrlKey:false, metaKey:false, altKey:false, button:0};"],
    [/(?=return "current";)/, function() {
      if (alt) // Bug 713052 [Fx13]
        return "null";
      if (openInTab) {
        let w = getTopWin(true);
        if (!w)
          return "window";
        if (!w.isTabEmpty(w.gBrowser.selectedTab))
          return "tab";
      }
    }],
    [/"tab"/g, 'loadInBackground == null ? "tab" : loadInBackground ? "background" : "foreground"'],
    [/"tabshifted"/g, 'loadInBackground == null ? "tabshifted" : loadInBackground ? "foreground" : "background"'],
    [/"window"/, 'shift && TU_getPref("extensions.tabutils.shiftClick" + prefName, 0) ? "current" : $&'],
    [/(?=if \((ctrl|meta))/, function(s, s1) (function() {
      if (openInTab &&
          ($1 && TU_getPref("extensions.tabutils.ctrlClick" + prefName) & 0x01 ||
          middle && middleUsesTabs && TU_getPref("extensions.tabutils.middleClick" + prefName, 0) & 1))
        return "current";
    }).toString().replace(/^.*{|}$/g, "").replace("$1", s1)],
    [/shift(?= \?)/, '$& ^ (TU_getPref("extensions.tabutils." + (middle ? "middleClick" : "ctrlClick") + prefName) & 0x02) > 0']
  );

  TU_hookCode("openLinkIn",
    [/(?=if \(where == "save"\))/, function() { //Bookmarklet
      if (url.startsWith("javascript:"))
        where = "current";
    }],
    [/where == "tab".*\n?.*where == "tabshifted"/, '$& || where == "background" || where == "foreground"'],
    [/(?=case "tab")/, "case 'background':"],
    [/(?=case "tab")/, "case 'foreground':"],
    ["inBackground: loadInBackground", "inBackground: where == 'background' ? true : where == 'foreground' ? false : loadInBackground"]
  );
})();

(function _PlacesUIUtilsExt() {
  if (!("PlacesUIUtils" in window))
    return;

  [
    "openNodeWithEvent", "openNodeIn", "_openNodeIn",
    "openContainerNodeInTabs", "openURINodesInTabs", "_openTabset"
  ].forEach(function(name) {
    if (!PlacesUIUtils["TU_" + name]) {
      PlacesUIUtils["TU_" + name] = PlacesUIUtils[name];
      PlacesUIUtils.__defineGetter__(name, function() {
        return ("_getTopBrowserWin" in this && this._getTopBrowserWin() || window)["TU_" + name] || this["TU_" + name];
      });
      PlacesUIUtils.__defineSetter__(name, function(val) {
        return ("_getTopBrowserWin" in this && this._getTopBrowserWin() || window)["TU_" + name] = val;
      });
    }
    if (!window["TU_" + name]) {
      window["TU_" + name] = PlacesUIUtils["TU_" + name];
    }
  });

  //侧边栏书签
  TU_hookCode("TU_openNodeWithEvent", /_openNodeIn\((.*)\)/, function(s, s1) s.replace(s1, (s1 = s1.split(","), s1.push("aEvent || {}"), s1.join())));
  TU_hookCode("TU__openNodeIn",
    ["{", "var aEvent = arguments[arguments.length - 1];"],
    ['aWhere == "current"', '(aEvent ? !aEvent.button && !aEvent.ctrlKey && !aEvent.altKey && !aEvent.shiftKey && !aEvent.metaKey : $&)']
  );

  //新标签页书签
  TU_hookCode("TU__openNodeIn",
    [/(?=.*PlacesUtils.annotations.*)/, 'if (aNode.tags && aNode.tags.split(",").indexOf("tab") != -1) aWhere = "tab";']
  );

  //书签组
  TU_hookCode("TU__openTabset", /.*gBrowser.loadTabs.*/, function(s)
    s.replace("false", "where == 'current'")
     .replace("loadInBackground", "where == 'background' ? true : where == 'foreground' ? false : $& ^ browserWindow.TU_getPref('browser.tabs.loadBookmarksInBackground')")
  );

  //Open internal links in current tab
  TU_hookCode("TU__openNodeIn", /(.*inBackground.*?\))(,?)/, "$1, event: aEvent$2");

  TU_hookCode("openUILinkIn",
    ["{", "var lastArg = Object(arguments[arguments.length - 1]);"],
    [/(?=.*openLinkIn.*)/, function() {
      params.event = lastArg.event;
    }]
  );

  TU_hookCode("openLinkIn",
    ["{", "var lastArg = Object(arguments[arguments.length - 1]);"],
    [/(?=let loadInBackground)/, function() {
      if (lastArg.event && where != "current" && TU_getPref("extensions.tabutils.openInternalInCurrent", false)) {
        let e = lastArg.event;
        if (!e.button && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
          let aDomain = w.tabutils.getDomainFromURI(w.gBrowser.currentURI);
          let bDomain = w.tabutils.getDomainFromURI(url, aAllowThirdPartyFixup);
          if (aDomain == bDomain)
            where = "current";
        }
      }
    }]
  );

  TU_hookCode("openUILink", /(?=.*whereToOpenLink.*)/, function() {
    params.event = event;
  });

  //Open bookmarks with title/history
  TU_hookCode("TU__openNodeIn", /(.*inBackground.*aEvent)(,?)/, "$1, title: aNode.title, itemId: aNode.itemId == -1 ? null : aNode.itemId$2");

  TU_hookCode("openUILinkIn",
    ["{", "var lastArg = Object(arguments[arguments.length - 1]);"],
    [/(?=.*openLinkIn.*)/, function() {
      params.title = lastArg.title;
      params.itemId = lastArg.itemId;
    }]
  );

  TU_hookCode("openLinkIn",
    ["{", "var lastArg = Object(arguments[arguments.length - 1]);"],
    ["relatedToCurrent: aRelatedToCurrent", "$&, title: lastArg.title, itemId: lastArg.itemId"]
  );

  TU_hookCode("PlacesUtils.getURLsForContainerNode", /uri: child.uri(?!.*itemId)/, "$&, title: child.title, itemId: child.itemId");
  TU_hookCode("TU_openURINodesInTabs", "uri: aNodes[i].uri", "$&, title: aNodes[i].title, itemId: aNodes[i].itemId");
  TU_hookCode("TU__openTabset",
    ["urls = []", "$&, titles = [], itemIds = [];"],
    ["urls.push(item.uri);", "$&;titles.push(item.title);itemIds.push(item.itemId == -1 ? null : item.itemId);"],
    [/loadTabs\((.*)\)/, function(s, s1) s.replace(s1, (s1 = s1.split(","), s1.push("{titles: titles, itemIds: itemIds}"), s1.join().replace("},{", ",")))]
  );
})();

(function _SidebarUtilsExt() {
  if (!("SidebarUtils" in window))
    return;

  //右键点击书签
  TU_hookCode("SidebarUtils.handleTreeClick",
    ["aEvent.button == 2", "$& && (aEvent.ctrlKey || aEvent.altKey || aEvent.metaKey || !TU_getPref('extensions.tabutils.rightClickBookmarks', 0))"],
    ["aEvent.button == 1", "aEvent.button > 0"],
    ["}", "if (aEvent.button == 2) aEvent.preventDefault();"]
  );
  TU_hookCode("whereToOpenLink", "e.button == 1", "e.button > 0");
  TU_hookCode.call(document.getElementsByTagName("treechildren")[0], "_isAccelPressed", /aEvent.(ctrl|meta)Key/, "$& && aEvent.button != 2");
})();