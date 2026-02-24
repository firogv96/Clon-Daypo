import { currentQuiz, comingFromCreator, resetQuizState } from './state.js';
import { renderEditor } from './editor.js';
import { renderQuestion } from './reader.js';

export function showView(viewId) {
  // Check for unsaved changes when going to home
  if (viewId === 'home') {
    const isEditing = document.getElementById('view-creator').classList.contains('active');
    const isReading = document.getElementById('view-reader').classList.contains('active');
    const hasQuestions = currentQuiz.questions.length > 0;

    if ((isEditing || isReading) && hasQuestions) {
      const message = isEditing 
        ? "¿Estás seguro de que quieres volver al inicio? Perderás todos los cambios realizados en el cuestionario."
        : "¿Estás seguro de que quieres volver al inicio? Perderás el progreso actual del test.";
      
      if (!confirm(message)) return;
    }
    
    // Reset state whenever we return home (either confirmed or from other views like results)
    resetQuizState();

    // Clear file inputs to allow re-uploading same file
    const fileInput = document.getElementById('file-input');
    const readerInput = document.getElementById('reader-file-input');
    if (fileInput) fileInput.value = '';
    if (readerInput) readerInput.value = '';
  }

  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.remove("active"));
  const target = document.getElementById(`view-${viewId}`);
  if (target) {
    target.classList.add("active");
  } else {
    console.error(`View ${viewId} not found`);
    return;
  }

  // Header Visibility
  const titleNav = document.getElementById("quiz-title-nav");
  const currentQuizName = document.getElementById("current-quiz-name");
  const backBtn = document.getElementById("btn-back-editor");

  if (viewId === "creator" || viewId === "reader") {
    titleNav.style.display = "flex";
    currentQuizName.textContent = currentQuiz.title || "Sin título";
  } else {
    titleNav.style.display = "none";
  }

  // Back Button Visibility
  backBtn.style.display = (viewId === 'reader' && comingFromCreator.value) ? 'flex' : 'none';

  if (viewId === "creator") renderEditor();
  if (viewId === "reader") renderQuestion();
  
  window.scrollTo(0, 0);
}

export function trackActiveCreatorQuestion() {
  const editors = document.querySelectorAll('.question-editor');
  let currentId = null;
  
  // Encontrar qué pregunta está cruzando la línea de los 250px desde el tope
  editors.forEach(editor => {
      const rect = editor.getBoundingClientRect();
      if (rect.top <= 250 && rect.bottom >= 250) {
          currentId = editor.id.replace('q-edit-', '');
      }
  });
  
  if (currentId !== null) {
      const activeItem = document.getElementById(`sidebar-q-${currentId}`);
      if (activeItem && !activeItem.classList.contains('active')) {
          // Solo actualizamos si cambia para evitar scrolls innecesarios
          document.querySelectorAll('#creator-sidebar .nav-item').forEach(item => item.classList.remove('active'));
          activeItem.classList.add('active');
          
          // AUTO SCROLL: Asegurar que el ítem activo sea visible en el sidebar
          activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
  }
}
