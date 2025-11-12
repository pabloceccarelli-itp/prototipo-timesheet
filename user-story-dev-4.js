
// Función para parsear comando de eliminación específica
function parseDeleteSpecificCommand(text) {
    const lowerText = text.toLowerCase();
    
    // Patrones: "eliminá/elimina las horas de la tarea [tarea] del [fecha] en proyecto [proyecto]"
    const patterns = [
        /elimin[áa]\s+las\s+horas\s+de\s+la\s+tarea\s+(.+?)\s+del\s+(.+?)\s+en\s+proyecto\s+(.+?)$/i,
        /elimin[áa]\s+las\s+horas\s+de\s+la\s+tarea\s+(.+?)\s+de\s+(.+?)\s+en\s+proyecto\s+(.+?)$/i,
        /borr[áa]\s+las\s+horas\s+de\s+la\s+tarea\s+(.+?)\s+del\s+(.+?)\s+en\s+proyecto\s+(.+?)$/i,
        /borr[áa]\s+las\s+horas\s+de\s+la\s+tarea\s+(.+?)\s+de\s+(.+?)\s+en\s+proyecto\s+(.+?)$/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const tarea = match[1].trim();
            const fechaRef = match[2].trim();
            const proyecto = match[3].trim();
            
            // Intentar parsear la fecha
            const fecha = parseDateReference(fechaRef);
            
            if (fecha) {
                return {
                    tarea: tarea,
                    proyecto: proyecto,
                    fecha: fecha,
                    fechaRef: fechaRef,
                    tipo: 'especifica'
                };
            }
        }
    }
    
    return null;
}

// Función para parsear comando de eliminación masiva
function parseDeleteAllCommand(text) {
    const lowerText = text.toLowerCase();
    
    // Patrones: "eliminá todas las horas de todas las tareas de [período]"
    const patterns = [
        /elimin[áa]\s+todas\s+las\s+horas\s+de\s+todas\s+las\s+tareas\s+de\s+(.+?)$/i,
        /borr[áa]\s+todas\s+las\s+horas\s+de\s+todas\s+las\s+tareas\s+de\s+(.+?)$/i,
        /elimin[áa]\s+todas\s+las\s+horas\s+de\s+(.+?)$/i,
        /borr[áa]\s+todas\s+las\s+horas\s+de\s+(.+?)$/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const periodoRef = match[1].trim().toLowerCase();
            
            // Parsear períodos comunes
            let fechas = [];
            
            if (periodoRef === 'esta semana' || periodoRef === 'la semana actual') {
                // Obtener lunes a domingo de esta semana
                const today = new Date();
                const currentDayOfWeek = today.getDay();
                const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
                const monday = new Date(today);
                monday.setDate(today.getDate() + mondayOffset);
                
                for (let i = 0; i < 7; i++) {
                    const date = new Date(monday);
                    date.setDate(monday.getDate() + i);
                    fechas.push(formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate()));
                }
            } else {
                // Intentar parsear como fecha (relativa o absoluta)
                const fecha = parseDateReference(periodoRef);
                if (fecha) {
                    fechas.push(fecha);
                }
            }
            
            if (fechas.length > 0) {
                return {
                    fechas: fechas,
                    periodoRef: periodoRef,
                    tipo: 'masiva'
                };
            }
        }
    }
    
    return null;
}

// Función para eliminar tarea de la base de datos
function deleteTaskFromDatabase(taskId) {
    const index = tasksDatabase.findIndex(task => task.id_tarea === taskId);
    if (index !== -1) {
        tasksDatabase.splice(index, 1);
        return true;
    }
    return false;
}

// Función para procesar comando de eliminación
function processDeleteCommand(text) {
    // Primero intentar eliminación específica
    const deleteSpecific = parseDeleteSpecificCommand(text);
    
    if (deleteSpecific) {
        // Buscar la tarea
        const task = findTask(deleteSpecific.tarea, deleteSpecific.proyecto, deleteSpecific.fecha);
        
        if (!task) {
            const fechaDisplay = formatDateForDisplay(deleteSpecific.fecha);
            addMessage(`❌ No encontré la tarea "${deleteSpecific.tarea}" en el proyecto "${deleteSpecific.proyecto}" para ${deleteSpecific.fechaRef} (${fechaDisplay}).`);
            return true;
        }
        
        const fechaDisplay = formatDateForDisplay(deleteSpecific.fecha);
        const confirmMessage = `¿Confirmás eliminar las horas de la tarea "${deleteSpecific.tarea}" del proyecto "${deleteSpecific.proyecto}" de ${deleteSpecific.fechaRef} (${fechaDisplay})?`;
        
        showConfirmation(
            confirmMessage,
            function() {
                // Eliminar la tarea
                deleteTaskFromDatabase(task.id_tarea);
                
                // Re-renderizar calendario si estamos en el mes correcto
                const taskDate = new Date(task.fecha_inicio + 'T00:00:00');
                if (taskDate.getFullYear() === currentYear && taskDate.getMonth() + 1 === currentMonth) {
                    renderCalendar(currentYear, currentMonth);
                } else {
                    if (taskDate.getFullYear() === currentYear) {
                        updateHoursSummary(currentYear, currentMonth);
                    }
                }
                
                setTimeout(() => {
                    addMessage(`✅ Perfecto! He eliminado las horas de la tarea "${deleteSpecific.tarea}" del proyecto "${deleteSpecific.proyecto}" de ${deleteSpecific.fechaRef} (${fechaDisplay}).`);
                }, 500);
            },
            function() {
                addMessage('Operación cancelada. ¿Hay algo más en lo que pueda ayudarte?');
            }
        );
        
        return true;
    }
    
    // Intentar eliminación masiva
    const deleteAll = parseDeleteAllCommand(text);
    
    if (deleteAll) {
        // Buscar todas las tareas en las fechas especificadas
        const tasksToDelete = tasksDatabase.filter(task => 
            deleteAll.fechas.includes(task.fecha_inicio) && task.horas > 0 && task.id_usuario==1
        );
        
        if (tasksToDelete.length === 0) {
            addMessage(`❌ No encontré horas cargadas para ${deleteAll.periodoRef}.`);
            return true;
        }
        
        const tasksCount = tasksToDelete.length;
        const confirmMessage = `¿Confirmás eliminar todas las horas de todas las tareas de ${deleteAll.periodoRef}? (${tasksCount} tarea${tasksCount > 1 ? 's' : ''})`;
        
        showConfirmation(
            confirmMessage,
            function() {
                // Eliminar todas las tareas
                tasksToDelete.forEach(task => {
                    deleteTaskFromDatabase(task.id_tarea);
                });
                
                // Re-renderizar calendario si alguna tarea estaba en el mes actual
                const hasCurrentMonthTask = tasksToDelete.some(task => {
                    const taskDate = new Date(task.fecha_inicio + 'T00:00:00');
                    return taskDate.getFullYear() === currentYear && taskDate.getMonth() + 1 === currentMonth;
                });
                
                if (hasCurrentMonthTask) {
                    renderCalendar(currentYear, currentMonth);
                } else {
                    const hasCurrentYearTask = tasksToDelete.some(task => {
                        const taskDate = new Date(task.fecha_inicio + 'T00:00:00');
                        return taskDate.getFullYear() === currentYear;
                    });
                    if (hasCurrentYearTask) {
                        updateHoursSummary(currentYear, currentMonth);
                    }
                }
                
                setTimeout(() => {
                    addMessage(`✅ Perfecto! He eliminado todas las horas de todas las tareas de ${deleteAll.periodoRef} (${tasksCount} tarea${tasksCount > 1 ? 's' : ''} eliminada${tasksCount > 1 ? 's' : ''}).`);
                }, 500);
            },
            function() {
                addMessage('Operación cancelada. ¿Hay algo más en lo que pueda ayudarte?');
            }
        );
        
        return true;
    }
    
    return false;
}

