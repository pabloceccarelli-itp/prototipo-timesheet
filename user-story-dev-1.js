
// Función para parsear referencia de tiempo relativa
function parseRelativeDate(text) {
    const lowerText = text.toLowerCase().trim();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Referencias relativas
    if (lowerText === 'hoy' || lowerText === 'hoy mismo') {
        return today;
    } else if (lowerText === 'ayer') {
        const date = new Date(today);
        date.setDate(date.getDate() - 1);
        return date;
    } else if (lowerText === 'antes de ayer' || lowerText === 'anteayer') {
        const date = new Date(today);
        date.setDate(date.getDate() - 2);
        return date;
    } else if (lowerText === 'mañana') {
        const date = new Date(today);
        date.setDate(date.getDate() + 1);
        return date;
    } else if (lowerText === 'pasado mañana') {
        const date = new Date(today);
        date.setDate(date.getDate() + 2);
        return date;
    }
    
    return null;
}

// Función para parsear fecha absoluta (ej: "el 13 de noviembre", "13 de noviembre")
function parseAbsoluteDate(text) {
    const lowerText = text.toLowerCase().trim();
    
    // Patrón: "el X de [mes]" o "X de [mes]"
    const monthPatterns = [
        /(?:el\s+)?(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i,
        /(?:el\s+)?(\d{1,2})\s+de\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i
    ];
    
    for (const pattern of monthPatterns) {
        const match = lowerText.match(pattern);
        if (match) {
            const day = parseInt(match[1]);
            const monthName = match[2].toLowerCase();
            
            // Mapear nombres de meses a números
            const monthMap = {
                'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
                'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12,
                'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6,
                'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12
            };
            
            const month = monthMap[monthName];
            if (!month) return null;
            
            // Usar el año del calendario actual
            const year = currentYear;
            
            // Validar día
            const daysInMonth = getDaysInMonth(year, month);
            if (day < 1 || day > daysInMonth) return null;
            
            const date = new Date(year, month - 1, day);
            date.setHours(0, 0, 0, 0);
            return date;
        }
    }
    
    return null;
}

// Función para parsear cualquier referencia de fecha
function parseDateReference(text) {
    // Primero intentar fecha relativa
    let date = parseRelativeDate(text);
    if (date) {
        return formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
    }
    
    // Luego intentar fecha absoluta
    date = parseAbsoluteDate(text);
    if (date) {
        return formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
    }
    
    return null;
}

// Función para parsear comando de carga diaria
function parseDailyHoursCommand(text) {
    const lowerText = text.toLowerCase();

    // Patrón generalizado: "cargá/carga Xh/horas de [tarea] al proyecto [proyecto] [fecha]"
    // La fecha puede ser: hoy, ayer, mañana, pasado mañana, antes de ayer, o "el X de [mes]"
    const patterns = [
        /carg[áa]\s+(\d+)\s*h\s+de\s+(.+?)\s+al\s+proyecto\s+(.+?)\s+(.+)$/i,
        /carg[áa]\s+(\d+)\s*horas?\s+de\s+(.+?)\s+al\s+proyecto\s+(.+?)\s+(.+)$/i,
        /carg[áa]\s+(\d+)\s*h\s+de\s+(.+?)\s+en\s+proyecto\s+(.+?)\s+(.+)$/i,
        /carg[áa]\s+(\d+)\s*horas?\s+de\s+(.+?)\s+en\s+proyecto\s+(.+?)\s+(.+)$/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const horas = parseInt(match[1]);
            const tarea = match[2].trim();
            const proyecto = match[3].trim();
            const fechaRef = match[4].trim();
            
            // Intentar parsear la fecha
            const fecha = parseDateReference(fechaRef);
            
            if (fecha) {
                return {
                    horas: horas,
                    tarea: tarea,
                    proyecto: proyecto,
                    fecha: fecha,
                    fechaRef: fechaRef // Guardar referencia original para mostrar en confirmación
                };
            }
        }
    }

    return null;
}


// Función para procesar comando
function processCommand(text) {
    // Intentar parsear comando de carga diaria
    const dailyCommand = parseDailyHoursCommand(text);
    if (dailyCommand) {
        const fechaDisplay = formatDateForDisplay(dailyCommand.fecha);
        const confirmMessage = `¿Confirmás cargar ${dailyCommand.horas}h de "${dailyCommand.tarea}" al proyecto "${dailyCommand.proyecto}" para ${dailyCommand.fechaRef} (${fechaDisplay})?`;

        showConfirmation(
            confirmMessage,
            function () {
                const task = createTask(dailyCommand.proyecto, dailyCommand.tarea, dailyCommand.fecha, dailyCommand.horas);
                const added = addTaskToDatabase(task);

                if (added) {
                    setTimeout(() => {
                        addMessage(`✅ Perfecto! He cargado ${dailyCommand.horas}h de "${dailyCommand.tarea}" al proyecto "${dailyCommand.proyecto}" para ${dailyCommand.fechaRef} (${fechaDisplay}).`);
                    }, 500);
                }
                // Si no se agregó (por feriado), el mensaje de error ya se mostró en addTaskToDatabase
            },
            function () {
                addMessage('Operación cancelada. ¿Hay algo más en lo que pueda ayudarte?');
            }
        );
        return true;
    }

    // Intentar parsear comando de carga en bloque
    const blockCommand = parseBlockHoursCommand(text);
    if (blockCommand) {
        const datesCount = blockCommand.fechas.length;
        // Capitalizar primera letra de los nombres de días
        const startDayDisplay = blockCommand.startDayName.charAt(0).toUpperCase() + blockCommand.startDayName.slice(1);
        const endDayDisplay = blockCommand.endDayName.charAt(0).toUpperCase() + blockCommand.endDayName.slice(1);
        const confirmMessage = `¿Confirmás cargar ${blockCommand.horas}h de "${blockCommand.tarea}" al proyecto "${blockCommand.proyecto}" de ${startDayDisplay} a ${endDayDisplay} (${datesCount} días)?`;

        showConfirmation(
            confirmMessage,
            function () {
                // Agregar todas las tareas primero, omitiendo feriados
                let created = 0;
                let skipped = 0;
                blockCommand.fechas.forEach((fecha) => {
                    if (hasHolidayOnDate(fecha)) {
                        skipped++;
                        return;
                    }
                    const task = createTask(blockCommand.proyecto, blockCommand.tarea, fecha, blockCommand.horas);
                    tasksDatabase.push(task);
                    created++;
                });

                // Re-renderizar calendario una sola vez después de agregar todas las tareas
                const firstDate = new Date(blockCommand.fechas[0] + 'T00:00:00');
                if (firstDate.getFullYear() === currentYear && firstDate.getMonth() + 1 === currentMonth) {
                    renderCalendar(currentYear, currentMonth);
                } else {
                    if (firstDate.getFullYear() === currentYear) {
                        updateHoursSummary(currentYear, currentMonth);
                    }
                }

                setTimeout(() => {
                    let message = `✅ Perfecto! He cargado ${blockCommand.horas}h de "${blockCommand.tarea}" al proyecto "${blockCommand.proyecto}" para ${created} día${created !== 1 ? 's' : ''}`;
                    if (skipped > 0) {
                        message += `. Se omitieron ${skipped} día${skipped !== 1 ? 's' : ''} por ser feriado${skipped !== 1 ? 's' : ''}.`;
                    } else {
                        message += ` (de ${startDayDisplay} a ${endDayDisplay}).`;
                    }
                    addMessage(message);
                }, 500);
            },
            function () {
                addMessage('Operación cancelada. ¿Hay algo más en lo que pueda ayudarte?');
            }
        );
        return true;
    }

    // Intentar procesar comando de edición
    if (typeof processEditCommand === 'function') {
        if (processEditCommand(text)) {
            return true;
        }
    }

    // Intentar procesar comando de eliminación
    if (typeof processDeleteCommand === 'function') {
        if (processDeleteCommand(text)) {
            return true;
        }
    }

    // Intentar procesar duplicado semana pasada -> esta semana
    if (typeof processDuplicateLastWeekCommand === 'function') {
        if (processDuplicateLastWeekCommand(text)) {
            return true;
        }
    }

    // Intentar procesar completar resto del mes con esta semana
    if (typeof processFillRestOfMonthCommand === 'function') {
        if (processFillRestOfMonthCommand(text)) {
            return true;
        }
    }

	// Intentar procesar consulta de líder: horas por colaborador/proyecto/semana
	if (typeof processLeaderHoursCommand === 'function') {
		if (processLeaderHoursCommand(text)) {
			return true;
		}
	}

	// Intentar procesar consulta de líder: resumen del equipo en un proyecto
	if (typeof processLeaderTeamCommand === 'function') {
		if (processLeaderTeamCommand(text)) {
			return true;
		}
	}

	// Intentar procesar consulta de líder: detectar horas faltantes
	if (typeof processLeaderMissingHoursCommand === 'function') {
		if (processLeaderMissingHoursCommand(text)) {
			return true;
		}
	}

    return false;
}