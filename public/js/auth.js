// Auth page functionality

let verificationQuestions = [];
let selectedAnswers = {};

// Load faculties on page load
document.addEventListener('DOMContentLoaded', () => {
    loadFaculties();
});

// Load faculties from API
async function loadFaculties() {
    try {
        const response = await fetch('/api/faculties');
        const faculties = await response.json();
        
        const facultySelect = document.getElementById('regFaculty');
        faculties.forEach(faculty => {
            const option = document.createElement('option');
            option.value = faculty;
            option.textContent = faculty;
            facultySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading faculties:', error);
    }
}

// Show/Hide Forms
function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('verificationSection').style.display = 'none';
}

// Login Form Submit
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            window.location.href = '/dashboard';
        } else {
            alert(data.error || 'Giriş uğursuz oldu');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Server xətası');
    }
});

// Continue Button - Load Verification Questions
document.getElementById('continueBtn').addEventListener('click', async () => {
    // Validate all fields
    const fullName = document.getElementById('regFullName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const faculty = document.getElementById('regFaculty').value;
    const degree = document.getElementById('regDegree').value;
    const course = document.getElementById('regCourse').value;
    const password = document.getElementById('regPassword').value;
    
    if (!fullName || !email || !phone || !faculty || !degree || !course || !password) {
        alert('Bütün sahələri doldurun');
        return;
    }
    
    // Validate email
    if (!email.endsWith('@bsu.edu.az')) {
        alert('Email @bsu.edu.az ilə bitməlidir');
        return;
    }
    
    // Validate phone
    if (phone.length !== 9 || !/^\d+$/.test(phone)) {
        alert('Telefon nömrəsi 9 rəqəm olmalıdır');
        return;
    }
    
    // Load verification questions
    try {
        const response = await fetch('/api/verification-questions');
        verificationQuestions = await response.json();
        
        displayVerificationQuestions();
        
        document.getElementById('continueBtn').style.display = 'none';
        document.getElementById('registerBtn').style.display = 'block';
        document.getElementById('verificationSection').style.display = 'block';
    } catch (error) {
        console.error('Error loading questions:', error);
        alert('Server xətası');
    }
});

// Display Verification Questions
function displayVerificationQuestions() {
    const container = document.getElementById('verificationQuestions');
    container.innerHTML = '';
    
    verificationQuestions.forEach((q, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'verification-question';
        
        const questionText = document.createElement('p');
        questionText.textContent = `${index + 1}. ${q.question}`;
        questionDiv.appendChild(questionText);
        
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'verification-options';
        
        q.options.forEach(option => {
            const optionBtn = document.createElement('div');
            optionBtn.className = 'verification-option';
            optionBtn.textContent = option;
            optionBtn.onclick = () => selectAnswer(index, q.question, option, optionBtn);
            optionsDiv.appendChild(optionBtn);
        });
        
        questionDiv.appendChild(optionsDiv);
        container.appendChild(questionDiv);
    });
}

// Select Answer
function selectAnswer(index, question, answer, element) {
    // Deselect all options in this question
    const options = element.parentElement.querySelectorAll('.verification-option');
    options.forEach(opt => opt.classList.remove('selected'));
    
    // Select this option
    element.classList.add('selected');
    
    // Store answer
    selectedAnswers[index] = { question, answer };
}

// Register Form Submit
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Check if all questions are answered
    if (Object.keys(selectedAnswers).length < 3) {
        alert('Bütün sualları cavablandırın');
        return;
    }
    
    const fullName = document.getElementById('regFullName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = '+994' + document.getElementById('regPhone').value.trim();
    const faculty = document.getElementById('regFaculty').value;
    const degree = document.getElementById('regDegree').value;
    const course = document.getElementById('regCourse').value;
    const password = document.getElementById('regPassword').value;
    
    const verificationAnswers = Object.values(selectedAnswers);
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fullName,
                email,
                phone,
                faculty,
                degree,
                course,
                password,
                verificationAnswers
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Qeydiyyat uğurla tamamlandı! İndi daxil ola bilərsiniz.');
            showLogin();
            // Reset form
            document.getElementById('registerForm').reset();
            document.getElementById('verificationSection').style.display = 'none';
            document.getElementById('continueBtn').style.display = 'block';
            document.getElementById('registerBtn').style.display = 'none';
            selectedAnswers = {};
        } else {
            alert(data.error || 'Qeydiyyat uğursuz oldu');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Server xətası');
    }
});
