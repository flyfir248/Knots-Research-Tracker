document.addEventListener("DOMContentLoaded", () => {
  const newTopicInput = document.getElementById("newTopicInput");
  const createTopicButton = document.getElementById("createTopicButton");
  const topicSelect = document.getElementById("topicSelect");
  const removeTopicButton = document.getElementById("removeTopicButton");
  const notesInput = document.getElementById("notesInput");
  const saveButton = document.getElementById("saveButton");
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const threadVisualizer = document.getElementById("threadVisualizer");
  const exportCSVButton = document.getElementById("exportCSVButton");
  const exportJSONButton = document.getElementById("exportJSONButton");
  const placeholder = document.getElementById("placeholder");

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
      });
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
        });
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
        });
      });
    } else {
      alert("Please select a topic first.");
    }
  });

  topicSelect.addEventListener("change", () => {
    visualizeThread(topicSelect.value);
  });

  searchButton.addEventListener("click", () => {
    const query = searchInput.value.trim().toLowerCase();
    if (query) {
      searchPages(query);
    }
  });

  exportCSVButton.addEventListener("click", () => {
    const selectedTopic = topicSelect.value;
    if (selectedTopic) {
      exportData(selectedTopic, "csv");
    } else {
      alert("Please select a topic to export.");
    }
  });

  exportJSONButton.addEventListener("click", () => {
    const selectedTopic = topicSelect.value;
    if (selectedTopic) {
      exportData(selectedTopic, "json");
    } else {
      alert("Please select a topic to export.");
    }
  });
});

function loadTopics() {
  browser.runtime.sendMessage({action: "getInfo"}).then((response) => {
    const topicSelect = document.getElementById("topicSelect");
    const researchTopics = response.researchTopics || {};

    // Clear existing options
    topicSelect.innerHTML = '<option value="">Select a topic</option>';

    if (Object.keys(researchTopics).length === 0) {
      document.getElementById("placeholder").classList.remove("hidden");
    } else {
      document.getElementById("placeholder").classList.add("hidden");
    }

    for (const topic of Object.keys(researchTopics)) {
      const option = document.createElement("option");
      option.value = topic;
      option.textContent = topic;
      topicSelect.appendChild(option);
    }

    if (topicSelect.value) {
      visualizeThread(topicSelect.value);
    }
  });
}

function visualizeThread(topic) {
  browser.runtime.sendMessage({action: "getInfo"}).then((response) => {
    const threadVisualizer = document.getElementById("threadVisualizer");
    const researchTopics = response.researchTopics || {};
    const pages = researchTopics[topic] || [];

    threadVisualizer.innerHTML = "";

    pages.forEach((page) => {
      const container = document.createElement("div");
      container.className = "page-container";
      container.innerHTML = `
        <h3>${page.title}</h3>
        <p><a href="${page.url}" target="_blank">${page.url}</a></p>
        <p>${page.notes}</p>
        <p><em>Timestamp:</em> ${new Date(page.timestamp).toLocaleString()}</p>
        <button class="removePageButton" data-url="${page.url}">Remove</button>
      `;

      container.querySelector(".removePageButton").addEventListener("click", () => {
        removePage(topic, page.url);
      });

      threadVisualizer.appendChild(container);
    });
  });
}

function searchPages(query) {
  const selectedTopic = document.getElementById("topicSelect").value;
  if (selectedTopic) {
    browser.runtime.sendMessage({action: "getInfo"}).then((response) => {
      const researchTopics = response.researchTopics || {};
      const pages = researchTopics[selectedTopic] || [];

      const filteredPages = pages.filter((page) => {
        return page.title.toLowerCase().includes(query) || page.notes.toLowerCase().includes(query);
      });

      const threadVisualizer = document.getElementById("threadVisualizer");
      threadVisualizer.innerHTML = "";

      filteredPages.forEach((page) => {
        const container = document.createElement("div");
        container.className = "page-container";
        container.innerHTML = `
          <h3>${page.title}</h3>
          <p><a href="${page.url}" target="_blank">${page.url}</a></p>
          <p>${page.notes}</p>
          <p><em>Timestamp:</em> ${new Date(page.timestamp).toLocaleString()}</p>
          <button class="removePageButton" data-url="${page.url}">Remove</button>
        `;

        container.querySelector(".removePageButton").addEventListener("click", () => {
          removePage(selectedTopic, page.url);
        });

        threadVisualizer.appendChild(container);
      });
    });
  }
}

function removePage(topic, url) {
  if (confirm("Are you sure you want to remove this page?")) {
    browser.runtime.sendMessage({
      action: "removePage",
      topic: topic,
      url: url
    }).then(() => {
      visualizeThread(topic);
    });
  }
}

function exportData(topic, format) {
  browser.runtime.sendMessage({
    action: "getInfo"
  }).then((response) => {
    const researchTopics = response.researchTopics || {};
    const pages = researchTopics[topic] || [];

    let dataStr, filename;
    if (format === "csv") {
      const csvContent = pages.map(page => {
        return `"${page.title.replace(/"/g, '""')}","${page.url}","${page.notes.replace(/"/g, '""')}","${new Date(page.timestamp).toLocaleString()}"`;
      }).join("\n");

      dataStr = `data:text/csv;charset=utf-8,Title,URL,Notes,Timestamp\n${csvContent}`;
      filename = `${topic}_research.csv`;
    } else if (format === "json") {
      const jsonContent = JSON.stringify(pages, null, 2);
      dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
      filename = `${topic}_research.json`;
    }

    const downloadLink = document.createElement("a");
    downloadLink.setAttribute("href", dataStr);
    downloadLink.setAttribute("download", filename);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  });
}
