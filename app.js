const STORAGE_KEY = "STORAGE_KEY";

const updateElement = (id, text) => {
  let element = document.getElementById(id);
  element.textContent = text;
};

const getTransactionRow = (transaction) => {
  let template = document.getElementById("transaction_row");
  let row = template.content.cloneNode(true);
  row.children[0].children[0].textContent = transaction.date;
  row.children[0].children[1].textContent = transaction.object;
  row.children[0].children[2].textContent = transaction.amount.toFixed(2);
  row.children[0].children[3].addEventListener("click", () => {
    deleteTransaction(transaction.id);
  });
  return row;
};

// =============== State Management ==================

let state = Object.freeze({
  ACCOUNT: null,
});

const updateState = (property, newData) => {
  state = Object.freeze({
    ...state,
    [property]: newData,
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.ACCOUNT));
};

// ============================================================

const updateDashboard = () => {
  let ACCOUNT = state.ACCOUNT;
  if (!ACCOUNT) return navigate("/login");
  updateElement("balance", ACCOUNT.balance.toFixed(2));
  updateElement("description", ACCOUNT.description);
  updateElement("currency", ACCOUNT.currency);
  updateElement("user_salutation", `Hi ${ACCOUNT.user},`);

  let transactionTable = document.getElementById("transactions");
  transactionTable.textContent = "";
  for (let transaction of ACCOUNT.transactions) {
    let row = getTransactionRow(transaction);
    transactionTable.appendChild(row);
  }
};

const routes = {
  "/login": { templateId: "login" },
  "/": { templateId: "dashboard", init: updateDashboard },
};

const updateView = () => {
  const path = window.location.pathname;
  let route = routes[path];

  if (!route) {
    // Redirect to login page
    return navigate("/login");
  }

  //   Accessing the HTML elements of template and app
  const template = document.getElementById(route.templateId);
  const app = document.getElementById("app");

  //   Cloning the template, clearing the app section and appending the template as app's child
  const view = template.content.cloneNode(true);
  app.innerHTML = "";
  app.appendChild(view);

  if (typeof route.init === "function") {
    route.init();
  }
};

const navigate = (path) => {
  // Navigate to a particular path specified as parameter
  window.history.pushState({}, path, path);
  updateView();
};

const init = () => {
  const savedAccount = localStorage.getItem(STORAGE_KEY);
  if (savedAccount) {
    updateState("ACCOUNT", JSON.parse(savedAccount));
  }

  // Whenever the url changes, update the view
  window.onpopstate = () => updateView();

  // Update view automatically whenever loaded initially
  updateView();
};

init();

const onLinkClick = (e) => {
  // Prevents the default behaviour of anchor tag
  e.preventDefault();

  //   Get the specified href and push that url to history
  let url = e.target.href;
  navigate(url);
};

// ================= Functions for registering and login ==================

const login = async () => {
  let loginForm = document.getElementById("loginForm");
  let user = loginForm.user.value;
  getAccountDetails(user);
};

const logout = () => {
  updateState("ACCOUNT", null);
  navigate("/login");
};

const getAccountDetails = async (user) => {
  let result = await getAccount(user);
  if (result.error) {
    let msg = result.error;
    console.log(msg);
    updateElement("loginError", msg);
    return;
  }

  console.log("Account fetched!", result);
  result.transactions = result.transactions.sort((a, b) =>
    a.date < b.date ? 1 : -1
  );
  updateState("ACCOUNT", result);
  navigate("/");
};

const register = async () => {
  let registrationForm = document.getElementById("registrationForm");

  const formData = {};

  // Loop through form elements and add to formData object
  for (let element of registrationForm.elements) {
    if (element.name) {
      formData[element.name] = element.value;
    }
  }

  // Display the formData object
  const jsonData = JSON.stringify(formData);

  const result = await createAccount(jsonData);

  if (result.error) {
    console.log("An error occurred : ", result.error);
    let msg = result.error;
    console.log(msg);
    updateElement("registerError", msg);
    return;
  }

  console.log("Account created!", result);
  updateState("ACCOUNT", result);
  navigate("/");
};

const addTransaction = async () => {
  let ACCOUNT = state.ACCOUNT;
  if (!ACCOUNT.user) {
    return console.log("No user logged in!");
  }
  let transactionForm = document.getElementById("transactionForm");

  const formData = {};

  // Loop through form elements and add to formData object
  for (let element of transactionForm.elements) {
    if (element.name) {
      formData[element.name] = element.value;
    }
  }

  // Display the formData object
  const jsonData = JSON.stringify(formData);

  const result = await createTransaction(ACCOUNT.user, jsonData);

  if (result.error) {
    console.log("An error occurred : ", result.error);
    let msg = result.error;
    console.log(msg);
    return;
  }

  await getAccountDetails(ACCOUNT.user);
  closeTransactionModal();
  transactionForm.reset();
};
const deleteTransaction = async (id) => {
  let ACCOUNT = state.ACCOUNT;
  if (!ACCOUNT.user) {
    return console.log("No user logged in!");
  }
  const result = await deleteTransactionAPI(ACCOUNT.user, id);

  if (result && result.error) {
    console.log("An error occurred : ", result.error);
    return;
  }

  await getAccountDetails(ACCOUNT.user);
  closeTransactionModal();
  transactionForm.reset();
};

const openTransactionModal = () => {
  let modalContainer = document.getElementById("transaction_modal_container");
  modalContainer.style.display = "block";
};
const closeTransactionModal = () => {
  let modalContainer = document.getElementById("transaction_modal_container");
  modalContainer.style.display = "none";
};

// ================================== API calls =====================================

const createAccount = async (data) => {
  try {
    const response = await fetch("//localhost:5000/api/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: data,
    });
    return await response.json();
  } catch (error) {
    return { error: error.message || "Unknown error" };
  }
};

const getAccount = async (user) => {
  try {
    const response = await fetch(
      "//localhost:5000/api/accounts/" + encodeURIComponent(user)
    );
    return await response.json();
  } catch (error) {
    return { error: error.message || "Unknown error" };
  }
};

const createTransaction = async (user, data) => {
  try {
    const response = await fetch(
      `//localhost:5000/api/accounts/${encodeURIComponent(user)}/transactions`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: data,
      }
    );
    return await response.json();
  } catch (error) {
    return { error: error.message || "Unknown error" };
  }
};
const deleteTransactionAPI = async (user, id) => {
  try {
    const response = await fetch(
      `//localhost:5000/api/accounts/${encodeURIComponent(
        user
      )}/transactions/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: { "content-type": "application/json" },
      }
    );
  } catch (error) {
    return { error: error.message || "Unknown error" };
  }
};
