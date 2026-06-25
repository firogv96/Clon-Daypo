import { currentQuiz, readerState, resetReaderState } from './state.js';
import { showView } from './navigation.js';

function createIcon(className, style = '') {
  const icon = document.createElement('i');
  icon.className = className;
  if (style) icon.setAttribute('style', style);
  return icon;
}

function setButtonContent(button, iconClass, text, iconAfter = false) {
  button.replaceChildren();
  const icon = createIcon(iconClass);
  if (iconAfter) {
    button.append(document.createTextNode(text + ' '), icon);
  } else {
    button.append(icon, document.createTextNode(' ' + text));
  }
}

export function isPlayableQuiz(quiz) {
  return !!quiz &&
    Array.isArray(quiz.questions) &&
    quiz.questions.length > 0 &&
    quiz.questions.every((q) =>
      q &&
      typeof q.text === 'string' &&
      q.text.trim().length > 0 &&
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      q.options.every((opt) => typeof opt === 'string' && opt.trim().length > 0) &&
      Number.isInteger(q.correct) &&
      q.correct >= 0 &&
      q.correct < q.options.length
    );
}

export function startQuiz(quiz) {
  if (quiz) {
      currentQuiz.title = quiz.title || "Cuestionario Importado";
      currentQuiz.questions = quiz.questions || [];
  }

  if (!isPlayableQuiz(currentQuiz)) {
    alert("El cuestionario no tiene preguntas validas para iniciar el modo lector.");
    return false;
  }

  resetReaderState(currentQuiz.questions.length);
  showView("reader");
  return true;
}

export function renderQuestion() {
  const q = currentQuiz.questions[readerState.currentIndex];
  const container = document.getElementById("question-container");
  const sidebar = document.getElementById("reader-sidebar");

  if (!container || !sidebar) return;

  if (!q) {
    container.replaceChildren();
    sidebar.replaceChildren();
    updateReaderStats();
    return;
  }

  updateReaderStats();

  sidebar.replaceChildren();
  let activeItem = null;
  currentQuiz.questions.forEach((_, idx) => {
    const item = document.createElement("div");
    item.className = "nav-item";
    if (readerState.currentIndex === idx) {
        item.classList.add("active");
        activeItem = item;
    }
    if (readerState.results[idx] === true) item.classList.add("correct");
    if (readerState.results[idx] === false) item.classList.add("wrong");

    item.appendChild(createIcon("fa-solid fa-circle-question", "opacity:0.5;"));

    const indexSpan = document.createElement("span");
    indexSpan.style.opacity = "0.5";
    indexSpan.textContent = `${idx + 1}.`;
    item.appendChild(indexSpan);

    item.appendChild(document.createTextNode(`Pregunta ${idx + 1}`));

    const status = document.createElement("div");
    status.style.marginLeft = "auto";
    status.style.display = "flex";
    status.style.gap = "0.5rem";
    if (readerState.revealed[idx]) status.appendChild(createIcon("fa-solid fa-eye", "opacity:0.5; font-size:12px;"));
    if (readerState.results[idx] === true) status.appendChild(createIcon("fa-solid fa-check", "font-size:12px;"));
    if (readerState.results[idx] === false) status.appendChild(createIcon("fa-solid fa-circle-exclamation", "font-size:12px;"));
    item.appendChild(status);

    item.onclick = () => goToQuestion(idx);
    sidebar.appendChild(item);
  });

  if (activeItem) {
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  const revealAllBtn = document.getElementById("reveal-all-btn");
  const revealBtnText = document.getElementById("reveal-all-text");
  const revealIcon = document.getElementById("reveal-all-icon");
  if (revealAllBtn) {
    const allRevealed = readerState.revealed.length > 0 && readerState.revealed.every((val) => val === true);
    if (revealBtnText) revealBtnText.textContent = allRevealed ? "Ocultar Todos" : "Revelar Todos";
    if (revealIcon) revealIcon.className = allRevealed ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
    revealAllBtn.classList.toggle("active", allRevealed);
  }

  const revealCurrentBtn = document.getElementById("reveal-current-btn");
  if (revealCurrentBtn) {
    const isRevealed = readerState.revealed[readerState.currentIndex];
    setButtonContent(revealCurrentBtn, isRevealed ? "fa-solid fa-eye-slash" : "fa-solid fa-eye", isRevealed ? "Ocultar Respuesta" : "Revelar Respuesta");
    revealCurrentBtn.classList.toggle("active", !!isRevealed);
  }

  const prevBtn = document.getElementById("prev-btn");
  if (prevBtn) prevBtn.disabled = readerState.currentIndex === 0;

  const isEnd = readerState.currentIndex === currentQuiz.questions.length - 1;
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) {
    if (isEnd) {
        setButtonContent(nextBtn, "fa-solid fa-award", "Ver Resultados", true);
        nextBtn.onclick = showResults;
        nextBtn.disabled = false;
    } else {
        setButtonContent(nextBtn, "fa-solid fa-chevron-right", "Siguiente", true);
        nextBtn.onclick = nextQuestion;
        nextBtn.disabled = false;
    }
  }

  const questionCard = document.createElement("div");
  questionCard.className = "question-card";
  questionCard.setAttribute("style", "border:none; background:transparent; padding:0.5rem 0;");

  const title = document.createElement("h2");
  title.setAttribute("style", "margin-bottom: 1.25rem; font-size: 1.5rem; line-height:1.4;");
  title.textContent = q.text;

  const optionsList = document.createElement("div");
  optionsList.id = "options-list";

  q.options.forEach((opt, idx) => {
    const isAnswered = readerState.results[readerState.currentIndex] !== null;
    const isRevealed = readerState.revealed[readerState.currentIndex];
    const isCorrectOpt = idx === q.correct && (isAnswered || isRevealed);
    const isSelectedWrong = idx === readerState.userAnswers[readerState.currentIndex] && idx !== q.correct && isAnswered;

    const optionButton = document.createElement("button");
    optionButton.className = `option-btn ${isCorrectOpt ? "correct" : ""} ${isSelectedWrong ? "wrong" : ""}`.trim();
    optionButton.disabled = isAnswered;
    optionButton.onclick = () => checkAnswer(idx);

    const radio = document.createElement("span");
    radio.className = `radio-custom ${readerState.userAnswers[readerState.currentIndex] === idx ? "selected" : ""}`.trim();

    optionButton.append(radio, document.createTextNode(opt));
    optionsList.appendChild(optionButton);
  });

  questionCard.append(title, optionsList);
  container.replaceChildren(questionCard);
}

export function updateReaderStats() {
  const answered = readerState.results.filter((r) => r !== null).length;
  const total = currentQuiz.questions.length;
  const correct = readerState.results.filter((r) => r === true).length;
  const wrong = readerState.results.filter((r) => r === false).length;

  const completed = document.getElementById("stat-completed");
  const pending = document.getElementById("stat-pending");
  const correctEl = document.getElementById("stat-correct");
  const wrongEl = document.getElementById("stat-wrong");
  const progressFill = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");

  if (completed) completed.textContent = `${answered} / ${total}`;
  if (pending) pending.textContent = total - answered;
  if (correctEl) correctEl.textContent = correct;
  if (wrongEl) wrongEl.textContent = wrong;

  const progress = total > 0 ? (answered / total) * 100 : 0;
  if (progressFill) progressFill.style.width = `${progress}%`;
  if (progressText) progressText.textContent = `${answered} / ${total}`;
}

export function checkAnswer(selectedIdx) {
  if (readerState.results[readerState.currentIndex] !== null) return;

  const q = currentQuiz.questions[readerState.currentIndex];
  if (!q || selectedIdx < 0 || selectedIdx >= q.options.length) return;

  const isCorrect = selectedIdx === q.correct;

  readerState.results[readerState.currentIndex] = isCorrect;
  readerState.userAnswers[readerState.currentIndex] = selectedIdx;

  if (isCorrect) readerState.score++;

  renderQuestion();
}

export function revealCurrent() {
  if (!currentQuiz.questions[readerState.currentIndex]) return;
  readerState.revealed[readerState.currentIndex] = !readerState.revealed[readerState.currentIndex];
  renderQuestion();
}

export function revealAll() {
  if (!currentQuiz.questions.length) return;
  const allCurrentRevealed = readerState.revealed.every((val) => val === true);
  readerState.revealed = readerState.revealed.map(() => !allCurrentRevealed);
  renderQuestion();
}

export function goToQuestion(idx) {
  if (idx < 0 || idx >= currentQuiz.questions.length) return;
  readerState.currentIndex = idx;
  renderQuestion();
}

export function nextQuestion() {
  if (readerState.currentIndex < currentQuiz.questions.length - 1) {
    readerState.currentIndex++;
    renderQuestion();
  }
}

export function prevQuestion() {
  if (readerState.currentIndex > 0) {
    readerState.currentIndex--;
    renderQuestion();
  }
}

export function showResults() {
  showView("results");
  const total = currentQuiz.questions.length;
  const correct = readerState.results.filter(r => r === true).length;
  const wrong = readerState.results.filter(r => r === false).length;
  const skipped = readerState.results.filter(r => r === null).length;

  const perc = total > 0 ? Math.round((correct / total) * 100) : 0;
  const wrongPerc = total > 0 ? Math.round((wrong / total) * 100) : 0;

  document.getElementById("res-score").textContent = `${perc}%`;
  document.getElementById("res-wrong-perc").textContent = `${wrongPerc}%`;
  document.getElementById("res-correct").textContent = correct;
  document.getElementById("res-wrong").textContent = wrong;
  document.getElementById("res-skipped").textContent = skipped;
  document.getElementById("res-total").textContent = total;

  const icon = document.querySelector("#result-icon-container i");
  if (perc >= 70) {
    document.getElementById("result-title").textContent = "Excelente Trabajo";
    icon.className = "fa-solid fa-face-grin-stars";
    icon.style.color = "var(--success)";
  } else if (perc >= 40) {
    document.getElementById("result-title").textContent = "Buen Intento";
    icon.className = "fa-solid fa-award";
    icon.style.color = "var(--primary)";
  } else {
    document.getElementById("result-title").textContent = "Sigue Practicando";
    icon.className = "fa-solid fa-face-frown";
    icon.style.color = "var(--error)";
  }
}

export function restartQuiz() {
  startQuiz();
}

export function reviewQuiz() {
  if (!currentQuiz.questions.length) return;
  readerState.currentIndex = 0;
  showView("reader");
}
