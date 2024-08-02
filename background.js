browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveInfo") {
    return saveResearchInfo(message.data);
  } else if (message.action === "getInfo") {
    return getResearchInfo();
  } else if (message.action === "createTopic") {
    return createTopic(message.topic);
  } else if (message.action === "removeTopic") {
    return removeTopic(message.topic);
  } else if (message.action === "removePage") {
    return removePage(message.topic, message.url);
  }
});

function saveResearchInfo(data) {
  return browser.storage.local.get("researchTopics").then((result) => {
    let researchTopics = result.researchTopics || {};
    if (!researchTopics[data.topic]) {
      researchTopics[data.topic] = [];
    }
    researchTopics[data.topic].push({
      url: data.url,
      title: data.title,
      notes: data.notes,
      timestamp: new Date().toISOString()
    });
    return browser.storage.local.set({ researchTopics });
  });
}

function getResearchInfo() {
  return browser.storage.local.get("researchTopics");
}

function createTopic(topic) {
  return browser.storage.local.get("researchTopics").then((result) => {
    let researchTopics = result.researchTopics || {};
    if (!researchTopics[topic]) {
      researchTopics[topic] = [];
      return browser.storage.local.set({ researchTopics });
    }
  });
}

function removeTopic(topic) {
  return browser.storage.local.get("researchTopics").then((result) => {
    let researchTopics = result.researchTopics || {};
    if (researchTopics[topic]) {
      delete researchTopics[topic];
      return browser.storage.local.set({ researchTopics });
    }
  });
}

function removePage(topic, url) {
  return browser.storage.local.get("researchTopics").then((result) => {
    let researchTopics = result.researchTopics || {};
    if (researchTopics[topic]) {
      researchTopics[topic] = researchTopics[topic].filter(page => page.url !== url);
      return browser.storage.local.set({ researchTopics });
    }
  });
}
