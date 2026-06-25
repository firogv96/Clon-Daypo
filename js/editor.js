import { currentQuiz } from './state.js';
import { syncActiveCreatorQuestion } from './creator-sidebar.js';

function setDisplay(id, value) {
  const element = document.getElementById(id);
  if (element) element.style.display = value;
}

function createIcon(className, style = '') {
  const icon = document.createElement('i');
  icon.className = className;
  if (style) icon.setAttribute('style', style);
  return icon;
}

export function renderEditor() {
  const container = document.getElementById("questions-list");
  const sidebar = document.getElementById("creator-sidebar");
  const sidebarContainer = document.getElementById("creator-sidebar-container");
  const layout = document.getElementById("creator-layout");
  const quizTitle = document.getElementById("quiz-title");
  const countBadge = document.getElementById("q-count-badge");

  if (!container || !sidebar || !sidebarContainer || !layout || !quizTitle || !countBadge) return;

  quizTitle.value = currentQuiz.title;
  countBadge.textContent = currentQuiz.questions.length;

  container.replaceChildren();
  sidebar.replaceChildren();

  const creatorActions = document.getElementById("creator-actions");
  const cancelBtn = document.getElementById("btn-creator-cancel");

  if (currentQuiz.questions.length > 0) {
      sidebarContainer.style.display = 'flex';
      layout.classList.remove('no-sidebar');
      setDisplay("btn-add-manual", "none");

      if (creatorActions) creatorActions.style.display = 'flex';
      if (cancelBtn) cancelBtn.style.display = 'none';
  } else {
      sidebarContainer.style.display = 'none';
      layout.classList.add('no-sidebar');
      setDisplay("btn-add-manual", "flex");

      if (creatorActions) creatorActions.style.display = 'none';
      if (cancelBtn) cancelBtn.style.display = 'flex';
  }

  const dropZone = document.getElementById("drop-zone");
  const fileInfo = document.getElementById("file-info");
  const fileNameText = document.getElementById("file-name-text");
  const fileIcon = document.getElementById("file-icon");
  const aiToggleRow = document.getElementById("ai-toggle-row");

  if (currentQuiz.fileName) {
      if (dropZone) dropZone.style.display = "none";
      if (fileInfo) fileInfo.style.display = "flex";
      if (fileNameText) fileNameText.textContent = currentQuiz.fileName;

      const statusText = document.getElementById("file-status-text");
      if (currentQuiz.questions.length > 0) {
          if (statusText) statusText.textContent = "Archivo procesado - " + currentQuiz.questions.length + " preguntas";
          setDisplay("btn-process-file", "none");
          setDisplay("btn-extract-text", "none");
          setDisplay("btn-quick-process", "none");
          if (aiToggleRow) aiToggleRow.style.display = "none";
      } else {
          if (statusText) statusText.textContent = "Archivo seleccionado - Listo para procesar";
          const rawTextContainer = document.getElementById("raw-text-container");
          const isExtracted = rawTextContainer && rawTextContainer.style.display === "flex";

          setDisplay("btn-quick-process", isExtracted ? "none" : "flex");
          setDisplay("btn-extract-text", isExtracted ? "none" : "flex");
          setDisplay("btn-process-file", isExtracted ? "flex" : "none");
          if (aiToggleRow) aiToggleRow.style.display = "flex";
      }

      if (fileIcon) {
        if (currentQuiz.fileName.toLowerCase().endsWith(".pdf")) {
            fileIcon.className = "fa-solid fa-file-pdf";
        } else if (currentQuiz.fileName.toLowerCase().endsWith(".txt")) {
            fileIcon.className = "fa-solid fa-file-lines";
        } else {
            fileIcon.className = "fa-solid fa-file-word";
        }
      }
  } else {
      if (dropZone) dropZone.style.display = "block";
      if (fileInfo) fileInfo.style.display = "none";
      const rawTextContainer = document.getElementById("raw-text-container");
      if (rawTextContainer) rawTextContainer.style.display = "none";
      setDisplay("btn-extract-text", "flex");
      setDisplay("btn-process-file", "none");
      setDisplay("btn-quick-process", "flex");
      if (aiToggleRow) aiToggleRow.style.display = "flex";
  }

  currentQuiz.questions.forEach((q, qIdx) => {
    const navItem = document.createElement("div");
    navItem.className = "nav-item";
    navItem.id = `sidebar-q-${qIdx}`;
    navItem.appendChild(createIcon("fa-solid fa-file-lines", "opacity:0.5;"));

    const indexSpan = document.createElement("span");
    indexSpan.style.opacity = "0.5";
    indexSpan.textContent = `${qIdx + 1}.`;
    navItem.appendChild(indexSpan);

    const textSpan = document.createElement("span");
    textSpan.textContent = q.text || "Pregunta vacia";
    navItem.appendChild(textSpan);

    navItem.onclick = () =>
      document
        .getElementById(`q-edit-${qIdx}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    sidebar.appendChild(navItem);

    const qDiv = document.createElement("div");
    qDiv.className = "question-editor";
    qDiv.id = `q-edit-${qIdx}`;

    const header = document.createElement("div");
    header.className = "question-editor-header";
    header.style.marginBottom = "1.5rem";

    const label = document.createElement("label");
    label.setAttribute("style", "margin:0; font-weight:700; color:var(--text); font-size: 1.1rem;");
    label.textContent = `Pregunta ${qIdx + 1}`;

    const deleteButton = document.createElement("button");
    deleteButton.className = "btn btn-outline";
    deleteButton.setAttribute("style", "color: var(--error); border-color: rgba(239, 68, 68, 0.2); padding: 0.5rem;");
    deleteButton.title = "Eliminar pregunta";
    deleteButton.onclick = () => removeQuestion(qIdx);
    deleteButton.appendChild(createIcon("fa-solid fa-trash-can"));

    header.append(label, deleteButton);

    const inputGroup = document.createElement("div");
    inputGroup.className = "input-group";
    const textarea = document.createElement("textarea");
    textarea.setAttribute("style", "min-height: 100px; font-size: 1rem;");
    textarea.value = q.text || "";
    textarea.onchange = (event) => updateQuestion(qIdx, 'text', event.target.value);
    inputGroup.appendChild(textarea);

    const optionsContainer = document.createElement("div");
    optionsContainer.id = `options-${qIdx}`;

    q.options.forEach((opt, oIdx) => {
      const optionItem = document.createElement("div");
      optionItem.className = "option-item";

      const radio = document.createElement("div");
      radio.className = `radio-custom ${currentQuiz.questions[qIdx].correct === oIdx ? "selected" : ""}`.trim();
      radio.onclick = () => setCorrect(qIdx, oIdx);

      const optionInput = document.createElement("input");
      optionInput.type = "text";
      optionInput.value = opt || "";
      optionInput.placeholder = `Opcion ${oIdx + 1}`;
      optionInput.onchange = (event) => updateOption(qIdx, oIdx, event.target.value);

      const removeButton = document.createElement("button");
      removeButton.className = "btn btn-outline";
      removeButton.style.padding = "0.25rem 0.5rem";
      removeButton.onclick = () => removeOption(qIdx, oIdx);
      removeButton.appendChild(createIcon("fa-solid fa-xmark"));

      optionItem.append(radio, optionInput, removeButton);
      optionsContainer.appendChild(optionItem);
    });

    const footer = document.createElement("div");
    footer.setAttribute("style", "display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; gap: 0.5rem;");

    const addOptionButton = document.createElement("button");
    addOptionButton.className = "btn btn-outline";
    addOptionButton.style.fontSize = "0.8rem";
    addOptionButton.onclick = () => addOption(qIdx);
    addOptionButton.append(createIcon("fa-solid fa-plus"), document.createTextNode(" Anadir opcion"));

    const addQuestionButton = document.createElement("button");
    addQuestionButton.className = "btn btn-outline";
    addQuestionButton.setAttribute("style", "font-size: 0.8rem; color: var(--primary); border-color: rgba(99, 102, 241, 0.2);");
    addQuestionButton.onclick = () => addQuestionAt(qIdx + 1);
    addQuestionButton.append(createIcon("fa-solid fa-plus"), document.createTextNode(" Anadir pregunta a continuacion"));

    footer.append(addOptionButton, addQuestionButton);
    qDiv.append(header, inputGroup, optionsContainer, footer);
    container.appendChild(qDiv);
  });

  quizTitle.onchange = (e) => {
    currentQuiz.title = e.target.value;
    document.getElementById("current-quiz-name").textContent = e.target.value;
  };

  syncActiveCreatorQuestion(false);
}

export function updateQuestion(idx, field, val) {
  currentQuiz.questions[idx][field] = val;
}
export function updateOption(qIdx, oIdx, val) {
  currentQuiz.questions[qIdx].options[oIdx] = val;
}
export function removeQuestion(idx) {
  currentQuiz.questions.splice(idx, 1);
  renderEditor();
}

export function clearImportedFile() {
  currentQuiz.fileName = null;
  currentQuiz.selectedFile = null;
  currentQuiz.questions = [];
  currentQuiz.extractedText = "";

  const fileInput = document.getElementById("file-input");
  if (fileInput) fileInput.value = "";

  renderEditor();
}
export function addOption(qIdx) {
  currentQuiz.questions[qIdx].options.push("");
  renderEditor();
}
export function removeOption(qIdx, oIdx) {
  currentQuiz.questions[qIdx].options.splice(oIdx, 1);
  if (currentQuiz.questions[qIdx].correct >= currentQuiz.questions[qIdx].options.length) {
    currentQuiz.questions[qIdx].correct = Math.max(0, currentQuiz.questions[qIdx].options.length - 1);
  }
  renderEditor();
}
export function setCorrect(qIdx, oIdx) {
  currentQuiz.questions[qIdx].correct = oIdx;
  renderEditor();
}
export function addNewQuestion() {
  addQuestionAt(currentQuiz.questions.length);
}

export function addQuestionAt(idx) {
  currentQuiz.questions.splice(idx, 0, {
    text: "",
    options: ["Opcion A", "Opcion B"],
    correct: 0,
  });
  renderEditor();
  setTimeout(() => {
    const el = document.getElementById(`q-edit-${idx}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 50);
}
