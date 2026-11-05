const BASE = "https://www.themealdb.com/api/json/v1/1/";
let currentMeal = null;     

// fetch url and return the json as a js object
function getJSON(path) {
    return fetch(BASE + path).then(response => {
        if (!response.ok) {
            throw new Error("Server error " + response.status);
        }
        return response.json();      
    });
}


function showMessage(text, type) {
    const box = document.getElementById("message");
    box.textContent = text;
    box.className = "message " + (type || "");
}

// API piece 1: load the category list into the dropdown
function loadCategories() {
    getJSON("list.php?c=list")
        .then(data => {
            const select = document.getElementById("categorySelect");
            data.meals.forEach(item => {
                const option = document.createElement("option");
                option.value = item.strCategory;
                option.textContent = item.strCategory;
                select.appendChild(option);
            });
        })
        .catch(error => {
            showMessage("Could not load categories. Check your internet connection.", "error");
            console.error(error);
        });
}

// ===== Search =====

function searchRecipes() {
    const category = document.getElementById("categorySelect").value;
    const name = document.getElementById("nameInput").value.trim();

    // input validation -> at least one search value is needed
    if (category === "" && name === "") {
        showMessage("Please choose a category or type a meal name (or both).", "error");
        return;
    }

    let request;
    if (name !== "") {
        request = getJSON("search.php?s=" + encodeURIComponent(name));
    } else {
        request = getJSON("filter.php?c=" + encodeURIComponent(category));
    }

    request
        .then(data => {
            let meals = data.meals || [];

            // Both fields used: keep only meals from the chosen category
            if (name !== "" && category !== "") {
                meals = meals.filter(meal => meal.strCategory === category);
            }

            showResults(meals);

            // Suggestion appears whenever a category is chosen
            if (category !== "") {
                makeSuggestion(meals, category);
            } else {
                document.getElementById("suggestion").textContent = "";
            }
        })
        .catch(error => {
            showMessage("Request failed. Please try again.", "error");
            console.error(error);
        });
}

// DOM: build one card per meal
function showResults(meals) {
    const grid = document.getElementById("results");
    grid.innerHTML = "";                 

    if (meals.length === 0) {
        showMessage("No recipes found. Try a different category or name.", "error");
        return;
    }
    showMessage(meals.length + " recipe(s) found.", "success");

    meals.forEach(meal => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
            <div class="card-body">
                <h3>${meal.strMeal}</h3>
                <button>View Recipe</button>
            </div>`;
        card.querySelector("button").addEventListener("click", () => showDetails(meal.idMeal));
        grid.appendChild(card);
    });
}

//  Suggestion logic 

function makeSuggestion(meals, category) {
    const box = document.getElementById("suggestion");

    // when no recipes match (for example a category and a name that don't go together)
    if (meals.length === 0) {
        box.textContent = "No suitable suggestion. Try another category or a different name.";
        return;
    }

    // pick random suggestion based on last search
    const pick = meals[Math.floor(Math.random() * meals.length)];
    let text = "Suggested recipe: " + pick.strMeal + ". ";

    // based on how many recipes matched
    if (meals.length === 1) {
        text += "It is the only matching recipe. ";
    } else if (meals.length <= 5) {
        text += "There are a few good options. ";
    } else {
        text += "There are many options, so browse the list below. ";
    }

    // a tip based on the category
    switch (category) {
        case "Dessert":
            text += "Tip: a good choice for a sweet treat.";
            break;
        case "Seafood":
            text += "Tip: best cooked fresh on the day you buy it.";
            break;
        case "Vegetarian":
        case "Vegan":
            text += "Tip: a light meal with no meat.";
            break;
        case "Breakfast":
            text += "Tip: quick to make in the morning.";
            break;
        case "Beef":
        case "Lamb":
        case "Goat":
            text += "Tip: red meat needs longer cooking, so plan ahead.";
            break;
        case "Pasta":
            text += "Tip: a quick and filling dinner.";
            break;
        default:
            text += "Tip: great for lunch or dinner.";
    }

    box.textContent = text;

    // Save the suggestion in Local Storage 
    localStorage.setItem("lastSuggestion", JSON.stringify({ meal: pick.strMeal, text: text }));
}

// Show the last saved suggestion when the app opens
function showLastSuggestion() {
    const saved = JSON.parse(localStorage.getItem("lastSuggestion"));
    if (saved) {
        document.getElementById("suggestion").textContent = "Last suggestion: " + saved.text;
    }
}

// ===== Recipe details and calculation =====

// Collect the ingredients (the API has strIngredient1 ... strIngredient20)
function getIngredients(meal) {
    const list = [];
    for (let i = 1; i <= 20; i++) {
        const name = meal["strIngredient" + i];
        const measure = meal["strMeasure" + i];
        if (name && name.trim() !== "") {
            list.push((measure || "").trim() + " " + name.trim());
        }
    }
    return list;
}

// estimated price (RM) of the MAIN item for one recipe, by category.
// assume price, not up tp date 
function getMainPrice(category) {
    switch (category) {
        case "Beef":
            return 25;
        case "Lamb":
        case "Goat":
            return 30;
        case "Chicken":
            return 12;
        case "Pork":
            return 18;
        case "Seafood":
            return 25;
        case "Pasta":
            return 8;
        case "Vegetarian":
        case "Vegan":
            return 6;
        case "Dessert":
            return 8;
        default:
            return 8;       // extra meals like breakfast, starter, side, miscellaneous
    }
}

//  main ingredients and assumed prices (RM)
const MAIN_INGREDIENTS = [
    { keyword: "beef", price: 25 },
    { keyword: "lamb", price: 30 },
    { keyword: "pork", price: 18 },
    { keyword: "chicken", price: 12 },
    { keyword: "salmon", price: 28 },
    { keyword: "prawn", price: 20 },
    { keyword: "tuna", price: 15 },
    { keyword: "tofu", price: 5 },
    { keyword: "egg", price: 6 }
];


function findMainIngredients(meal) {
    const names = [];
    let totalPrice = 0;

    for (let i = 0; i < MAIN_INGREDIENTS.length; i++) {
        for (let j = 1; j <= 20; j++) {
            const name = meal["strIngredient" + j];
            if (!name) {
                continue;
            }
            const lower = name.toLowerCase();

            // skip stock cubes and eggplant, they are not the main item
            if (lower.includes("stock") || lower.includes("eggplant")) {
                continue;
            }

            if (lower.includes(MAIN_INGREDIENTS[i].keyword)) {
                names.push(name);
                totalPrice += MAIN_INGREDIENTS[i].price;
                break;
            }
        }
    }

    // if no main ingredient found -> use the category price instead
    if (names.length === 0) {
        return {
            names: [meal.strCategory + " (category price)"],
            price: getMainPrice(meal.strCategory),
            count: 1
        };
    }

    return { names: names, price: totalPrice, count: names.length };
}

// CALCULATION: estimated meal cost
function calculateMealCost(meal, servings) {
    const BASE_SERVINGS = 4;      // assume 1 recipe serves 4 servings 
    const OTHER_PRICE = 1.5;      // assume rm 1.50 per other ingredient

    // Validation: whole number from 1 to 50
    if (isNaN(servings) || !Number.isInteger(servings) || servings < 1 || servings > 50) {
        return null;
    }

    const count = getIngredients(meal).length;
    const main = findMainIngredients(meal);
    const mainPrice = main.price;
    const otherCount = Math.max(count - main.count, 0);   // every ingredient except the main items
    const otherCost = otherCount * OTHER_PRICE;
    const recipeCost = mainPrice + otherCost;
    const costPerServing = recipeCost / BASE_SERVINGS;
    const totalCost = costPerServing * servings;

    // label the cost
    let label;
    if (costPerServing <= 5) {
        label = "Budget-friendly";
    } else if (costPerServing <= 10) {
        label = "Moderate";
    } else {
        label = "Expensive";
    }

    return {
        totalCost: totalCost,
        costPerServing: costPerServing,
        label: label,
        count: count,
        mainPrice: mainPrice,
        otherCount: otherCount,
        otherCost: otherCost,
        mainName: main.names.join(" + ")
    };
}

// full recipe details, shown in the details box
function showDetails(id) {
    getJSON("lookup.php?i=" + id)
        .then(data => {
            const meal = data.meals[0];
            currentMeal = meal;

            const items = getIngredients(meal).map(i => "<li>" + i + "</li>").join("");

            const box = document.getElementById("details");
            box.innerHTML = `
                <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
                <h1>${meal.strMeal}</h1>
                <p>${meal.strCategory} | ${meal.strArea}</p>
                <h3>Ingredients</h3>
                <ul>${items}</ul>
                <h3>Instructions</h3>
                <p class="instructions">${meal.strInstructions}</p>

                <div class="calc-box">
                    <h3>Estimate Meal Cost</h3>
                    <div class="controls">
                        <label>Servings
                            <input id="servingsInput" type="number" value="4">
                        </label>
                        <label>Day
                            <select id="daySelect">
                                <option>Monday</option><option>Tuesday</option>
                                <option>Wednesday</option><option>Thursday</option>
                                <option>Friday</option><option>Saturday</option>
                                <option>Sunday</option>
                            </select>
                        </label>
                    </div>
                    <button id="calcBtn">Calculate Cost</button>
                    <button id="addBtn">Add to Meal Plan</button>
                    <p id="costResult" class="result"></p>
                </div>`;

            document.getElementById("calcBtn").addEventListener("click", showCost);
            document.getElementById("addBtn").addEventListener("click", addToPlan);
            box.scrollIntoView();
        })
        .catch(error => {
            showMessage("Could not load recipe details.", "error");
            console.error(error);
        });
}

// Button handler: show the calculated cost with a breakdown
function showCost() {
    const servings = Number(document.getElementById("servingsInput").value);
    const result = calculateMealCost(currentMeal, servings);
    const out = document.getElementById("costResult");

    if (result === null) {
        out.className = "result message error";
        out.textContent = "Please enter whole servings from 1 to 50.";
        return;
    }

    out.className = "result";
    out.innerHTML =
        "Main ingredient(s) (" + result.mainName + "): RM " + result.mainPrice.toFixed(2) +
        " + " + result.otherCount + " other ingredients: RM " + result.otherCost.toFixed(2) + "<br>" +
        "Estimated total for " + servings + " serving(s): RM " + result.totalCost.toFixed(2) + "<br>" +
        "Per serving: RM " + result.costPerServing.toFixed(2) + " (" + result.label + ")";
}

// ===== CREATE: save the current recipe into the meal plan =====

function addToPlan() {
    const servings = Number(document.getElementById("servingsInput").value);
    const day = document.getElementById("daySelect").value;
    const result = calculateMealCost(currentMeal, servings);

    if (result === null) {
        showMessage("Please enter whole servings from 1 to 50 first.", "error");
        return;
    }

    const plan = getPlan();

    plan.push({
        id: Date.now(),                      // unique id for this record
        mealId: currentMeal.idMeal,
        name: currentMeal.strMeal,
        thumb: currentMeal.strMealThumb,
        category: currentMeal.strCategory,
        area: currentMeal.strArea,
        ingredients: getIngredients(currentMeal),
        day: day,
        servings: servings,
        note: "",
        costPerServing: result.costPerServing,
        totalCost: result.totalCost
    });

    savePlan(plan);
    showMessage(currentMeal.strMeal + " added to your meal plan for " + day + ".", "success");
}

// ===== Event listeners and start-up =====

document.getElementById("searchBtn").addEventListener("click", searchRecipes);
document.getElementById("nameInput").addEventListener("keydown", e => {
    if (e.key === "Enter") searchRecipes();
});

loadCategories();
showLastSuggestion();