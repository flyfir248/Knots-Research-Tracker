let researchTopics = {};

browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.get("researchTopics").then((result) => {
    if (result.researchTopics) {
      researchTopics = result.researchTopics;
    }
  });
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "getInfo":
      sendResponse({ researchTopics: researchTopics });
      break;
    case "createTopic":
      createTopic(message.topic);
      break;
    case "removeTopic":
      removeTopic(message.topic);
      break;
    case "saveInfo":
      saveInfo(message.data);
      break;
    case "removePage":
      removePage(message.topic, message.url);
      break;
    case "saveAnnotation":
      saveAnnotation(message.data);
      break;
    case "updateAnnotation":
        return updateAnnotation(message.data);
    case "deleteAnnotation":
        return deleteAnnotation(message.data);
    case "getAnnotations":
      return getAnnotations(message.topic, message.url);
    default:
      console.error("Unknown action:", message.action);
  }
});

function createTopic(topic) {
  if (!researchTopics[topic]) {
    researchTopics[topic] = [];
    saveResearchTopics();
  }
}

function removeTopic(topic) {
  if (researchTopics[topic]) {
    delete researchTopics[topic];
    saveResearchTopics();
  }
}

function saveInfo(data) {
  if (!researchTopics[data.topic]) {
    researchTopics[data.topic] = [];
  }
  
  const existingPageIndex = researchTopics[data.topic].findIndex(page => page.url === data.url);
  
  if (existingPageIndex !== -1) {
    // Update existing page
    researchTopics[data.topic][existingPageIndex] = {
      ...researchTopics[data.topic][existingPageIndex],
      ...data,
      timestamp: Date.now()
    };
  } else {
    // Add new page
    researchTopics[data.topic].push({
      ...data,
      timestamp: Date.now()
    });
  }
  
  saveResearchTopics();
}

function removePage(topic, url) {
  if (researchTopics[topic]) {
    researchTopics[topic] = researchTopics[topic].filter(page => page.url !== url);
    saveResearchTopics();
  }
}

function saveAnnotation(data) {
  if (!researchTopics[data.topic]) {
    researchTopics[data.topic] = [];
  }
  
  const pageIndex = researchTopics[data.topic].findIndex(page => page.url === data.url);

  if (pageIndex !== -1) {
    if (!researchTopics[data.topic][pageIndex].annotations) {
      researchTopics[data.topic][pageIndex].annotations = [];
    }
    researchTopics[data.topic][pageIndex].annotations.push({
      note: data.note,
      timestamp: data.timestamp
    });
  } else {
    // If the page doesn't exist, create it with the annotation
    researchTopics[data.topic].push({
      url: data.url,
      annotations: [{
        note: data.note,
        timestamp: data.timestamp
      }]
    });
  }

  saveResearchTopics();
  return Promise.resolve();
}

function getAnnotations(topic, url) {
  if (researchTopics[topic]) {
    const page = researchTopics[topic].find(p => p.url === url);
    if (page && page.annotations) {
      return Promise.resolve(page.annotations);
    }
  }
  return Promise.resolve([]);
}

function saveResearchTopics() {
  browser.storage.local.set({ researchTopics: researchTopics });
}

function updateAnnotation(data) {
  if (researchTopics[data.topic]) {
    const pageIndex = researchTopics[data.topic].findIndex(page => page.url === data.url);
    if (pageIndex !== -1 && researchTopics[data.topic][pageIndex].annotations) {
      researchTopics[data.topic][pageIndex].annotations[data.index] = data.updatedAnnotation;
      saveResearchTopics();
      return Promise.resolve();
    }
  }
  return Promise.reject("Annotation not found");
}

function deleteAnnotation(data) {
  if (researchTopics[data.topic]) {
    const pageIndex = researchTopics[data.topic].findIndex(page => page.url === data.url);
    if (pageIndex !== -1 && researchTopics[data.topic][pageIndex].annotations) {
      researchTopics[data.topic][pageIndex].annotations.splice(data.index, 1);
      saveResearchTopics();
      return Promise.resolve();
    }
  }
  return Promise.reject("Annotation not found");
}