import { showView, trackActiveCreatorQuestion } from './navigation.js';
import { handleFile, exportToMarkdown, parseMarkdown, processSelectedFile, extractAndReviewText, cancelProcessing } from './importer.js';
import { renderEditor, updateQuestion, updateOption, removeQuestion, addOption, removeOption, setCorrect, addNewQuestion, addQuestionAt, clearImportedFile } from './editor.js';
import { startQuiz, checkAnswer, revealCurrent, revealAll, nextQuestion, prevQuestion, restartQuiz } from './reader.js';
import { currentQuiz, comingFromCreator, APP_VERSION } from './state.js';

// Setup PDF worker
if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
}

// Expose functions to window for HTML access
window.showView = showView;
window.handleFile = handleFile;
window.exportToMarkdown = exportToMarkdown;
window.updateQuestion = updateQuestion;
window.updateOption = updateOption;
window.removeQuestion = removeQuestion;
window.addOption = addOption;
window.removeOption = removeOption;
window.setCorrect = setCorrect;
window.addNewQuestion = addNewQuestion;
window.addQuestionAt = addQuestionAt;
window.clearImportedFile = clearImportedFile;
window.processSelectedFile = processSelectedFile;
window.extractAndReviewText = extractAndReviewText;
window.cancelProcessing = cancelProcessing;
window.startQuizFromCreator = () => {
    if (currentQuiz.questions.length === 0) return alert("Añade algunas preguntas primero.");
    comingFromCreator.value = true;
    startQuiz();
};
window.triggerReaderImport = () => document.getElementById("reader-file-input").click();
window.handleReaderLoad = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".txt")) {
        alert("Formato no soportado. El modo lectura solo acepta archivos .txt");
        event.target.value = "";
        return;
    }

    // Clear input value so same file can be selected again
    event.target.value = "";

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        
        // Guardar en el historial
        let history = JSON.parse(localStorage.getItem('readerHistory') || '[]');
        history = history.filter(item => item.name !== file.name);
        history.unshift({ name: file.name, content: text, date: new Date().toISOString() });
        if (history.length > 5) history = history.slice(0, 5);
        localStorage.setItem('readerHistory', JSON.stringify(history));
        if (window.renderRecentFiles) window.renderRecentFiles();

        const quiz = parseMarkdown(text);
        currentQuiz.title = quiz.title;
        currentQuiz.questions = quiz.questions;
        comingFromCreator.value = false;
        startQuiz();
    };
    reader.readAsText(file);
};

window.renderRecentFiles = () => {
    const container = document.getElementById('recent-files-list');
    if (!container) return;
    const history = JSON.parse(localStorage.getItem('readerHistory') || '[]');
    
    if (history.length === 0) {
        container.innerHTML = '<p style="color: var(--text-dim); text-align: center; font-size: 0.9rem; margin: 1rem 0;">No hay archivos recientes</p>';
        return;
    }
    
    container.innerHTML = history.map((item, index) => `
        <div class="recent-file-item" onclick="loadFromHistory(${index})">
            <i class="fa-solid fa-file-lines" style="color: var(--primary); font-size: 1.2rem;"></i>
            <div style="flex: 1; margin-left: 0.75rem; overflow: hidden;">
                <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;">${item.name}</div>
                <div style="font-size: 0.75rem; color: var(--text-dim);">${new Date(item.date).toLocaleDateString()}</div>
            </div>
            <i class="fa-solid fa-chevron-right" style="font-size: 0.8rem; color: var(--text-dim);"></i>
        </div>
    `).join('');
};

window.loadFromHistory = (index) => {
    const history = JSON.parse(localStorage.getItem('readerHistory') || '[]');
    const item = history[index];
    if (item) {
        // Mover arriba
        const clickedItem = history.splice(index, 1)[0];
        clickedItem.date = new Date().toISOString();
        history.unshift(clickedItem);
        localStorage.setItem('readerHistory', JSON.stringify(history));
        window.renderRecentFiles();

        const quiz = parseMarkdown(item.content);
        currentQuiz.title = quiz.title;
        currentQuiz.questions = quiz.questions;
        comingFromCreator.value = false;
        startQuiz();
    }
};

window.checkAnswer = checkAnswer;
window.revealCurrent = revealCurrent;
window.revealAll = revealAll;
window.nextQuestion = nextQuestion;
window.prevQuestion = prevQuestion;
window.restartQuiz = restartQuiz;

window.showAboutModal = () => {
    document.getElementById("modal-about").classList.add("active");
};
window.closeAboutModal = () => {
    document.getElementById("modal-about").classList.remove("active");
};
window.dismissMobileWarning = () => {
    const overlay = document.getElementById('mobile-warning-overlay');
    if (overlay) overlay.classList.remove('active');
};

// Scroll event
window.onscroll = function() {
  const btn = document.getElementById('scroll-top');
  if (btn) {
      if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
          btn.style.display = 'flex';
      } else {
          btn.style.display = 'none';
      }
  }
  
  const creatorView = document.getElementById('view-creator');
  if (creatorView && creatorView.classList.contains('active')) {
      trackActiveCreatorQuestion();
  }
};

// Importer logic (DOM)
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("file-input");
    if (dropZone && fileInput) {
        dropZone.onclick = () => fileInput.click();
        fileInput.onchange = (e) => handleFile(e.target.files[0]);
        dropZone.ondragover = (e) => {
          e.preventDefault();
          dropZone.classList.add("dragover");
        };
        dropZone.ondragleave = () => dropZone.classList.remove("dragover");
        dropZone.ondrop = (e) => {
          e.preventDefault();
          dropZone.classList.remove("dragover");
          handleFile(e.dataTransfer.files[0]);
        };
    }
    
    // Mobile warning check
    if (window.innerWidth < 768) {
        const warningModal = document.getElementById('mobile-warning-overlay');
        if (warningModal) warningModal.classList.add('active');
    }

    // Initialize version
    const headerVersion = document.getElementById("header-version");
    const aboutVersion = document.getElementById("about-version");
    if (headerVersion) headerVersion.textContent = APP_VERSION;
    if (aboutVersion) aboutVersion.textContent = APP_VERSION;

    // Close modals on click outside
    const modalAbout = document.getElementById("modal-about");
    const modalProgress = document.getElementById("modal-progress");
    
    if (modalAbout) {
        modalAbout.onclick = (e) => {
            if (e.target === modalAbout) closeAboutModal();
        };
    }
    
    if (modalProgress) {
        modalProgress.onclick = (e) => {
            if (e.target === modalProgress) cancelProcessing();
        };
    }
    
    if (window.renderRecentFiles) {
        window.renderRecentFiles();
    }
});
