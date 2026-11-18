/* Course data for the home page, navigation and weekly plan (matches the syllabus). */
window.COURSE = {
  code: 'BCS 407', title: 'Artificial Intelligence', school: 'School of Engineering, Applied Science and Technology · Canadian University Dubai',
  lede: 'A narrated, visual course from search to agents: how machines decide, learn, sequence, reason, and act, with the ideas that connect them to the brain. Every lecture is animated, has a voice, and ends with random exercises you can answer and check.',
  meta: ['3 credit hours', '2 lecture hours + 2 lab hours per week', '16 weeks', 'Instructor: Dr. Arash Kermani'],
  clos: [
    'Explain foundational AI principles.',
    'Design AI solutions using machine learning techniques.',
    'Implement intelligent decision solutions.',
    'Evaluate AI models ethically.'
  ],
  assessment: [['Quiz 1', 10], ['Quiz 2', 10], ['Lab work', 20], ['Midterm', 15], ['Project', 15], ['Final exam', 30]],
  books: [
    'Russell, S. &amp; Norvig, P. (2020). <i>Artificial Intelligence: A Modern Approach</i> (4th ed.). Pearson. ISBN 9780134610996.',
    'Negnevitsky, M. (2011). <i>Artificial Intelligence: A Guide to Intelligent Systems</i> (2nd ed.). Addison-Wesley. ISBN 9780135145992.',
    'Suggested: Sutton &amp; Barto (2018), <i>Reinforcement Learning: An Introduction</i> (2nd ed.), MIT Press, free online. Srivastava et al. (2014), <i>Dropout</i>, JMLR 15. Gerstner et al. (2014), <i>Neuronal Dynamics</i>, Cambridge University Press, free online.'
  ],
  footer: 'Prepared for Canadian University Dubai. Narration: ElevenLabs and Kokoro text-to-speech. Built with plain HTML, SVG and JavaScript; the Python cells run in your browser.',
  weeks: [
    { n: 1, title: 'Introduction to Artificial Intelligence and Intelligent Agents', bullets: ['Overview of AI: fundamentals, applications and history', 'Rational agents and their environments', 'AI today: foundation models and agentic AI (preview)'], clos: [1], ref: 'AIMA Ch. 1, 2', lecture: 'w01', lab: 'lab01', labTitle: 'Introduction to AI tools' },
    { n: 2, title: 'Problem Solving and Search (Part 1)', bullets: ['Problem formulation', 'Uninformed search (BFS, DFS, uniform cost)'], clos: [1], ref: 'AIMA Ch. 3 (3.1 to 3.4)', lecture: 'w02', lab: 'lab02', labTitle: 'Uninformed search' },
    { n: 3, title: 'Problem Solving and Search (Part 2)', bullets: ['Heuristic and informed search (A*)', 'Designing heuristic functions'], clos: [1], ref: 'AIMA Ch. 3 (3.5, 3.6)', assessment: 'Quiz 1', lecture: 'w03', lab: 'lab03', labTitle: 'Informed search (A*)' },
    { n: 4, title: 'Learning from Data', bullets: ['Supervised learning: regression and classification with linear models', 'Decision trees, overfitting and model evaluation', 'Unsupervised learning: clustering (k-means)'], clos: [2], ref: 'AIMA Ch. 19', lecture: 'w04', lab: 'lab04', labTitle: 'Clustering' },
    { n: 5, title: 'Optimization for Learning', bullets: ['Local search and optimization (hill climbing, simulated annealing)', 'Gradient descent, stochastic gradient descent, the learning rate', 'The perceptron'], clos: [2], ref: 'AIMA Ch. 4 (4.1, 4.2), Ch. 19, Ch. 21', lecture: 'w05', lab: 'lab05', labTitle: 'Decision trees' },
    { n: 6, title: 'Artificial Neural Networks (Part 1)', bullets: ['Multi-layer perceptron and activation functions', 'Backpropagation and computation graphs'], clos: [2], ref: 'AIMA Ch. 21 (21.1, 21.2, 21.4)', lecture: 'w06', lab: 'lab06', labTitle: 'Optimization and the perceptron' },
    { n: 7, title: 'Artificial Neural Networks (Part 2)', bullets: ['Generalization: regularization, dropout, early stopping', 'Convolutional networks (overview) and transfer learning', 'The brain connection: noise and competition between neurons'], clos: [2], ref: 'AIMA Ch. 21 (21.3, 21.5, 21.7)', lecture: 'w07', lab: 'lab07', labTitle: 'Multi-layer perceptron and dropout' },
    { n: 8, title: 'Midterm Examination (weeks 1 to 7)', bullets: ['Revision exercises from all earlier lectures'], clos: [1, 2], assessment: 'Midterm', lecture: 'w08', lab: 'lab08', labTitle: 'CNNs and transfer learning (revision lab)' },
    { n: 9, title: 'Sequence Models', bullets: ['Recurrent networks (RNN, LSTM) and the vanishing gradient', 'Word embeddings and sequence-to-sequence models'], clos: [2], ref: 'AIMA Ch. 21 (21.6), Ch. 24', lecture: 'w09', lab: 'lab09', labTitle: 'Recurrent networks' },
    { n: 10, title: 'Attention, Transformers and Large Language Models', bullets: ['The attention mechanism and the transformer', 'Pre-training, fine-tuning and prompting', 'Limits: hallucination and evaluation'], clos: [2], ref: 'AIMA Ch. 24', lecture: 'w10', lab: 'lab10', labTitle: 'Language models in practice' },
    { n: 11, title: 'Reinforcement Learning (Part 1)', bullets: ['Markov decision processes and the Bellman equations', 'Passive and active reinforcement learning, Q-learning'], clos: [3], ref: 'AIMA Ch. 17 (17.1, 17.2), Ch. 22 (22.1 to 22.3)', lecture: 'w11', lab: 'lab11', labTitle: 'Q-learning' },
    { n: 12, title: 'Reinforcement Learning (Part 2)', bullets: ['Generalization and policy search', 'Exploration', 'Reinforcement learning from human feedback for large language models'], clos: [3], ref: 'AIMA Ch. 22 (22.4, 22.5); Sutton and Barto', assessment: 'Quiz 2', lecture: 'w12' },
    { n: 13, title: 'Agentic AI', bullets: ['The perceive, plan and act loop with a language model', 'Tool use, memory and retrieval', 'Planning, guardrails and evaluating agents'], clos: [3], ref: 'Instructor notes; AIMA Ch. 2', lecture: 'w13', lab: 'lab12', labTitle: 'Build a tool-using agent' },
    { n: 14, title: 'Brain-Inspired AI and Reasoning with Uncertainty', bullets: ['Hebbian learning, spike-timing plasticity and spiking networks', 'Backpropagation and the brain', 'Fuzzy thinking and fuzzy sets (short introduction)'], clos: [3], ref: 'Instructor notes; suggested readings; Negnevitsky Ch. 4', lecture: 'w14' },
    { n: 15, title: 'Responsible AI, Applications and Future Trends', bullets: ['Bias, explainability, safety and regulation', 'AI in healthcare, finance, business, autonomous vehicles and robots', 'Future of AI; project presentations'], clos: [4], ref: 'AIMA Ch. 27 (27.3), Ch. 28', assessment: 'Project presentation', lecture: 'w15' },
    { n: 16, title: 'Final Examination', bullets: [], clos: [2, 3, 4], assessment: 'Final exam' }
  ]
};
(function () {
  const C = window.COURSE; C.order = []; C.titles = {};
  C.weeks.forEach(w => {
    if (w.lecture) { C.order.push(w.lecture); C.titles[w.lecture] = 'Week ' + w.n + ': ' + w.title.replace(/ \(Part (\d)\)/, ' $1').replace(/^Introduction to Artificial Intelligence and Intelligent Agents/, 'Intelligent agents'); }
    if (w.lab) { C.order.push(w.lab); C.titles[w.lab] = 'Lab: ' + w.labTitle; }
  });
})();
