// This frame script is used to assist Tab Utilities Fixed, to avoid performance degradation in e10s.

var getLinksSelected = function() {
    let links = content.document.links;
    let selection = content.getSelection();
    if (!links || !selection) return [];

    let linkURLs = [];
    //console.time('checkLinkSelected');
    for (let link of links) {
      if (selection.containsNode(link, true) && (link.offsetHeight > 0) && linkURLs.indexOf(link.href) == -1)
        linkURLs.push(link.href);
    }
    //console.timeEnd('checkLinkSelected');
    return linkURLs;
};

sendAsyncMessage("tabutils-fixed:LinksSelected", {
    links : getLinksSelected()
});
