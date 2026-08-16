// ===========================
// Digital Physics Textbook
// JSON-based Content System
// ===========================

// Global state
let navigationData = null;
let contentData = null;
let questionsData = null;
let derivationsData = null;

// ===========================
// Data Loading Functions
// ===========================

async function loadNavigationData() {
    try {
        const response = await fetch('data/navigation.json');
        navigationData = await response.json();
        return navigationData;
    } catch (error) {
        console.error('Error loading navigation data:', error);
        return null;
    }
}

async function loadContentData() {
    try {
        const response = await fetch('data/content.json');
        contentData = await response.json();
        return contentData;
    } catch (error) {
        console.error('Error loading content data:', error);
        return null;
    }
}

async function loadQuestionsData() {
    try {
        const response = await fetch('data/questions.json');
        questionsData = await response.json();
        return questionsData;
    } catch (error) {
        console.error('Error loading questions data:', error);
        return null;
    }
}

async function loadDerivationsData() {
    try {
        const response = await fetch('data/derivations.json');
        derivationsData = await response.json();
        return derivationsData;
    } catch (error) {
        console.error('Error loading derivations data:', error);
        return null;
    }
}

// ===========================
// Navigation Rendering
// ===========================
function renderNavigation() {
    const nav = document.getElementById('navigation');
    if (!nav || !navigationData) return;
    
    nav.innerHTML = '';
    
    navigationData.coreThemes.forEach(theme => {
        const themeDiv = document.createElement('div');
        themeDiv.className = 'topic';
        
        const themeTitle = document.createElement('div');
        themeTitle.className = 'topic-title';
        themeTitle.innerHTML = `
            ${theme.title}
            <span class="arrow">▼</span>
        `;
        themeTitle.onclick = () => toggleTopic(themeDiv);
        
        const topicsDiv = document.createElement('div');
        topicsDiv.className = 'topic-sections';
        
        theme.topics.forEach(topic => {
            const link = document.createElement('a');
            link.href = `#${topic.id}`;
            link.className = 'section-link';
            
            // Add HL badge for higher level content
            if (topic.level === 'HL') {
                link.innerHTML = `${topic.title} <span class="hl-badge">HL</span>`;
            } else {
                link.textContent = topic.title;
            }
            
            link.onclick = (e) => {
                e.preventDefault();
                loadContent(topic.id);
                setActiveLink(link);
            };
            topicsDiv.appendChild(link);
        });
        
        themeDiv.appendChild(themeTitle);
        themeDiv.appendChild(topicsDiv);
        nav.appendChild(themeDiv);
    });
}

function toggleTopic(topicDiv) {
    topicDiv.classList.toggle('collapsed');
}

function setActiveLink(activeLink) {
    document.querySelectorAll('.section-link').forEach(link => {
        link.classList.remove('active');
    });
    activeLink.classList.add('active');
}

// ===========================
// Content Loading
// ===========================
async function loadContent(sectionId) {
    const contentArea = document.getElementById('content');
    let loadedContent = null;
    
    // Attempt to fetch from standalone HTML file
    try {
        const response = await fetch(`data/content/${sectionId}.html`);
        if (response.ok) {
            loadedContent = await response.text();
        } else {
            console.warn(`Standalone file for ${sectionId} not found, falling back to content.json.`);
        }
    } catch (error) {
        console.error(`Error loading standalone file for ${sectionId}:`, error);
    }
    
    // Fallback to monolithic content.json data
    if (!loadedContent) {
        if (contentData && contentData.sections[sectionId]) {
            loadedContent = contentData.sections[sectionId].content;
        } else {
            contentArea.innerHTML = `
                <h1>Content Coming Soon</h1>
                <p>This section is under development. Please check back later.</p>
            `;
            return;
        }
    }
    
    contentArea.innerHTML = loadedContent;
    
    // Cancel any running animation frame from a previous simulation
    if (window.__simRAFId) {
        cancelAnimationFrame(window.__simRAFId);
        window.__simRAFId = null;
    }
    
    // Initialize section-specific simulations after DOM is ready
    setTimeout(() => {
        // Kinematics scooter simulation
        if (sectionId === 'kinematics' && typeof window.initScooterSim === 'function') {
            window.initScooterSim();
        }
        // Re-evaluate any remaining inline scripts from other sections
        const scripts = contentArea.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            newScript.appendChild(document.createTextNode(oldScript.textContent));
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
    }, 200);
    
    // Update URL hash
    window.location.hash = sectionId;
    
    // Scroll to top
    document.querySelector('.content-area').scrollTop = 0;
    
    // Trigger MathJax to re-render equations
    if (window.MathJax) {
        MathJax.typesetPromise();
    }
    
    // Load questions for this section
    renderQuestions(sectionId);
    
    // Add click handlers
    setTimeout(() => {
        addEquationClickHandlers();
        addGlossaryClickHandlers();
    }, 600);
}

// ===========================
// Questions Panel
// ===========================
function renderQuestions(sectionId) {
    const questionsPanel = document.getElementById('questions');
    
    if (!questionsData || !questionsData.questions[sectionId]) {
        questionsPanel.innerHTML = '<p class="questions-placeholder">No conceptual questions for this section yet.</p>';
        return;
    }
    
    const questions = questionsData.questions[sectionId];
    let html = '';
    questions.forEach((q, index) => {
        html += `
            <div class="question-item" data-target="${q.targetId || ''}">
                <div class="question-number">Question ${index + 1}</div>
                <div class="question-text">${q.text}</div>
                ${q.hint ? `<div class="question-hint">${q.hint}</div>` : ''}
            </div>
        `;
    });
    
    questionsPanel.innerHTML = html;
    
    // Add ScrollSpy to automatically align questions when scrolled
    setTimeout(() => {
        if (typeof initQuestionScrollSpy === 'function') {
            initQuestionScrollSpy(sectionId);
        }
    }, 100);
}

function initQuestionsPanel() {
    const panel = document.getElementById('questions-panel');
    if (!panel) return;
    
    const header = panel.querySelector('.questions-header');
    
    panel.addEventListener('click', function(e) {
        if (panel.classList.contains('expanded')) {
            const rect = header.getBoundingClientRect();
            const clickX = e.clientX;
            const clickY = e.clientY;
            
            const isCloseButton = clickX > rect.right - 60 && 
                                 clickY < rect.top + 60;
            
            if (isCloseButton || e.target.closest('.questions-header')) {
                panel.classList.remove('expanded');
                return;
            }
        } else {
            panel.classList.add('expanded');
        }
    });
    
    const questionsContent = document.getElementById('questions');
    if (questionsContent) {
        questionsContent.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
}

// ===========================
// Equation Derivations Modal
// ===========================

function openDerivationModal(derivationType) {
    const modal = document.getElementById('derivation-modal');
    const body = document.getElementById('derivation-body');
    
    if (!derivationsData || !derivationsData.derivations[derivationType]) {
        body.innerHTML = '<p>Derivation not available for this equation yet.</p>';
    } else {
        const derivation = derivationsData.derivations[derivationType];
        body.innerHTML = `<h3>${derivation.title}</h3>${derivation.content}`;
    }
    
    modal.classList.add('active');
    
    // Re-render MathJax for the modal content
    if (window.MathJax) {
        MathJax.typesetPromise([body]);
    }
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

function closeDerivationModal() {
    const modal = document.getElementById('derivation-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function addEquationClickHandlers() {
    const equationBlocks = document.querySelectorAll('.equation-block');
    equationBlocks.forEach(block => {
        const content = block.textContent;
        let derivationType = null;
        
        if (content.includes('\\vec{v}') && content.includes('d\\vec{x}') && content.includes('dt')) {
            derivationType = 'velocity';
        } else if (content.includes('\\vec{a}') && content.includes('d\\vec{v}')) {
            derivationType = 'acceleration';
        } else if (content.includes('F_{net}') && content.includes('m\\vec{a}')) {
            derivationType = 'newton2';
        } else if (content.includes('KE') || content.includes('\\frac{1}{2}mv^2')) {
            derivationType = 'kinetic-energy';
        }
        
        if (derivationType) {
            block.style.cursor = 'pointer';
            block.setAttribute('data-derivation', derivationType);
            block.addEventListener('click', function(e) {
                e.stopPropagation();
                openDerivationModal(derivationType);
            });
            block.title = 'Click to see derivation';
        }
    });
}

// ===========================
// Initialization
// ===========================
async function init() {
    // Load all data first
    await Promise.all([
        loadNavigationData(),
        loadContentData(),
        loadQuestionsData(),
        loadDerivationsData()
    ]);
    
    // Render navigation
    renderNavigation();
    
    // Initialize tab navigation
    initTabNavigation();
    initSubmitButton();
    
    // Initialize questions panel
    initQuestionsPanel();
    
    // Load content from URL hash if present
    const hash = window.location.hash.substring(1);
    if (hash) {
        loadContent(hash);
        const link = document.querySelector(`a[href="#${hash}"]`);
        if (link) setActiveLink(link);
    }
    
    // Set up modal event listeners
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('derivation-modal');
        if (e.target === modal) {
            closeDerivationModal();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeDerivationModal();
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ===========================
// Monster Physics Mode
// ===========================

// Monster Mode Global State
let monsterQuestionsData = null;
let monsterQuotesData = null;
let currentChallenge = {
    topicId: null,
    questions: [],
    currentIndex: 0,
    answers: [],
    correctAnswers: []
};

// ===========================
// Monster Data Loading
// ===========================
async function loadMonsterQuestionsData() {
    try {
        const response = await fetch('data/monster-questions.json');
        monsterQuestionsData = await response.json();
        return monsterQuestionsData;
    } catch (error) {
        console.error('Error loading monster questions:', error);
        return null;
    }
}

async function loadMonsterQuotesData() {
    try {
        const response = await fetch('data/monster-quotes.json');
        monsterQuotesData = await response.json();
        return monsterQuotesData;
    } catch (error) {
        console.error('Error loading monster quotes:', error);
        return null;
    }
}

// ===========================
// Tab Navigation
// ===========================
function initTabNavigation() {
    const tabs = document.querySelectorAll('.main-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const view = tab.dataset.view;
            switchView(view);
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });
}

function switchView(viewName) {
    const textbookView = document.getElementById('textbook-view');
    const monsterView = document.getElementById('monster-view');
    
    if (viewName === 'textbook') {
        textbookView.style.display = 'block';
        monsterView.style.display = 'none';
    } else if (viewName === 'monster') {
        textbookView.style.display = 'none';
        monsterView.style.display = 'block';
        initMonsterMode();
    }
}

// ===========================
// Monster Mode Initialization
// ===========================
async function initMonsterMode() {
    // Load data if not already loaded
    if (!monsterQuestionsData) {
        await loadMonsterQuestionsData();
    }
    if (!monsterQuotesData) {
        await loadMonsterQuotesData();
    }
    
    // Show arena selection
    showArenaSelection();
}

function showArenaSelection() {
    document.getElementById('arena-selection').style.display = 'block';
    document.getElementById('challenge-area').style.display = 'none';
    document.getElementById('report-card').style.display = 'none';
    
    renderArenaTopics();
}

function renderArenaTopics() {
    const grid = document.getElementById('arena-grid');
    if (!grid || !monsterQuestionsData) return;
    
    grid.innerHTML = '';
    
    const topics = monsterQuestionsData.topics;
    for (const [topicId, topic] of Object.entries(topics)) {
        const card = document.createElement('div');
        card.className = 'arena-card';
        card.innerHTML = `
            <div class="arena-card-icon">${topic.icon}</div>
            <div class="arena-card-title">${topic.title}</div>
            <div class="arena-card-count">${topic.questions.length} questions</div>
        `;
        card.onclick = () => startChallenge(topicId);
        grid.appendChild(card);
    }
}

// ===========================
// Challenge Management
// ===========================
function startChallenge(topicId) {
    const topic = monsterQuestionsData.topics[topicId];
    if (!topic) return;
    
    // Reset challenge state
    currentChallenge = {
        topicId: topicId,
        questions: [],
        currentIndex: 0,
        answers: [],
        correctAnswers: []
    };
    
    // Select 5 random questions (or all if less than 5)
    const allQuestions = topic.questions;
    const shuffled = shuffleArray([...allQuestions]);
    currentChallenge.questions = shuffled.slice(0, 5);
    
    // Generate the actual question instances with randomized values
    currentChallenge.questions = currentChallenge.questions.map(q => generateQuestion(q));
    
    // Show challenge area
    document.getElementById('arena-selection').style.display = 'none';
    document.getElementById('challenge-area').style.display = 'block';
    document.getElementById('report-card').style.display = 'none';
    
    // Update topic name
    document.getElementById('challenge-topic').textContent = topic.title;
    
    // Reset progress dots
    resetProgressDots();
    
    // Show first question
    showQuestion(0);
}

function generateQuestion(template) {
    const generated = {
        level: template.level,
        type: template.type,
        unit: template.unit || '',
        trap_explanation: template.trap_explanation || '',
        originalTemplate: template
    };
    
    // Generate random values for variables
    const variables = {};
    if (template.variables) {
        for (const [key, values] of Object.entries(template.variables)) {
            if (Array.isArray(values)) {
                variables[key] = values[Math.floor(Math.random() * values.length)];
            } else if (values.min !== undefined && values.max !== undefined) {
                const step = values.step || 1;
                const range = Math.floor((values.max - values.min) / step) + 1;
                variables[key] = values.min + (Math.floor(Math.random() * range) * step);
            }
        }
    }
    generated.variables = variables;
    
    // Generate question text
    let text = template.template;
    for (const [key, value] of Object.entries(variables)) {
        text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    generated.text = text;
    
    // Calculate correct answer
    if (template.fixed_answer !== undefined) {
        generated.correctAnswer = template.fixed_answer;
    } else if (template.answer_formula) {
        generated.correctAnswer = calculateAnswer(template.answer_formula, variables);
    }
    
    // Generate answer options for multiple choice
    if (template.type === 'multiple-choice') {
        const options = [];
        
        // Add correct answer
        let correctDisplay;
        if (typeof generated.correctAnswer === 'number') {
            correctDisplay = `${roundAnswer(generated.correctAnswer)} ${generated.unit}`;
        } else {
            correctDisplay = String(generated.correctAnswer).replace(/\{(\w+)\}/g, (_, key) => variables[key]);
        }
        options.push({ value: generated.correctAnswer, display: correctDisplay, isCorrect: true });
        
        // Generate wrong answers
        if (template.wrong_formulas) {
            template.wrong_formulas.forEach(formula => {
                const wrongValue = calculateAnswer(formula, variables);
                options.push({ 
                    value: wrongValue, 
                    display: `${roundAnswer(wrongValue)} ${generated.unit}`,
                    isCorrect: false 
                });
            });
        } else if (template.wrong_answers) {
            template.wrong_answers.forEach(wa => {
                const display = wa.replace(/\{(\w+)\}/g, (_, key) => variables[key]);
                options.push({ value: display, display: display, isCorrect: false });
            });
        }
        
        generated.options = shuffleArray(options);
    }
    
    generated.tolerance = template.tolerance || 0.1;
    
    return generated;
}

function calculateAnswer(formula, variables) {
    try {
        // Create a function with the variables in scope
        const varNames = Object.keys(variables);
        const varValues = Object.values(variables);
        const fn = new Function(...varNames, `return ${formula}`);
        return fn(...varValues);
    } catch (e) {
        console.error('Error calculating answer:', e);
        return 0;
    }
}

function roundAnswer(value) {
    if (typeof value !== 'number') return value;
    // Round to 2 decimal places
    return Math.round(value * 100) / 100;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ===========================
// Question Display
// ===========================
function showQuestion(index) {
    currentChallenge.currentIndex = index;
    const question = currentChallenge.questions[index];
    
    // Update question number
    document.getElementById('question-number').textContent = `Question ${index + 1}/5`;
    
    // Update difficulty stars
    const stars = '*'.repeat(question.level);
    document.getElementById('difficulty-stars').textContent = stars;
    
    // Update progress dots
    updateProgressDots(index);
    
    // Display question text
    document.getElementById('question-text').textContent = question.text;
    
    // Render answer area
    renderAnswerArea(question);
    
    // Reset hint button
    resetHint();
    
    // Disable submit button
    document.getElementById('submit-btn').disabled = true;
}

function renderAnswerArea(question) {
    const area = document.getElementById('answer-area');
    area.innerHTML = '';
    
    if (question.type === 'multiple-choice') {
        question.options.forEach((option, i) => {
            const btn = document.createElement('button');
            btn.className = 'answer-option';
            btn.textContent = option.display;
            btn.onclick = () => selectAnswer(btn, option);
            area.appendChild(btn);
        });
    } else if (question.type === 'numeric') {
        const container = document.createElement('div');
        container.className = 'numeric-input-container';
        container.innerHTML = `
            <input type="number" class="numeric-input" id="numeric-answer" step="any" placeholder="?">
            <span class="numeric-unit">${question.unit}</span>
        `;
        area.appendChild(container);
        
        // Enable submit when input has value
        const input = container.querySelector('#numeric-answer');
        input.addEventListener('input', () => {
            document.getElementById('submit-btn').disabled = input.value === '';
        });
        input.focus();
    }
}

function selectAnswer(button, option) {
    // Remove selection from other buttons
    document.querySelectorAll('.answer-option').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Select this button
    button.classList.add('selected');
    
    // Store selected answer
    currentChallenge.selectedAnswer = option;
    
    // Enable submit
    document.getElementById('submit-btn').disabled = false;
}

function resetProgressDots() {
    const dots = document.querySelectorAll('.progress-dots .dot');
    dots.forEach(dot => {
        dot.classList.remove('answered', 'current', 'correct', 'incorrect');
    });
}

function updateProgressDots(currentIndex) {
    const dots = document.querySelectorAll('.progress-dots .dot');
    dots.forEach((dot, i) => {
        dot.classList.remove('current');
        if (i < currentIndex) {
            dot.classList.add('answered');
        }
        if (i === currentIndex) {
            dot.classList.add('current');
        }
    });
}

function addGlossaryClickHandlers() {
    const terms = document.querySelectorAll('.glossary-term');
    terms.forEach(term => {
        term.addEventListener('click', function(e) {
            e.stopPropagation();
            const isActive = term.classList.contains('active');
            terms.forEach(t => t.classList.remove('active'));
            if (!isActive) {
                term.classList.add('active');
            }
        });
    });
    
    // Close on clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.glossary-term')) {
            document.querySelectorAll('.glossary-term').forEach(t => t.classList.remove('active'));
        }
    });
}

// ===========================
// Submit and Progress
// ===========================
function initSubmitButton() {
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitAnswer);
    }
    
    const backBtn = document.getElementById('back-to-arena');
    if (backBtn) {
        backBtn.addEventListener('click', showArenaSelection);
    }
}

function submitAnswer() {
    const question = currentChallenge.questions[currentChallenge.currentIndex];
    let userAnswer;
    let isCorrect;
    
    if (question.type === 'multiple-choice') {
        userAnswer = currentChallenge.selectedAnswer;
        isCorrect = userAnswer && userAnswer.isCorrect;
    } else if (question.type === 'numeric') {
        const input = document.getElementById('numeric-answer');
        userAnswer = parseFloat(input.value);
        const tolerance = question.tolerance || 0.5;
        isCorrect = Math.abs(userAnswer - question.correctAnswer) <= tolerance;
    }
    
    // Store answer
    currentChallenge.answers.push({
        question: question,
        userAnswer: userAnswer,
        isCorrect: isCorrect
    });
    
    // Mark dot
    const dots = document.querySelectorAll('.progress-dots .dot');
    dots[currentChallenge.currentIndex].classList.add('answered');
    
    // Move to next question or show report
    if (currentChallenge.currentIndex < currentChallenge.questions.length - 1) {
        currentChallenge.selectedAnswer = null;
        showQuestion(currentChallenge.currentIndex + 1);
    } else {
        showReportCard();
    }
}

// ===========================
// Report Card
// ===========================
function showReportCard() {
    document.getElementById('arena-selection').style.display = 'none';
    document.getElementById('challenge-area').style.display = 'none';
    document.getElementById('report-card').style.display = 'block';
    
    const correctCount = currentChallenge.answers.filter(a => a.isCorrect).length;
    const total = currentChallenge.answers.length;
    
    // Determine level
    const level = determineLevel(correctCount);
    const levelData = monsterQuotesData.levels[level];
    
    // Update display
    document.getElementById('level-icon').textContent = levelData.icon;
    document.getElementById('level-title').textContent = levelData.title;
    document.getElementById('report-level').setAttribute('data-level', level);
    
    document.getElementById('report-score').textContent = `${correctCount}/${total}`;
    
    // Random quote
    const quotes = levelData.quotes;
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    document.getElementById('report-quote').textContent = randomQuote;
    
    // Render breakdown
    renderBreakdown();
}

function determineLevel(correctCount) {
    if (correctCount === 5) return 'monster';
    if (correctCount === 4) return 'adept';
    if (correctCount === 3) return 'grown';
    if (correctCount === 2) return 'toddler';
    return 'baby';
}

function renderBreakdown() {
    const breakdown = document.getElementById('report-breakdown');
    breakdown.innerHTML = '';
    
    currentChallenge.answers.forEach((answer, i) => {
        const item = document.createElement('div');
        item.className = `breakdown-item ${answer.isCorrect ? 'correct' : 'incorrect'}`;
        
        let userAnswerDisplay = '';
        if (answer.question.type === 'multiple-choice') {
            userAnswerDisplay = answer.userAnswer ? answer.userAnswer.display : 'No answer';
        } else {
            userAnswerDisplay = `${answer.userAnswer} ${answer.question.unit}`;
        }
        
        let correctAnswerDisplay = '';
        if (answer.question.type === 'multiple-choice') {
            const correctOption = answer.question.options.find(o => o.isCorrect);
            correctAnswerDisplay = correctOption ? correctOption.display : '';
        } else {
            correctAnswerDisplay = `${roundAnswer(answer.question.correctAnswer)} ${answer.question.unit}`;
        }
        
        item.innerHTML = `
            <div class="breakdown-question">Q${i + 1}: ${answer.question.text}</div>
            <div class="breakdown-answer user-answer">Your answer: ${userAnswerDisplay}</div>
            ${!answer.isCorrect ? `<div class="breakdown-answer correct-answer">Correct: ${correctAnswerDisplay}</div>` : ''}
            ${answer.question.trap_explanation ? `<div class="breakdown-explanation">Tip: ${answer.question.trap_explanation}</div>` : ''}
        `;
        
        breakdown.appendChild(item);
    });
}

// ===========================
// Update Init Function
// ===========================
const originalInit = init;
init = async function() {
    // Call original init
    await originalInit.call(this);
    
    // Initialize Monster Mode
    initTabNavigation();
    initSubmitButton();
    
    // Load monster data in background
    loadMonsterQuestionsData();
    loadMonsterQuotesData();
};

// ===========================
// Hint Functionality
// ===========================
function showHint() {
    const question = currentChallenge.questions[currentChallenge.currentIndex];
    const hintDisplay = document.getElementById('hint-display');
    const hintText = document.getElementById('hint-text');
    const hintBtn = document.getElementById('hint-btn');
    
    if (question && question.hint) {
        hintText.textContent = question.hint;
        hintDisplay.style.display = 'block';
        hintBtn.disabled = true;
        hintBtn.textContent = 'Hint shown';
    } else {
        hintText.textContent = 'No hint available for this question. Think about the fundamental concepts!';
        hintDisplay.style.display = 'block';
        hintBtn.disabled = true;
    }
}

function resetHint() {
    const hintDisplay = document.getElementById('hint-display');
    const hintBtn = document.getElementById('hint-btn');
    
    if (hintDisplay) hintDisplay.style.display = 'none';
    if (hintBtn) {
        hintBtn.disabled = false;
        hintBtn.innerHTML = '<span class="hint-icon">?</span> Need a hint?';
    }
}

// ===========================
// Question Bank Mode
// ===========================
let questionBankData = null;
let completedQuestions = JSON.parse(localStorage.getItem('qb_completed') || '[]');
let currentTopicFilter = 'all';
let currentStatusFilter = 'all';
let currentPaperFilter = 'all';
let currentLevelFilter = 'all';

async function loadQuestionBankData() {
    try {
        const response = await fetch('data/question-bank.json');
        questionBankData = await response.json();
        return questionBankData;
    } catch (error) {
        console.error('Error loading question bank data:', error);
        return null;
    }
}

async function initQuestionBankMode() {
    if (!questionBankData) {
        await loadQuestionBankData();
    }
    
    // Auto-select topic based on current page hash
    let hash = window.location.hash.substring(1);
    if (hash && navigationData && navigationData.coreThemes.some(t => t.id === hash || t.topics.some(topic => topic.id === hash))) {
        currentTopicFilter = hash;
    } else {
        currentTopicFilter = 'all';
    }
    
    renderQBSidebar();
    setupQBFilters();
    renderQBQuestions();
}

function renderQBSidebar() {
    const sidebar = document.getElementById('qb-topics');
    if (!sidebar || !navigationData) return;
    
    let html = '';
    
    navigationData.coreThemes.forEach(theme => {
        // Count questions for this theme
        const themeQuestions = questionBankData?.questions?.filter(q => 
            theme.topics.some(t => t.id === q.topic)
        ) || [];
        const completed = themeQuestions.filter(q => completedQuestions.includes(q.id)).length;
        const total = themeQuestions.length;
        const percent = total > 0 ? (completed / total) * 100 : 0;
        const circumference = 2 * Math.PI * 14;
        const offset = circumference - (percent / 100) * circumference;
        
        html += `
            <div class="qb-topic-item" data-theme="${theme.id}" onclick="filterByTheme('${theme.id}')">
                <div class="qb-progress-ring">
                    <svg width="36" height="36" viewBox="0 0 36 36">
                        <circle class="bg" cx="18" cy="18" r="14"/>
                        <circle class="progress" cx="18" cy="18" r="14" 
                            stroke-dasharray="${circumference}" 
                            stroke-dashoffset="${offset}"/>
                    </svg>
                    <span class="qb-progress-text">${completed}/${total}</span>
                </div>
                <span class="qb-topic-name">${theme.title}</span>
            </div>
        `;
        
        // Subtopics
        html += '<div class="qb-subtopics">';
        theme.topics.forEach(topic => {
            html += `
                <div class="qb-subtopic-item" data-topic="${topic.id}" onclick="filterByTopic('${topic.id}')">
                    ${topic.title}
                </div>
            `;
        });
        html += '</div>';
    });
    
    sidebar.innerHTML = html;
}

function setupQBFilters() {
    const statusFilter = document.getElementById('filter-status');
    const paperFilter = document.getElementById('filter-paper');
    const levelFilter = document.getElementById('filter-level');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            currentStatusFilter = e.target.value;
            renderQBQuestions();
        });
    }
    
    if (paperFilter) {
        paperFilter.addEventListener('change', (e) => {
            currentPaperFilter = e.target.value;
            renderQBQuestions();
        });
    }
    
    if (levelFilter) {
        levelFilter.addEventListener('change', (e) => {
            currentLevelFilter = e.target.value;
            renderQBQuestions();
        });
    }
}

function filterByTheme(themeId) {
    currentTopicFilter = themeId;
    document.querySelectorAll('.qb-topic-item').forEach(el => {
        el.classList.toggle('active', el.dataset.theme === themeId);
    });
    renderQBQuestions();
}

function filterByTopic(topicId) {
    currentTopicFilter = topicId;
    document.querySelectorAll('.qb-subtopic-item').forEach(el => {
        el.classList.toggle('active', el.dataset.topic === topicId);
    });
    renderQBQuestions();
}

function renderQBQuestions() {
    const container = document.getElementById('qb-questions');
    if (!container || !questionBankData) return;
    
    let questions = questionBankData.questions || [];
    
    // Apply filters
    if (currentTopicFilter !== 'all') {
        questions = questions.filter(q => 
            q.topic === currentTopicFilter || 
            navigationData.coreThemes.find(t => t.id === currentTopicFilter)?.topics.some(topic => topic.id === q.topic)
        );
    }
    
    if (currentStatusFilter === 'completed') {
        questions = questions.filter(q => completedQuestions.includes(q.id));
    } else if (currentStatusFilter === 'incomplete') {
        questions = questions.filter(q => !completedQuestions.includes(q.id));
    }
    
    if (currentPaperFilter !== 'all') {
        questions = questions.filter(q => q.paper === currentPaperFilter);
    }
    
    if (currentLevelFilter !== 'all') {
        questions = questions.filter(q => q.level === currentLevelFilter);
    }
    
    if (questions.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center; padding: 2rem;">No questions match your filters.</p>';
        return;
    }
    
    // Filter into categories for balanced selection
    const graphQuestions = questions.filter(q => q.tags && q.tags.includes('Graphical'));
    const hardQuestions = questions.filter(q => q.id.startsWith('kin-hard') && !(q.tags && q.tags.includes('Graphical')));
    const regularQuestions = questions.filter(q => !(q.tags && q.tags.includes('Graphical')) && !q.id.startsWith('kin-hard'));

    // Shuffle categories
    graphQuestions.sort(() => 0.5 - Math.random());
    hardQuestions.sort(() => 0.5 - Math.random());
    regularQuestions.sort(() => 0.5 - Math.random());

    // Select the required amounts
    let selectedQuestions = [];
    if (graphQuestions.length > 0) selectedQuestions.push(graphQuestions.pop());
    if (hardQuestions.length > 0) selectedQuestions.push(hardQuestions.pop());
    
    // Fill the rest up to 10
    while (selectedQuestions.length < 10 && regularQuestions.length > 0) {
        selectedQuestions.push(regularQuestions.pop());
    }
    
    // If still less than 10, fill with leftovers
    const leftovers = [...graphQuestions, ...hardQuestions].sort(() => 0.5 - Math.random());
    while (selectedQuestions.length < 10 && leftovers.length > 0) {
        selectedQuestions.push(leftovers.pop());
    }

    // Final shuffle so the graph/hard aren't always questions 1 and 2
    questions = selectedQuestions.sort(() => 0.5 - Math.random());
    
    let html = '';
    questions.forEach((q, idx) => {
        const levelClass = q.level === 'HL' ? 'hl' : 'sl';
        const paperClass = q.paper === 'Paper 1' ? 'paper1' : 'paper2';
        
        html += `
            <div class="qb-question-card" data-id="${q.id}">
                <div class="qb-card-header">
                    <span class="qb-question-number">Question ${idx + 1}</span>
                    <div class="qb-tags">
                        <span class="qb-tag ${levelClass}">${q.level}</span>
                        <span class="qb-tag ${paperClass}">${q.paper}</span>
                        <span class="qb-tag ${q.difficulty}">${q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}</span>
                        ${q.tags?.map(tag => `<span class="qb-tag">${tag}</span>`).join('') || ''}
                    </div>
                </div>
                ${q.image ? `<div class="qb-question-image"><img src="${q.image}" alt="Question diagram"></div>` : ""}
                <div class="qb-question-text">${q.question_text}</div>
                <div class="qb-answer-area">
                    ${q.type === 'numerical' 
                        ? `<div style="display: flex; align-items: center; gap: 10px;">
                               <input type="number" step="any" id="input-${q.id}" class="qb-numerical-input" placeholder="Enter number..." style="padding: 10px; border-radius: 6px; border: 1px solid #4c1d95; background: #2e1065; color: #fff; width: 200px; font-size: 1rem;">
                               <span style="color: #d8b4fe; font-size: 1.1rem;">${q.unit || ''}</span>
                           </div>
                           <div id="feedback-${q.id}" style="margin-top: 10px; font-size: 1rem;"></div>`
                        : q.type === 'mcq' && q.options
                        ? `<div class="qb-mcq-options" style="display: flex; flex-direction: column; gap: 10px;">
                               ${q.options.map((opt, i) => `
                                   <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 10px; border-radius: 6px; background: rgba(76, 29, 149, 0.2); border: 1px solid rgba(76, 29, 149, 0.5);">
                                       <input type="radio" name="mcq-${q.id}" value="${i}" style="accent-color: #39ff14; width: 1.2rem; height: 1.2rem;">
                                       <span style="color: #ede9fe; font-size: 1rem;">${String.fromCharCode(65 + i)}) ${opt}</span>
                                   </label>
                               `).join('')}
                           </div>
                           <div id="feedback-${q.id}" style="margin-top: 10px; font-size: 1rem;"></div>`
                        : `<textarea class="qb-answer-textarea" id="input-${q.id}" placeholder="Write your answer here..."></textarea>`
                    }
                </div>
                <div class="qb-card-actions">
                    <button class="qb-btn qb-btn-markscheme" onclick="toggleMarkscheme('${q.id}')">Markscheme</button>
                    <button class="qb-btn qb-btn-grade" onclick="gradeAnswer('${q.id}')">Grade Answer</button>
                </div>
                <div class="qb-markscheme" id="markscheme-${q.id}">
                    <div class="qb-markscheme-label">Markscheme</div>
                    <div class="qb-markscheme-content">${q.markscheme_answer}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function toggleMarkscheme(questionId) {
    const markscheme = document.getElementById(`markscheme-${questionId}`);
    if (markscheme) {
        markscheme.classList.toggle('visible');
    }
    
    // Mark as completed
    if (!completedQuestions.includes(questionId)) {
        completedQuestions.push(questionId);
        localStorage.setItem('qb_completed', JSON.stringify(completedQuestions));
        renderQBSidebar(); // Update progress rings
    }
}

function gradeAnswer(questionId) {
    const q = questionBankData.questions.find(x => x.id === questionId);
    if (!q) return;

    if (q.type === 'numerical') {
        const inputEl = document.getElementById(`input-${questionId}`);
        const feedbackEl = document.getElementById(`feedback-${questionId}`);
        
        if (!inputEl || inputEl.value.trim() === '') {
            feedbackEl.innerHTML = '<span style="color: #ef4444;">Please enter a numerical answer.</span>';
            return;
        }
        
        const userAnswer = parseFloat(inputEl.value);
        if (isNaN(userAnswer)) {
            feedbackEl.innerHTML = '<span style="color: #ef4444;">Please enter a valid number.</span>';
            return;
        }
        
        const correctAnswer = q.answer;
        const tolerance = q.tolerance || 0.05;
        const diff = Math.abs(userAnswer - correctAnswer);
        
        if (diff <= tolerance) {
            feedbackEl.innerHTML = `<span style="color: #22c55e; font-weight: bold;">Correct!</span>`;
            inputEl.style.border = '2px solid #22c55e';
            inputEl.style.background = 'rgba(34, 197, 94, 0.1)';
        } else {
            feedbackEl.innerHTML = '<span style="color: #ef4444; font-weight: bold;">Incorrect.</span> See Markscheme.';
            inputEl.style.border = '2px solid #ef4444';
            inputEl.style.background = 'rgba(239, 68, 68, 0.1)';
        }
    } else if (q.type === 'mcq') {
        const feedbackEl = document.getElementById(`feedback-${questionId}`);
        const selected = document.querySelector(`input[name="mcq-${questionId}"]:checked`);
        
        if (!selected) {
            feedbackEl.innerHTML = '<span style="color: #ef4444;">Please select an option.</span>';
            return;
        }
        
        const userIdx = parseInt(selected.value);
        const correctIdx = q.answer;
        
        // Reset borders
        const allOptions = document.querySelectorAll(`input[name="mcq-${questionId}"]`);
        allOptions.forEach(opt => {
            opt.parentElement.style.border = '1px solid rgba(76, 29, 149, 0.5)';
            opt.parentElement.style.background = 'rgba(76, 29, 149, 0.2)';
        });
        
        const correctInput = document.querySelector(`input[name="mcq-${questionId}"][value="${correctIdx}"]`);
        
        if (userIdx === correctIdx) {
            feedbackEl.innerHTML = `<span style="color: #22c55e; font-weight: bold;">Correct!</span>`;
            selected.parentElement.style.border = '2px solid #22c55e';
            selected.parentElement.style.background = 'rgba(34, 197, 94, 0.2)';
        } else {
            feedbackEl.innerHTML = '<span style="color: #ef4444; font-weight: bold;">Incorrect.</span> The correct answer is highlighted in green.';
            selected.parentElement.style.border = '2px solid #ef4444';
            selected.parentElement.style.background = 'rgba(239, 68, 68, 0.2)';
            
            if (correctInput) {
                correctInput.parentElement.style.border = '2px solid #22c55e';
                correctInput.parentElement.style.background = 'rgba(34, 197, 94, 0.2)';
            }
        }
    }
    
    // Reveal the markscheme and mark as completed
    const markscheme = document.getElementById(`markscheme-${questionId}`);
    if (markscheme && !markscheme.classList.contains('visible')) {
        toggleMarkscheme(questionId);
    }
}

// Override initMonsterMode to use Question Bank
async function initMonsterMode() {
    await initQuestionBankMode();
}


// ===========================
// Question Panel ScrollSpy
// ===========================
let questionObserver = null;

function initQuestionScrollSpy(sectionId) {
    if (questionObserver) {
        questionObserver.disconnect();
    }
    
    const items = document.querySelectorAll('.question-item[data-target]');
    if (!items.length) return;
    
    const questionsPanel = document.getElementById('questions');
    const contentArea = document.querySelector('.content-area');
    
    if (!questionsPanel || !contentArea) return;
    
    const observerOptions = {
        root: contentArea,
        rootMargin: '-10% 0px -70% 0px', // Trigger when heading enters top 30% of screen
        threshold: 0
    };
    
    questionObserver = new IntersectionObserver((entries) => {
        // Find the most recently intersecting target
        let activeTargetId = null;
        
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                activeTargetId = entry.target.id;
            }
        });
        
        if (activeTargetId) {
            const questionItems = document.querySelectorAll('.question-item');
            const targetItem = document.querySelector(`.question-item[data-target="${activeTargetId}"]`);
            
            if (targetItem && !targetItem.classList.contains('active')) {
                questionItems.forEach(i => {
                    i.classList.remove('active');
                    i.classList.add('dim');
                });
                
                targetItem.classList.remove('dim');
                targetItem.classList.add('active');
                
                // Smooth scroll the panel to the active item if panel is expanded
                const panelContainer = document.getElementById('questions-panel');
                if (panelContainer && panelContainer.classList.contains('expanded')) {
                    const itemOffset = targetItem.offsetTop;
                    const panelHeight = questionsPanel.clientHeight;
                    const itemHeight = targetItem.clientHeight;
                    
                    questionsPanel.scrollTo({
                        top: itemOffset - (panelHeight / 2) + (itemHeight / 2),
                        behavior: 'smooth'
                    });
                }
            }
        }
    }, observerOptions);
    
    // Observe all targets in the main content
    items.forEach(item => {
        const targetId = item.getAttribute('data-target');
        if (targetId) {
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                questionObserver.observe(targetEl);
            }
        }
    });
}
