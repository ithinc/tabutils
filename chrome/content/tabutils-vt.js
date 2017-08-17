//Vertical tabs
tabutils._verticalTabs = function() {
  TU_hookCode("gBrowser.mTabContainer._notifyBackgroundTab",
    [/(?=var scrollRect)/, function() {
      var vertical = this.orient == "vertical";
      var [start, end, size] = vertical ? ["top", "bottom", "height"]
                                        : ["left", "right", "width"];
    }],
    ["left:", "[start]:", "g"], // Bug 971630 [Fx29]
    ["right:", "[end]:", "g"],
    [".left", "[start]", "g"],
    [".right", "[end]", "g"],
    [".width", "[size]", "g"]
  );

  TU_hookCode("gBrowser.mTabContainer._getDropIndex",
    ["{", function() {
      var vertical = this.orient == "vertical";
      var [position, size] = vertical ? ["screenY", "height"]
                                      : ["screenX", "width"];
    }],
    [/getComputedStyle.*direction == "ltr"/, "$& || vertical"],
    [".screenX", "[position]", "g"],
    [".width", "[size]", "g"]
  );

  TU_hookCode("gBrowser.addTab", '!Services.prefs.getBoolPref("browser.tabs.animate")', 'this.mTabContainer.orient == "vertical" || $&');
  TU_hookCode("gBrowser.removeTab", '!Services.prefs.getBoolPref("browser.tabs.animate")', 'this.mTabContainer.orient == "vertical" || $&');

  // Hide tabs toolbar in Full Screen mode
  TU_hookCode("FullScreen.mouseoverToggle", /(?=.*gNavToolbox.*)/, function() {
    if (document.getElementById("TabsToolbar").parentNode != gNavToolbox)
      gBrowser.mTabContainer.visible = aShow;
  });

  if (tabutils.fxVersion >= 35.0) { // Bug 1071821 [Fx35]
      // I did not find a compatible approach
      TU_hookCode("FullScreen.toggle", /.*if.*\(\!this\._fullScrToggler\).*\n.*\n.*\n.*\n.*\}/, function() {
        if (!this._eventLoaded) { // the equivalent to "if (!this._fullScrToggler)"
          for (let fullScrToggler of this._fullScrTogglers) {
            fullScrToggler.addEventListener("mouseover", this._expandCallback, false);
            fullScrToggler.addEventListener("dragenter", this._expandCallback, false);
            fullScrToggler.collapsed = false;
          }
          this._eventLoaded = true;
        }
      });

  } else { // Earlier than Fx35
      TU_hookCode("FullScreen.toggle", /.*_expandCallback.*\n.*_expandCallback.*/, function() {
        for (let fullScrToggler of this._fullScrTogglers) {
          fullScrToggler.addEventListener("mouseover", this._expandCallback, false);
          fullScrToggler.addEventListener("dragenter", this._expandCallback, false);
          fullScrToggler.hidden = false;
        }
      });
      TU_hookCode("FullScreen.enterDomFullscreen", /.*_expandCallback.*\n.*_expandCallback.*/, function() {
        for (let fullScrToggler of this._fullScrTogglers) {
          fullScrToggler.removeEventListener("mouseover", this._expandCallback, false);
          fullScrToggler.removeEventListener("dragenter", this._expandCallback, false);
        }
      });

      TU_hookCode("FullScreen.cleanup", /.*_expandCallback.*\n.*_expandCallback.*/, function() {
        for (let fullScrToggler of this._fullScrTogglers) {
          fullScrToggler.removeEventListener("mouseover", this._expandCallback, false);
          fullScrToggler.removeEventListener("dragenter", this._expandCallback, false);
        }
      });
  }
  TU_hookCode("FullScreen.mouseoverToggle", /.*(collapsed|hidden) = aShow.*/, function() {
    let tabBarPosition = TU_getPref("extensions.tabutils.tabBarPosition");
    this._fullScrTogglers[0].$1 = aShow;
    this._fullScrTogglers[1].$1 = aShow || tabBarPosition != 1;
    this._fullScrTogglers[2].$1 = aShow || tabBarPosition != 2;
    this._fullScrTogglers[3].$1 = aShow || tabBarPosition != 3;
  }); // Note: mozFullScreen is Fx9+. I did not add " || document.mozFullScreen" because it seems always return to false, unknown reason.

  TU_hookCode("FullScreen.showXULChrome",
    ['fullscreenctls.parentNode == navbar', 'document.getElementById("TabsToolbar").parentNode == gNavToolbox'],
    ['fullscreenctls.parentNode.id == "TabsToolbar" && !ctlsOnTabbar', 'fullscreenctls.parentNode != navbar']
  );

  XPCOMUtils.defineLazyGetter(FullScreen, "_fullScrTogglers", function() [
    document.getElementById("fullscr-toggler"),
    document.getElementById("fullscr-toggler-bottom"),
    document.getElementById("fullscr-toggler-left"),
    document.getElementById("fullscr-toggler-right")
  ]);

  // Hide tabs toolbar in Print Preview mode
  TU_hookCode("PrintPreviewListener._hideChrome", "}", function() {
    this._chromeState.tabsToolbarOpen = gBrowser.mTabContainer.visible;
    gBrowser.mTabContainer.visible = false;
  });

  TU_hookCode("PrintPreviewListener._showChrome", "}", function() {
    if (this._chromeState.tabsToolbarOpen)
      gBrowser.mTabContainer.visible = true;
  });

  tabutils._tabPrefObserver.tabBarPosition = function() {
    let tabsToolbar = document.getElementById("TabsToolbar");
    let appcontent = document.getElementById("appcontent");
    let bottombox = document.getElementById("browser-bottombox");

    switch (TU_getPref("extensions.tabutils.tabBarPosition")) {
      case 1: //Bottom
        if (tabsToolbar.parentNode != bottombox) {
          gBrowser.mTabContainer.mTabstrip._stopSmoothScroll();
          bottombox.insertBefore(tabsToolbar, bottombox.firstChild);
          tabsToolbar.orient = gBrowser.mTabContainer.orient = gBrowser.mTabContainer.mTabstrip.orient = "horizontal";
          TabsInTitlebar.allowedBy("tabbarposition", false);
        }
        break;
      case 2: //Left
        if (tabsToolbar.nextSibling != appcontent) {
          gBrowser.mTabContainer.mTabstrip._stopSmoothScroll();
          appcontent.parentNode.insertBefore(tabsToolbar, appcontent);
          tabsToolbar.orient = gBrowser.mTabContainer.orient = gBrowser.mTabContainer.mTabstrip.orient = "vertical";
          TabsInTitlebar.allowedBy("tabbarposition", false);
          gBrowser.mTabContainer.removeAttribute("overflow");
        }
        break;
      case 3: //Right
        if (tabsToolbar.previousSibling != appcontent) {
          gBrowser.mTabContainer.mTabstrip._stopSmoothScroll();
          appcontent.parentNode.insertBefore(tabsToolbar, appcontent.nextSibling);
          tabsToolbar.orient = gBrowser.mTabContainer.orient = gBrowser.mTabContainer.mTabstrip.orient = "vertical";
          TabsInTitlebar.allowedBy("tabbarposition", false);
          gBrowser.mTabContainer.removeAttribute("overflow");
        }
        break;
      case 0: //Top
      default:
        if (tabsToolbar.parentNode != gNavToolbox) {
          gBrowser.mTabContainer.mTabstrip._stopSmoothScroll();
          if ("TabsOnTop" in window) // Bug 755593 [Fx28]
            gNavToolbox.appendChild(tabsToolbar);
          else
            gNavToolbox.insertBefore(tabsToolbar, document.getElementById("nav-bar"));
          tabsToolbar.orient = gBrowser.mTabContainer.orient = gBrowser.mTabContainer.mTabstrip.orient = "horizontal";
          TabsInTitlebar.allowedBy("tabbarposition", true);
        }
        break;
    }

    this.closeButtons();
  };
};
