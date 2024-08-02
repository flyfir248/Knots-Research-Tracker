document.addEventListener("DOMContentLoaded", () => {
  const newTopicInput = document.getElementById("newTopicInput");
  const createTopicButton = document.getElementById("createTopicButton");
  const topicSelect = document.getElementById("topicSelect");
  const removeTopicButton = document.getElementById("removeTopicButton");
  const notesInput = document.getElementById("notesInput");
  const saveButton = document.getElementById("saveButton");
  const threadVisualizer = document.getElementById("threadVisualizer");
  const exportFormatSelect = document.getElementById("exportFormatSelect");
  const exportButton = document.getElementById("exportButton");

  loadTopics();

  createTopicButton.addEventListener("click", () => {
    const newTopic = newTopicInput.value.trim();
    if (newTopic) {
      browser.runtime.sendMessage({
        action: "createTopic",
        topic: newTopic
      }).then(() => {
        loadTopics();
        newTopicInput.value = "";
      }).catch(console.error);
    }
  });

  removeTopicButton.addEventListener("click", () => {
    const selectedTopic = topicSelect.value;
    if (selectedTopic) {
      if (confirm(`Are you sure you want to remove the topic "${selectedTopic}" and all its saved pages?`)) {
        browser.runtime.sendMessage({
          action: "removeTopic",
          topic: selectedTopic
        }).then(() => {
          loadTopics();
          threadVisualizer.innerHTML = "";
        }).catch(console.error);
      }
    } else {
      alert("Please select a topic to remove.");
    }
  });

  saveButton.addEventListener("click", () => {
    const selectedTopic = topicSelect.value;
    if (selectedTopic) {
      browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
        const activeTab = tabs[0];
        browser.runtime.sendMessage({
          action: "saveInfo",
          data: {
            topic: selectedTopic,
            url: activeTab.url,
            title: activeTab.title,
            notes: notesInput.value
          }
        }).then(() => {
          loadTopics();
          notesInput.value = "";
          visualizeThread(selectedTopic);
        }).catch(console.error);
      }).catch(console.error);
    } else {
      alert("Please select a topic first.");
    }
  });

  topicSelect.addEventListener("change", () => {
    visualizeThread(topicSelect.value);
  });

  exportButton.addEventListener("click", () => {
    const format = exportFormatSelect.value;
    browser.runtime.sendMessage({
      action: "exportData",
      format: format
    }).then((response) => {
      const { dataStr, mimeType } = response;
      const blob = new Blob([dataStr], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research_data.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }).catch(console.error);
  });
});

function loadTopics() {
  browser.runtime.sendMessage({action: "getInfo"}).then((response) => {
    const topicSelect = document.getElementById("topicSelect");
    const researchTopics = response.researchTopics || {};

    // Clear existing options
    topicSelect.innerHTML = '<option value="">Select a topic</option>';

    for (const topic of Object.keys(researchTopics)) {
      const option = document.createElement("option");
      option.value = topic;
      option.textContent = topic;
      topicSelect.appendChild(option);
    }
  }).catch(console.error);
}

function visualizeThread(topic) {
  const threadVisualizer = document.getElementById("threadVisualizer");
  if (!topic) {
    threadVisualizer.innerHTML = "";
    return;
  }

  browser.runtime.sendMessage({action: "getInfo"}).then((response) => {
    const researchTopics = response.researchTopics || {};
    const pages = researchTopics[topic] || [];

    threadVisualizer.innerHTML = "";
    const ul = document.createElement("ul");
    pages.forEach((page, index) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = page.url;
      a.target = "_blank";
      a.textContent = `${index + 1}. ${page.title}`;
      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => {
        removePage(topic, page.url);
      });
      li.appendChild(a);
      li.appendChild(document.createElement("br"));
      li.appendChild(document.createTextNode(page.notes));
      li.appendChild(document.createElement("br"));
      li.appendChild(document.createTextNode(`Timestamp: ${page.timestamp}`));
      li.appendChild(document.createElement("br"));
      li.appendChild(removeButton);
      ul.appendChild(li);
    });
    threadVisualizer.appendChild(ul);
  }).catch(console.error);
}

function removePage(topic, url) {
  browser.runtime.sendMessage({
    action: "removePage",
    topic: topic,
    url: url
  }).then(() => {
    visualizeThread(topic);
  }).catch(console.error);
}
