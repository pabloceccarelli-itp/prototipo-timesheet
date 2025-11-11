// Base de datos de tareas (mockup)
let tasksDatabase = [
    {
        id_tarea: 1,
        id_usuario: 1,
        centro_de_costo: "IT",
        proyecto: "Proyecto Alfa",
        tarea: "Planificación",
        fecha_inicio: "2025-11-10",
        fecha_fin: "2025-11-10",
        horas: 4,
        detalle: "Planificación del sprint"
    },
    {
        id_tarea: 2,
        id_usuario: 1,
        centro_de_costo: "IT",
        proyecto: "Proyecto Alfa",
        tarea: "Testing/Pruebas",
        fecha_inicio: "2025-11-10",
        fecha_fin: "2025-11-10",
        horas: 4,
        detalle: "Testing de funcionalidades"
    },
    {
        id_tarea: 3,
        id_usuario: 0,
        centro_de_costo: "HR",
        proyecto: "Administración",
        tarea: "Puente turístico no laborable",
        fecha_inicio: "2025-11-21",
        fecha_fin: "2025-11-21",
        horas: 0,
        detalle: "Día no laborable"
    },
    {
        id_tarea: 4,
        id_usuario: 0,
        centro_de_costo: "HR",
        proyecto: "Administración",
        tarea: "Día de la Soberanía Nacional",
        fecha_inicio: "2025-11-24",
        fecha_fin: "2025-11-24",
        horas: 0,
        detalle: "Feriado nacional"
    }
];

// Estado del calendario
let currentMonth = 11; // Noviembre
let currentYear = 2025;

// Nombres de meses en español
const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Nombres de días en español
const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const dayNamesShort = ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.'];

// Función para obtener el primer día del mes
function getFirstDayOfMonth(year, month) {
    return new Date(year, month - 1, 1).getDay();
}

// Función para obtener el número de días en un mes
function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

// Función para formatear fecha como YYYY-MM-DD
function formatDate(year, month, day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Función para obtener tareas de un día específico
function getTasksForDate(dateString) {
    return tasksDatabase.filter(task => task.fecha_inicio === dateString);
}

// Función para renderizar el calendario
function renderCalendar(year, month) {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';

    const firstDay = getFirstDayOfMonth(year, month);
    const daysInMonth = getDaysInMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month - 1);

    // Calcular cuántos días del mes anterior mostrar
    let daysToShow = [];
    let startDay = firstDay === 0 ? 6 : firstDay - 1; // Lunes = 0

    // Días del mes anterior
    for (let i = startDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        daysToShow.push({
            day: day,
            month: month - 1,
            year: year,
            isCurrentMonth: false
        });
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
        daysToShow.push({
            day: day,
            month: month,
            year: year,
            isCurrentMonth: true
        });
    }

    // Días del mes siguiente para completar la cuadrícula
    const totalCells = Math.ceil(daysToShow.length / 7) * 7;
    const remainingDays = totalCells - daysToShow.length;
    for (let day = 1; day <= remainingDays; day++) {
        daysToShow.push({
            day: day,
            month: month + 1,
            year: year,
            isCurrentMonth: false
        });
    }

    // Crear semanas
    for (let week = 0; week < daysToShow.length / 7; week++) {
        const weekDiv = document.createElement('div');
        weekDiv.className = 'calendar-week';

        for (let day = 0; day < 7; day++) {
            const dayIndex = week * 7 + day;
            if (dayIndex >= daysToShow.length) break;

            const dayData = daysToShow[dayIndex];
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';

            // Determinar si es fin de semana
            // day = 0 (lunes), 1 (martes), 2 (miércoles), 3 (jueves), 4 (viernes), 5 (sábado), 6 (domingo)
            if (day === 5 || day === 6) {
                console.log('Fin de semana: ', day);
                dayDiv.classList.add('weekend');
            } else {
                dayDiv.classList.add('weekday');
            }

            if (!dayData.isCurrentMonth) {
                dayDiv.classList.add('off-range');
            }

            // Número del día
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = dayData.day;
            dayDiv.appendChild(dayNumber);

            // Eventos del día
            const dateString = formatDate(dayData.year, dayData.month, dayData.day);
            const tasks = getTasksForDate(dateString);

            if (tasks.length > 0) {
                const eventsDiv = document.createElement('div');
                eventsDiv.className = 'day-events';

                // Calcular horas totales
                const totalHours = tasks.reduce((sum, task) => sum + task.horas, 0);
                if (totalHours > 0) {
                    const hoursDiv = document.createElement('div');
                    hoursDiv.className = 'event-hours';
                    hoursDiv.textContent = `${totalHours}hs`;
                    eventsDiv.appendChild(hoursDiv);
                }

                tasks.forEach(task => {
                    if (task.horas > 0) {
                        const eventDiv = document.createElement('div');
                        eventDiv.className = 'event-item blue';
                        eventDiv.textContent = task.tarea;
                        eventDiv.title = `${task.tarea} - ${task.horas}hs`;
                        eventDiv.style.whiteSpace = 'normal';
                        eventsDiv.appendChild(eventDiv);
                    } else {
                        const eventDiv = document.createElement('div');
                        eventDiv.className = 'event-item purple';
                        eventDiv.textContent = task.tarea;
                        eventDiv.title = task.detalle;
                        eventDiv.style.whiteSpace = 'normal';
                        eventsDiv.appendChild(eventDiv);
                    }
                });

                dayDiv.appendChild(eventsDiv);
            }

            weekDiv.appendChild(dayDiv);
        }

        calendarGrid.appendChild(weekDiv);
    }

    // Actualizar selector de mes
    const monthSelector = document.getElementById('monthSelector');
    monthSelector.value = `${year}-${String(month).padStart(2, '0')}`;

    // Actualizar resumen de horas
    updateHoursSummary(year, month);
}

// Función para actualizar el resumen de horas
function updateHoursSummary(year, month) {
    const daysInMonth = getDaysInMonth(year, month);
    let totalHours = 0;

    // Calcular horas cargadas en el mes
    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = formatDate(year, month, day);
        const tasks = getTasksForDate(dateString);
        totalHours += tasks.reduce((sum, task) => sum + task.horas, 0);
    }

    // Calcular horas laborables (días laborables * 8 horas)
    let laborableDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            laborableDays++;
        }
    }

    const horasLaborables = laborableDays * 8;
    const horasCargadas = totalHours;
    const horasPendientes = Math.max(0, horasLaborables - horasCargadas);

    document.getElementById('horasLaborables').textContent = horasLaborables;
    document.getElementById('horasCargadas').textContent = horasCargadas;
    document.getElementById('horasPendientes').textContent = horasPendientes;
}

// Event listeners
document.getElementById('monthSelector').addEventListener('change', function (e) {
    const [year, month] = e.target.value.split('-').map(Number);
    currentYear = year;
    currentMonth = month;
    renderCalendar(year, month);
});


// Función para obtener el próximo ID de tarea
function getNextTaskId() {
    if (tasksDatabase.length === 0) return 1;
    return Math.max(...tasksDatabase.map(t => t.id_tarea)) + 1;
}

// Función para obtener la fecha de hoy en formato YYYY-MM-DD
function getTodayDate() {
    const today = new Date();
    return formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
}

// Función para obtener fechas de lunes a viernes de la semana actual
function getWeekdaysDates() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = domingo, 1 = lunes, etc.
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Ajustar para que lunes sea el primer día

    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const weekdays = [];
    for (let i = 0; i < 5; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        weekdays.push(formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate()));
    }

    return weekdays;
}


// Función para crear tarea
function createTask(proyecto, tarea, fecha, horas, detalle = '') {
    return {
        id_tarea: getNextTaskId(),
        id_usuario: 1,
        centro_de_costo: "IT",
        proyecto: proyecto,
        tarea: tarea,
        fecha_inicio: fecha,
        fecha_fin: fecha,
        horas: horas,
        detalle: detalle || `${tarea} - ${proyecto}`
    };
}

// Función para agregar tarea a la base de datos
function addTaskToDatabase(task) {
    tasksDatabase.push(task);
    // Re-renderizar calendario si estamos en el mes correcto
    const taskDate = new Date(task.fecha_inicio + 'T00:00:00');
    if (taskDate.getFullYear() === currentYear && taskDate.getMonth() + 1 === currentMonth) {
        renderCalendar(currentYear, currentMonth);
    } else {
        // Si no estamos en el mes, al menos actualizar el resumen si es el mismo año
        if (taskDate.getFullYear() === currentYear) {
            updateHoursSummary(currentYear, currentMonth);
        }
    }
}


// Función para formatear fecha para mostrar
function formatDateForDisplay(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    return `${day} de ${month}`;
}


// Inicializar calendario
renderCalendar(currentYear, currentMonth);
