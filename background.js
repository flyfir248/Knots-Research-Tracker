browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveInfo") {
    saveResearchInfo(message.data).then(sendResponse).catch(console.error);
    return true;
  } else if (message.action === "getInfo") {
    getResearchInfo().then(sendResponse).catch(console.error);
    return true;
  } else if (message.action === "createTopic") {
    createTopic(message.topic).then(sendResponse).catch(console.error);
    return true;
  } else if (message.action === "removeTopic") {
    removeTopic(message.topic).then(sendResponse).catch(console.error);
    return true;
  } else if (message.action === "removePage") {
    removePage(message.topic, message.url).then(sendResponse).catch(console.error);
    return true;
  } else if (message.action === "exportData") {
    exportData(message.format).then(sendResponse).catch(console.error);
    return true;
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
      return browser.storage.local.set({ researchTopics }).then(() => {
        console.log(`Topic "${topic}" created.`);
      });
    } else {
      console.log(`Topic "${topic}" already exists.`);
    }
  });
}

function removeTopic(topic) {
  return browser.storage.local.get("researchTopics").then((result) => {
    let researchTopics = result.researchTopics || {};
    if (researchTopics[topic]) {
      delete researchTopics[topic];
      return browser.storage.local.set({ researchTopics }).then(() => {
        console.log(`Topic "${topic}" removed.`);
      });
    }
  });
}

function removePage(topic, url) {
  console.log(`Attempting to remove page ${url} from topic ${topic}`);
  return browser.storage.local.get("researchTopics").then((result) => {
    let researchTopics = result.researchTopics || {};
    if (researchTopics[topic]) {
      researchTopics[topic] = researchTopics[topic].filter(page => page.url !== url);
      return browser.storage.local.set({ researchTopics }).then(() => {
        console.log(`Page ${url} removed from topic ${topic}`);
      });
    }
  });
}

function exportData(format) {
  return browser.storage.local.get("researchTopics").then((result) => {
    const researchTopics = result.researchTopics || {};
    let dataStr;
    let mimeType;
    if (format === "json") {
      dataStr = JSON.stringify(researchTopics, null, 2);
      mimeType = "application/json";
    } else if (format === "csv") {
      const headers = "Topic,URL,Title,Notes,Timestamp\n";
      const rows = Object.keys(researchTopics).flatMap(topic =>
        researchTopics[topic].map(page =>
          `${topic},"${page.url}","${page.title}","${page.notes}","${page.timestamp}"\n`
        )
      );
      dataStr = headers + rows.join("");
      mimeType = "text/csv";
    } else if (format === "txt") {
      const lines = Object.keys(researchTopics).flatMap(topic => [
        `Topic: ${topic}`,
        ...researchTopics[topic].map(page =>
          `URL: ${page.url}\nTitle: ${page.title}\nNotes: ${page.notes}\nTimestamp: ${page.timestamp}\n`
        ),
        "\n"
      ]);
      dataStr = lines.join("\n");
      mimeType = "text/plain";
    }
    return { dataStr, mimeType };
  });
}
