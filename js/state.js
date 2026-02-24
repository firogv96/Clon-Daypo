export const APP_VERSION = "v1.2.0";

export let currentQuiz = {
  title: "Nuevo Cuestionario",
  questions: [],
  fileName: null,
  selectedFile: null, // Raw file object
  useIA: true,
  extractedText: ""
};

export let readerState = {
  currentIndex: 0,
  score: 0,
  results: [], // null = not answered, true = correct, false = wrong
  userAnswers: [], // stored indices
  revealed: [], // indices of questions revealed
};

export let comingFromCreator = { value: false };

export function resetReaderState(quizLength) {
  readerState.currentIndex = 0;
  readerState.score = 0;
  readerState.results = new Array(quizLength).fill(null);
  readerState.userAnswers = new Array(quizLength).fill(null);
  readerState.revealed = new Array(quizLength).fill(false);
}

export function resetQuizState() {
  currentQuiz.title = "Nuevo Cuestionario";
  currentQuiz.questions = [];
  currentQuiz.fileName = null;
  comingFromCreator.value = false;
  
  // Also reset reader state to be sure
  readerState.currentIndex = 0;
  readerState.score = 0;
  readerState.results = [];
  readerState.userAnswers = [];
  readerState.revealed = [];
}
