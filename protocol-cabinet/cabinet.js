(() => {
  const element = id => document.getElementById(id);
  const exchange = element("exchange");
  const jump = element("jump");
  const forward = element("forward");
  const previous = element("previous");
  const buttons = Array.from(document.querySelectorAll("[data-protocol]"));
  let protocol;
  let scenario;
  let step = 0;

  function showMessage(index) {
    step = index;
    const current = scenario.steps[step];
    const position = `Message ${step + 1} of ${scenario.steps.length}`;
    element("direction").textContent = current.direction;
    element("message").textContent = current.payload;
    element("step-title").textContent = current.title;
    element("explanation").textContent = current.explanation;
    element("field").textContent = current.field;
    element("meaning").textContent = current.meaning;
    element("counter").textContent = position;
    element("announcement").textContent = `${protocol.name}. ${scenario.label}. ${position}. ${current.title}.`;
    jump.value = String(step);
    previous.disabled = step === 0;
    forward.textContent = step === scenario.steps.length - 1 ? "Replay ↺" : "Next message →";
  }

  function openExchange(protocolId, caseId) {
    protocol = protocols[protocolId];
    scenario = protocol.cases.find(item => item.id === caseId) || protocol.cases[0];
    buttons.forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.protocol === protocolId));
    });
    exchange.replaceChildren(...protocol.cases.map(item => new Option(item.label, item.id)));
    exchange.value = scenario.id;
    jump.replaceChildren(...scenario.steps.map((item, index) =>
      new Option(`${index + 1}. ${item.title}`, String(index))));
    element("transport").textContent = protocol.transport;
    element("format").textContent = protocol.format;
    showMessage(0);
  }

  function openFromHash() {
    const [id, caseId] = location.hash.slice(1).split("/");
    if (Object.hasOwn(protocols, id)) openExchange(id, caseId);
    else if (!protocol || !id) openExchange("dns");
  }

  buttons.forEach(button => button.addEventListener("click", () => {
    const id = button.dataset.protocol;
    if (protocols[id] !== protocol) location.hash = id;
  }));
  exchange.addEventListener("change", () => {
    const id = buttons.find(button => button.getAttribute("aria-pressed") === "true").dataset.protocol;
    location.hash = `${id}/${exchange.value}`;
  });
  jump.addEventListener("change", () => showMessage(Number(jump.value)));
  previous.addEventListener("click", () => showMessage(step - 1));
  forward.addEventListener("click", () => showMessage((step + 1) % scenario.steps.length));
  window.addEventListener("hashchange", openFromHash);
  openFromHash();
  element("cabinet").hidden = false;
})();
