
// Chatbot functionality
const chatbotButton = document.getElementById('chatbotButton');
const chatbotWidget = document.getElementById('chatbotWidget');
const chatbotClose = document.getElementById('chatbotClose');
const chatbotInput = document.getElementById('chatbotInput');
const chatbotSend = document.getElementById('chatbotSend');
const chatbotMessages = document.getElementById('chatbotMessages');

chatbotButton.addEventListener('click', function () {
    chatbotWidget.classList.toggle('open');
});

chatbotClose.addEventListener('click', function () {
    chatbotWidget.classList.remove('open');
});

// Función para agregar mensaje
function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
    // Convertir saltos de línea a <br> para HTML
    messageDiv.innerHTML = text.replace(/\n/g, '<br>');
    chatbotMessages.appendChild(messageDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    return messageDiv;
}

// Función para mostrar animación "Pensando"
function showThinking() {
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'thinking';
    thinkingDiv.innerHTML = '<div class="thinking-dot"></div><div class="thinking-dot"></div><div class="thinking-dot"></div>';
    chatbotMessages.appendChild(thinkingDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    return thinkingDiv;
}

// Función para remover animación "Pensando"
function removeThinking(thinkingDiv) {
    if (thinkingDiv && thinkingDiv.parentNode) {
        thinkingDiv.parentNode.removeChild(thinkingDiv);
    }
}


// Función para mostrar confirmación
function showConfirmation(message, onConfirm, onCancel) {
    const messageDiv = addMessage(message, false);
    
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'confirmation-buttons';
    
    const yesBtn = document.createElement('button');
    yesBtn.className = 'confirm-btn yes';
    yesBtn.textContent = 'Sí';
    yesBtn.onclick = function() {
        messageDiv.remove();
        onConfirm();
    };
    
    const noBtn = document.createElement('button');
    noBtn.className = 'confirm-btn no';
    noBtn.textContent = 'No';
    noBtn.onclick = function() {
        messageDiv.remove();
        if (onCancel) onCancel();
    };
    
    buttonsDiv.appendChild(yesBtn);
    buttonsDiv.appendChild(noBtn);
    messageDiv.appendChild(buttonsDiv);
}


// Función principal para enviar mensaje
function sendMessage() {
    const message = chatbotInput.value.trim();
    if (message) {
        addMessage(message, true);
        chatbotInput.value = '';
        
        // Mostrar animación "Pensando"
        const thinkingDiv = showThinking();
        
        // Procesar después de 1 segundo
        setTimeout(() => {
            removeThinking(thinkingDiv);
            
            const commandProcessed = processCommand(message);
            
            if (!commandProcessed) {
                addMessage(`No pude entender tu solicitud. Puedo ayudarte a:\n
                    • Cargar horas diarias: "Cargá 8h de Desarrollo Web al proyecto Alfa hoy"
                    • Cargar horas en bloque: "Cargá 4h de Reunión con el Cliente en proyecto Alfa de lunes a viernes"
                    • Editar horas: "Cambiá las horas de la tarea Planificación de ayer en proyecto Beta a 3h"
                    • Eliminar horas: "Eliminá las horas de la tarea Planificación del martes en proyecto Gamma" o "Eliminá todas las horas de todas las tareas de esta semana"
                    • Duplicar horas de la semana pasada a esta semana: "Copiá mis horas de la semana pasada en proyecto Delta"
                    • Completar el mes restante con las horas del proyecto Delta de esta semana: "Completá el mes restante con las horas del proyecto Delta de esta semana"
                                    
                    ¿Puedes reformular tu pedido?`);
            }
        }, 1000);
    }
}

chatbotSend.addEventListener('click', sendMessage);
chatbotInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});