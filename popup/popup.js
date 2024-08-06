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
  const pageRating = document.getElementById("pageRating");
  const settingsButton = document.getElementById("settingsButton");
  const settingsDropdown = document.getElementById("settingsDropdown");
  const textSizeSelect = document.getElementById("textSize");
  const themeSelect = document.getElementById("theme");
  const highlightButton = document.getElementById("highlightButton");
  const annotationList = document.getElementById("annotationList");

  let currentHighlight = null;

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
        const rating = pageRating.value;
        browser.runtime.sendMessage({
          action: "saveInfo",
          data: {
            topic: selectedTopic,
            url: activeTab.url,
            title: activeTab.title,
            notes: notesInput.value,
            rating: rating,
            timestamp: Date.now()
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

  settingsButton.addEventListener("click", () => {
    settingsDropdown.classList.toggle("hidden");
  });

  textSizeSelect.addEventListener("change", (e) => {
    document.body.classList.remove("text-small", "text-medium", "text-large");
    document.body.classList.add(`text-${e.target.value}`);
    saveSettings();
  });

  themeSelect.addEventListener("change", (e) => {
    document.body.classList.remove("theme-default", "theme-dark", "theme-light", "theme-sepia", "theme-forest", "theme-ocean", "theme-sunset", "theme-cyberpunk");
    document.body.classList.add(`theme-${e.target.value}`);
    saveSettings();
  });

  highlightButton.addEventListener("click", highlightSelectedText);

  loadSettings();
});

function loadTopics() {
  browser.runtime.sendMessage({action: "getInfo"}).then((response) => {
    const topicSelect = document.getElementById("topicSelect");
    const researchTopics = response.researchTopics || {};

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
        <p><em>Rating:</em> ${getRatingText(page.rating)}</p>
        <p><em>Timestamp:</em> ${new Date(page.timestamp).toLocaleString()}</p>
        <button class="removePageButton" data-url="${page.url}">Remove</button>
        <button class="annotatePageButton" data-url="${page.url}">Annotate</button>
        <div class="annotationList" data-url="${page.url}"></div>
      `;

      container.querySelector(".removePageButton").addEventListener("click", () => {
        removePage(topic, page.url);
      });

      container.querySelector(".annotatePageButton").addEventListener("click", () => {
        promptForAnnotation(topic, page.url);
      });

      threadVisualizer.appendChild(container);
    });

    // Load annotations for all pages
    pages.forEach(page => {
      loadAnnotations(topic, page.url);
    });
  });
}

function getRatingText(rating) {
  const ratingTexts = {
    '1': '1 - Not Relevant',
    '2': '2 - Somewhat Relevant',
    '3': '3 - Relevant',
    '4': '4 - Very Relevant',
    '5': '5 - Extremely Relevant'
  };
  return rating ? ratingTexts[rating] : 'Not rated';
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
        return `"${page.title.replace(/"/g, '""')}","${page.url}","${page.notes.replace(/"/g, '""')}","${page.rating || 'Not rated'}","${new Date(page.timestamp).toLocaleString()}"`;
      }).join("\n");

      dataStr = `data:text/csv;charset=utf-8,Title,URL,Notes,Rating,Timestamp\n${csvContent}`;
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
        page.notes.toLowerCase().includes(searchTerm) ||
        (page.rating && page.rating.toString() === searchTerm)
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
        <p><em>Rating:</em> ${page.rating || 'Not rated'}</p>
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

function highlightSelectedText() {
  browser.tabs.executeScript({
    code: `
      (function() {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.style.backgroundColor = 'yellow';
        span.className = 'knots-highlight';
        range.surroundContents(span);
        return {
          text: selection.toString(),
          html: span.outerHTML
        };
      })();
    `
  }).then((result) => {
    if (result[0]) {
      currentHighlight = result[0];
      promptForAnnotation();
    }
  });
}

function promptForAnnotation(topic, url) {
  const note = prompt("Add a note for this page:", "");
  if (note !== null) {
    saveAnnotation(topic, url, note);
  }
}

function saveAnnotation(topic, url, note) {
  browser.runtime.sendMessage({
    action: "saveAnnotation",
    data: {
      topic: topic,
      url: url,
      note: note,
      timestamp: Date.now()
    }
  }).then(() => {
    loadAnnotations(topic, url);
  });
}

function loadAnnotations(topic, url) {
  browser.runtime.sendMessage({
    action: "getAnnotations",
    topic: topic,
    url: url
  }).then((annotations) => {
    displayAnnotations(topic, url, annotations);
  });
}

function displayAnnotations(topic, url, annotations) {
  const annotationList = document.querySelector(`.annotationList[data-url="${url}"]`);
  annotationList.innerHTML = "";
  annotations.forEach((annotation, index) => {
    const annotationElement = document.createElement("div");
    annotationElement.className = "annotation";
    annotationElement.innerHTML = `
      <p><strong>Note:</strong> ${annotation.note}</p>
      <p><em>Timestamp:</em> ${new Date(annotation.timestamp).toLocaleString()}</p>
      <button class="editAnnotation" data-topic="${topic}" data-url="${url}" data-index="${index}">Edit</button>
      <button class="deleteAnnotation" data-topic="${topic}" data-url="${url}" data-index="${index}">Delete</button>
    `;
    annotationList.appendChild(annotationElement);
  });

  annotationList.querySelectorAll(".editAnnotation").forEach(button => {
    button.addEventListener("click", editAnnotation);
  });
  annotationList.querySelectorAll(".deleteAnnotation").forEach(button => {
    button.addEventListener("click", deleteAnnotation);
  });
}

function editAnnotation(event) {
  const { topic, url, index } = event.target.dataset;

  browser.runtime.sendMessage({
    action: "getAnnotations",
    topic: topic,
    url: url
  }).then((annotations) => {
    if (annotations && annotations[index]) {
      const annotation = annotations[index];
      const newNote = prompt("Edit the note for this page:", annotation.note);

      if (newNote !== null) {
        annotation.note = newNote;

        browser.runtime.sendMessage({
          action: "updateAnnotation",
          data: {
            topic: topic,
            url: url,
            index: parseInt(index),
            updatedAnnotation: annotation
          }
        }).then(() => {
          loadAnnotations(topic, url);
        }).catch((error) => {
          console.error("Error updating annotation:", error);
        });
      }
    } else {
      console.error("Annotation not found at index:", index);
    }
  }).catch((error) => {
    console.error("Error getting annotations:", error);
  });
}

function deleteAnnotation(event) {
  const { topic, url, index } = event.target.dataset;

  if (confirm("Are you sure you want to delete this annotation?")) {
    browser.runtime.sendMessage({
      action: "deleteAnnotation",
      data: {
        topic: topic,
        url: url,
        index: parseInt(index)
      }
    }).then(() => {
      loadAnnotations(topic, url);
    }).catch((error) => {
      console.error("Error deleting annotation:", error);
    });
  }
}