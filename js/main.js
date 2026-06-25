import { showView, trackActiveCreatorQuestion } from './navigation.js';
import { handleFile, exportToMarkdown, parseMarkdown, processSelectedFile, extractAndReviewText, cancelProcessing } from './importer.js';
import { renderEditor, updateQuestion, updateOption, removeQuestion, addOption, removeOption, setCorrect, addNewQuestion, addQuestionAt, clearImportedFile } from './editor.js';
import { startQuiz, checkAnswer, revealCurrent, revealAll, nextQuestion, prevQuestion, restartQuiz, reviewQuiz, isPlayableQuiz } from './reader.js';
import { currentQuiz, comingFromCreator } from './state.js';
import { initTheme } from './theme.js';

const READER_HISTORY_KEY = 'readerHistory';
const MAX_READER_HISTORY = 5;

function parseVersionConfig(text) {
    const match = text.match(/^\s*version\s*=\s*(.+?)\s*$/m);
    return match ? match[1] : '';
}

async function loadAppVersion() {
    try {
        const response = await fetch('version.conf', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return parseVersionConfig(await response.text());
    } catch (error) {
        console.warn('No se pudo cargar version.conf.', error);
        return '';
    }
}

function renderAppVersion(version) {
    const headerVersion = document.getElementById("header-version");
    const aboutVersion = document.getElementById("about-version");
    if (headerVersion) headerVersion.textContent = version;
    if (aboutVersion) aboutVersion.textContent = version || 'No disponible';
}
function createIcon(className, style = '') {
    const icon = document.createElement('i');
    icon.className = className;
    if (style) icon.setAttribute('style', style);
    return icon;
}

function getReaderHistory() {
    try {
        const parsed = JSON.parse(localStorage.getItem(READER_HISTORY_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('Historial de lector corrupto, se reinicia.', error);
        localStorage.removeItem(READER_HISTORY_KEY);
        return [];
    }
}

function saveReaderHistory(history) {
    try {
        localStorage.setItem(READER_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_READER_HISTORY)));
        return true;
    } catch (error) {
        console.warn('No se pudo guardar el historial del lector.', error);
        alert('El navegador no pudo guardar este archivo en recientes. Puedes seguir usando el test.');
        return false;
    }
}

function loadQuizText(text, sourceName, shouldSaveRecent) {
    const quiz = parseMarkdown(text);
    if (!isPlayableQuiz(quiz)) {
        alert('El archivo no contiene un cuestionario valido. Revisa que tenga titulo, preguntas y al menos dos opciones por pregunta.');
        return false;
    }

    if (shouldSaveRecent) {
        let history = getReaderHistory();
        history = history.filter(item => item.name !== sourceName);
        history.unshift({ name: sourceName, content: text, date: new Date().toISOString() });
        saveReaderHistory(history);
        if (window.renderRecentFiles) window.renderRecentFiles();
    }

    currentQuiz.title = quiz.title;
    currentQuiz.questions = quiz.questions;
    comingFromCreator.value = false;
    startQuiz();
    return true;
}

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
    comingFromCreator.value = true;
    if (!startQuiz()) comingFromCreator.value = false;
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

    event.target.value = "";

    const reader = new FileReader();
    reader.onload = (e) => {
        loadQuizText(e.target.result || '', file.name, true);
    };
    reader.onerror = () => alert('No se pudo leer el archivo seleccionado.');
    reader.readAsText(file);
};

window.renderRecentFiles = () => {
    const container = document.getElementById('recent-files-list');
    if (!container) return;
    const history = getReaderHistory();

    container.replaceChildren();

    if (history.length === 0) {
        const empty = document.createElement('p');
        empty.setAttribute('style', 'color: var(--text-dim); text-align: center; font-size: 0.9rem; margin: 1rem 0;');
        empty.textContent = 'No hay archivos recientes';
        container.appendChild(empty);
        return;
    }

    history.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'recent-file-item';
        row.onclick = () => window.loadFromHistory(index);

        row.appendChild(createIcon('fa-solid fa-file-lines', 'color: var(--primary); font-size: 1.2rem;'));

        const info = document.createElement('div');
        info.setAttribute('style', 'flex: 1; margin-left: 0.75rem; overflow: hidden;');

        const name = document.createElement('div');
        name.setAttribute('style', 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;');
        name.textContent = item.name || 'Archivo sin nombre';

        const date = document.createElement('div');
        date.setAttribute('style', 'font-size: 0.75rem; color: var(--text-dim);');
        const parsedDate = new Date(item.date);
        date.textContent = Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toLocaleDateString();

        info.append(name, date);
        row.append(info, createIcon('fa-solid fa-chevron-right', 'font-size: 0.8rem; color: var(--text-dim);'));
        container.appendChild(row);
    });
};

window.loadFromHistory = (index) => {
    const history = getReaderHistory();
    const item = history[index];
    if (!item) return;

    const clickedItem = history.splice(index, 1)[0];
    clickedItem.date = new Date().toISOString();
    history.unshift(clickedItem);
    saveReaderHistory(history);
    window.renderRecentFiles();

    if (!loadQuizText(item.content || '', item.name || 'Archivo reciente', false)) {
        const cleaned = getReaderHistory().filter((_, historyIndex) => historyIndex !== 0);
        saveReaderHistory(cleaned);
        window.renderRecentFiles();
    }
};

window.checkAnswer = checkAnswer;
window.revealCurrent = revealCurrent;
window.revealAll = revealAll;
window.nextQuestion = nextQuestion;
window.prevQuestion = prevQuestion;
window.restartQuiz = restartQuiz;
window.reviewQuiz = reviewQuiz;

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
let creatorScrollFrame = null;
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
  if (creatorView && creatorView.classList.contains('active') && creatorScrollFrame === null) {
      creatorScrollFrame = requestAnimationFrame(() => {
          creatorScrollFrame = null;
          trackActiveCreatorQuestion();
      });
  }
};

// Importer logic (DOM)
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
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

    if (window.innerWidth < 768) {
        const warningModal = document.getElementById('mobile-warning-overlay');
        if (warningModal) warningModal.classList.add('active');
    }

    loadAppVersion().then(renderAppVersion);

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
