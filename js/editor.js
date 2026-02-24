import { currentQuiz } from './state.js';

export function renderEditor() {
  const container = document.getElementById("questions-list");
  const sidebar = document.getElementById("creator-sidebar");
  const sidebarContainer = document.getElementById("creator-sidebar-container");
  const layout = document.getElementById("creator-layout");
  
  document.getElementById("quiz-title").value = currentQuiz.title;
  document.getElementById("q-count-badge").textContent =
    currentQuiz.questions.length;

  container.innerHTML = "";
  sidebar.innerHTML = "";
  
  const creatorActions = document.getElementById("creator-actions");
  const cancelBtn = document.getElementById("btn-creator-cancel");

  if (currentQuiz.questions.length > 0) {
      sidebarContainer.style.display = 'flex';
      layout.classList.remove('no-sidebar');
      document.getElementById("btn-add-manual").style.display = 'none'; // Hide big button if editing
      
      if (creatorActions) creatorActions.style.display = 'flex';
      if (cancelBtn) cancelBtn.style.display = 'none';
  } else {
      sidebarContainer.style.display = 'none';
      layout.classList.add('no-sidebar');
      document.getElementById("btn-add-manual").style.display = 'flex';

      if (creatorActions) creatorActions.style.display = 'none';
      if (cancelBtn) cancelBtn.style.display = 'flex';
  }

  // Handle Import Area
  const dropZone = document.getElementById("drop-zone");
  const fileInfo = document.getElementById("file-info");
  const fileNameText = document.getElementById("file-name-text");
  const fileIcon = document.getElementById("file-icon");

  if (currentQuiz.fileName) {
      dropZone.style.display = "none";
      fileInfo.style.display = "flex";
      fileNameText.textContent = currentQuiz.fileName;
      
      const statusText = document.getElementById("file-status-text");
      if (currentQuiz.questions.length > 0) {
          statusText.textContent = "Archivo procesado - " + currentQuiz.questions.length + " preguntas";
          if (document.getElementById("btn-process-file")) document.getElementById("btn-process-file").style.display = "none";
          if (document.getElementById("btn-extract-text")) document.getElementById("btn-extract-text").style.display = "none";
          if (document.getElementById("btn-quick-process")) document.getElementById("btn-quick-process").style.display = "none";
          const aiToggle = document.querySelector(".switch")?.parentElement;
          if (aiToggle) aiToggle.style.display = "none";
      } else {
          statusText.textContent = "Archivo seleccionado - Listo para procesar";
          // If text is not yet extracted, show Quick and Extract
          const container = document.getElementById("raw-text-container");
          const isExtracted = container && container.style.display === "flex";
          
          if (document.getElementById("btn-quick-process")) 
              document.getElementById("btn-quick-process").style.display = isExtracted ? "none" : "flex";
          if (document.getElementById("btn-extract-text")) 
              document.getElementById("btn-extract-text").style.display = isExtracted ? "none" : "flex";
          if (document.getElementById("btn-process-file")) 
              document.getElementById("btn-process-file").style.display = isExtracted ? "flex" : "none";
          
          const aiToggle = document.querySelector(".switch")?.parentElement;
          if (aiToggle) aiToggle.style.display = "flex";
      }

      if (currentQuiz.fileName.toLowerCase().endsWith(".pdf")) {
          fileIcon.className = "fa-solid fa-file-pdf";
      } else if (currentQuiz.fileName.toLowerCase().endsWith(".txt")) {
          fileIcon.className = "fa-solid fa-file-lines";
      } else {
          fileIcon.className = "fa-solid fa-file-word";
      }
  } else {
      dropZone.style.display = "block";
      fileInfo.style.display = "none";
      const rawTextContainer = document.getElementById("raw-text-container");
      if (rawTextContainer) rawTextContainer.style.display = "none";
      const extractBtn = document.getElementById("btn-extract-text");
      const processBtn = document.getElementById("btn-process-file");
      const quickBtn = document.getElementById("btn-quick-process");
      if (extractBtn) extractBtn.style.display = "flex";
      if (processBtn) processBtn.style.display = "none";
      if (quickBtn) quickBtn.style.display = "flex";
  }

  currentQuiz.questions.forEach((q, qIdx) => {
    // Sidebar Item
    const navItem = document.createElement("div");
    navItem.className = "nav-item";
    navItem.id = `sidebar-q-${qIdx}`;
    navItem.innerHTML = `<i class="fa-solid fa-file-lines" style="opacity:0.5;"></i> <span style="opacity:0.5">${qIdx + 1}.</span> ${q.text || "Pregunta vacía"}`;
    navItem.onclick = () =>
      document
        .getElementById(`q-edit-${qIdx}`)
        .scrollIntoView({ behavior: "smooth", block: "center" });
    sidebar.appendChild(navItem);

    // Editor Item
    const qDiv = document.createElement("div");
    qDiv.className = "question-editor";
    qDiv.id = `q-edit-${qIdx}`;
    qDiv.innerHTML = `
              <div class="question-editor-header" style="margin-bottom: 1.5rem;">
                  <label style="margin:0; font-weight:700; color:var(--text); font-size: 1.1rem;">Pregunta ${qIdx + 1}</label>
                  <button class="btn btn-outline" style="color: var(--error); border-color: rgba(239, 68, 68, 0.2); padding: 0.5rem;" onclick="removeQuestion(${qIdx})" title="Eliminar pregunta">
                      <i class="fa-solid fa-trash-can"></i>
                  </button>
              </div>
              <div class="input-group">
                  <textarea onchange="updateQuestion(${qIdx}, 'text', this.value)" style="min-height: 100px; font-size: 1rem;">${q.text}</textarea>
              </div>
              <div id="options-${qIdx}">
                  ${q.options
                    .map(
                      (opt, oIdx) => `
                      <div class="option-item">
                          <div class="radio-custom ${currentQuiz.questions[qIdx].correct === oIdx ? "selected" : ""}" onclick="setCorrect(${qIdx}, ${oIdx})"></div>
                          <input type="text" value="${opt}" placeholder="Opción ${oIdx + 1}" onchange="updateOption(${qIdx}, ${oIdx}, this.value)">
                          <button class="btn btn-outline" style="padding: 0.25rem 0.5rem;" onclick="removeOption(${qIdx}, ${oIdx})">
                              <i class="fa-solid fa-xmark"></i>
                          </button>
                      </div>
                  `,
                    )
                    .join("")}
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; gap: 0.5rem;">
                  <button class="btn btn-outline" style="font-size: 0.8rem;" onclick="addOption(${qIdx})">
                      <i class="fa-solid fa-plus"></i> Añadir opción
                  </button>
                  <button class="btn btn-outline" style="font-size: 0.8rem; color: var(--primary); border-color: rgba(99, 102, 241, 0.2);" onclick="addQuestionAt(${qIdx + 1})">
                      <i class="fa-solid fa-plus"></i> Añadir pregunta a continuación
                  </button>
              </div>
          `;
    container.appendChild(qDiv);
  });

  const quizTitleInput = document.getElementById("quiz-title");
  quizTitleInput.onchange = (e) => {
    currentQuiz.title = e.target.value;
    document.getElementById("current-quiz-name").textContent =
      e.target.value;
  };


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
    options: ["Opción A", "Opción B"],
    correct: 0,
  });
  renderEditor();
  // Optional: Scroll to the newly added question if it's not at the end
  setTimeout(() => {
    const el = document.getElementById(`q-edit-${idx}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 50);
}
