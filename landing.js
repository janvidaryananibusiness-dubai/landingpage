// Janvi Daryanani — single-page landing page interactions
document.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  const form = document.querySelector("[data-lead-form]");
  if (!form) return;

  const submitButton = form.querySelector('button[type="submit"]');
  const feedback = form.querySelector(".form-feedback");
  const currencySelect = document.querySelector("#lead-currency");
  const budgetSelect = document.querySelector("#lead-budget");
  const currencyNote = document.querySelector("[data-currency-note]");

  // Budget ranges are stored in AED, then displayed using live AED exchange rates.
  const bands = [
    { min: 0, max: 1000000, type: "under" },
    { min: 1000000, max: 2000000 },
    { min: 2000000, max: 3000000 },
    { min: 3000000, max: 5000000 },
    { min: 5000000, max: 10000000 },
    { min: 10000000, type: "over" }
  ];
  let rates = { AED: 1 };
  let ratesReady = false;

  const money = (amount, currency) => new Intl.NumberFormat("en", {
    style: "currency", currency, maximumFractionDigits: 0
  }).format(Math.round(amount));

  function renderBudgets() {
    if (!currencySelect || !budgetSelect) return;
    const currency = currencySelect.value;
    const rate = rates[currency] || 1;
    budgetSelect.replaceChildren(new Option("Select your budget", "", true, true));
    budgetSelect.options[0].disabled = true;

    bands.forEach((band) => {
      let label;
      if (band.type === "under") {
        label = `Under ${money(band.max * rate, currency)}`;
      } else if (band.type === "over") {
        label = `${money(band.min * rate, currency)}+`;
      } else {
        label = `${money(band.min * rate, currency)} – ${money(band.max * rate, currency)}`;
      }
      budgetSelect.add(new Option(label, `${label} (${currency})`));
    });
    budgetSelect.add(new Option("Not sure yet", `Not sure yet (${currency})`));

    // if (currencyNote) {
    //   currencyNote.textContent = ratesReady
    //     ? `Approximate values converted to ${currency}.`
    //     : currency === "AED"
    //       ? "Budget values are shown in AED."
    //       : "Live exchange rates are loading…";
    // }
  }

  async function fetchRates() {
    if (!currencySelect) return;
    // Keep alternate currencies unavailable until real exchange rates have loaded.
    [...currencySelect.options].forEach(option => {
      if (option.value !== "AED") option.disabled = true;
    });
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/AED", { cache: "no-store" });
      if (!response.ok) throw new Error("Exchange-rate request failed");
      const result = await response.json();
      if (result.result !== "success" || !result.rates) throw new Error("Rates unavailable");
      rates = { AED: 1, ...result.rates };
      ratesReady = true;
      [...currencySelect.options].forEach(option => { option.disabled = false; });
    } catch (error) {
      // Avoid showing made-up conversions. Keep AED available if live rates cannot load.
      [...currencySelect.options].forEach(option => {
        if (option.value !== "AED") option.disabled = true;
      });
      currencySelect.value = "AED";
      if (currencyNote) currencyNote.textContent = "Currency conversion is unavailable right now. AED is available.";
    }
    renderBudgets();
  }

  if (currencySelect && budgetSelect) {
    renderBudgets();
    currencySelect.addEventListener("change", renderBudgets);
    fetchRates();
  }

  const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbxcBgY55q4II2nGAuE2K6UlTrXPYDHlGTOMARSULh_zF4Rtxlr63PbaiKEy_blFZfYy/exec";


form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const originalLabel = submitButton.innerHTML;

    submitButton.disabled = true;
    submitButton.innerHTML = "<span>Sending…</span>";
    feedback.textContent = "";

    const formData = new FormData(form);

    const sheetData = new URLSearchParams({
      Name: formData.get("Name") || "",
      Email: formData.get("Email") || "",
      Phone: formData.get("Phone") || "",
      Budget: formData.get("Budget") || "",
      Currency: formData.get("Currency") || ""
    });

    try {
      await fetch(GOOGLE_SHEETS_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: sheetData.toString()
      });

      form.reset();

      if (currencySelect) {
        currencySelect.value = "AED";
      }

      renderBudgets();

      feedback.textContent =
        "Thank you! Your enquiry has been submitted successfully.";

    } catch (error) {
      console.error("Google Sheets submission error:", error);

      feedback.textContent =
        "Unable to submit your enquiry. Please try again.";
        
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = originalLabel;
    }
});



});
