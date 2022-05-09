// Used extension API
const windows = browser.windows;
const extension = browser.extension;
const storage = browser.storage;
const browserAction = browser.browserAction;
const commands = browser.commands;
const tabs = browser.tabs;


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
      // if enabled set image to default
      browserAction.setIcon({
        path: 'icons/private_save.png'
      });
    }
    // else error image
    else {
      browserAction.setIcon({
        path: 'icons/private_save_error.png'
      });
    }
  });

// function that saves in windowTabsArray new tabs in incognito window
function tabCreatedListener(tab) {
  // if we are in incognito mode
  if (tab.incognito) {
    // searching for private window taht we are in 
    const isExisted = windowTabsArray.find(item => item.windowId === tab.windowId);

    // if window existed update its tab array
    if (isExisted) {
      isExisted.tabs.push({ id: tab.id, url: tab.url });
    }
    // if window is new update windowTabsArray
    else {
      const newObject = {
        windowId: tab.windowId,
        tabs: [{ id: tab.id, url: tab.url }]
      }

      windowTabsArray.push(newObject);
    }
  }
}

// change url of the tab
function tabUpdateListener(tabId, changeInfo, tab) {
  // check if tab is in incognito and has in changeInfo argument an url property
  if (tab.incognito && changeInfo.url) {
    // searching for private window taht we are in 
    const isExisted = windowTabsArray.find(item => item.windowId === tab.windowId);
   
    // if we found tab, update it
    if (isExisted) {
      //searching for the tab
      const changedTabIndex = isExisted.tabs.findIndex(item => item.id === tabId);
   
      // if tab is existing update its url
      if (changedTabIndex >= 0)
        isExisted.tabs[changedTabIndex].url = changeInfo.url;
      // else add new
      else {
        isExisted.tabs.push({ id: tabId, url: changeInfo.url })
      }
    }
  }
}

// delete tab from windowTabsArray
function tabRemovedListener(tab) {
  //check if we are in incognito
  if (tab.incognito) {
    // searching for the window index
    const windowIdIndex = windowTabsArray.findIndex(item => item.windowId === tab.windowId);

    // remove tab from the window
    if (windowIdIndex >= 0) {
      const tabIndex = windowTabsArray[windowIdIndex].tabs.findIndex(item => item.id === tab.id);
      windowTabsArray[windowIdIndex].tabs.splice(tabIndex, 1);
    }
  }
}

// when incognito window closes this function saves into storage its tabs
function windowRemovedListener(windowId) {
  // searching for window to remove from our array
  const windowObject = windowTabsArray.find(window => window.windowId === windowId);

  if (!windowObject) return;

  // window index
  const index = windowTabsArray.indexOf(windowObject);

  // removing window from array
  windowTabsArray.splice(index, 1);

  // saving tabs to storage
  storage.sync.get(value => {
    if (value.windows) {
      value.windows.push(windowObject);

      storage.sync.set({ "windows": value.windows });
    }
    else {
      storage.sync.set({ "windows": [windowObject] });
    }
  })
}

// open new incognito window with saved in storage tabs
function openSavedIncognito() {
  storage.sync.get().then(data => {
    // if our stack is empty do nothing
    if (!data.windows?.length) return;

    // getting last window
    const lastWindow = data.windows.pop();
    
    // getting the urls of saved window
    const urls = lastWindow.tabs.map(item => item.url);

    // opening a new incognito window with tabs
    windows.create({
      incognito: true,
      url: urls
    })
    storage.sync.set({ "windows": data.windows });
  })
}

// tabs listeners
tabs.onCreated.addListener(tabCreatedListener);
tabs.onUpdated.addListener(tabUpdateListener);
tabs.onRemoved.addListener(tabRemovedListener);

// window listener
windows.onRemoved.addListener(windowRemovedListener);

// open private window on extension icon click
browserAction.onClicked.addListener(openSavedIncognito);

// open private window on extension short-cut
commands.onCommand.addListener(openSavedIncognito);