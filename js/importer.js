import { currentQuiz } from './state.js';
import { renderEditor } from './editor.js';

let classifier; // El modelo ya cargado
let classifierPromise = null; // La promesa de la descarga en curso
let isProcessingCancelled = false;
let isCurrentlyProcessing = false;

export async function handleFile(file) {
  if (!file) return;
  const fileName = file.name.toLowerCase();
  const allowed = [".docx", ".pdf", ".txt"];
  if (!allowed.some(ext => fileName.endsWith(ext))) {
    alert("Formato no soportado.");
    return;
  }
  currentQuiz.selectedFile = file;
  currentQuiz.fileName = file.name;
  renderEditor();
}

export function normalizeText(text) {
    if (!text) return "";
    return text
        .replace(/[\u200B-\u200D\uFEFF]/g, "") // Caracteres invisibles
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\u00A0/g, " ") // NBSP a espacio normal
        .replace(/\t/g, "  ") // Tabs a espacios dobles
        .trim();
}

function smartSplit(text) {
    if (!text) return "";
    
    // Identificamos el tipo de archivo actual
    const fileName = (currentQuiz && currentQuiz.selectedFile && currentQuiz.selectedFile.name) 
                     ? currentQuiz.selectedFile.name.toLowerCase() 
                     : "";
                     
    if (fileName.endsWith(".pdf")) {
        return smartSplitPDF(text);
    } else if (fileName.endsWith(".docx") || fileName.endsWith(".txt")) {
        return smartSplitDOCX(text);
    } else {
        // Por defecto usamos la lógica más segura (tipo DOCX)
        return smartSplitDOCX(text);
    }
}

function smartSplitPDF(text) {
    let processed = normalizeText(text);

    // REGLA 1: Unir bloques entre ¿ y ? que estén rotos en varias líneas
    // Usamos una función de reemplazo para limpiar espacios internos en esos bloques
    processed = processed.replace(/(¿[\s\S]*?\?)/g, (match) => {
        return match.replace(/\s+/g, " ").trim();
    });

    // 1. Asegurar espacio después de puntos de numeración si falta (1.Text -> 1. Text)
    processed = processed.replace(/(\b\d+[\.\)])([^\s\d\n])/g, "$1 $2");
    processed = processed.replace(/(\b[A-Ea-e][\.\)])([^\s\n])/g, "$1 $2");

    // 2. Forzar salto de línea ANTES de números de pregunta (1. o 1)) o bloques ¿...?
    // Captura números pegados al final de línea o seguidos de espacio/tab
    processed = processed.replace(/([^\n])(\b\d+[\.\)](\s|\t|$))/g, "$1\n$2");
    processed = processed.replace(/([^\n])(¿)/g, "$1\n$2");
    
    // 3. Forzar salto de línea ANTES de opciones de respuesta (A. o A))
    // Caso A: Opción en MAYÚSCULA pegada a letra minúscula (ej: "corazónA.") -> Dividir
    processed = processed.replace(/([a-zñáéíóú])([A-E][\.\)](\s|\t|$))/g, "$1\n$2");
    
    // Caso B: Opción en minúscula (ej: " a.") -> Solo dividir si hay espacio previo
    // Esto evita romper palabras como "aorta."
    processed = processed.replace(/([^\n])\s+(\b[A-Ea-e][\.\)](\s|\t|$))/g, "$1\n$2");

    // 4. Colapsar saltos de línea múltiples
    processed = processed.replace(/\n{3,}/g, "\n\n");

    return processed;
}

function smartSplitDOCX(text) {
    let processed = normalizeText(text);

    // Lógica especializada para documentos Word / TXT.
    // Aunque Word conserva los párrafos nativos bastante bien, a veces los usuarios
    // redactan las opciones en la misma línea que la pregunta, por lo que es necesario
    // seguir forzando las divisiones estructurales.

    // 1. Asegurar espacio después de puntos de numeración si falta para que el parseo no falle.
    processed = processed.replace(/(\b\d+[\.\)])([^\s\d\n])/g, "$1 $2");
    processed = processed.replace(/(\b[A-Ea-e][\.\)])([^\s\n])/g, "$1 $2");

    // 2. Forzar salto de línea ANTES de números de pregunta (1. o 1)) o bloques ¿...?
    // Captura números pegados al final de línea o seguidos de espacio/tab
    processed = processed.replace(/([^\n])(\b\d+[\.\)](\s|\t|$))/g, "$1\n$2");
    processed = processed.replace(/([^\n])(¿)/g, "$1\n$2");
    
    // 3. Forzar salto de línea ANTES de opciones de respuesta (A. o A))
    // Caso A: Opción en MAYÚSCULA pegada a letra minúscula (ej: "corazónA.") -> Dividir
    processed = processed.replace(/([a-zñáéíóú])([A-E][\.\)](\s|\t|$))/g, "$1\n$2");
    
    // Caso B: Opción en minúscula (ej: " a.") -> Solo dividir si hay espacio previo
    processed = processed.replace(/([^\n])\s+(\b[A-Ea-e][\.\)](\s|\t|$))/g, "$1\n$2");

    // Colapsar saltos de línea múltiples
    processed = processed.replace(/\n{3,}/g, "\n\n");

    return processed;
}

export async function extractAndReviewText() {
    const file = currentQuiz.selectedFile;
    if (!file) return;

    showProgressModal(true);
    updateProgress(5, "Extrayendo contenido...");
    
    try {
        let fullText = await extractTextFromFile(file);
        fullText = smartSplit(fullText);
        
        currentQuiz.extractedText = fullText;
        
        // Mostrar en la interfaz
        const container = document.getElementById("raw-text-container");
        const area = document.getElementById("raw-text-area");
        if (container && area) {
            container.style.display = "flex";
            area.value = fullText;
            document.getElementById("btn-extract-text").style.display = "none";
            document.getElementById("btn-process-file").style.display = "flex";
            document.getElementById("btn-quick-process").style.display = "none";
        }
        
        showProgressModal(false);
    } catch (error) {
        console.error(error);
        alert("Error al extraer texto: " + error.message);
        showProgressModal(false);
    }
}

export async function processSelectedFile() {
  if (isCurrentlyProcessing) return;
  
  const file = currentQuiz.selectedFile;
  if (!file) return;

  const useIA = document.getElementById("ai-toggle")?.checked || false;
  currentQuiz.useIA = useIA;

  isProcessingCancelled = false;
  isCurrentlyProcessing = true;
  
  showProgressModal(true);
  updateProgress(0, "Iniciando...");
  
  try {
    let textToProcess = "";
    const container = document.getElementById("raw-text-container");
    const area = document.getElementById("raw-text-area");

    // Si el usuario corrigió el texto manualmente o está en modo revisión
    if (container && container.style.display !== "none" && area.value.trim().length > 0) {
        updateProgress(5, "Usando texto verificado...");
        textToProcess = area.value;
    } else {
        updateProgress(5, "Extrayendo contenido...");
        textToProcess = await extractTextFromFile(file);
        textToProcess = smartSplit(textToProcess);
    }
    
    if (isProcessingCancelled) throw new Error("CANCELLED");

    if (useIA) {
      await processWithZeroShotIA(textToProcess);
    } else {
      parseRawText(textToProcess);
      showProgressModal(false);
      isCurrentlyProcessing = false;
    }

    // Limpieza de UI post-proceso
    if (container) container.style.display = "none";
    
  } catch (error) {
    isCurrentlyProcessing = false;
    if (error.message !== "CANCELLED") {
        console.error(error);
        alert("Error: " + error.message);
        showProgressModal(false);
    }
  }
}

async function extractTextFromFile(file) {
  const fileName = file.name.toLowerCase();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    if (fileName.endsWith(".docx")) {
      reader.onload = async (e) => {
        try {
          // Se usa convertToHtml en vez de extractRawText. extractRawText oculta las viñetas 
          // y números de listas autogeneradas de Word, rompiendo la estructura de opciones.
          const result = await window.mammoth.convertToHtml({ arrayBuffer: e.target.result });
          
          const parser = new DOMParser();
          const doc = parser.parseFromString(result.value, "text/html");
          let text = "";
          let optionCounter = 0; // Reiniciar con cada pregunta para asegurar opciones correlativas (A, B, C...)
          
          function traverse(node) {
              if (node.nodeType === Node.TEXT_NODE) {
                  text += node.nodeValue;
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                  const tag = node.tagName.toLowerCase();
                  
                  if (tag === 'br') {
                      text += "\n";
                  }

                  // Evaluar si es el inicio de una pregunta para reiniciar el contador de opciones
                  if (['p', 'div', 'h1', 'h2', 'h3'].includes(tag)) {
                      const txt = node.textContent || "";
                      const isQuestionLike = txt.includes("¿") || txt.includes("?") || txt.trim().endsWith(":");
                      if (isQuestionLike) {
                          optionCounter = 0;
                      }
                  }
                  
                  if (tag === 'li') {
                      const liText = node.textContent || "";
                      const isQuestion = liText.includes("¿") || liText.includes("?") || liText.trim().endsWith(":");
                      
                      const parent = node.parentNode;
                      if (parent && parent.tagName.toLowerCase() === 'ol') {
                          if (isQuestion) {
                              text += `1. `;
                              optionCounter = 0; // Reset para las opciones de esta pregunta
                          } else {
                              // El % 5 asegura que siempre será A, B, C, D, o E (requerido por el parser regex)
                              const letter = String.fromCharCode(65 + (optionCounter % 5)); 
                              text += `${letter}. `;
                              optionCounter++;
                          }
                      } else {
                          text += "• ";
                      }
                  }
                  
                  // Recorremos los hijos recursivamente
                  for (let child of node.childNodes) {
                      traverse(child);
                  }
                  
                  // Agregamos saltos de línea al terminar un bloque estructural
                  if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'].includes(tag)) {
                      text += "\n";
                  }
              }
          }
          
          traverse(doc.body);
          resolve(text);
          
        } catch (err) { reject(err); }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileName.endsWith(".pdf")) {
      reader.onload = async (e) => {
        try {
          const typedarray = new Uint8Array(e.target.result);
          const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
          let text = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            if (isProcessingCancelled) { reject(new Error("CANCELLED")); return; }
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            let lastY;
            let pageText = "";
            for (let item of content.items) {
                // Detectar saltos de línea por posición vertical con un umbral más sensible (3px)
                if (lastY !== undefined && Math.abs(item.transform[5] - lastY) > 3) {
                    pageText += "\n";
                }
                lastY = item.transform[5];
                pageText += item.str + " ";
            }
            text += pageText + "\n";
            updateProgress(5 + (i/pdf.numPages * 15), `Leyendo PDF: página ${i}/${pdf.numPages}`);
          }
          resolve(text);
        } catch (err) { reject(err); }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsText(file);
    }
  });
}

async function processWithZeroShotIA(text) {
  try {
    const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1');
    env.allowLocalModels = false;

    if (isProcessingCancelled) throw new Error("CANCELLED");

    // Si ya existe el clasificador (ya se bajó), lo usamos directo
    if (!classifier) {
        // Si no existe, pero hay una promesa de descarga activa, esperamos a ESA promesa
        if (!classifierPromise) {
            updateProgress(15, "Iniciando descarga del modelo IA...");
            classifierPromise = pipeline('zero-shot-classification', 'Xenova/mobilebert-uncased-mnli', {
                progress_callback: (data) => {
                    // Solo actualizamos la UI si el modal está abierto (no cancelado)
                    if (!isProcessingCancelled && data.status === 'progress') {
                        updateProgress(15 + (data.progress / 100 * 40), `Descargando IA... ${Math.round(data.progress)}%`);
                    }
                }
            });
        } else {
            updateProgress(15, "Reanudando conexión con descarga en curso...");
        }

        classifier = await classifierPromise;
    }

    if (isProcessingCancelled) throw new Error("CANCELLED");

    updateProgress(60, "Analizando estructura del cuestionario...");
    
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 2);
    const questions = [];
    let currentQ = null;
    const labels = ['pregunta de examen', 'opción de respuesta'];

    for (let i = 0; i < lines.length; i++) {
        if (isProcessingCancelled) throw new Error("CANCELLED");
        const line = lines[i];
        updateProgress(60 + (i / lines.length * 35), `Analizando línea ${i+1}/${lines.length}`);

        // Regla: Empieza por número (1. o 1)) seguido de espacio/tab
        const startsWithQNum = /^\d+[\.\)](\s|\t)+/.test(line);
        const startsWithLetterOpt = /^[A-Ea-e][\.\)](\s|\t)+/.test(line);
        const startsWithSymbolOpt = /^[\-\*\•]\s+/.test(line);
        const hasQuestionSigns = line.includes("?") || line.includes("¿");
        const endsWithColon = line.endsWith(":");

        let category = null;
        if (startsWithQNum || (hasQuestionSigns && !startsWithLetterOpt) || endsWithColon) {
            category = 'question';
        } else if (startsWithLetterOpt || startsWithSymbolOpt) {
            category = 'option';
        } else {
            // Línea ambigua (no tiene números, ni signos claros, ni letras de opción)
            if (currentQ && currentQ.options.length === 0) {
                // Si aún no hay opciones, asumimos que es texto de la pregunta (continuación)
                category = 'question';
            } else {
                // Si ya hay opciones o no hay pregunta activa, dejamos que la IA decida
                const output = await classifier(line, labels);
                if (isProcessingCancelled) throw new Error("CANCELLED");
                category = (output.labels[0] === 'pregunta de examen' && output.scores[0] > 0.75) ? 'question' : 'option';
            }
        }

        if (category === 'question') {
            if (currentQ && currentQ.options.length > 0) {
                questions.push(currentQ);
                currentQ = { text: line.replace(/^\d+[\.\)]\s*/, ""), options: [], correct: 0 };
            } else if (currentQ && !startsWithQNum) {
                // Si es texto ambiguo o pregunta sin número, se une a la anterior
                currentQ.text += " " + line;
            } else {
                currentQ = { text: line.replace(/^\d+[\.\)]\s*/, ""), options: [], correct: 0 };
            }
        } else if (currentQ) {
            if (startsWithLetterOpt || startsWithSymbolOpt) {
                // Si la línea trae su propio prefijo de opción
                let cleanOpt = line.replace(/^[A-Ea-e][\.\)]\s*/, "").replace(/^[\-\*\•]\s*/, "");
                // Limpieza extra: SOLO si el PDF pegó el número de la siguiente pregunta al final
                // Buscamos un patrón que parezca número de pregunta (ej: " 15.") al final absoluto
                cleanOpt = cleanOpt.replace(/\s\d+[\.\)]$/, "").trim();
                currentQ.options.push(cleanOpt);
            } else {
                // Si la IA dijo que era opción pero no tiene prefijo, es continuación de la última opción
                if (currentQ.options.length > 0) {
                    const lastIdx = currentQ.options.length - 1;
                    currentQ.options[lastIdx] += " " + line;
                    // Limpieza extra en la unión: SOLO si hay un espacio claro antes del número
                    currentQ.options[lastIdx] = currentQ.options[lastIdx].replace(/\s\d+[\.\)]$/, "").trim();
                } else {
                    // Si no hay opciones aún, lo tratamos como parte de la pregunta (fallback)
                    currentQ.text += " " + line;
                }
            }
        }
    }

    if (currentQ) questions.push(currentQ);
    currentQuiz.questions = [...currentQuiz.questions, ...questions];
    updateProgress(100, "¡Finalizado!");
    
    setTimeout(() => {
        showProgressModal(false);
        renderEditor();
        isCurrentlyProcessing = false;
    }, 500);

  } catch (error) {
    isCurrentlyProcessing = false;
    throw error;
  }
}

export function parseRawText(text) {
  const processedText = smartSplit(text);
  const lines = processedText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const questions = [];
  let currentQ = null;
  lines.forEach((line) => {
    const startsWithNum = /^\d+[\.\)](\s|\t)+/.test(line);
    const isQuestionPrefixed = startsWithNum || line.includes("¿") || line.endsWith(":") || line.endsWith("?");
    const isOptionPrefixed = /^[A-Ea-e][\.\)](\s|\t)+/.test(line) || /^[\-\*\•]\s+/.test(line);

    if (isQuestionPrefixed && !isOptionPrefixed) {
      if (currentQ && currentQ.options.length > 0) {
        questions.push(currentQ);
        currentQ = { text: line.replace(/^\d+[\.\)]\s*/, ""), options: [], correct: 0 };
      } else if (currentQ && !startsWithNum) {
        currentQ.text += " " + line;
      } else {
        currentQ = { text: line.replace(/^\d+[\.\)]\s*/, ""), options: [], correct: 0 };
      }
    } else if (isOptionPrefixed && currentQ) {
      currentQ.options.push(line.replace(/^[A-Ea-e][\.\)]\s*/, "").replace(/^[\-\*\•]\s*/, ""));
    } else if (currentQ) {
      // Línea ambigua (continuación)
      if (currentQ.options.length === 0) {
        currentQ.text += " " + line;
      } else {
        const lastIdx = currentQ.options.length - 1;
        currentQ.options[lastIdx] += " " + line;
      }
    }
  });
  if (currentQ) questions.push(currentQ);
  currentQuiz.questions = [...currentQuiz.questions, ...questions];
  renderEditor();
}

export function parseMarkdown(md) {
  const lines = md.split("\n");
  let quiz = { title: "Cuestionario Importado", questions: [] };
  let currentQ = null;
  lines.forEach(line => {
    if (line.startsWith("# ")) quiz.title = line.substring(2).trim();
    else if (line.startsWith("## ")) {
      if (currentQ) quiz.questions.push(currentQ);
      currentQ = { text: line.substring(3).trim(), options: [], correct: 0 };
    } else if (line.startsWith("- [") && currentQ) {
      const isCorrect = line.includes("[x]");
      currentQ.options.push(line.substring(6).trim());
      if (isCorrect) currentQ.correct = currentQ.options.length - 1;
    }
  });
  if (currentQ) quiz.questions.push(currentQ);
  return quiz;
}

export function exportToMarkdown() {
  let md = `# ${currentQuiz.title}\n\n`;
  currentQuiz.questions.forEach(q => {
    md += `## ${q.text}\n`;
    q.options.forEach((opt, oi) => {
      md += `- ${oi === q.correct ? "[x]" : "[ ]"} ${opt}\n`;
    });
    md += `\n`;
  });
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentQuiz.title.replace(/\s+/g, "_")}.txt`;
  a.click();
}

function showProgressModal(show) {
    const modal = document.getElementById("modal-progress");
    if (show) modal.classList.add("active");
    else modal.classList.remove("active");
}

function updateProgress(percent, text) {
    const fill = document.getElementById("ai-progress-fill");
    const textEl = document.getElementById("progress-status-text");
    const percentEl = document.getElementById("progress-percent");
    if (fill) fill.style.width = `${percent}%`;
    if (textEl) textEl.textContent = text;
    if (percentEl) percentEl.textContent = `${Math.round(percent)}%`;
}

export function cancelProcessing() {
    isProcessingCancelled = true;
    isCurrentlyProcessing = false;
    showProgressModal(false);
    // No reseteamos classifierPromise aquí porque el download sigue en el fondo
    // y queremos poder re-usarla si el usuario le da otra vez.
}
