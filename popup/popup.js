document.addEventListener("DOMContentLoaded", () => {
  const newTopicInput = document.getElementById("newTopicInput");
  const createTopicButton = document.getElementById("createTopicButton");
  const topicSelect = document.getElementById("topicSelect");
  const removeTopicButton = document.getElementById("removeTopicButton");
  const notesInput = document.getElementById("notesInput");
  const saveButton = document.getElementById("saveButton");
  const threadVisualizer = document.getElementById("threadVisualizer");

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

    pages.forEach((page, index) => {
      const knot = document.createElement("div");
      knot.className = "knot";
      knot.innerHTML = `
        <h3>${page.title}</h3>
        <p><a href="${page.url}" target="_blank">${page.url}</a></p>
        <p>${page.notes}</p>
        <p>${new Date(page.timestamp).toLocaleString()}</p>
        <button class="removePageButton" data-url="${page.url}">Remove</button>
      `;

      knot.querySelector(".removePageButton").addEventListener("click", () => {
        console.log(`Removing page ${page.url} from topic ${topic}`);
        removePage(topic, page.url);
      });

      threadVisualizer.appendChild(knot);

      if (index < pages.length - 1) {
        const thread = document.createElement("div");
        thread.className = "thread";
        threadVisualizer.appendChild(thread);
      }
    });
  });
}

function removePage(topic, url) {
  browser.runtime.sendMessage({
    action: "removePage",
    topic: topic,
    url: url
  }).then(() => {
    console.log(`Page ${url} removed from topic ${topic}`);
    visualizeThread(topic);
  }).catch(error => {
    console.error(`Error removing page ${url} from topic ${topic}:`, error);
  });
}
