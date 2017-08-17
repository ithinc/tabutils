var {classes: Cc, interfaces: Ci, utils: Cu} = Components;

XPCOMUtils.defineLazyModuleGetter(this, "TabmixSvc",
  "resource://tabmixplus/Services.jsm");
var TMP_console = TabmixSvc.console;

function TU_hookCode(aStr) {
  try {
    var namespaces = aStr.split(".");

    try {
      var object = this;
      while (namespaces.length > 1) {
        object = object[namespaces.shift()];
      }
    }
    catch (e) {
      throw TypeError(aStr + " is not a function");
    }

    var method = namespaces.pop();
    if (typeof object[method] != "function")
      throw TypeError(aStr + " is not a function");

    return object[method] = TU_hookFunc.apply(this, Array.concat(object[method], Array.slice(arguments, 1)));
  }
  catch (e) {
    Components.utils.reportError("Failed to hook " + aStr + "\n---\n"+(new Error()).stack);
  }
}

function TU_hookSetter(aStr) {
  try {
    var namespaces = aStr.split(".");

    try {
      var object = this;
      while (namespaces.length > 1) {
        object = object[namespaces.shift()];
      }
    }
    catch (e) {
      throw TypeError(aStr + " has no setter");
    }

    var property = namespaces.pop();
    var orgSetter = object.__lookupSetter__(property);
    if (!orgSetter)
      throw TypeError(aStr + " has no setter");

    var mySetter = TU_hookFunc.apply(this, Array.concat(orgSetter, Array.slice(arguments, 1)));
    object.__defineGetter__(property, object.__lookupGetter__(property));
    object.__defineSetter__(property, mySetter);

    return mySetter;
  }
  catch (e) {
    Components.utils.reportError("Failed to hook " + aStr + "\n---\n"+(new Error()).stack);
  }
}

function TU_hookFunc(aFunc) {
  var myCode = aFunc.toString();
  var orgCode, newCode, flags;

  for (var i = 1; i < arguments.length;) {
    if (arguments[i].constructor.name == "Array")
      [orgCode, newCode, flags] = arguments[i++];
    else
      [orgCode, newCode, flags] = [arguments[i++], arguments[i++], arguments[i++]];

    if (typeof newCode == "function" && newCode.length == 0)
      newCode = newCode.toString().replace(/^.*{|}$/g, "");

    switch (orgCode) {
      case "{": [orgCode, newCode] = [/{/, "$&\n" + newCode];break;
      case "}": [orgCode, newCode] = [/}$/, newCode + "\n$&"];break;
    }

    if (typeof orgCode == "string")
      orgCode = RegExp(orgCode.replace(/[{[(\\^|$.?*+/)\]}]/g, "\\$&"), flags || "");

    myCode = myCode.replace(orgCode, newCode);
  }

//  Cu.reportError(myCode);
//  myCode = myCode.replace(/(^.*\n?{)([\s\S]*)(}$)/, function(s, s1, s2, s3) (function() {
//    $1
//    try {
////      switch (arguments.callee.name) {
////        case "set_selectedTab":
////          Cu.reportError(arguments.callee.caller.name + '*' + arguments.callee.name + '*' + (val && val._tPos));break;
////        case "BrowserOpenTab":
////          Cu.reportError(arguments.callee.caller.name + '*' + arguments.callee.name );break;
////      }
//      $2
//    } catch (e) {
//      Cu.reportError([arguments.callee.name ,e]);
//      Cu.reportError(arguments.callee.stack);
//      Cu.reportError(arguments.callee);
//    }
//    $3
//  }).toString().replace(/^.*{|}$/g, "").replace("$1", s1).replace("$2", s2).replace("$3", s3));

  return eval("(" + myCode + ")");
}

function TU_getPref(aPrefName, aDefault) {
  switch (Services.prefs.getPrefType(aPrefName)) {
    case Services.prefs.PREF_BOOL: return Services.prefs.getBoolPref(aPrefName);
    case Services.prefs.PREF_INT: return Services.prefs.getIntPref(aPrefName);
    case Services.prefs.PREF_STRING: return Services.prefs.getComplexValue(aPrefName, Components.interfaces.nsISupportsString).data;
    default:
      switch (typeof aDefault) {
        case "boolean": Services.prefs.setBoolPref(aPrefName, aDefault);break;
        case "number": Services.prefs.setIntPref(aPrefName, aDefault);break;
        case "string": Services.prefs.setCharPref(aPrefName, aDefault);break;
      }
      return aDefault;
  }
}

function TU_setPref(aPrefName, aValue) {
  switch (Services.prefs.getPrefType(aPrefName)) {
    case Services.prefs.PREF_BOOL: Services.prefs.setBoolPref(aPrefName, aValue);break;
    case Services.prefs.PREF_INT: Services.prefs.setIntPref(aPrefName, aValue);break;
    case Services.prefs.PREF_STRING: Services.prefs.setCharPref(aPrefName, aValue);break;
    default:
      switch (typeof aValue) {
        case "boolean": Services.prefs.setBoolPref(aPrefName, aValue);break;
        case "number": Services.prefs.setIntPref(aPrefName, aValue);break;
        case "string": Services.prefs.setCharPref(aPrefName, aValue);break;
      }
  }
}
