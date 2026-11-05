const PLAN_KEY = "easycookPlan";

// read -> get the saved meal plan (an array). return [] if nothing saved.
function getPlan() {
    try {
        return JSON.parse(localStorage.getItem(PLAN_KEY)) || [];   
    } catch (error) {
        return [];      
    }
}

// save -> write the whole array back to local storage
function savePlan(plan) {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));          
}

// stop user-typed text from being treated as HTML
function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}