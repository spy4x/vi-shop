// The shop's one script, an enhancement: every page works without it.
//
// A filter form (`data-autosubmit`) sends itself when a chip is clicked or tapped. A change made
// with the arrow keys does not send it, so a keyboard moves through the chips without reloading the
// page; its "Filter" button is then hidden until it takes focus.
//
// The order list's form (`data-zalo`) copies its message before it opens the Zalo chat, the way
// an item page's order bar does, instead of posting to the page that shows the message to copy.
for (const form of document.querySelectorAll("form[data-autosubmit]")) {
  form.querySelector("[data-filter-submit]")?.classList.add("sr-only", "focus:not-sr-only")
  let byKeyboard = false
  form.addEventListener("keydown", () => byKeyboard = true)
  form.addEventListener("pointerdown", () => byKeyboard = false)
  form.addEventListener("change", () => byKeyboard || form.requestSubmit())
}

for (const form of document.querySelectorAll("form[data-zalo]")) {
  form.addEventListener("submit", async (event) => {
    if (event.submitter?.value !== "zalo") return
    event.preventDefault()
    const status = form.querySelector("[role=status]")
    try {
      await navigator.clipboard.writeText(form.dataset.message)
      if (status) status.textContent = form.dataset.copied
      open(form.dataset.zalo, "_blank", "noopener")
    } catch {
      if (status) status.textContent = form.dataset.copyFailed
    }
  })
}
