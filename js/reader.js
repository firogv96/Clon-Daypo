import { currentQuiz, readerState, resetReaderState } from './state.js';
import { showView } from './navigation.js';

export function startQuiz(quiz) {
  // Logic to handle both passing a quiz or using the current one
  if (quiz) {
      // currentQuiz is already exported and mutable from other modules
  }
  resetReaderState(currentQuiz.questions.length);
  showView("reader");
}

export function renderQuestion() {
  const q = currentQuiz.questions[readerState.currentIndex];
  const container = document.getElementById("question-container");
  const sidebar = document.getElementById("reader-sidebar");

  updateReaderStats();

  // Render Sidebar Index
  sidebar.innerHTML = "";
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

    item.innerHTML = `
          <i class="fa-solid fa-circle-question" style="opacity:0.5;"></i>
          <span style="opacity:0.5">${idx + 1}.</span> 
          Pregunta ${idx + 1}
          <div style="margin-left:auto; display:flex; gap:0.5rem;">
            ${readerState.revealed[idx] ? '<i class="fa-solid fa-eye" style="opacity:0.5; font-size:12px;"></i>' : ""}
            ${readerState.results[idx] === true ? '<i class="fa-solid fa-check" style="font-size:12px;"></i>' : ""}
            ${readerState.results[idx] === false ? '<i class="fa-solid fa-circle-exclamation" style="font-size:12px;"></i>' : ""}
          </div>
      `;
    item.onclick = () => goToQuestion(idx);
    sidebar.appendChild(item);
  });

  if (activeItem) {
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Update Reveal All Button
  const revealAllBtn = document.getElementById("reveal-all-btn");
  const revealBtnText = document.getElementById("reveal-all-text");
  const revealIcon = document.getElementById("reveal-all-icon");
  if (revealAllBtn) {
    const allRevealed = readerState.revealed.every((val) => val === true);
    revealBtnText.textContent = allRevealed ? "Ocultar Todos" : "Revelar Todos";
    if (revealIcon) {
      revealIcon.className = allRevealed ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
    }
    // Visual toggle state
    if (allRevealed) {
      revealAllBtn.classList.add("active");
    } else {
      revealAllBtn.classList.remove("active");
    }
  }

  // Update Reveal Current Button
  const revealCurrentBtn = document.getElementById("reveal-current-btn");
  if (revealCurrentBtn) {
    const isRevealed = readerState.revealed[readerState.currentIndex];
    revealCurrentBtn.innerHTML = isRevealed 
      ? '<i class="fa-solid fa-eye-slash"></i> Ocultar Respuesta' 
      : '<i class="fa-solid fa-eye"></i> Revelar Respuesta';
    
    if (isRevealed) {
      revealCurrentBtn.classList.add("active");
    } else {
      revealCurrentBtn.classList.remove("active");
    }
  }

  // Reader Buttons
  document.getElementById("prev-btn").disabled = readerState.currentIndex === 0;
  const isEnd = readerState.currentIndex === currentQuiz.questions.length - 1;
  const nextBtn = document.getElementById("next-btn");
  
  if (isEnd) {
      nextBtn.innerHTML = 'Ver Resultados <i class="fa-solid fa-award"></i>';
      nextBtn.onclick = showResults;
      nextBtn.disabled = false;
  } else {
      nextBtn.innerHTML = 'Siguiente <i class="fa-solid fa-chevron-right"></i>';
      nextBtn.onclick = nextQuestion;
      nextBtn.disabled = false;
  }

  container.innerHTML = `
          <div class="question-card" style="border:none; background:transparent; padding:0.5rem 0;">
              <h2 style="margin-bottom: 1.25rem; font-size: 1.5rem; line-height:1.4;">${q.text}</h2>
              <div id="options-list">
                  ${q.options
                    .map((opt, idx) => {
                      const isAnswered = readerState.results[readerState.currentIndex] !== null;
                      const isRevealed = readerState.revealed[readerState.currentIndex];
                      const isCorrectOpt = idx === q.correct && (isAnswered || isRevealed);
                      const isSelectedWrong = idx === readerState.userAnswers[readerState.currentIndex] && idx !== q.correct && isAnswered;

                      return `
                          <button class="option-btn ${isCorrectOpt ? "correct" : ""} ${isSelectedWrong ? "wrong" : ""}" 
                              onclick="checkAnswer(${idx})" ${isAnswered ? "disabled" : ""}>
                              <span class="radio-custom ${readerState.userAnswers[readerState.currentIndex] === idx ? "selected" : ""}"></span>
                              ${opt}
                          </button>
                      `;
                    })
                    .join("")}
              </div>
          </div>
      `;

}

export function updateReaderStats() {
  if (!currentQuiz.questions.length) return;
  const answered = readerState.results.filter((r) => r !== null).length;
  const total = currentQuiz.questions.length;
  const correct = readerState.results.filter((r) => r === true).length;
  const wrong = readerState.results.filter((r) => r === false).length;

  document.getElementById("stat-completed").textContent = `${answered} / ${total}`;
  document.getElementById("stat-pending").textContent = total - answered;
  document.getElementById("stat-correct").textContent = correct;
  document.getElementById("stat-wrong").textContent = wrong;

  const progress = (answered / total) * 100;
  document.getElementById("progress-fill").style.width = `${progress}%`;
  document.getElementById("progress-text").textContent = `${answered} / ${total}`;
}

export function checkAnswer(selectedIdx) {
  if (readerState.results[readerState.currentIndex] !== null) return;

  const q = currentQuiz.questions[readerState.currentIndex];
  const isCorrect = selectedIdx === q.correct;

  readerState.results[readerState.currentIndex] = isCorrect;
  readerState.userAnswers[readerState.currentIndex] = selectedIdx;

  if (isCorrect) readerState.score++;

  renderQuestion();
}

export function revealCurrent() {
  readerState.revealed[readerState.currentIndex] = !readerState.revealed[readerState.currentIndex];
  renderQuestion();
}

export function revealAll() {
  const allCurrentRevealed = readerState.revealed.every((val) => val === true);
  readerState.revealed = readerState.revealed.map(() => !allCurrentRevealed);
  renderQuestion();
}

export function goToQuestion(idx) {
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
    document.getElementById("result-title").textContent =
      "¡Excelente Trabajo!";
    icon.className = "fa-solid fa-face-grin-stars";
    icon.style.color = "var(--success)";
  } else if (perc >= 40) {
    document.getElementById("result-title").textContent = "Buen Intento";
    icon.className = "fa-solid fa-award";
    icon.style.color = "var(--primary)";
  } else {
    document.getElementById("result-title").textContent =
      "Sigue Practicando";
    icon.className = "fa-solid fa-face-frown";
    icon.style.color = "var(--error)";
  }
}

export function restartQuiz() {
  startQuiz();
}

export function reviewQuiz() {
  readerState.currentIndex = 0;
  showView("reader");
}
