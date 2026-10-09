
"use strict";

// ========================================
// GREENQUEST AI - APPLICATION CONFIGURATION
// ========================================

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "qwen2.5:3b";

const plannerForm = document.getElementById("plannerForm");
const generateBtn = document.getElementById("generateBtn");
const missionElement = document.getElementById("mission");

let currentMission = null;
let isGenerating = false;

// ========================================
// LOAD AND SAVE USER PROGRESS
// ========================================

function loadStats() {
    try {
        const saved = JSON.parse(
            localStorage.getItem("greenQuestStats")
        );

        if (saved && typeof saved === "object") {
            return {
                minutes: Math.max(0, Number(saved.minutes) || 0),
                missions: Math.max(0, Number(saved.missions) || 0),
                points: Math.max(0, Number(saved.points) || 0)
            };
        }
    } catch (error) {
        console.warn("Could not load saved progress.", error);
    }

    return {
        minutes: 0,
        missions: 0,
        points: 0
    };
}

const stats = loadStats();

function updateStats() {
    document.getElementById("totalMinutes").textContent =
        stats.minutes;

    document.getElementById("totalMissions").textContent =
        stats.missions;

    document.getElementById("totalPoints").textContent =
        stats.points;
}

function saveStats() {
    try {
        localStorage.setItem(
            "greenQuestStats",
            JSON.stringify(stats)
        );
    } catch (error) {
        console.warn("Progress could not be saved.", error);
    }

    updateStats();
}

// ========================================
// BUILT-IN MISSIONS
// Works even when local AI is unavailable
// ========================================

function fallbackMission(mood, time, activity) {
    const activities = {
        "nature walk": {
            title: "The Little Nature Walk",
            tasks: [
                "Walk in a safe, familiar green space.",
                "Notice three different shades of green.",
                "Listen for natural sounds around you."
            ]
        },

        "bird watching": {
            title: "The Birdwatcher's Quest",
            tasks: [
                "Find a safe spot to observe birds from a distance.",
                "Notice their colours, movements, and calls.",
                "Observe without disturbing nests or wildlife."
            ]
        },

        "gardening": {
            title: "Grow Something Green",
            tasks: [
                "Water a plant or help care for a garden.",
                "Observe the leaves, soil, and new growth.",
                "Learn one new thing about the plant."
            ]
        },

        "photography": {
            title: "Nature Through Your Lens",
            tasks: [
                "Look for interesting patterns in nature.",
                "Notice leaves, shadows, and flowers.",
                "Capture a few nature photos if you like."
            ]
        },

        "mindfulness": {
            title: "A Quiet Moment Outdoors",
            tasks: [
                "Sit somewhere comfortable and safe outdoors.",
                "Notice the breeze, sounds, and colours.",
                "Take a few gentle, unhurried breaths."
            ]
        },

        "exploring plants": {
            title: "The Green Explorer",
            tasks: [
                "Observe plants in a nearby garden or park.",
                "Compare different leaf shapes and patterns.",
                "Avoid eating or touching unfamiliar plants."
            ]
        }
    };

    const selected = activities[activity] || activities["nature walk"];

    return {
        title: selected.title,
        description:
            `A ${time}-minute nature adventure for when you're feeling ${mood}. ` +
            "Take a break from your screen and reconnect with the world around you.",
        duration: Number(time),
        tasks: selected.tasks
    };
}

// ========================================
// DISPLAY A MISSION
// ========================================

function displayMission(data) {
    const duration = Number(data.duration);
    const validDuration = [10, 20, 30, 60].includes(duration)
        ? duration
        : Number(document.getElementById("time").value);

    const tasks = Array.isArray(data.tasks)
        ? data.tasks.filter(task => typeof task === "string").slice(0, 5)
        : [];

    currentMission = {
        title: String(data.title || "Your Nature Adventure"),
        description: String(data.description || "Explore the outdoors."),
        duration: validDuration,
        tasks: tasks,
        points: 10,
        completed: false
    };

    // Build elements safely without inserting raw AI HTML.
    missionElement.replaceChildren();

    const icon = document.createElement("div");
    icon.className = "mission-icon";
    icon.textContent = "🌿";

    const tag = document.createElement("span");
    tag.className = "mission-tag";
    tag.textContent = "YOUR AI-GENERATED MISSION";

    const heading = document.createElement("h3");
    heading.textContent = currentMission.title;

    const description = document.createElement("p");
    description.textContent = currentMission.description;

    const taskList = document.createElement("ul");

    tasks.forEach(task => {
        const item = document.createElement("li");
        item.textContent = "🍃 " + task;
        taskList.appendChild(item);
    });

    const details = document.createElement("p");
    details.textContent =
        `⏱️ About ${validDuration} minutes · ⭐ 10 nature points`;

    const completeBtn = document.createElement("button");
    completeBtn.type = "button";
    completeBtn.className = "complete-btn";
    completeBtn.textContent = "✓ I Completed My Mission";

    completeBtn.addEventListener("click", () => {
        if (!currentMission || currentMission.completed) {
            return;
        }

        currentMission.completed = true;

        stats.minutes += currentMission.duration;
        stats.missions += 1;
        stats.points += currentMission.points;

        saveStats();

        completeBtn.disabled = true;
        completeBtn.textContent = "🎉 Mission Completed!";

        const success = document.createElement("p");
        success.className = "success-message";
        success.textContent =
            "Amazing! You made time for the real world today. 🌎";

        missionElement.appendChild(success);
    });

    missionElement.append(
        icon,
        tag,
        heading,
        description,
        taskList,
        details,
        completeBtn
    );

    missionElement.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

// ========================================
// GENERATE MISSION USING OPEN-WEIGHT AI
// ========================================

async function generateMission() {
    if (isGenerating) {
        return;
    }

    const mood = document.getElementById("mood").value;
    const time = document.getElementById("time").value;
    const activity = document.getElementById("activity").value;

    isGenerating = true;
    generateBtn.disabled = true;
    generateBtn.textContent = "🌱 Creating Your Adventure...";

    const prompt = `
You are GreenQuest AI, an outdoor adventure planner.

Create a safe, beginner-friendly outdoor mission.

User's mood: ${mood}
Available time: ${time} minutes
Preferred activity: ${activity}

Return ONLY valid JSON in this exact structure:
{
  "title": "A short creative title",
  "description": "Two short sentences describing the mission",
  "duration": ${Number(time)},
  "tasks": [
    "First simple action",
    "Second simple action",
    "Third simple action"
  ]
}

Rules:
- Encourage real-world outdoor activity.
- Keep the mission within the available time.
- Make it accessible to beginners.
- Do not require purchases or special equipment.
- Recommend safe, familiar public spaces or a home garden.
- Never suggest approaching strangers or disturbing wildlife.
- Never recommend eating unidentified plants or mushrooms.
- If outdoor access is unavailable, suggest a safe nature activity near a window.
- Return JSON only, with no Markdown.
`;

    try {
        const response = await fetch(OLLAMA_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    {
                        role: "system",
                        content:
                            "You are GreenQuest AI. Generate safe nature missions. Return only valid JSON."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                format: "json",
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama HTTP error: ${response.status}`);
        }

        const result = await response.json();
        const content = result.message?.content;

        if (!content) {
            throw new Error("The AI returned an empty response.");
        }

        const data = JSON.parse(content);

        if (
            typeof data.title !== "string" ||
            typeof data.description !== "string" ||
            !Array.isArray(data.tasks)
        ) {
            throw new Error("The AI response has an invalid format.");
        }

        displayMission(data);

    } catch (error) {
        console.error("GreenQuest AI error:", error);

        // Provide a usable mission if local AI is unavailable.
        displayMission(
            fallbackMission(mood, time, activity)
        );

        const notice = document.createElement("p");
        notice.className = "error-note";
        notice.setAttribute("role", "status");
        notice.textContent =
            "Built-in mission loaded. To generate personalized AI missions, make sure Ollama is installed, running, and the selected model is available.";

        missionElement.appendChild(notice);

    } finally {
        isGenerating = false;
        generateBtn.disabled = false;
        generateBtn.textContent = "✨ Generate My Mission";
    }
}

// ========================================
// FORM SUBMISSION
// ========================================

plannerForm.addEventListener("submit", function (event) {
    event.preventDefault();
    generateMission();
});

// ========================================
// INITIALIZE APP
// ========================================

updateStats();