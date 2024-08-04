document.addEventListener("DOMContentLoaded", () => {
  const newTopicInput = document.getElementById("newTopicInput");
  const createTopicButton = document.getElementById("createTopicButton");
  const topicSelect = document.getElementById("topicSelect");
  const removeTopicButton = document.getElementById("removeTopicButton");
  const notesInput = document.getElementById("notesInput");
  const saveButton = document.getElementById("saveButton");
  const threadVisualizer = document.getElementById("threadVisualizer");
  const exportCSVButton = document.getElementById("exportCSVButton");
  const exportJSONButton = document.getElementById("exportJSONButton");
  const placeholder = document.getElementById("placeholder");
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");

  // New elements for settings
  const settingsButton = document.getElementById("settingsButton");
  const settingsDropdown = document.getElementById("settingsDropdown");
  const textSizeSelect = document.getElementById("textSize");
  const themeSelect = document.getElementById("theme");

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

  searchButton.addEventListener("click", () => {
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (searchTerm) {
      searchResearch(searchTerm);
    } else {
      alert("Please enter a search term.");
    }
  });

  // Toggle settings menu
  settingsButton.addEventListener("click", () => {
    settingsDropdown.classList.toggle("hidden");
  });

  // Apply text size
  textSizeSelect.addEventListener("change", (e) => {
    document.body.classList.remove("text-small", "text-medium", "text-large");
    document.body.classList.add(`text-${e.target.value}`);
    saveSettings();
  });

  // Apply theme
  themeSelect.addEventListener("change", (e) => {
    document.body.classList.remove("theme-default", "theme-dark", "theme-light");
    document.body.classList.add(`theme-${e.target.value}`);
    saveSettings();
  });

  // Load saved settings
  loadSettings();
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
  const searchInput = document.getElementById("searchInput");
  searchInput.value = "";
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

function removePage(topic, url) {
  browser.runtime.sendMessage({
    action: "removePage",
    topic: topic,
    url: url
  }).then(() => {
    visualizeThread(topic);
  }).catch(error => {
    console.error(`Error removing page ${url} from topic ${topic}:`, error);
  });
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

function searchResearch(searchTerm) {
  browser.runtime.sendMessage({action: "getInfo"}).then((response) => {
    const researchTopics = response.researchTopics || {};
    const results = [];

    for (const topic in researchTopics) {
      const pages = researchTopics[topic];
      const matchingPages = pages.filter(page =>
        page.title.toLowerCase().includes(searchTerm) ||
        page.url.toLowerCase().includes(searchTerm) ||
        page.notes.toLowerCase().includes(searchTerm)
      );

      if (matchingPages.length > 0) {
        results.push({topic, pages: matchingPages});
      }
    }

    displaySearchResults(results);
  });
}

function displaySearchResults(results) {
  const threadVisualizer = document.getElementById("threadVisualizer");
  threadVisualizer.innerHTML = "";

  if (results.length === 0) {
    threadVisualizer.innerHTML = "<p>No results found.</p>";
    return;
  }

  results.forEach(result => {
    const topicHeader = document.createElement("h2");
    topicHeader.textContent = result.topic;
    threadVisualizer.appendChild(topicHeader);

    result.pages.forEach(page => {
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
        removePage(result.topic, page.url);
      });

      threadVisualizer.appendChild(container);
    });
  });
}

function saveSettings() {
  const settings = {
    textSize: document.getElementById("textSize").value,
    theme: document.getElementById("theme").value
  };
  browser.storage.local.set({ settings });
}

function loadSettings() {
  browser.storage.local.get("settings").then((result) => {
    const settings = result.settings || { textSize: "medium", theme: "default" };
    document.getElementById("textSize").value = settings.textSize;
    document.getElementById("theme").value = settings.theme;
    document.body.classList.add(`text-${settings.textSize}`, `theme-${settings.theme}`);
  });
}