// =================================================================
// 1. GLOBAL FIREBASE VARIABLES (Defined in index.html, used here)
//    var auth;
//    var db;
// =================================================================

document.addEventListener('DOMContentLoaded', (event) => {
    
    // =================================================================
    // 2. VARIABLE AND DOM ELEMENT DECLARATIONS
    // =================================================================

    // --- Input & Form DOM Elements ---
    const wInput = document.getElementById("water");
    const eInput = document.getElementById("exercise");
    const bInput = document.getElementById("bloodsugar");
    const submitButton = document.getElementById("submit");
    const outputBody = document.getElementById("outputBody");
    const editSection = document.getElementById("editSection");
    const updateEntryButton = document.getElementById("updateEntry");
    const cancelEditButton = document.getElementById("cancelEdit");

    // script.js (Near existing variable declarations, e.g., line 60)

    // ... (Existing state variables: editIndex, healthData, currentUserId) ...

    // 🛑 NEW: Chart Instances 🛑
    let bloodSugarChartInstance = null;
    let goalComparisonChartInstance = null;
    
    // ... (rest of the script) ...

    // --- Authentication DOM Elements ---
    const authContainer = document.getElementById("authContainer");
    const mainApp = document.getElementById("mainApp");
    const authEmail = document.getElementById("authEmail");
    const authPassword = document.getElementById("authPassword");
    const registerBtn = document.getElementById("registerBtn");
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const authMessage = document.getElementById("authMessage");

    // --- Average & Feedback DOM Elements (CRITICAL: Declared ONCE) ---
    const avgWaterSpan = document.getElementById("avgWater");
    const avgExerciseSpan = document.getElementById("avgExercise");
    const avgBloodSugarSpan = document.getElementById("avgBloodSugar");
    const waterFeedback = document.getElementById("waterFeedback");
    const exerciseFeedback = document.getElementById("exerciseFeedback");
    const bloodSugarFeedback = document.getElementById("bloodSugarFeedback");
    
    // --- Global State Variables ---
    let editIndex = -1; // Stores the Firestore document ID being edited
    let healthData = []; // Local array to hold the user's data fetched from Firestore
    let currentUserId = null; // Stores the Firebase User ID

    // --- Health Goals/Targets (CRITICAL: Declared ONCE) ---
    const GOALS = {
        WATER: 2500,  // ml (e.g., 2.5 liters)
        EXERCISE: 45, // minutes
        BLOOD_SUGAR_MAX: 120 // mg/dL (A typical maximum for non-diabetics)
    };
    // script.js (Inside document.addEventListener('DOMContentLoaded', ...) )

    // ... (Existing Auth DOM Elements) ...
    // const logoutBtn = document.getElementById("logoutBtn");
    // const authMessage = document.getElementById("authMessage");
    
    // 🛑 NEW: Theme Toggle Element 🛑
    const themeToggleBtn = document.getElementById("themeToggle");
    
    // --- Average & Feedback DOM Elements (CRITICAL: Declared ONCE) ---
    // ... (rest of the script) ...

    // =================================================================
    // 3. UTILITY AND HELPER FUNCTIONS (Defined before they are called)
    // =================================================================

    function updateAuthMessage(message, isError) {
        authMessage.textContent = message;
        authMessage.style.color = isError ? "#f87171" : "#4ade80";
    }

    function clearInputs() {
        wInput.value = "";
        eInput.value = "";
        bInput.value = "";
    }

    function validateInput(w, e, b) {
        if (w === "" || e === "" || b === "") {
            alert("Please fill in all health metrics.");
            return false;
        }
        if (isNaN(Number(w)) || isNaN(Number(e)) || isNaN(Number(b))) {
            alert("Metrics must be valid numbers.");
            return false;
        }
        return true;
    }
    
    // --- Summary & Feedback Logic ---
    function updateSummary() {
        const allData = healthData; 
        
        if (allData.length === 0) {
            avgWaterSpan.textContent = "0 ml";
            avgExerciseSpan.textContent = "0 min";
            avgBloodSugarSpan.textContent = "0 mg/dL";
            waterFeedback.textContent = "Start logging your data to see progress!";
            exerciseFeedback.textContent = "Log your exercise to start your journey!";
            bloodSugarFeedback.textContent = "Monitor your blood sugar for valuable insights!";
            waterFeedback.className = 'warning-status';
            exerciseFeedback.className = 'warning-status';
            bloodSugarFeedback.className = 'warning-status';
            return;
        }

        const totals = allData.reduce((acc, entry) => {
            const waterVal = parseFloat(entry.water) || 0;
            const exerciseVal = parseFloat(entry.exercise) || 0;
            const bloodsugarVal = parseFloat(entry.bloodsugar) || 0;

            if (waterVal > 0) acc.water.total += waterVal;
            if (exerciseVal > 0) acc.exercise.total += exerciseVal;
            acc.bloodsugar.total += bloodsugarVal; 
            
            if (waterVal > 0) acc.water.count++;
            if (exerciseVal > 0) acc.exercise.count++;
            acc.bloodsugar.count++;

            return acc;
        }, { 
            water: {total: 0, count: 0}, 
            exercise: {total: 0, count: 0}, 
            bloodsugar: {total: 0, count: 0} 
        });

        const avgWater = totals.water.count > 0 ? totals.water.total / totals.water.count : 0;
        const avgExercise = totals.exercise.count > 0 ? totals.exercise.total / totals.exercise.count : 0;
        const avgBloodSugar = totals.bloodsugar.count > 0 ? totals.bloodsugar.total / totals.bloodsugar.count : 0;
        
        // Update Averages Display
        avgWaterSpan.textContent = `${avgWater.toFixed(0)} ml`;
        avgExerciseSpan.textContent = `${avgExercise.toFixed(1)} min`;
        avgBloodSugarSpan.textContent = `${avgBloodSugar.toFixed(0)} mg/dL`;
        
        // Feedback Logic
        if (avgWater >= GOALS.WATER) {
            waterFeedback.textContent = `Great! Your average intake of ${avgWater.toFixed(0)}ml meets the goal!`;
            waterFeedback.className = 'good-status';
        } else if (avgWater > 0) {
            waterFeedback.textContent = `You're close! Average ${avgWater.toFixed(0)}ml. Try for ${GOALS.WATER - avgWater.toFixed(0)}ml more!`;
            waterFeedback.className = 'warning-status';
        }

        if (avgExercise >= GOALS.EXERCISE) {
            exerciseFeedback.textContent = `Excellent! Your ${avgExercise.toFixed(1)} min average beats the goal!`;
            exerciseFeedback.className = 'good-status';
        } else if (avgExercise > 0) {
            exerciseFeedback.textContent = `Keep going! Average ${avgExercise.toFixed(1)} min. Aim for a total of ${GOALS.EXERCISE} min!`;
            exerciseFeedback.className = 'warning-status';
        }

        if (avgBloodSugar <= GOALS.BLOOD_SUGAR_MAX && avgBloodSugar > 0) {
            bloodSugarFeedback.textContent = `Stable! Your average of ${avgBloodSugar.toFixed(0)} mg/dL is within a healthy range.`;
            bloodSugarFeedback.className = 'good-status';
        } else if (avgBloodSugar > GOALS.BLOOD_SUGAR_MAX) {
            bloodSugarFeedback.textContent = `Warning: Average of ${avgBloodSugar.toFixed(0)} mg/dL is high. Consult a doctor.`;
            bloodSugarFeedback.className = 'warning-status';
        } else {
             bloodSugarFeedback.textContent = "Log your blood sugar to get feedback.";
             bloodSugarFeedback.className = '';
        }
    }

    function fillTable() {
        let html = '';
        
        // Sort data by timestamp descending (newest first)
        healthData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        healthData.forEach((entry, i) => {
            const date = entry.date || new Date().toLocaleDateString();
            const water = entry.water || 0;
            const exercise = entry.exercise || 0;
            const bloodsugar = entry.bloodsugar || 0;

            // script.js (Inside function fillTable())

// ... (HTML template inside the forEach loop) ...

           // script.js (Inside function fillTable() - within the healthData.forEach loop)

            html += `
                <tr>
                    <td>${date}</td>
                    <td>${water}</td>
                    <td>${exercise}</td>
                    <td>${bloodsugar}</td>
                    
                    <td class="action-cell">
                        <button onclick="activateEdit('${entry.id}')" class="edit-btn">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                    
                    <td class="action-cell">
                        <button onclick="deleteRow('${entry.id}')" class="delete-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `});
// ... (rest of fillTable) ...
            
// ... (rest of fillTable) ...
        outputBody.innerHTML = html;
        updateSummary(); // Update summary every time the table is filled

        // script.js (Inside document.addEventListener('DOMContentLoaded', ...) )

    // ... (Your utility functions and global chart instance variables) ...

    /**
     * Renders the Blood Sugar Trend line chart, limited to the LAST 7 ENTRIES.
     * @param {Array<Object>} data The sorted health data array (newest first).
     */
    function renderBloodSugarChart(data) {
        // 🛑 CHANGE: Limit to the last 7 entries 🛑
        const limit = 7; 
        const recentData = data.slice(0, limit).reverse(); // Reverse so chart reads left-to-right (oldest to newest)

        const dates = recentData.map(entry => entry.date.substring(0, 5)); // Use short date format (MM/DD)
        const bloodSugarLevels = recentData.map(entry => entry.bloodsugar);
        const goalLine = Array(dates.length).fill(GOALS.BLOOD_SUGAR_MAX);

        const ctx = document.getElementById('bloodSugarChart');
        if (!ctx) return; 

        if (bloodSugarChartInstance) {
            bloodSugarChartInstance.destroy(); 
        }

        bloodSugarChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Blood Sugar (mg/dL)',
                    data: bloodSugarLevels,
                    borderColor: 'rgb(249, 115, 22)',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 4,
                }, {
                    label: `Target Max (${GOALS.BLOOD_SUGAR_MAX} mg/dL)`,
                    data: goalLine,
                    borderColor: 'rgba(248, 113, 113, 0.7)',
                    borderDash: [5, 5],
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Level' }, grid: { color: 'rgba(128, 128, 128, 0.1)' } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { display: true, position: 'top' }, title: { display: false } }
            }
        });
    }

    /**
     * Renders the Water and Exercise goal comparison bar chart, limited to the LAST 7 ENTRIES.
     * @param {Array<Object>} data The health data array to calculate averages from (newest first).
     */
    function renderGoalComparisonChart(data) {
        // 🛑 CHANGE: Limit to the last 7 entries 🛑
        const limit = 7;
        const recentData = data.slice(0, limit);
        const numEntries = recentData.length;

        if (numEntries === 0) return;

        // Calculate 7-day averages 
        const totals = recentData.reduce((acc, entry) => {
            acc.water += parseFloat(entry.water) || 0;
            acc.exercise += parseFloat(entry.exercise) || 0;
            return acc;
        }, { water: 0, exercise: 0 });

        const avgWater = totals.water / numEntries;
        const avgExercise = totals.exercise / numEntries;

        const ctx = document.getElementById('goalComparisonChart');
        if (!ctx) return;

        if (goalComparisonChartInstance) {
            goalComparisonChartInstance.destroy(); 
        }

        goalComparisonChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Water Intake (ml)', 'Exercise (min)'],
                datasets: [{
                    label: `7-Day Average (${numEntries} entries)`,
                    data: [avgWater.toFixed(0), avgExercise.toFixed(0)],
                    backgroundColor: ['rgb(99, 102, 241)', 'rgb(16, 185, 129)'],
                    borderRadius: 5
                }, {
                    label: 'Daily Goal',
                    data: [GOALS.WATER, GOALS.EXERCISE],
                    backgroundColor: ['rgba(99, 102, 241, 0.3)', 'rgba(16, 185, 129, 0.3)'],
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Amount' }, grid: { color: 'rgba(128, 128, 128, 0.1)' } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { position: 'top' }, title: { display: false } }
            }
        });
    }

    // ... (The rest of your existing script: updateSummary, fillTable, etc.) ...
    renderBloodSugarChart(healthData);
    renderGoalComparisonChart(healthData); 
    }

    async function getHealthData() {
        if (!currentUserId) {
            healthData = [];
            fillTable();
            return;
        }
        try {
            // Fetch data from the user's specific sub-collection
            const snapshot = await db.collection("users").doc(currentUserId).collection("data").get();
            
            healthData = snapshot.docs.map(doc => ({ 
                ...doc.data(), 
                id: doc.id // Store the Firestore document ID for editing/deleting
            }));
            
            fillTable();
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }

    async function addNewEntry(w, e, b) {
        if (!currentUserId) return;

        try {
            await db.collection("users").doc(currentUserId).collection("data").add({
                date: new Date().toLocaleDateString(),
                water: w,
                exercise: e,
                bloodsugar: b,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            clearInputs();
            await getHealthData();
        } catch (error) {
            console.error("Error adding document:", error);
        }
    }

    async function deleteRow(id) {
        if (!currentUserId || !confirm("Are you sure you want to delete this entry?")) return;
        
        try {
            await db.collection("users").doc(currentUserId).collection("data").doc(id).delete();
            await getHealthData();
        } catch (error) {
            console.error("Error deleting document:", error);
        }
    }

    function activateEdit(id) {
        const entry = healthData.find(e => e.id === id);
        if (!entry) return;

        editIndex = id; // Store the ID being edited
        wInput.value = entry.water;
        eInput.value = entry.exercise;
        bInput.value = entry.bloodsugar;

        submitButton.classList.add("hidden");
        editSection.classList.remove("hidden");
    }

    async function updateEntry() {
        if (!currentUserId || editIndex === -1) return;

        const w = wInput.value.trim();
        const e = eInput.value.trim();
        const b = bInput.value.trim();

        if (!validateInput(w, e, b)) return;

        try {
            await db.collection("users").doc(currentUserId).collection("data").doc(editIndex).update({
                water: w,
                exercise: e,
                bloodsugar: b
            });
            
            // Cleanup
            editIndex = -1;
            clearInputs();
            submitButton.classList.remove("hidden");
            editSection.classList.add("hidden");
            await getHealthData();
        } catch (error) {
            console.error("Error updating document:", error);
        }
    }

    // =================================================================
    // 4. EVENT LISTENERS AND INITIALIZATION
    // =================================================================

    // --- Data Submission Listeners ---
    submitButton.addEventListener("click", () => {
        const w = wInput.value.trim();
        const e = eInput.value.trim();
        const b = bInput.value.trim();

        if (!validateInput(w, e, b)) return;
        addNewEntry(w, e, b);
    });

    updateEntryButton.addEventListener("click", updateEntry);
    cancelEditButton.addEventListener("click", () => {
        editIndex = -1;
        clearInputs();
        submitButton.classList.remove("hidden");
        editSection.classList.add("hidden");
    });
    
    // --- Authentication Handlers ---
    registerBtn.addEventListener("click", async () => {
        const email = authEmail.value;
        const password = authPassword.value;
        if (password.length < 6) {
            updateAuthMessage("Password must be at least 6 characters.", true);
            return;
        }
        try {
            await auth.createUserWithEmailAndPassword(email, password);
            updateAuthMessage("Registration successful! Logging in...", false);
        } catch (error) {
            updateAuthMessage(error.message, true);
        }
    });

    loginBtn.addEventListener("click", async () => {
        const email = authEmail.value;
        const password = authPassword.value;
        try {
            await auth.signInWithEmailAndPassword(email, password);
            updateAuthMessage("Login successful!", false);
        } catch (error) {
            updateAuthMessage(error.message, true);
        }
    });

    logoutBtn.addEventListener("click", () => {
        auth.signOut();
    });

    // script.js (Inside Event Listeners and Initialization section)

    // --- NEW: Theme Toggle Handler ---
    themeToggleBtn.addEventListener('click', () => {
        // Toggle the 'light-mode' class on the body
        document.body.classList.toggle('light-mode');
        
        // Update the icon based on the current mode
        const isLightMode = document.body.classList.contains('light-mode');
        const icon = themeToggleBtn.querySelector('i');
        
        if (isLightMode) {
            // If we are in light mode, show the moon icon (to switch to dark)
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        } else {
            // If we are in dark mode, show the sun icon (to switch to light)
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    });

    // ... (The rest of your event listeners and initialization) ...

    // --- Firebase Auth State Listener (Initializes App State) ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserId = user.uid;
            authContainer.classList.add("hidden");
            mainApp.classList.remove("hidden");
            getHealthData(); 
        } else {
            currentUserId = null;
            healthData = [];
            fillTable(); // Clear table and update summary to '0'
            authContainer.classList.remove("hidden");
            mainApp.classList.add("hidden");
            updateAuthMessage("");
        }
    });

    // --- Expose functions globally for onclick events in the table ---
    window.activateEdit = activateEdit;
    window.deleteRow = deleteRow;

});