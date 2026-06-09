document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const categorySelect = document.getElementById("category-filter");
  const sortSelect = document.getElementById("sort-order");
  const searchInput = document.getElementById("search-input");

  let activitiesData = {};

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      activitiesData = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      populateCategoryOptions(activitiesData);
      renderActivities(activitiesData);
      populateActivityOptions(activitiesData);
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function populateCategoryOptions(activities) {
    const categories = new Set();
    Object.values(activities).forEach((details) => {
      if (details.category) {
        categories.add(details.category);
      }
    });

    categorySelect.innerHTML = '<option value="">All categories</option>';
    Array.from(categories)
      .sort()
      .forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
      });
  }

  function populateActivityOptions(activities) {
    activitySelect.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- Select an activity --";
    activitySelect.appendChild(defaultOption);

    Object.keys(activities).forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });
  }

  function renderActivities(activities) {
    activitiesList.innerHTML = "";
    const entries = Object.entries(activities);

    if (entries.length === 0) {
      activitiesList.innerHTML = "<p>No activities match the current filters.</p>";
      return;
    }

    entries.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;

      const categoryLabel = details.category
        ? `<p><strong>Category:</strong> ${details.category}</p>`
        : "";

      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
          <h4>${name}</h4>
          ${categoryLabel}
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

      activitiesList.appendChild(activityCard);
    });

    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  function getFilteredActivities() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedCategory = categorySelect.value;

    return Object.fromEntries(
      Object.entries(activitiesData)
        .filter(([name, details]) => {
          const matchesCategory =
            selectedCategory === "" || details.category === selectedCategory;
          const matchesSearch =
            name.toLowerCase().includes(query) ||
            details.description.toLowerCase().includes(query) ||
            (details.category && details.category.toLowerCase().includes(query));
          return matchesCategory && matchesSearch;
        })
        .sort((a, b) => {
          const sortOrder = sortSelect.value;
          if (sortOrder === "name-desc") {
            return b[0].localeCompare(a[0]);
          }
          if (sortOrder === "spots-asc") {
            return (
              a[1].max_participants - a[1].participants.length -
              (b[1].max_participants - b[1].participants.length)
            );
          }
          if (sortOrder === "spots-desc") {
            return (
              b[1].max_participants - b[1].participants.length -
              (a[1].max_participants - a[1].participants.length)
            );
          }
          return a[0].localeCompare(b[0]);
        })
    );
  }

  function refreshActivities() {
    renderActivities(getFilteredActivities());
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  categorySelect.addEventListener("change", refreshActivities);
  sortSelect.addEventListener("change", refreshActivities);
  searchInput.addEventListener("input", refreshActivities);

  fetchActivities();
});
