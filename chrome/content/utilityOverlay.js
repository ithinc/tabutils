(function _utilityOverlayExt() {
  if (!("whereToOpenLink" in window))
    return;

  TU_hookCode("whereToOpenLink", "{", function() {
    var target;
    switch (arguments.callee.caller && arguments.callee.caller.name) {
      case "PUIU_openNodeWithEvent":  //Fx 4.0
      case "PUIU__openTabset":
        target = "bookmarks";break;
      case "BrowserGoHome":
        target = "homepage";break;
      case "handleLinkClick": //Fx 4.0
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
    [/"current"/g, 'openInTab ? "tab" : "current"'],
    [/"tab"/g, 'loadInBackground == null ? "tab" : loadInBackground ? "background" : "foreground"'],
    [/"tabshifted"/g, 'loadInBackground == null ? "tabshifted" : loadInBackground ? "foreground" : "background"'],
    [/"window"/, 'shift && TU_getPref("extensions.tabutils.shiftClick" + prefName, 0) ? "current" : $&'],
    [/(?=if \((ctrl|meta))/, <![CDATA[
      if (openInTab && ($1 && TU_getPref("extensions.tabutils.ctrlClick" + prefName, 1)
                     || middle && TU_getPref("extensions.tabutils.middleClick" + prefName, 0) & 1))
        return "current";
    ]]>],
    [/if \(shift|shift \?/, function(s) s.replace('shift', '$& ^ (middle && TU_getPref("extensions.tabutils.middleClick" + prefName, 0) & 2) > 0')]
  );

  TU_hookCode("openLinkIn",
    [/(?=if \(where == "save"\))/, function() { //Bookmarklet
      if (url.substr(0, 11) == "javascript:")
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

  ["openNodeWithEvent", "openNodeIn", "_openNodeIn", "_openTabset"].forEach(function(name) {
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
    ["{", "var aEvent = arguments[arguments.callee.length];"],
    ['aWhere == "current"', '(aEvent ? !aEvent.button && !aEvent.ctrlKey && !aEvent.altKey && !aEvent.shiftKey && !aEvent.metaKey : $&)']
  );

  //新标签页书签
  TU_hookCode("TU__openNodeIn",
    [/(?=.*PlacesUtils.annotations.*)/, 'if (aNode.tags && aNode.tags.split(",").indexOf("tab") != -1) aWhere = "tab";']
  );

  //书签组
  TU_hookCode("TU__openTabset",
    [/.*gBrowser.loadTabs.*/, function(s) s.replace("loadInBackground", "where == 'background' ? true : where == 'foreground' ? false : $& ^ browserWindow.TU_getPref('browser.tabs.loadBookmarksInBackground')")]
  );

  //Open internal links in current tab
  TU_hookCode("TU__openNodeIn", /openUILinkIn\((.*)\)/, function(s, s1)
    s.replace(s1, (s1 = s1.split(","), s1.length == 2 && s1.push("null", "null", "null"), s1.push("{event: aEvent}"), s1.join().replace("},{", ",")))
  );

  TU_hookCode("openUILinkIn",
    ["{", "var lastArg = Object(arguments[arguments.length - 1]);"],
    [/(?=.*openLinkIn.*)/, "params.event = lastArg.event;"]
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

  TU_hookCode("openUILink", /(?=.*openUILinkIn.*)/, "params.event = event;");
})();
