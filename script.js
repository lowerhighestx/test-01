const STORAGE_KEY = "neon-goal-columns.v1";
const MIN_STEPS = 5;
const MAX_STEPS = 50;
const DEFAULT_STEPS = 10;
const MIN_COLUMN_WIDTH = 140;
const MAX_COLUMN_WIDTH = 360;
const DEFAULT_COLUMN_WIDTH = 280;
const DEFAULT_GOAL_COLOR = "#6ffffa";
const HERO_SIZE = 28;

const state = {
  goals: [],
  stats: {
    streakDays: 0,
    lastCompletionDate: null,
  },
};

const uiState = {
  editing: null,
  goalCardGoalId: null,
  pendingAnimation: null,
  tooltipStepElement: null,
};

let audioCtx = null;

const elements = {
  board: document.getElementById("goalBoard"),
  addGoalBtn: document.getElementById("addGoalBtn"),
  overallProgressBar: document.getElementById("overallProgressBar"),
  overallProgressText: document.getElementById("overallProgressText"),
  streakBadge: document.getElementById("streakBadge"),
  goalModal: document.getElementById("goalModal"),
  goalForm: document.getElementById("goalForm"),
  goalTitleInput: document.getElementById("goalTitleInput"),
  goalStepsInput: document.getElementById("goalStepsInput"),
  stepModal: document.getElementById("stepModal"),
  stepForm: document.getElementById("stepForm"),
  stepModalMeta: document.getElementById("stepModalMeta"),
  stepTitleInput: document.getElementById("stepTitleInput"),
  stepDescriptionInput: document.getElementById("stepDescriptionInput"),
  goalCardModal: document.getElementById("goalCardModal"),
  goalCardForm: document.getElementById("goalCardForm"),
  goalCardModalMeta: document.getElementById("goalCardModalMeta"),
  goalCardTitleInput: document.getElementById("goalCardTitleInput"),
  goalCardWidthInput: document.getElementById("goalCardWidthInput"),
  goalCardColorInput: document.getElementById("goalCardColorInput"),
  goalCardStepsEditor: document.getElementById("goalCardStepsEditor"),
  stepTooltip: document.getElementById("stepTooltip"),
  confettiLayer: document.getElementById("confettiLayer"),
};

function init() {
  loadState();
  bindEvents();
  render();
}

function bindEvents() {
  elements.addGoalBtn.addEventListener("click", openGoalModal);

  elements.goalForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = elements.goalTitleInput.value.trim();
    const totalSteps = clamp(
      Number.parseInt(elements.goalStepsInput.value, 10) || DEFAULT_STEPS,
      MIN_STEPS,
      MAX_STEPS
    );

    if (!title) {
      elements.goalTitleInput.focus();
      return;
    }

    const goal = createGoal(title, totalSteps);
    state.goals.push(goal);
    saveState();

    closeModal(elements.goalModal);
    elements.goalForm.reset();
    elements.goalStepsInput.value = String(DEFAULT_STEPS);

    render();

    const created = elements.board.querySelector(`[data-goal-id="${goal.id}"]`);
    if (created) {
      created.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  });

  elements.stepForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!uiState.editing) {
      return;
    }

    const goal = state.goals.find((candidate) => candidate.id === uiState.editing.goalId);
    if (!goal) {
      closeModal(elements.stepModal);
      return;
    }

    const step = goal.steps.find((candidate) => candidate.stepNumber === uiState.editing.stepNumber);
    if (!step) {
      closeModal(elements.stepModal);
      return;
    }

    const title = elements.stepTitleInput.value.trim();
    const description = elements.stepDescriptionInput.value.trim();

    step.title = title || getStepDefaultLabel(step.stepNumber, goal.totalSteps);
    step.description = description;

    saveState();
    closeModal(elements.stepModal);
    uiState.editing = null;
    render();
  });

  elements.goalCardForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const goalId = uiState.goalCardGoalId;
    if (!goalId) {
      return;
    }

    const goal = state.goals.find((candidate) => candidate.id === goalId);
    if (!goal) {
      closeModal(elements.goalCardModal);
      return;
    }

    const goalTitle = elements.goalCardTitleInput.value.trim();
    goal.title = (goalTitle || goal.title).slice(0, 60);
    goal.columnWidth = clamp(
      Number.parseInt(elements.goalCardWidthInput.value, 10) || goal.columnWidth || DEFAULT_COLUMN_WIDTH,
      MIN_COLUMN_WIDTH,
      MAX_COLUMN_WIDTH
    );
    goal.color = normalizeHexColor(elements.goalCardColorInput.value, goal.color || DEFAULT_GOAL_COLOR);

    const rows = elements.goalCardStepsEditor.querySelectorAll(".goal-step-row[data-step]");
    rows.forEach((row) => {
      const stepNumber = Number.parseInt(row.getAttribute("data-step"), 10);
      if (Number.isNaN(stepNumber)) {
        return;
      }

      const step = goal.steps[stepNumber - 1];
      if (!step) {
        return;
      }

      const titleInput = row.querySelector("input[data-field=\"title\"]");
      const descriptionInput = row.querySelector("textarea[data-field=\"description\"]");

      const nextTitle = titleInput ? titleInput.value.trim() : "";
      const nextDescription = descriptionInput ? descriptionInput.value.trim() : "";

      step.title = (nextTitle || getStepDefaultLabel(stepNumber, goal.totalSteps)).slice(0, 70);
      step.description = nextDescription.slice(0, 240);
    });

    saveState();
    closeModal(elements.goalCardModal);
    render();
  });

  document.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-close-modal]");
    if (closeButton) {
      const modalId = closeButton.getAttribute("data-close-modal");
      if (modalId) {
        closeModal(document.getElementById(modalId));
      }
      return;
    }

    if (event.target.classList.contains("modal")) {
      closeModal(event.target);
      return;
    }

    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) {
      return;
    }

    const action = actionTarget.getAttribute("data-action");
    const goalId = actionTarget.getAttribute("data-goal-id");

    if (!goalId) {
      return;
    }

    if (action === "complete-step") {
      completeStep(goalId);
      return;
    }

    if (action === "undo-step") {
      undoStep(goalId);
      return;
    }

    if (action === "open-goal-card") {
      openGoalCardModal(goalId);
      return;
    }

    if (action === "move-goal-left") {
      moveGoal(goalId, -1);
      return;
    }

    if (action === "move-goal-right") {
      moveGoal(goalId, 1);
      return;
    }

    if (action === "edit-step") {
      const stepNumber = Number.parseInt(actionTarget.getAttribute("data-step"), 10);
      if (Number.isNaN(stepNumber)) {
        return;
      }
      openStepModal(goalId, stepNumber);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    closeModal(elements.goalModal);
    closeModal(elements.stepModal);
    closeModal(elements.goalCardModal);
  });

  document.addEventListener("mouseover", (event) => {
    const step = event.target.closest(".step[data-goal-id][data-step]");
    if (!step) {
      hideStepTooltip();
      return;
    }
    showStepTooltip(step, event);
  });

  document.addEventListener("mousemove", (event) => {
    if (!uiState.tooltipStepElement) {
      return;
    }
    positionStepTooltip(event.clientX, event.clientY);
  });

  document.addEventListener("mouseout", (event) => {
    if (!uiState.tooltipStepElement) {
      return;
    }
    const related = event.relatedTarget;
    if (related && uiState.tooltipStepElement.contains(related)) {
      return;
    }
    const step = event.target.closest(".step[data-goal-id][data-step]");
    if (step && step === uiState.tooltipStepElement) {
      hideStepTooltip();
    }
  });
}

function createGoal(title, totalSteps) {
  const safeSteps = clamp(totalSteps, MIN_STEPS, MAX_STEPS);
  const steps = [];

  for (let stepNumber = 1; stepNumber <= safeSteps; stepNumber += 1) {
    steps.push({
      stepNumber,
      title: getStepDefaultLabel(stepNumber, safeSteps),
      description: "",
      completed: false,
    });
  }

  return {
    id: makeId(),
    title,
    totalSteps: safeSteps,
    currentStep: 1,
    columnWidth: DEFAULT_COLUMN_WIDTH,
    color: DEFAULT_GOAL_COLOR,
    steps,
  };
}

function completeStep(goalId) {
  const goal = state.goals.find((candidate) => candidate.id === goalId);
  if (!goal) {
    return;
  }

  if (isGoalFinished(goal)) {
    return;
  }

  const fromStep = goal.currentStep;
  const step = goal.steps[fromStep - 1];
  if (!step) {
    return;
  }

  step.completed = true;

  let toStep = fromStep;
  if (fromStep < goal.totalSteps) {
    goal.currentStep = fromStep + 1;
    toStep = goal.currentStep;
  }

  updateStreak();

  uiState.pendingAnimation = {
    goalId,
    fromStep,
    toStep,
    completedStep: fromStep,
  };

  saveState();
  render();

  playStepTone(fromStep === goal.totalSteps);

  if (fromStep === goal.totalSteps) {
    launchConfetti(goalId);
  }
}

function undoStep(goalId) {
  const goal = state.goals.find((candidate) => candidate.id === goalId);
  if (!goal || !canUndoGoal(goal)) {
    return;
  }

  const fromStep = getHeroStep(goal);
  let targetStep = fromStep;

  if (isGoalFinished(goal)) {
    const lastStep = goal.steps[goal.totalSteps - 1];
    if (!lastStep) {
      return;
    }
    lastStep.completed = false;
    goal.currentStep = goal.totalSteps;
    targetStep = goal.totalSteps;
  } else {
    const previousStepNumber = clamp(goal.currentStep - 1, 1, goal.totalSteps);
    const previousStep = goal.steps[previousStepNumber - 1];
    if (!previousStep || !previousStep.completed) {
      return;
    }
    previousStep.completed = false;
    goal.currentStep = previousStepNumber;
    targetStep = previousStepNumber;
  }

  uiState.pendingAnimation = {
    goalId,
    fromStep,
    toStep: targetStep,
    completedStep: targetStep,
  };

  saveState();
  render();
}

function openGoalModal() {
  openModal(elements.goalModal);
  elements.goalTitleInput.value = "";
  elements.goalStepsInput.value = String(DEFAULT_STEPS);
  elements.goalTitleInput.focus();
}

function openStepModal(goalId, stepNumber) {
  const goal = state.goals.find((candidate) => candidate.id === goalId);
  if (!goal) {
    return;
  }

  const step = goal.steps.find((candidate) => candidate.stepNumber === stepNumber);
  if (!step) {
    return;
  }

  uiState.editing = { goalId, stepNumber };

  elements.stepModalMeta.textContent = `${goal.title} · Step ${stepNumber}/${goal.totalSteps}`;
  elements.stepTitleInput.value = step.title || "";
  elements.stepDescriptionInput.value = step.description || "";

  openModal(elements.stepModal);
  elements.stepTitleInput.focus();
}

function openGoalCardModal(goalId) {
  const goal = state.goals.find((candidate) => candidate.id === goalId);
  if (!goal) {
    return;
  }

  uiState.goalCardGoalId = goalId;
  elements.goalCardModalMeta.textContent = `${goal.title} · ${goal.totalSteps} steps`;
  elements.goalCardTitleInput.value = goal.title;
  elements.goalCardWidthInput.value = String(
    clamp(goal.columnWidth || DEFAULT_COLUMN_WIDTH, MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH)
  );
  elements.goalCardColorInput.value = normalizeHexColor(goal.color || DEFAULT_GOAL_COLOR, DEFAULT_GOAL_COLOR);

  elements.goalCardStepsEditor.innerHTML = goal.steps
    .map((step) => {
      const defaultLabel = getStepDefaultLabel(step.stepNumber, goal.totalSteps);
      const badge = step.stepNumber === 1 ? "START" : step.stepNumber === goal.totalSteps ? "FINISH" : "STEP";

      return `
        <section class="goal-step-row" data-step="${step.stepNumber}">
          <div class="goal-step-row-head">
            <span class="goal-step-tag">Step ${step.stepNumber}/${goal.totalSteps}</span>
            <span class="goal-step-chip">${badge}</span>
          </div>
          <input
            type="text"
            data-field="title"
            maxlength="70"
            value="${escapeAttribute(step.title || defaultLabel)}"
            placeholder="${defaultLabel}"
          />
          <textarea
            rows="2"
            data-field="description"
            maxlength="240"
            placeholder="Step note"
          >${escapeHtml(step.description || "")}</textarea>
        </section>
      `;
    })
    .join("");

  openModal(elements.goalCardModal);
  elements.goalCardTitleInput.focus();
}

function moveGoal(goalId, delta) {
  const index = state.goals.findIndex((goal) => goal.id === goalId);
  if (index === -1) {
    return;
  }

  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= state.goals.length) {
    return;
  }

  const [goal] = state.goals.splice(index, 1);
  state.goals.splice(nextIndex, 0, goal);
  saveState();
  render();

  const movedColumn = elements.board.querySelector(`[data-goal-id="${cssEscape(goalId)}"]`);
  if (movedColumn) {
    movedColumn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }
}

function openModal(modal) {
  if (!modal) {
    return;
  }
  hideStepTooltip();
  modal.classList.remove("hidden");
}

function closeModal(modal) {
  if (!modal) {
    return;
  }
  modal.classList.add("hidden");

  if (modal === elements.stepModal) {
    uiState.editing = null;
  }

  if (modal === elements.goalCardModal) {
    uiState.goalCardGoalId = null;
  }
}

function render() {
  hideStepTooltip();
  const existingScroll = captureViewportScroll();

  if (state.goals.length === 0) {
    elements.board.innerHTML = `
      <section class="empty-state">
        <div>
          <h2>No goals yet</h2>
          <p>Create your first neon column and start climbing from START to FINISH.</p>
        </div>
      </section>
    `;
    updateHud();
    uiState.pendingAnimation = null;
    return;
  }

  const cardsMarkup = state.goals
    .map((goal, index) => renderGoalCard(goal, index, state.goals.length))
    .join("");
  elements.board.innerHTML = cardsMarkup;

  restoreViewportScroll(existingScroll);
  positionHeroes();

  if (uiState.pendingAnimation) {
    animateHeroTransition(uiState.pendingAnimation);
  }

  updateHud();
  uiState.pendingAnimation = null;
}

function renderGoalCard(goal, index, totalGoals) {
  const completedCount = goal.steps.filter((step) => step.completed).length;
  const percent = Math.round((completedCount / goal.totalSteps) * 100);
  const finished = completedCount >= goal.totalSteps;
  const canUndo = canUndoGoal(goal);
  const goalColor = normalizeHexColor(goal.color || DEFAULT_GOAL_COLOR, DEFAULT_GOAL_COLOR);
  const goalWidth = clamp(goal.columnWidth || DEFAULT_COLUMN_WIDTH, MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH);
  const goalColorRgb = hexToRgbTriplet(goalColor);
  const canReorder = totalGoals > 1;
  const canMoveLeft = canReorder && index > 0;
  const canMoveRight = canReorder && index < totalGoals - 1;
  const reorderControls = canReorder
    ? `
          <button
            type="button"
            class="mini-btn"
            data-action="move-goal-left"
            data-goal-id="${escapeAttribute(goal.id)}"
            ${canMoveLeft ? "" : "disabled"}
            title="Move left"
          >
            ←
          </button>
          <button
            type="button"
            class="mini-btn"
            data-action="move-goal-right"
            data-goal-id="${escapeAttribute(goal.id)}"
            ${canMoveRight ? "" : "disabled"}
            title="Move right"
          >
            →
          </button>
      `
    : "";

  const stepsMarkup = [];
  for (let stepNumber = goal.totalSteps; stepNumber >= 1; stepNumber -= 1) {
    const step = goal.steps[stepNumber - 1];
    const classes = ["step"];

    if (step.stepNumber === goal.totalSteps) {
      classes.push("step-finish");
    }

    if (step.completed) {
      classes.push("step-completed");
    } else if (!finished && step.stepNumber === goal.currentStep) {
      classes.push("step-current");
    } else {
      classes.push("step-future");
    }

    if (
      uiState.pendingAnimation &&
      uiState.pendingAnimation.goalId === goal.id &&
      uiState.pendingAnimation.completedStep === step.stepNumber
    ) {
      classes.push("step-pulse");
    }

    const metaLabel =
      getStepDefaultLabel(step.stepNumber, goal.totalSteps);

    stepsMarkup.push(`
      <button
        type="button"
        class="${classes.join(" ")}"
        data-action="edit-step"
        data-goal-id="${escapeAttribute(goal.id)}"
        data-step="${step.stepNumber}"
        data-step-title="${escapeAttribute(step.title || metaLabel)}"
        data-step-description="${escapeAttribute(step.description || "")}"
      >
        <span class="step-topline">
          <span class="step-number">${step.stepNumber}</span>
          <span class="step-title">${escapeHtml(step.title || metaLabel)}</span>
        </span>
        <span class="step-desc">${escapeHtml(step.description || metaLabel)}</span>
      </button>
    `);
  }

  return `
    <article
      class="goal-column"
      data-goal-id="${escapeAttribute(goal.id)}"
      style="--goal-width:${goalWidth}px; --goal-accent:${goalColor}; --goal-accent-rgb:${goalColorRgb};"
    >
      <header class="goal-head">
        <div class="goal-head-top">
          <h2 class="goal-title" title="${escapeAttribute(goal.title)}">${escapeHtml(goal.title)}</h2>
        </div>
        <div class="goal-mini">
          <span>${percent}% COMPLETE</span>
        </div>
        <div class="goal-controls">
          <button
            type="button"
            class="mini-btn"
            data-action="open-goal-card"
            data-goal-id="${escapeAttribute(goal.id)}"
          >
            Goal Card
          </button>
          ${reorderControls}
        </div>
      </header>

      <div class="steps-viewport" data-goal-id="${escapeAttribute(goal.id)}">
        <div class="steps-track">
          ${stepsMarkup.join("")}
          <div class="hero-marker" data-goal-id="${escapeAttribute(goal.id)}" aria-hidden="true"></div>
        </div>
      </div>

      <footer class="goal-footer">
        <button
          type="button"
          class="complete-btn"
          data-action="complete-step"
          data-goal-id="${escapeAttribute(goal.id)}"
          ${finished ? "disabled" : ""}
        >
          ${finished ? "GOAL DONE" : "▲ COMPLETE"}
        </button>
        <button
          type="button"
          class="undo-btn"
          data-action="undo-step"
          data-goal-id="${escapeAttribute(goal.id)}"
          ${canUndo ? "" : "disabled"}
        >
          x
        </button>
      </footer>
    </article>
  `;
}

function positionHeroes() {
  for (const goal of state.goals) {
    const stepNumber = getHeroStep(goal);
    placeHeroAtStep(goal.id, stepNumber, false);

    const viewport = elements.board.querySelector(`.steps-viewport[data-goal-id="${cssEscape(goal.id)}"]`);
    if (viewport && !viewport.dataset.restored) {
      scrollStepIntoView(goal.id, stepNumber, "auto", "end");
    }
  }
}

function animateHeroTransition(animationInfo) {
  const { goalId, fromStep, toStep } = animationInfo;

  const marker = elements.board.querySelector(`.hero-marker[data-goal-id="${cssEscape(goalId)}"]`);
  if (!marker) {
    return;
  }

  const fromBlock = getStepBlock(goalId, fromStep);
  const toBlock = getStepBlock(goalId, toStep);

  if (!fromBlock || !toBlock) {
    placeHeroAtStep(goalId, toStep, true);
    return;
  }

  const fromTop = getHeroTopForBlock(fromBlock);
  const toTop = getHeroTopForBlock(toBlock);

  marker.style.transition = "none";
  marker.style.top = `${fromTop}px`;

  requestAnimationFrame(() => {
    marker.style.transition = "top 420ms cubic-bezier(0.22, 1, 0.36, 1)";
    marker.style.top = `${toTop}px`;
    marker.classList.add("hero-burst");

    window.setTimeout(() => {
      marker.classList.remove("hero-burst");
    }, 460);
  });

  scrollStepIntoView(goalId, toStep, "smooth", "center");
}

function getHeroStep(goal) {
  if (isGoalFinished(goal)) {
    return goal.totalSteps;
  }
  return clamp(goal.currentStep, 1, goal.totalSteps);
}

function placeHeroAtStep(goalId, stepNumber, withTransition) {
  const marker = elements.board.querySelector(`.hero-marker[data-goal-id="${cssEscape(goalId)}"]`);
  const block = getStepBlock(goalId, stepNumber);

  if (!marker || !block) {
    return;
  }

  marker.style.transition = withTransition
    ? "top 420ms cubic-bezier(0.22, 1, 0.36, 1)"
    : "none";
  marker.style.top = `${getHeroTopForBlock(block)}px`;
}

function getHeroTopForBlock(block) {
  return block.offsetTop + (block.offsetHeight - HERO_SIZE) / 2;
}

function getStepBlock(goalId, stepNumber) {
  return elements.board.querySelector(
    `.step[data-goal-id="${cssEscape(goalId)}"][data-step="${stepNumber}"]`
  );
}

function scrollStepIntoView(goalId, stepNumber, behavior = "auto", block = "nearest") {
  const viewport = elements.board.querySelector(`.steps-viewport[data-goal-id="${cssEscape(goalId)}"]`);
  const step = getStepBlock(goalId, stepNumber);

  if (!viewport || !step) {
    return;
  }

  const stepTop = step.offsetTop;
  const stepBottom = stepTop + step.offsetHeight;
  const viewportTop = viewport.scrollTop;
  const viewportBottom = viewportTop + viewport.clientHeight;

  let targetTop = viewportTop;

  if (block === "center") {
    targetTop = stepTop - (viewport.clientHeight - step.offsetHeight) / 2;
  } else if (block === "end") {
    targetTop = stepBottom - viewport.clientHeight;
  } else if (stepTop < viewportTop) {
    targetTop = stepTop;
  } else if (stepBottom > viewportBottom) {
    targetTop = stepBottom - viewport.clientHeight;
  }

  const clampedTop = Math.max(0, Math.min(targetTop, viewport.scrollHeight - viewport.clientHeight));
  viewport.scrollTo({ top: clampedTop, behavior });
}

function captureViewportScroll() {
  const map = new Map();
  const viewports = elements.board.querySelectorAll(".steps-viewport[data-goal-id]");

  viewports.forEach((viewport) => {
    const goalId = viewport.getAttribute("data-goal-id");
    if (goalId) {
      map.set(goalId, viewport.scrollTop);
    }
  });

  return map;
}

function restoreViewportScroll(scrollMap) {
  const viewports = elements.board.querySelectorAll(".steps-viewport[data-goal-id]");

  viewports.forEach((viewport) => {
    const goalId = viewport.getAttribute("data-goal-id");
    if (!goalId) {
      return;
    }

    if (scrollMap.has(goalId)) {
      viewport.scrollTop = scrollMap.get(goalId);
      viewport.dataset.restored = "1";
      return;
    }

    delete viewport.dataset.restored;
  });
}

function updateHud() {
  let totalSteps = 0;
  let completedSteps = 0;

  for (const goal of state.goals) {
    totalSteps += goal.totalSteps;
    completedSteps += goal.steps.filter((step) => step.completed).length;
  }

  const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  elements.overallProgressBar.style.width = `${percent}%`;
  elements.overallProgressText.textContent = `${percent}% (${completedSteps}/${totalSteps || 0})`;
  elements.streakBadge.textContent = `Streak: ${state.stats.streakDays}`;
}

function updateStreak() {
  const today = dateKey(new Date());

  if (!state.stats.lastCompletionDate) {
    state.stats.streakDays = 1;
    state.stats.lastCompletionDate = today;
    return;
  }

  if (state.stats.lastCompletionDate === today) {
    return;
  }

  const prevDate = new Date(`${state.stats.lastCompletionDate}T00:00:00`);
  const nextDate = new Date(prevDate);
  nextDate.setDate(prevDate.getDate() + 1);

  if (dateKey(nextDate) === today) {
    state.stats.streakDays += 1;
  } else {
    state.stats.streakDays = 1;
  }

  state.stats.lastCompletionDate = today;
}

function launchConfetti(goalId) {
  const column = elements.board.querySelector(`.goal-column[data-goal-id="${cssEscape(goalId)}"]`);
  if (!column) {
    return;
  }

  const rect = column.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const startY = rect.top + 24;
  const colors = ["#6ffffa", "#ffe66a", "#5cff9a", "#7da0ff", "#ff74c3"];

  for (let i = 0; i < 30; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";

    const dx = `${randomBetween(-160, 160)}px`;
    const dy = `${randomBetween(140, 280)}px`;
    const rot = `${randomBetween(120, 620)}deg`;

    piece.style.left = `${centerX + randomBetween(-20, 20)}px`;
    piece.style.top = `${startY}px`;
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty("--dx", dx);
    piece.style.setProperty("--dy", dy);
    piece.style.setProperty("--rot", rot);
    piece.style.animationDelay = `${Math.random() * 0.12}s`;

    elements.confettiLayer.appendChild(piece);

    window.setTimeout(() => {
      piece.remove();
    }, 1300);
  }
}

function playStepTone(isFinalStep) {
  try {
    if (!audioCtx) {
      audioCtx = new window.AudioContext();
    }

    const now = audioCtx.currentTime;
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(isFinalStep ? 880 : 560, now);
    oscillator.frequency.linearRampToValueAtTime(isFinalStep ? 1220 : 760, now + 0.12);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.17);
  } catch (_error) {
    // Audio may be blocked by browser policies. The app still works without sound.
  }
}

function loadState() {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    state.goals = [];
    return;
  }

  try {
    const parsed = JSON.parse(raw);

    state.goals = Array.isArray(parsed.goals) ? parsed.goals.map(sanitizeGoal).filter(Boolean) : [];

    const stats = parsed.stats && typeof parsed.stats === "object" ? parsed.stats : {};
    state.stats.streakDays = Number.isFinite(stats.streakDays) ? Math.max(0, stats.streakDays) : 0;
    state.stats.lastCompletionDate =
      typeof stats.lastCompletionDate === "string" ? stats.lastCompletionDate : null;
  } catch (_error) {
    state.goals = [];
    state.stats = { streakDays: 0, lastCompletionDate: null };
  }
}

function saveState() {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      goals: state.goals,
      stats: state.stats,
    })
  );
}

function sanitizeGoal(rawGoal) {
  if (!rawGoal || typeof rawGoal !== "object") {
    return null;
  }

  const totalSteps = clamp(
    Number.isFinite(rawGoal.totalSteps) ? rawGoal.totalSteps : DEFAULT_STEPS,
    MIN_STEPS,
    MAX_STEPS
  );

  const providedSteps = Array.isArray(rawGoal.steps) ? rawGoal.steps : [];
  const steps = [];

  for (let stepNumber = 1; stepNumber <= totalSteps; stepNumber += 1) {
    const incoming = providedSteps[stepNumber - 1] || {};
    steps.push({
      stepNumber,
      title:
        typeof incoming.title === "string" && incoming.title.trim()
          ? incoming.title.trim()
          : getStepDefaultLabel(stepNumber, totalSteps),
      description:
        typeof incoming.description === "string" ? incoming.description.trim().slice(0, 240) : "",
      completed: Boolean(incoming.completed),
    });
  }

  const firstIncomplete = steps.find((step) => !step.completed);
  const currentStep = firstIncomplete ? firstIncomplete.stepNumber : totalSteps;

  return {
    id: typeof rawGoal.id === "string" && rawGoal.id ? rawGoal.id : makeId(),
    title:
      typeof rawGoal.title === "string" && rawGoal.title.trim()
        ? rawGoal.title.trim().slice(0, 60)
        : "Untitled Goal",
    totalSteps,
    currentStep,
    columnWidth: clamp(
      Number.isFinite(rawGoal.columnWidth) ? rawGoal.columnWidth : DEFAULT_COLUMN_WIDTH,
      MIN_COLUMN_WIDTH,
      MAX_COLUMN_WIDTH
    ),
    color: normalizeHexColor(rawGoal.color, DEFAULT_GOAL_COLOR),
    steps,
  };
}

function getStepDefaultLabel(stepNumber, totalSteps) {
  if (stepNumber === 1) {
    return "START";
  }
  if (stepNumber === totalSteps) {
    return "FINISH";
  }
  return `Step ${stepNumber}`;
}

function canUndoGoal(goal) {
  return goal.steps.some((step) => step.completed);
}

function showStepTooltip(stepElement, mouseEvent) {
  if (!elements.stepTooltip || !stepElement) {
    return;
  }

  const title = stepElement.getAttribute("data-step-title") || "Step";
  const description = stepElement.getAttribute("data-step-description") || "";
  const text = description ? `${title}\n${description}` : title;

  elements.stepTooltip.textContent = text;
  elements.stepTooltip.classList.remove("hidden");
  uiState.tooltipStepElement = stepElement;
  positionStepTooltip(mouseEvent.clientX, mouseEvent.clientY);
}

function positionStepTooltip(mouseX, mouseY) {
  if (!elements.stepTooltip || elements.stepTooltip.classList.contains("hidden")) {
    return;
  }

  const offset = 16;
  const maxX = window.innerWidth - elements.stepTooltip.offsetWidth - 8;
  const maxY = window.innerHeight - elements.stepTooltip.offsetHeight - 8;
  const nextLeft = Math.min(mouseX + offset, Math.max(8, maxX));
  const nextTop = Math.min(mouseY + offset, Math.max(8, maxY));

  elements.stepTooltip.style.left = `${nextLeft}px`;
  elements.stepTooltip.style.top = `${nextTop}px`;
}

function hideStepTooltip() {
  if (!elements.stepTooltip) {
    return;
  }

  elements.stepTooltip.classList.add("hidden");
  elements.stepTooltip.textContent = "";
  uiState.tooltipStepElement = null;
}

function normalizeHexColor(value, fallback = DEFAULT_GOAL_COLOR) {
  const source = typeof value === "string" ? value.trim() : "";
  if (!/^#[0-9a-fA-F]{6}$/.test(source)) {
    return fallback;
  }
  return `#${source.slice(1).toLowerCase()}`;
}

function hexToRgbTriplet(hex) {
  const normalized = normalizeHexColor(hex, DEFAULT_GOAL_COLOR);
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

function isGoalFinished(goal) {
  return goal.steps.every((step) => step.completed);
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `goal-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(value);
  }
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

init();
