const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Show a feedback message ("error" or "success" picks the colour)
function showMessage(text, type) {
    const box = document.getElementById("message");
    box.textContent = text;
    box.className = "message " + (type || "");
}

// READ: display all saved meals (filtered by day if chosen)
function renderPlan() {
    const plan = getPlan();
    const filter = document.getElementById("dayFilter").value;
    const shown = filter === "" ? plan : plan.filter(r => r.day === filter);

    const list = document.getElementById("planList");
    const summary = document.getElementById("summary");
    list.innerHTML = "";
    summary.textContent = "";

    if (shown.length === 0) {
        showMessage("No meals to show. Add one from the Recipe Explorer.", "");
        return;
    }

    // Calculation: total cost of the meals shown
    let total = 0;
    shown.forEach(r => { total += r.totalCost; });
    summary.textContent =
        "Meals shown: " + shown.length + " | Total estimated cost: RM " + total.toFixed(2);

    shown.forEach(record => list.appendChild(createCard(record)));
}

// Build one card with edit fields
function createCard(record) {
    const dayOptions = DAYS.map(d => "<option>" + d + "</option>").join("");
    const items = record.ingredients.map(i => "<li>" + escapeHTML(i) + "</li>").join("");

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
        <img src="${record.thumb}" alt="${escapeHTML(record.name)}">
        <div class="card-body">
            <h3>${escapeHTML(record.name)}</h3>
            <p>${escapeHTML(record.category)} | ${escapeHTML(record.area)}</p>
            <p>RM ${record.totalCost.toFixed(2)} (RM ${record.costPerServing.toFixed(2)} per serving)</p>
            <details>
                <summary>Ingredients</summary>
                <ul>${items}</ul>
            </details>
            <label>Day <select class="dayEdit">${dayOptions}</select></label>
            <label>Servings <input class="servingsEdit" type="number"></label>
            <label>Note <input class="noteEdit" type="text" placeholder="Optional note"></label>
            <button class="updateBtn">Update</button>
            <button class="deleteBtn">Delete</button>
        </div>`;

    // Set values with .value so typed text is never read as HTML
    card.querySelector(".dayEdit").value = record.day;
    card.querySelector(".servingsEdit").value = record.servings;
    card.querySelector(".noteEdit").value = record.note;

    card.querySelector(".updateBtn").addEventListener("click", () => updateRecord(record.id, card));
    card.querySelector(".deleteBtn").addEventListener("click", () => deleteRecord(record.id));
    return card;
}

// UPDATE: save changes to one record
function updateRecord(id, card) {
    const day = card.querySelector(".dayEdit").value;
    const servings = Number(card.querySelector(".servingsEdit").value);
    const note = card.querySelector(".noteEdit").value.trim();

    // Validation
    if (!Number.isInteger(servings) || servings < 1 || servings > 50) {
        showMessage("Servings must be a whole number from 1 to 50.", "error");
        return;
    }
    if (note.length > 100) {
        showMessage("Note must be 100 characters or less.", "error");
        return;
    }

    const plan = getPlan();
    const record = plan.find(r => r.id === id);

    record.day = day;
    record.servings = servings;
    record.note = note;
    record.totalCost = record.costPerServing * servings;   // recalculate

    savePlan(plan);
    renderPlan();
    showMessage("Meal updated.", "success");
}

// DELETE: remove one record
function deleteRecord(id) {
    if (!confirm("Delete this meal from your plan?")) {
        return;
    }
    const plan = getPlan().filter(r => r.id !== id);
    savePlan(plan);
    renderPlan();
    showMessage("Meal deleted.", "success");
}

// Event listener and start-up
document.getElementById("dayFilter").addEventListener("change", renderPlan);
renderPlan();