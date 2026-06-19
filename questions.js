// questions.js
// Question bank for BISEASE SENIOR HIGH SCHOOL - ICT SEM 2 MID-TERM ASSESSMENT
// type: "mcq" -> multiple choice (auto-marked exact match)
// type: "text" -> short answer (auto-marked via keyword matching against acceptable answers)

const QUESTION_BANK = [
  // ----- PAPER 2 - ESSAY (text type, keyword-matched) -----
  {
    id: "p2q1",
    type: "text",
    paper: "Paper 2 - Essay",
    marks: 2,
    question: "Name two types of filters you can apply to a dataset in Excel.",
    acceptableAnswers: [
      "autofilter", "auto filter", "standard filter", "advanced filter",
      "custom filter", "text filter", "number filter"
    ],
    requiredCount: 2 // needs to mention at least 2 distinct acceptable terms
  },
  {
    id: "p2q2",
    type: "text",
    paper: "Paper 2 - Essay",
    marks: 2,
    question: "____________ is the use of computers and internet in teaching and learning.",
    acceptableAnswers: ["e-learning", "elearning", "technology-enhanced learning", "technology enhanced learning", "digital learning"],
    requiredCount: 1
  },
  {
    id: "p2q3",
    type: "text",
    paper: "Paper 2 - Essay",
    marks: 2,
    question: "EHR stands for ____________.",
    acceptableAnswers: ["electronic health record", "electronic health records"],
    requiredCount: 1
  },
  {
    id: "p2q4",
    type: "text",
    paper: "Paper 2 - Essay",
    marks: 2,
    question: "MRI is used in the ____________ sector.",
    acceptableAnswers: ["healthcare", "health care", "medical", "hospital"],
    requiredCount: 1
  },
  {
    id: "p2q5",
    type: "text",
    paper: "Paper 2 - Essay",
    marks: 2,
    question: "State two challenges of using technology in schools.",
    acceptableAnswers: [
      "cost", "lack of teacher training", "teacher training", "poor internet connectivity",
      "internet connectivity", "digital divide", "cybersecurity risk", "cybersecurity",
      "technical issues", "distraction", "equity issues", "equity"
    ],
    requiredCount: 2
  },

  // ----- PAPER 1 - OBJECTIVE (mcq type) -----
  {
    id: "p1q1",
    type: "mcq",
    paper: "Paper 1 - Objective",
    marks: 1,
    question: "ICT stands for:",
    options: [
      "Internal Communication Technology",
      "Information and Communication Technology",
      "Internet Computer Technology",
      "Integrated Communication Tool"
    ],
    correctIndex: 1
  },
  {
    id: "p1q2",
    type: "mcq",
    paper: "Paper 1 - Objective",
    marks: 1,
    question: "Which of the following is used in education?",
    options: ["MRI Scanner", "Google Classroom", "Robot arm", "X-ray machine"],
    correctIndex: 1
  },
  {
    id: "p1q3",
    type: "mcq",
    paper: "Paper 1 - Objective",
    marks: 1,
    question: "Which device is used in hospitals for body scanning?",
    options: ["Printer", "MRI scanner", "Keyboard", "Projector"],
    correctIndex: 1
  },
  {
    id: "p1q4",
    type: "mcq",
    paper: "Paper 1 - Objective",
    marks: 1,
    question: "LMS stands for:",
    options: [
      "Learning Management System",
      "Local Management Software",
      "Learning Media System",
      "Logical Memory System"
    ],
    correctIndex: 0
  },
  {
    id: "p1q5",
    type: "mcq",
    paper: "Paper 1 - Objective",
    marks: 1,
    question: "Which of these is a benefit of technology in manufacturing?",
    options: ["Slower production", "More errors", "Faster production", "Less efficiency"],
    correctIndex: 2
  },
  {
    id: "p1q6",
    type: "mcq",
    paper: "Paper 1 - Objective",
    marks: 1,
    question: "Which of the following is NOT a medical technology?",
    options: ["CT scan", "Ultrasound", "Robot surgery", "Calculator"],
    correctIndex: 3
  },
  {
    id: "p1q7",
    type: "mcq",
    paper: "Paper 1 - Objective",
    marks: 1,
    question: "Technology in education helps students to:",
    options: ["Avoid learning", "Access online resources", "Reduce knowledge", "Stop studying"],
    correctIndex: 1
  },
  {
    id: "p1q8",
    type: "mcq",
    paper: "Paper 1 - Objective",
    marks: 1,
    question: "Which file format can you save an Excel workbook in?",
    options: [".docx only", ".ppt only", ".xlsx and .pdf", ".jpg only"],
    correctIndex: 2
  },
  {
    id: "p1q9",
    type: "mcq",
    paper: "Paper 1 - Objective",
    marks: 1,
    question: "A teacher has a large Excel report that is 15 pages long when printed. Some data is cut off at the edges. What should the teacher do?",
    options: [
      "Print it anyway",
      "Delete some columns",
      "Adjust the page layout settings (margins, scaling) before printing",
      "Save it as a PDF and print"
    ],
    correctIndex: 2
  },
  {
    id: "p1q10",
    type: "mcq",
    paper: "Paper 1 - Objective",
    marks: 1,
    question: "A manufacturing company uses IoT sensors and robots. How do these technologies work together?",
    options: [
      "They are separate and don't work together",
      "IoT sensors collect data, and robots use this data to automate tasks accurately",
      "Only robots are needed",
      "They only reduce costs"
    ],
    correctIndex: 1
  }
];
