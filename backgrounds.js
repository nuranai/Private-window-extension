// Used extension API
const windows = browser.windows,
  extension = browser.extension,
  storage = browser.storage,
  browserAction = browser.browserAction,
  commands = browser.commands,
  tabs = browser.tabs;

let isAllowedInIncognito = false;

// saved tabs for incognito
/**
 * fromat: 
 * [
 *  { windowId: "",
 *    tabs: [
 *      id: "",
 *      url: "",
 *    ]
 *  }
 * ]
 */
const windowTabsArray = [];


// icon changed based on is extension is enabled in incognito or not
extension.isAllowedIncognitoAccess()
  .then(answer => {
    if (answer) {
      isAllowedInIncognito = true;
      browserAction.setIcon({
        path: 'icons/private_save.png'
      });
    }
    else {
      browserAction.setIcon({
        path: 'icons/private_save_error.png'
      });
    }
});

// function that saves in windowTabsArray new tabs in incognito window
function tabCreatedListener(tab) {
  if (tab.incognito) {
    const isExisted = windowTabsArray.find(item => item.windowId === tab.windowId);
    if (isExisted) {
      isExisted.tabs.push({ id: tab.id, url: tab.url });
    }
    else {
      const newObject = {
        windowId: tab.windowId,
        tabs: [{id: tab.id, url:tab.url}]
      }
      windowTabsArray.push(newObject);
    }
  }
}

// change url of the tab
function tabUpdateListener(tabId, changeInfo, tab) {
  if (tab.incognito && changeInfo.url) {
    const isExisted = windowTabsArray.find(item => item.windowId === tab.windowId);
    if (isExisted) {
      let changedTabIndex = isExisted.tabs.findIndex(item => item.id === tabId);
      if (changedTabIndex >= 0)
        isExisted.tabs[changedTabIndex].url = changeInfo.url;
      else {
        isExisted.tabs.push({id: tabId, url: changeInfo.url})
      }
    }
  }
}

// delete tab from windowTabsArray
function tabRemovedListener(tab) {
  if (tab.incognito) {
    const windowIdIndex = windowTabsArray.findIndex(item => item.windowId === tab.windowId);
    if (windowIdIndex >= 0) {
      const tabIndex = windowTabsArray[windowIdIndex].tabs.findIndex(item => item.id === tab.id);
      windowTabsArray[windowIdIndex].tabs.splice(tabIndex, 1);
    }
  }
}

// when incognito window closes this function saves into storage its tabs
function windowRemovedListener(windowId) {
  const windowObject = windowTabsArray.find(window => window.windowId === windowId);
  const index = windowTabsArray.indexOf(windowObject);

  windowTabsArray.splice(index, 1);
  storage.sync.set({ "tabs": windowObject.tabs });
}

// open new incognito window with saved in storage tabs
function opentSavedIncognito() {
  storage.sync.get().then(data => {
    const asd = data.tabs.map(item => item.url);
    windows.create({
      incognito: true,
      url:asd 
    });
  })
}

// tabs listeners
tabs.onCreated.addListener(tabCreatedListener);
tabs.onUpdated.addListener(tabUpdateListener);
tabs.onRemoved.addListener(tabRemovedListener);

// window listener
windows.onRemoved.addListener(windowRemovedListener);

// open private window on extension icon click
browserAction.onClicked.addListener(opentSavedIncognito);

// open private window on extension short-cut
commands.onCommand.addListener(opentSavedIncognito);