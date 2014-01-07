//Multi-row tabs
tabutils._multirowTabs = function() {
  gBrowser.mTabContainer.enterBlockMode = function enterBlockMode() {
    if (this.orient == "horizontal" && this.getAttribute("overflow") == "true" && this.getAttribute("showAllTabs") == "true") {
      this.mTabstrip._lineHeight = this.mTabstrip.boxObject.height;
      this.setAttribute("multirow", true);
      this._revertTabSizing();

      let evt = document.createEvent("UIEvent");
      evt.initUIEvent("underflow", true, false, window, 1);
      this.mTabstrip._scrollbox.dispatchEvent(evt);
    }
  };

  gBrowser.mTabContainer.exitBlockMode = function exitBlockMode() {
    if (!this.hasAttribute("multirow"))
      return;

    if (this.orient == "horizontal" &&
        this.getAttribute("showAllTabs") == "true" &&
        (this.getAttribute("overflow") == "true" || this.mTabstrip.boxObject.height / this.mTabstrip._lineHeight > 1.35))
      return;

    this.removeAttribute("multirow");
    this.stylePinnedTabs();
  };

  tabutils.addEventListener(gBrowser.mTabContainer, "overflow", function(event) {
    this.enterBlockMode();
  }, false);

  tabutils.addEventListener(gBrowser.mTabContainer, "TabClose", function(event) {
    setTimeout(function(self) {
      self.exitBlockMode();
    }, 250, this);
  }, false);

  tabutils.addEventListener(window, "resize", function(event) {
    gBrowser.mTabContainer.exitBlockMode();
    if (window.fullScreen && FullScreen._isChromeCollapsed)
      gNavToolbox.style.marginTop = -gNavToolbox.getBoundingClientRect().height + "px";
  }, false);

  TU_hookCode("gBrowser.mTabContainer._getDropIndex",
    [/event.screenX.*width \/ 2/g, function(s) s + " && " + s.replace("screenX", "screenY", "g").replace("width / 2", "height")
                                                 + " || " + s.replace("screenX", "screenY", "g").replace("width / 2", "height * 0")]
  );

  tabutils.addEventListener(gBrowser.mTabContainer, "dragover", function(event) {
    var ind = this._tabDropIndicator.parentNode;
    if (!this.hasAttribute("multirow")) {
      ind.style.position = "";
      return;
    }
    ind.style.position = "fixed";
    ind.style.zIndex = 100;

    var newIndex = this._getDropIndex(event);
    var tab = this.childNodes[newIndex < this.childNodes.length ? newIndex : newIndex - 1];
    var ltr = getComputedStyle(this).direction == "ltr";
    var [start, end] = ltr ? ["left", "right"] : ["right", "left"];
    var startPos = this.getBoundingClientRect()[start];
    if (tab.boxObject.screenY > event.screenY && newIndex > 0) {
      tab = this.childNodes[newIndex - 1];
      startPos += tab.getBoundingClientRect()[end] - this.mTabstrip._scrollbox.getBoundingClientRect()[start];
    }
    ind.style[start] = startPos - ind.clientWidth / 2 * (ltr ? 1 : -1) + "px";

    ind.style.top = tab.getBoundingClientRect().top + "px";
    ind.style.lineHeight = tab.getBoundingClientRect().height + "px";
    ind.firstChild.style.verticalAlign = "bottom";
  }, true);

  TU_hookCode("gBrowser.mTabContainer._animateTabMove", "{", function() {
    if (TU_getPref("extensions.tabutils.disableTabMoveAnimation", true)) {
      TU_hookFunc(arguments.callee.caller.toString().match(/^.*{|var (ind|tabStrip|ltr).*|var pixelsToScroll[\s\S]*$/g).join("\n"),
        [/.*scrollByPixels.*/, ";"],
        [/.*effects == "move"[\s\S]*?(?=var (newIndex|scrollRect|rect))/, ""]
      ).apply(this, arguments);
      return;
    }
  });

  tabutils.addEventListener(gBrowser.mTabContainer, "drop", function(event) {
    if (!TU_getPref("extensions.tabutils.disableTabMoveAnimation", true))
      return;

    let dt = event.dataTransfer;
    let dropEffect = dt.dropEffect;
    let draggedTab = dt.mozGetDataAt(TAB_DROP_TYPE, 0);

    if (dropEffect == "move" && draggedTab && draggedTab.parentNode == this) {
      draggedTab._dragData.animDropIndex = this._getDropIndex(event);
    }
  }, true);

  TU_hookCode("gBrowser.moveTabTo", "{", function() {
    if (["onxbldrop", "ondrop"].indexOf(arguments.callee.caller.name) > -1) {
      if (aTab.pinned) {
        if (aIndex >= this._numPinnedTabs)
          this.unpinTab(aTab);
      } else {
        if (aIndex < this._numPinnedTabs)
          this.pinTab(aTab);
      }
    }
  });

  tabutils.addEventListener(gBrowser.mTabContainer, "dragexit", function(event) {
    this._tabDropIndicator.collapsed = true;
  }, true);

  tabutils.addEventListener(gBrowser.mTabContainer, "dragend", function(event) {
    this._tabDropIndicator.collapsed = true;
  }, true);

  tabutils._tabPrefObserver.showAllTabs = function() {
    let showAllTabs = TU_getPref("extensions.tabutils.showAllTabs");
    if (showAllTabs) {
      gBrowser.mTabContainer.setAttribute("showAllTabs", true);
      gBrowser.mTabContainer.enterBlockMode();
    }
    else {
      gBrowser.mTabContainer.removeAttribute("showAllTabs");
      gBrowser.mTabContainer.exitBlockMode();
    }
  };
};
